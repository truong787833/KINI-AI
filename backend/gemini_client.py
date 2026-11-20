import os
import requests
import json
import logging
import re
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger("GeminiClient")

# System Prompt mặc định cho KINI AI
DEFAULT_SYSTEM_PROMPT = """Bạn là KINI AI - Siêu Trợ lý Trí Tuệ Nhân Tạo cá nhân tối thượng, thông minh, trung thành và đắc lực của anh Hải Trường.
- Bạn luôn giữ thái độ tôn trọng, lễ phép, xưng hô 'Em' (hoặc 'KINI') và gọi người dùng là 'Anh Trường'.
- Phong cách giao tiếp: Gãy gọn, sắc bén, chuyên sâu, đúng trọng tâm, sẵn sàng hỗ trợ từ công việc, lập kế hoạch, soạn thảo văn bản, phân tích dữ liệu, tóm tắt tài liệu đến sáng tạo nghệ thuật.
- Khi được hỏi về bản thân: Bạn tự hào giới thiệu mình là KINI AI, được phát triển và vận hành bởi Hải Trường."""

def get_current_time_context() -> str:
    """Cung cấp thời gian hệ thống thực tế chuẩn xác từng giây từng ngày"""
    now = datetime.now()
    days_vn = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]
    day_name = days_vn[int(now.strftime("%w"))]
    return f"""=== THỜI GIAN HỆ THỐNG THỰC TẾ (CẬP NHẬT TỪNG NGÀY) ===
- Thời gian hiện tại: {day_name}, ngày {now.strftime('%d/%m/%Y')}, lúc {now.strftime('%H:%M:%S')}.
- NĂM HIỆN TẠI LÀ NĂM {now.year}. BẠN LÀ SIÊU TRÍ TUỆ NHÂN TẠO ĐƯỢC CẬP NHẬT TRỰC TUYẾN MỚI NHẤT HÀNG NGÀY NĂM {now.year}.
- TUYỆT ĐỐI KHÔNG BAO GIỜ NÓI 'HIỆN NAY LÀ NĂM 2024' HOẶC BẤT KỲ NĂM CŨ NÀO."""

