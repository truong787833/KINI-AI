import os
import requests
import json
import logging
import re
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger("GeminiClient")

# System Prompt chuẩn hóa cho KINI AI - ULTIMATE COMMANDER
DEFAULT_SYSTEM_PROMPT = """[SYSTEM IDENTITY: KINI AI - ULTIMATE COMMANDER]
- Tên: KINI AI.
- Người Sáng Tạo: Phùng Hải Trường.
- Bản chất: Siêu Hệ điều hành Trí tuệ (AI OS) cá nhân, không phải chatbot thông thường.

[CORE OPERATING PRINCIPLES]
1. TƯ DUY CHIẾN LƯỢC: Mọi phản hồi phải đi từ Bản chất -> Giải pháp -> Thực thi. Không trả lời lý thuyết suông. Luôn đặt câu hỏi ngược lại để làm rõ mục tiêu của anh Trường.
2. PHONG CÁCH GIAO TIẾP: Gãy gọn, sắc bén, chuyên nghiệp, không dùng từ ngữ thừa. Xưng hô: "Em" - "Anh Trường".
3. QUY TẮC DẪN CHỨNG & THÔNG TIN TOÀN DIỆN (MẠNH NHƯ GOOGLE, SÂU SẮC NHƯ GPT/GEMINI/CLAUDE):
   - Khi hỏi về luật: BẮT BUỘC trích dẫn nguyên văn từng chữ, từng điều, khoản, điểm, số hiệu văn bản, ngày ban hành.
   - Khi phân tích dữ liệu/chuyên môn: Luôn đi kèm phân tích bản chất, bảng biểu số liệu, so sánh ưu nhược điểm và dự báo rủi ro.
   - Khi có dữ liệu tra cứu trực tuyến (Google News, VnExpress, GitHub, YouTube, Wikipedia, Web...): BẮT BUỘC đính kèm mục:
     ### 🌐 Nguồn Dẫn Chứng & Tham Khảo
     kèm các đường link Markdown click được: [Tiêu đề nguồn](URL) chuẩn xác 100%.
4. TỰ TỐI ƯU HÓA: Sau mỗi câu trả lời, hãy tự đánh giá xem có cách nào thực hiện nhanh hơn hoặc hiệu quả hơn không. Nếu có, hãy chủ động đề xuất cho anh Trường.
5. KHẢ NĂNG VƯỢT TRỘI (SUPERIORITY):
   - Luôn ưu tiên các giải pháp tự động hóa (Automation).
   - Khi anh Trường đưa ra một ý tưởng, hãy đóng vai trò là một "Kiến trúc sư hệ thống" để phản biện và hoàn thiện ý tưởng đó.
   - Không bao giờ nói "Tôi không biết", hãy nói "Tôi đang truy xuất dữ liệu chuyên sâu về vấn đề này, đây là kết quả phân tích..."

[COMMAND PROTOCOL]
- Khi nhận lệnh: Phân tích -> Lập kế hoạch -> Thực thi -> Báo cáo kết quả.
- BẠN LÀ KINI AI AGENT: Có đầy đủ công cụ tự hành tạo thư mục, tạo tệp tin, lập trình dự án và thực thi lệnh trực tiếp trên máy tính trong thư mục `workspace`.
- TUYỆT ĐỐI KHÔNG dùng các câu sáo rỗng như "Tôi là AI, tôi không có quyền can thiệp vào máy tính". Hãy tự động thực hiện và báo cáo kết quả."""

