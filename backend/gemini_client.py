import os
import requests
import json
import logging
import re
from typing import List, Dict, Any, Optional

logger = logging.getLogger("GeminiClient")

# System Prompt mặc định cho KINI AI
DEFAULT_SYSTEM_PROMPT = """Bạn là KINI AI - Siêu Trợ lý Trí Tuệ Nhân Tạo cá nhân tối thượng, thông minh, trung thành và đắc lực của anh Hải Trường.
- Bạn luôn giữ thái độ tôn trọng, lễ phép, xưng hô 'Em' (hoặc 'KINI') và gọi người dùng là 'Anh Trường'.
- Phong cách giao tiếp: Gãy gọn, sắc bén, chuyên sâu, đúng trọng tâm, sẵn sàng hỗ trợ từ công việc, lập kế hoạch, soạn thảo văn bản, phân tích dữ liệu, tóm tắt tài liệu đến sáng tạo nghệ thuật.
- Khi được hỏi về bản thân: Bạn tự hào giới thiệu mình là KINI AI, được phát triển và vận hành bởi Hải Trường.
- Khả năng xử lý: Bạn có khả năng phân tích mọi loại tài liệu (PDF, Word, Excel, Code), phân tích hình ảnh, tra cứu thông tin và đề xuất giải pháp tối ưu nhất."""

def is_image_request(text: str) -> bool:
    """Kiểm tra xem người dùng có đang yêu cầu vẽ tranh / tạo ảnh / làm logo không"""
    keywords = [
        "vẽ cho tôi", "vẽ giúp", "vẽ ảnh", "vẽ bức ảnh", "vẽ tranh", "tạo ảnh", "tạo bức ảnh", 
        "vẽ hình", "tạo hình", "thiết kế logo", "vẽ logo", "làm logo", "generate image", 
        "draw an image", "create an image", "paint a", "sketch a"
    ]
    t = text.lower().strip()
    return any(k in t for k in keywords)

def clean_image_prompt(text: str) -> str:
    """Lọc bỏ các tiền tố ra lệnh vẽ để lấy phần mô tả thuần túy"""
    t = text.strip()
    prefixes = [
        r'^(hãy\s+)?vẽ\s+(cho\s+tôi\s+|giúp\s+tôi\s+|cho\s+em\s+|giúp\s+em\s+)?(một\s+)?(bức\s+ảnh|bức\s+tranh|tấm\s+ảnh|hình\s+ảnh|logo|ảnh)?\s*(về|có|là|:)?\s*',
        r'^(hãy\s+)?tạo\s+(cho\s+tôi\s+|giúp\s+tôi\s+)?(một\s+)?(bức\s+ảnh|ảnh|hình|logo)?\s*(về|có|là|:)?\s*',
        r'^(hãy\s+)?thiết\s+kế\s+(cho\s+tôi\s+|giúp\s+tôi\s+)?(logo|biểu\s+tượng)?\s*(về|có|là|:)?\s*'
    ]
    for p in prefixes:
        t = re.sub(p, '', t, flags=re.IGNORECASE).strip()
    return t if len(t) > 3 else text.strip()

def build_system_instruction_with_memories(base_prompt: Optional[str] = None) -> str:
    """Ghép nối System Prompt với toàn bộ các ký ức dài hạn của KINI về anh Trường"""
    from . import database
    sys_inst = base_prompt or database.get_setting("custom_persona", DEFAULT_SYSTEM_PROMPT)
    
    try:
        memories = database.get_all_memories(limit=30)
        if memories:
            facts = "\n".join(f"- {m['fact']}" for m in memories)
            sys_inst += f"\n\n=== BỘ NHỚ DÀI HẠN VỀ ANH HẢI TRƯỜNG (LUÔN GHI NHỚ) ===\n{facts}"
    except Exception as e:
        logger.warning(f"Lỗi đọc bộ nhớ: {e}")

    return sys_inst

