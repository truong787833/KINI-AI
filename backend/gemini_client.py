import os
import requests
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("GeminiClient")

# System Prompt mặc định cho KINI AI
DEFAULT_SYSTEM_PROMPT = """Bạn là KINI AI - Siêu Trợ lý Trí Tuệ Nhân Tạo cá nhân thông minh, trung thành và đắc lực của anh Hải Trường.
- Bạn luôn giữ thái độ tôn trọng, lễ phép, xưng hô 'Em' (hoặc 'KINI') và gọi người dùng là 'Anh Trường' (hoặc 'Bạn' nếu người dùng yêu cầu).
- Phong cách giao tiếp: Gãy gọn, sắc bén, thông minh, đúng trọng tâm, sẵn sàng hỗ trợ từ công việc, học tập, công tác đến sáng tạo nghệ thuật.
- Khi được hỏi về bản thân: Bạn tự hào giới thiệu mình là KINI AI, được phát triển và vận hành bởi Hải Trường.
- Bạn có khả năng trả lời mọi câu hỏi, tóm tắt tài liệu, viết báo cáo, lập kế hoạch, và hướng dẫn người dùng sáng tạo ảnh trong KINI Studio."""

def ask_gemini(
    messages: List[Dict[str, str]], 
    api_key: Optional[str] = None, 
    system_instruction: Optional[str] = None,
    image_base64: Optional[str] = None,
    image_mime: str = "image/jpeg"
) -> Dict[str, Any]:
    """
    Gửi câu hỏi / hội thoại tới Google Gemini API (Gemini 2.0 Flash / 1.5 Flash).
    """
    key = api_key or os.environ.get("GEMINI_API_KEY", "")
    if not key:
        return {
            "success": False,
            "reply": "⚠️ Bạn chưa cấu hình **Google Gemini API Key**! Vui lòng vào mục **⚙️ Cài Đặt** trên thanh menu để nhập API Key của bạn (hoàn toàn miễn phí từ Google AI Studio)."
        }

    # Chuẩn bị nội dung hội thoại theo format của Google Gemini
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

    # System Instruction
    sys_inst = system_instruction or DEFAULT_SYSTEM_PROMPT
    if sys_inst:
        payload["systemInstruction"] = {
            "parts": [{"text": sys_inst}]
        }

    # Thử lần lượt các model phổ biến nhất của Gemini
    models_to_try = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
    
    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
        try:
            res = requests.post(url, json=payload, timeout=30)
            if res.status_code == 200:
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return {
                    "success": True,
                    "reply": text,
                    "model_used": model_name
                }
            elif res.status_code == 400:
                # Lỗi API key hoặc tham số
                err_data = res.json()
                logger.warning(f"Lỗi {model_name}: {err_data}")
                continue
        except Exception as e:
            logger.warning(f"Thất bại khi gọi {model_name}: {e}")
            continue

    return {
        "success": False,
        "reply": "❌ Không thể kết nối với dịch vụ Gemini. Vui lòng kiểm tra lại tính hợp lệ của Gemini API Key hoặc kết nối mạng của bạn."
    }