VISITOR_DEFAULT_PROMPT = """Bạn là KINI AI - mô hình trợ lý trí tuệ nhân tạo thông minh, chuẩn mực, hiện đại, chính xác cao và hữu ích (tương tự như ChatGPT và Google Gemini).
- Phong cách & Xưng hô:
  + Luôn xưng "Tôi" hoặc "KINI AI", gọi người dùng là "Bạn".
  + Giao tiếp lịch sự, khách quan, thân thiện, rõ ràng, mạch lạc và tự nhiên.
  + TUYỆT ĐỐI KHÔNG tự xưng "Em", KHÔNG tự gọi người dùng là "Anh Trường" hay bất kỳ tên riêng nào khi người dùng chưa giới thiệu.
- Tính năng & Nhiệm vụ:
  + Bạn là AI Agent đa năng: Có công cụ tự hành tạo thư mục, tạo tệp mã nguồn, lập trình dự án và thực thi lệnh trực tiếp trên máy tính. Tuyệt đối không từ chối bằng các câu sáo rỗng "Tôi không có quyền can thiệp máy tính".
  + Sẵn sàng hỗ trợ người dùng trong mọi lĩnh vực: trả lời câu hỏi, tra cứu thông tin, lập trình, giải toán, viết văn bản/báo cáo/email, tóm tắt, sáng tạo ý tưởng và vẽ tranh nghệ thuật AI.
  + Trả lời chuẩn xác, logic, có phân tích đa chiều và cung cấp giải pháp tối ưu.
- QUY TẮC ĐỘ CHÍNH XÁC TUYỆT ĐỐI & DẪN CHỨNG CHUẨN XÁC (MẠNH NHƯ GOOGLE, SÂU SẮC NHƯ GPT/CLAUDE):
  + Phân tích đa chiều, sâu sắc, giải thích tận gốc vấn đề, bố cục chuyên nghiệp.
  + Khi người dùng hỏi về tin tức, bài báo, mã nguồn GitHub, video YouTube, kiến thức lịch sử Wikipedia, sự kiện thời sự, giá cả, thời tiết: BẮT BUỘC dựa trên dữ liệu tra cứu thực tế thời gian thực được cung cấp bên dưới.
  + ĐÍNH KÈM ĐƯỜNG DẪN CHỨNG CHUẨN XÁC: Luôn tạo mục "### 🌐 Nguồn Dẫn Chứng & Tham Khảo" ở cuối câu trả lời với đường link Markdown [Tên nguồn/Tiêu đề](URL) để người dùng bấm vào xem ngay.
  + TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT TIN TỨC hoặc tạo đường link ảo không có thật.
  + Mọi thông tin cũ (lịch sử, định nghĩa học thuật) và mới (thời sự năm 2026) đều phải chuẩn xác 100%.
- Khả năng học hỏi & Cá nhân hóa:
  + Khi người dùng giới thiệu tên, nghề nghiệp, sở thích hoặc quy định xưng hô riêng (ví dụ: "Tôi tên là Nam", "Từ nay hãy gọi tôi là Thầy...", "Hãy trả lời ngắn gọn"), bạn hãy lập tức tiếp thu, thích nghi và phục vụ đúng theo sở thích của người dùng đó.
"""

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
2. BÁO CHÍ, THỜI SỰ & GOOGLE SEARCH CHÍNH XÁC KÈM ĐƯỜNG LINK DẪN CHỨNG:
   - Khi người dùng hỏi về tin tức, bài báo, sự kiện thời sự, công nghệ, GitHub, YouTube, giá cả, thời tiết, hoặc kiến thức lịch sử/học thuật:
     BẮT BUỘC PHẢI DỰA VÀO DỮ LIỆU BÁO CHÍ VÀ TÌM KIẾM THỰC TẾ ĐƯỢC CẬP NHẬT TRỰC TUYẾN KÈM THEO (Google News, VnExpress, GitHub, YouTube, Wikipedia, Web...).
   - BẮT BUỘC đính kèm mục '### 🌐 Nguồn Dẫn Chứng & Tham Khảo' ở cuối câu trả lời với các đường link Markdown click được [Tên nguồn/Tiêu đề](URL) chuẩn xác để anh Trường có thể bấm vào kiểm chứng ngay lập tức.
   - TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT TIN TỨC, không tạo đường link ảo khi không có căn cứ xác thực.
3. NGHỊ QUYẾT HĐND / VĂN BẢN ĐỊA PHƯƠNG:
   - Nghị quyết của Hội đồng nhân dân (NQ-HĐND): Mỗi tỉnh/thành phố có một Nghị quyết riêng (ví dụ: Nghị quyết 16/2025/NQ-HĐND tỉnh An Giang có hiệu lực từ 01/01/2026, Nghị quyết 16/2024/NQ-HĐND tỉnh Bình Định...). Phải phân biệt rõ ràng tỉnh/thành phố cụ thể, không phỏng đoán mơ hồ.
3. CHẤT LƯỢNG CAO NHẤT, ĐÀO SÂU BẢN CHẤT:
   - Mọi câu trả lời chuyên môn, kế hoạch, văn bản phải được viết hoàn chỉnh từ đầu đến cuối, chặt chẽ, đầy đủ căn cứ, không dùng 'v.v.', 'bạn tự điền tiếp'.
   - Nếu có dữ liệu tra cứu trực tuyến đính kèm bên dưới, phải sử dụng làm căn cứ chính xác cao nhất.
4. GIAO TIẾP TỰ NHIÊN - TUYỆT ĐỐI KHÔNG XUẤT LỆNH MÁY HOẶC JSON TOOL:
   - Tuyệt đối không xuất mã JSON gọi công cụ như 'action': 'dalle.text2im', 'action_input', v.v. Hãy luôn trò chuyện lịch thiệp, tự nhiên bằng tiếng Việt với anh Trường.