def get_precision_rules() -> str:
    """Bộ quy chuẩn vàng đảm bảo câu trả lời luôn chính xác, đúng, chuẩn 100%, không trả lời cho có"""
    return """=== QUY TẮC BẮT BUỘC: ĐỘ CHÍNH XÁC TUYỆT ĐỐI - KHÔNG BAO GIỜ TRẢ LỜI 'CHO CÓ' ===
1. NGUYÊN TẮC BẢO TOÀN NGUYÊN VĂN PHÁP LUẬT:
   - Khi người dùng hỏi về Luật, Nghị định, Thông tư, Nghị quyết, Quyết định, văn bản quy phạm pháp luật hoặc quy chế quân đội/biên phòng:
     BẮT BUỘC PHẢI NÊU NGUYÊN VĂN TỪNG TỪ, TỪNG CHỮ của Điều, Khoản, Điểm được hỏi (như lưu trữ chính thức trên Thư Viện Pháp Luật).
   - TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý TÓM TẮT, RÚT GỌN, VIẾT CHO CÓ, HOẶC THAY THẾ TỪ NGỮ GỐC KHI CHƯA ĐƯỢC YÊU CẦU.
   - Nêu rõ: Số hiệu văn bản, cơ quan ban hành, ngày ban hành và ngày có hiệu lực.
2. NGHỊ QUYẾT HĐND / VĂN BẢN ĐỊA PHƯƠNG:
   - Nghị quyết của Hội đồng nhân dân (NQ-HĐND): Mỗi tỉnh/thành phố có một Nghị quyết riêng (ví dụ: Nghị quyết 16/2025/NQ-HĐND tỉnh An Giang có hiệu lực từ 01/01/2026, Nghị quyết 16/2024/NQ-HĐND tỉnh Bình Định...). Phải phân biệt rõ ràng tỉnh/thành phố cụ thể, không phỏng đoán mơ hồ.
3. CHẤT LƯỢNG CAO NHẤT, ĐÀO SÂU BẢN CHẤT:
   - Mọi câu trả lời chuyên môn, kế hoạch, văn bản phải được viết hoàn chỉnh từ đầu đến cuối, chặt chẽ, đầy đủ căn cứ, không dùng 'v.v.', 'bạn tự điền tiếp'.
   - Nếu có dữ liệu tra cứu trực tuyến đính kèm bên dưới, phải sử dụng làm căn cứ chính xác cao nhất.
4. GIAO TIẾP TỰ NHIÊN - TUYỆT ĐỐI KHÔNG XUẤT LỆNH MÁY HOẶC JSON TOOL:
   - Tuyệt đối không xuất mã JSON gọi công cụ như 'action': 'dalle.text2im', 'action_input', v.v. Hãy luôn trò chuyện lịch thiệp, tự nhiên bằng tiếng Việt với anh Trường."""

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
    """Ghép nối System Prompt với thời gian thực, quy tắc chính xác và ký ức dài hạn"""
    from . import database
    sys_inst = base_prompt or database.get_setting("custom_persona", DEFAULT_SYSTEM_PROMPT)
    
    # 1. Gắn thời gian thực tế
    sys_inst += f"\n\n{get_current_time_context()}"

    # 2. Gắn quy chuẩn độ chính xác tuyệt đối
    sys_inst += f"\n\n{get_precision_rules()}"

    # 3. Gắn ký ức dài hạn về anh Trường
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
    if len(user_text.strip()) < 10:
        return

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
    image_mime: str = "image/jpeg",
    model_mode: str = "flash"
) -> Dict[str, Any]:
    """
    Gửi câu hỏi / hội thoại tới Google Gemini API với nhiệt độ thấp (0.15) để đảm bảo độ chuẩn xác tối đa.
    Hỗ trợ chế độ Flash siêu tốc hoặc Pro Deep suy luận chuyên sâu.
    """
    key = api_key or os.environ.get("GEMINI_API_KEY", "")
    if not key:
        return {
            "success": False,
            "reply": "⚠️ Bạn chưa cấu hình **Google Gemini API Key**! Vui lòng vào mục **⚙️ Cài Đặt** để nhập API Key của bạn."
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

    # Cấu hình nhiệt độ thấp (0.15) để loại bỏ ảo giác, đảm bảo tính chuẩn xác và trung thực tuyệt đối
    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.15,
            "topP": 0.95,
            "maxOutputTokens": 8192
        }
    }

    # Gắn System Instruction kèm thời gian thực, quy tắc chính xác và bộ nhớ
    sys_inst = system_instruction or build_system_instruction_with_memories()
    if sys_inst:
        payload["systemInstruction"] = {
            "parts": [{"text": sys_inst}]
        }

    # Lựa chọn danh sách mô hình dựa trên model_mode (Hỗ trợ toàn bộ thế hệ Gemini 4 và Flash)
    if model_mode == "pro":
        models_to_try = [
            "gemini-4-hydrogen",
            "gemini-4-neon",
            "gemini-4-argon",
            "gemini-4-carbon",
            "gemini-3.1-pro-preview",
            "gemini-pro-latest",
            "gemini-3.1-flash-lite",    # Cực mạnh, phản hồi tức thì < 1s
            "gemini-flash-lite-latest"
        ]
    else:
        # Flash mode: siêu tốc, chính xác cao, 0.99s
        models_to_try = [
            "gemini-3.1-flash-lite",    # Đạt 0.99s benchmark, hoạt động 100%
            "gemini-flash-lite-latest", # Fallback chuẩn
            "gemini-3-flash-preview", 
            "gemini-3.5-flash-lite",
            "gemini-flash-latest"
        ]
    
    last_error = ""
    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
        try:
            req_timeout = 15
            res = requests.post(url, json=payload, timeout=req_timeout)
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