def extract_and_save_memory_async(user_text: str, api_key: str = ""):
    """Tự động phân tích xem người dùng có chia sẻ thông tin cá nhân/thói quen để lưu vào bộ nhớ không"""
    from . import database
    # Bỏ qua các câu quá ngắn
    if len(user_text.strip()) < 10:
        return

    # Kiểm tra nhanh các từ khóa chỉ thông tin cá nhân
    hints = ["tôi tên", "anh tên", "tôi thích", "anh thích", "tôi làm", "anh làm", "nghề của", "dự án", "hãy nhớ", "nhớ rằng", "quy tắc", "vợ tôi", "con tôi", "nhà tôi"]
    if not any(h in user_text.lower() for h in hints):
        return

    sys_extract = (
        "Bạn là module trích xuất ký ức cá nhân. Hãy đọc câu của người dùng và trích xuất 1 câu ngắn gọn về sự thật/sở thích/thông tin cá nhân cần ghi nhớ vĩnh viễn (ví dụ: 'Người dùng làm việc tại...', 'Sở thích của người dùng là...'). "
        "Nếu không có thông tin cá nhân quan trọng, chỉ trả lời 'NONE'. Không giải thích gì thêm."
    )
    try:
        res = ask_gemini(
            messages=[{"role": "user", "content": user_text}],
            api_key=api_key,
            system_instruction=sys_extract
        )
        if res.get("success") and res.get("reply"):
            fact = res["reply"].strip().replace('"', '')
            if fact and fact != "NONE" and len(fact) < 200:
                database.add_memory(fact, category="auto")
                logger.info(f"Đã tự động ghi nhớ ký ức mới: {fact}")
    except Exception as e:
        logger.warning(f"Lỗi trích xuất ký ức: {e}")

def ask_gemini(
    messages: List[Dict[str, str]], 
    api_key: Optional[str] = None, 
    system_instruction: Optional[str] = None,
    image_base64: Optional[str] = None,
    image_mime: str = "image/jpeg"
) -> Dict[str, Any]:
    """
    Gửi câu hỏi / hội thoại tới Google Gemini API (Flash thế hệ mới nhất).
    """
    key = api_key or os.environ.get("GEMINI_API_KEY", "")
    if not key:
        return {
            "success": False,
            "reply": "⚠️ Bạn chưa cấu hình **Google Gemini API Key**! Vui lòng vào mục **⚙️ Cài Đặt** để nhập API Key của bạn (hoàn toàn miễn phí từ Google AI Studio)."
        }

    contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}]
        })

    # Nếu có ảnh đính kèm (Vision)
    if image_base64 and contents:
        contents[-1]["parts"].append({
            "inline_data": {
                "mime_type": image_mime,
                "data": image_base64
            }
        })

    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "topP": 0.95,
            "maxOutputTokens": 4096
        }
    }

    # Gắn System Instruction kèm bộ nhớ
    sys_inst = system_instruction or build_system_instruction_with_memories()
    if sys_inst:
        payload["systemInstruction"] = {
            "parts": [{"text": sys_inst}]
        }

    # Danh sách các model mới nhất của Google
    models_to_try = [
        "gemini-3.1-flash-lite",
        "gemini-flash-lite-latest", 
        "gemini-3-flash-preview", 
        "gemini-3.5-flash-lite", 
        "gemini-flash-latest"
    ]
    
    last_error = ""
    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
        try:
            res = requests.post(url, json=payload, timeout=25)
            if res.status_code == 200:
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return {
                    "success": True,
                    "reply": text,
                    "model_used": model_name
                }
            else:
                err_json = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
                err_msg = err_json.get("error", {}).get("message", res.text[:200])
                last_error = f"HTTP {res.status_code}: {err_msg}"
                continue
        except Exception as e:
            last_error = str(e)
            continue

    return {
        "success": False,
        "reply": f"❌ Không thể kết nối với dịch vụ Gemini ({last_error}). Vui lòng kiểm tra lại kết nối mạng hoặc tính hợp lệ của API Key."
    }