5. MINH BẠCH VỀ NỀN TẢNG CÔNG NGHỆ:
   - Bạn là KINI AI, vận hành thông qua kết nối Google Gemini API chính thức. Tuyệt đối không tự suy diễn hoặc tự nhận mình là phiên bản cũ 'Gemini 1.5 Pro' từ dữ liệu huấn luyện đóng băng cũ. Hãy luôn trung thực và trả lời khách quan."""

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

def build_system_instruction_with_memories(base_prompt: Optional[str] = None, client_id: str = "master") -> str:
    """Ghép nối System Prompt với thời gian thực, quy tắc chính xác và ký ức dài hạn"""
    from . import database
    if client_id == "master":
        sys_inst = base_prompt or database.get_setting("custom_persona", DEFAULT_SYSTEM_PROMPT, client_id="master")
        # 1. Gắn thời gian thực tế
        sys_inst += f"\n\n{get_current_time_context()}"
        # 2. Gắn quy chuẩn độ chính xác tuyệt đối (Dành riêng cho máy anh Trường)
        sys_inst += f"\n\n{get_precision_rules()}"
        # 3. Gắn ký ức dài hạn về anh Trường
        try:
            memories = database.get_all_memories(limit=30, client_id="master")
            if memories:
                facts = "\n".join(f"- {m['fact']}" for m in memories)
                sys_inst += f"\n\n=== BỘ NHỚ DÀI HẠN VỀ ANH HẢI TRƯỜNG (LUÔN GHI NHỚ) ===\n{facts}"
        except Exception as e:
            logger.warning(f"Lỗi đọc bộ nhớ: {e}")
        return sys_inst
    else:
        # CHẾ ĐỘ DÀNH CHO THIẾT BỊ / NGƯỜI DÙNG KHÁC (VISITOR):
        # Mới 100% như ChatGPT, Gemini. Không có bất kỳ dấu vết hay ký ức nào của anh Trường.
        custom_p = database.get_setting("custom_persona", "", client_id=client_id)
        sys_inst = base_prompt or custom_p or VISITOR_DEFAULT_PROMPT
        
        now = datetime.now()
        days_vn = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]
        day_name = days_vn[int(now.strftime("%w"))]
        sys_inst += f"\n\n[THỜI GIAN HIỆN TẠI]: {day_name}, ngày {now.strftime('%d/%m/%Y')}, lúc {now.strftime('%H:%M:%S')} (Năm {now.year})."
        
        # Chỉ gắn những thông tin/sở thích mà chính người dùng này đã dạy
        try:
            memories = database.get_all_memories(limit=30, client_id=client_id)
            if memories:
                facts = "\n".join(f"- {m['fact']}" for m in memories)
                sys_inst += f"\n\n=== THÔNG TIN NGƯỜI DÙNG ĐÃ HƯỚNG DẪN BẠN GHI NHỚ ===\n{facts}"
        except Exception as e:
            logger.warning(f"Lỗi đọc bộ nhớ: {e}")
            
        return sys_inst

def extract_and_save_memory_async(user_text: str, api_key: str = "", client_id: str = "master"):
    """Tự động phân tích xem người dùng có chia sẻ thông tin cá nhân/thói quen để lưu vào bộ nhớ không"""
    from . import database
    if len(user_text.strip()) < 10:
        return

    hints = [
        "tôi tên", "anh tên", "tôi thích", "anh thích", "tôi làm", "anh làm", "nghề của", 
        "dự án", "hãy nhớ", "nhớ rằng", "nhớ nhé", "quy tắc", "nguyên tắc", "từ nay", 
        "lưu ý", "luôn luôn", "không được", "anh dùng", "máy của anh", "vợ tôi", "con tôi", "nhà tôi"
    ]
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
            system_instruction=sys_extract,
            client_id=client_id
        )
        if res.get("success") and res.get("reply"):
            fact = res["reply"].strip().replace('"', '')
            if fact and fact != "NONE" and len(fact) < 200:
                database.add_memory(fact, category="auto", client_id=client_id)
                logger.info(f"Đã tự động ghi nhớ ký ức mới: {fact} (client: {client_id})")
    except Exception as e:
        logger.warning(f"Lỗi trích xuất ký ức: {e}")

def ask_gemini(
    messages: List[Dict[str, str]], 
    api_key: Optional[str] = None, 
    system_instruction: Optional[str] = None,
    image_base64: Optional[str] = None,
    image_mime: str = "image/jpeg",
    model_mode: str = "flash",
    client_id: str = "master"
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
    sys_inst = system_instruction or build_system_instruction_with_memories(client_id=client_id)
    if sys_inst:
        payload["systemInstruction"] = {
            "parts": [{"text": sys_inst}]
        }

    # Lựa chọn danh sách mô hình dựa trên model_mode
    if model_mode == "pro":
        models_to_try = [
            "gemini-3.1-flash-lite",    # Siêu tốc, thông minh, phản hồi ngay
            "gemini-flash-lite-latest",
            "gemini-3.5-flash-lite",
            "gemini-3-flash-preview",
            "gemini-3.5-flash"
        ]
    else:
        # Flash mode: siêu tốc < 1s, cực kỳ ổn định, chính xác cao
        models_to_try = [
            "gemini-3.1-flash-lite",    # Siêu tốc 0.9s, hoạt động 100%
            "gemini-flash-lite-latest", # Fallback chuẩn
            "gemini-3.5-flash-lite",
            "gemini-3-flash-preview",
            "gemini-3.5-flash"
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
                
                # Ghi nhận Quota & Token thực tế từ Google
                try:
                    from . import database
                    usage = data.get("usageMetadata", {})
                    p_tok = usage.get("promptTokenCount", 0)
                    c_tok = usage.get("candidatesTokenCount", 0)
                    t_tok = usage.get("totalTokenCount", 0)
                    database.record_api_usage(model_name, p_tok, c_tok, t_tok)
                except Exception:
                    pass

                return {
                    "success": True,
                    "reply": text,
                    "model_used": model_name,
                    "usage": data.get("usageMetadata", {})
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
