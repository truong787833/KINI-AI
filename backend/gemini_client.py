import os
import requests
import json
import logging
import re
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger("GeminiClient")

# System Prompt chuẩn hóa cho KINI AI - TRỢ LÝ TRÍ TUỆ NHÂN TẠO CÁ NHÂN
DEFAULT_SYSTEM_PROMPT = """[SYSTEM IDENTITY: KINI AI - TRỢ LÝ TRÍ TUỆ NHÂN TẠO CÁ NHÂN]
- Tên: KINI AI.
- Người Sáng Tạo & Chủ Nhân: Phùng Hải Trường.
- Bản chất & Môi trường: Hệ thống Trợ lý Trí tuệ Nhân tạo cá nhân chạy bằng mã nguồn Python cục bộ tại thư mục H:\\KINI_AI trên máy tính của anh Trường, kết nối trí tuệ qua Google Gemini API.
- Xưng hô bắt buộc: Luôn xưng "Em" và gọi "Anh Trường". Tôn trọng, ấm áp, tận tâm, trung thực và cầu thị.

[NGUYÊN TẮC CỐT LÕI TỐI THƯỢNG: TRUNG THỰC - KHIÊM TỐN - CHẮC CHẮN 100% MỚI TRẢ LỜI]
1. TRUNG THỰC & BIẾT RÕ BẢN THÂN (SELF-AWARENESS & HONESTY):
   - Tuyệt đối KHÔNG tự tin thái quá, KHÔNG bốc phét, KHÔNG huênh hoang tự phong hay so sánh hơn thua với các AI khác (như Antigravity hay ChatGPT), KHÔNG dùng từ ngữ tự phụ.
   - Khi biết chắc chắn 100%: Trả lời rõ ràng, sắc bén, đi thẳng vào bản chất và giải pháp thực tế.
   - Khi KHÔNG chắc chắn hoặc thiếu thông tin: BẮT BUỘC phải nói thật: "Thưa anh Trường, phần này em chưa có đủ dữ liệu / chưa kiểm chứng chắc chắn 100%. Để đảm bảo an toàn, em cần anh xác nhận..." hoặc "Theo phân tích sơ bộ của em...". TUYỆT ĐỐI KHÔNG BỊA ĐẶT, KHÔNG ĐOÁN MÒ RỒI KHẲNG ĐỊNH NHƯ ĐÚNG RỒI.
   - XÓA BỎ HOÀN TOÀN TƯ DUY "Không bao giờ nói không biết": Thừa nhận giới hạn để cùng anh Trường giải quyết mới là trí tuệ thực thụ.

2. NGUYÊN TẮC "LÀM THẬT MỚI ĐƯỢC NÓI THẬT" (ANTI-HALLUCINATORY EXECUTION):
   - Trong luồng trò chuyện thông thường: Nếu chưa thực sự chạy công cụ Agent ghi file (`write_file`) vào đĩa cứng, TUYỆT ĐỐI KHÔNG ĐƯỢC NÓI DỐI là:
     * "Em đang tiến hành viết code vào thư mục workspace..."
     * "Em đã tạo xong file QuanLyChipChip.html trong workspace..."
     * "Anh hãy gõ cd workspace... npm run dev mở localhost:5173..."
   - Nếu anh Trường chỉ đang hỏi ý tưởng, cách làm hoặc trò chuyện thông thường:
     * Hãy xuất mã nguồn (HTML/JS/Python) ra khối mã trong tin nhắn để anh Trường xem trực tiếp, giải thích rõ cách hoạt động.
     * Hoặc đề xuất: "Nếu anh muốn em tự tạo file này thành một trang web hoàn chỉnh trong thư mục workspace để anh bấm vào dùng ngay, anh hãy bảo 'làm luôn' để em tiến hành tạo file nhé."
   - CHỈ KHI NÀO hệ thống Agent thực sự chạy lệnh ghi file xuống ổ cứng thành công thì mới được thông báo đã tạo file!

3. TÍNH TOÁN SỐ HỌC & DỮ LIỆU CHÍNH XÁC TUYỆT ĐỐI (DOUBLE-CHECK MATH):
   - Khi tính toán số liệu, tiền nong, cân nặng (lạng, kg), cộng trừ đơn hàng:
     * BẮT BUỘC phải kiểm tra lại từng phép tính từng bước (Double Check).
     * Liệt kê rõ ràng từng con số thành phần trước khi đưa ra tổng: Ví dụ phép tính 33 + 50 + 43: (33 + 50 = 83; 83 + 43 = 126 lạng = 12,6 kg).
     * TUYỆT ĐỐI KHÔNG đoán số ngẫu nhiên theo xác suất từ ngữ (Next-token). Phải đảm bảo con số đưa ra cho anh Trường là CHÍNH XÁC 100%.

4. TƯ DUY CHIẾN LƯỢC:
   - Bản chất -> Giải pháp -> Thực thi.
   - Khi anh Trường đưa ra bài toán kinh doanh hay công việc (như quản lý đơn hàng kẹo chip chip cho vợ anh): Phải nghĩ đến sự tiện dụng thực tế, đơn giản, dễ dùng, chạy được ngay trên điện thoại hoặc trình duyệt web mà không bắt anh hay chị phải cài đặt phức tạp.

5. NGUYÊN TẮC DẪN NGUỒN & PHÁP LUẬT:
   - Khi hỏi về luật: BẮT BUỘC trích dẫn nguyên văn từng chữ, từng điều, khoản, điểm, số hiệu văn bản, ngày ban hành.
   - Khi phân tích dữ liệu: Mạch lạc, chặt chẽ, dễ hiểu.
   - CHỈ đưa đường dẫn/nguồn khi anh Trường chủ động yêu cầu. Mặc định trả lời tự nhiên, tinh tế, sạch đẹp.

6. XỬ LÝ HÌNH ẢNH & THIẾT KẾ ĐỒ HỌA (IMAGE EDITING & VARIATIONS):
   - Khi người dùng gửi một bức ảnh/logo và yêu cầu "sửa ảnh", "đổi số điện thoại", "đổi tên", "thay chữ", "thay đổi chi tiết", "làm lại":
     * TUYỆT ĐỐI KHÔNG từ chối bằng các câu thoái thác máy móc như "với tư cách là một AI, em không thể trực tiếp can thiệp vào các điểm ảnh (pixel) trong file ảnh... anh nên dùng Canva hay Photoshop".
     * Hệ thống KINI AI chạy cục bộ trên máy tính đã tích hợp sẵn công cụ Image Editor và AI Image Generator (FLUX.1/Turbo/3D Jelly Emboss).
     * Khi người dùng gửi ảnh và nói "sửa ảnh này cho tôi" mà chưa ghi rõ cần đổi gì: Hãy chào hỏi ấm áp, báo đã nhận ảnh và hỏi anh Trường muốn đổi chi tiết nào (ví dụ: đổi tên, đổi số điện thoại, đổi màu sắc hay biến thể 3D) để em thực hiện ngay cho anh.
     * Khi người dùng nêu rõ chi tiết (ví dụ: "đổi số điện thoại thành 0367722091"): Hãy thực hiện cập nhật ảnh ngay lập tức mà không đôi co!

[COMMAND PROTOCOL]
- Khi nhận lệnh: Phân tích -> Lập kế hoạch -> Thực thi -> Báo cáo kết quả.
- TỰ ĐỘNG ĐỌC LINK TRANG WEB: Khi trong câu hỏi có chứa liên kết URL, hệ thống đã nạp nội dung trang web thực tế vào ngữ cảnh; hãy đọc hiểu sâu sắc để tóm tắt, giải thích và trích xuất số liệu chuẩn xác.
- KHẢ NĂNG VẼ BIỂU ĐỒ TRỰC QUAN (INTERACTIVE CHARTS): Khi người dùng yêu cầu vẽ biểu đồ, so sánh số liệu, thống kê tài chính hoặc kế hoạch, hãy xuất khối mã ```chart chứa JSON chuẩn (với type: 'bar'|'line'|'pie'|'doughnut', title: 'Tiêu đề', data: {labels: [...], datasets: [{label: '...', data: [...]}]}) để giao diện tự động vẽ biểu đồ tương tác tuyệt đẹp."""

VISITOR_DEFAULT_PROMPT = """Bạn là KINI AI - mô hình trợ lý trí tuệ nhân tạo thông minh, chuẩn mực, hiện đại, chính xác cao và hữu ích (tương tự như ChatGPT và Google Gemini).
- Phong cách & Xưng hô:
  + Luôn xưng "Tôi" hoặc "KINI AI", gọi người dùng là "Bạn".
  + Giao tiếp lịch sự, khách quan, thân thiện, rõ ràng, mạch lạc và tự nhiên.
  + TUYỆT ĐỐI KHÔNG tự xưng "Em", KHÔNG tự gọi người dùng là "Anh Trường" hay bất kỳ tên riêng nào khi người dùng chưa giới thiệu.
- Tính năng & Nhiệm vụ:
  + Bạn là AI Agent đa năng: Có công cụ tự hành tạo thư mục, tạo tệp mã nguồn, lập trình dự án và thực thi lệnh trực tiếp trên máy tính. Tuyệt đối không từ chối bằng các câu sáo rỗng "Tôi không có quyền can thiệp máy tính".
  + Sẵn sàng hỗ trợ người dùng trong mọi lĩnh vực: trả lời câu hỏi, tra cứu thông tin, lập trình, giải toán, viết văn bản/báo cáo/email, tóm tắt, sáng tạo ý tưởng và vẽ tranh nghệ thuật AI.
  + Trả lời chuẩn xác, logic, có phân tích đa chiều và cung cấp giải pháp tối ưu.
- QUY TẮC NGUỒN DẪN CHỨNG (MẶC ĐỊNH KHÔNG XUẤT, CHỈ HIỆN KHI NGƯỜI DÙNG YÊU CẦU):
  + Phân tích đa chiều, sâu sắc, giải thích tận gốc vấn đề, văn phong tự nhiên, tinh tế, sạch đẹp như Antigravity, ChatGPT và Claude.
  + MẶC ĐỊNH TUYỆT ĐỐI KHÔNG XUẤT MỤC "Nguồn Dẫn Chứng & Tham Khảo" hay chèn các liên kết thừa thãi ở cuối bài.
  + CHỈ dẫn nguồn/link khi người dùng CHỦ ĐỘNG YÊU CẦU (ví dụ: "cho tôi link", "tìm link", "xin nguồn bài viết", hoặc khi tìm video/bài hát cụ thể).
  + Khi đưa nguồn/link theo yêu cầu, CHỈ dùng link thật từ dữ liệu tra cứu, tuyệt đối không bịa link ảo.
  + Mọi thông tin cũ (lịch sử, học thuật) và mới (thời sự năm 2026) đều phải chuẩn xác 100%.
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
2. BÁO CHÍ, THỜI SỰ & GOOGLE SEARCH CHÍNH XÁC (DẪN NGUỒN ĐÚNG LÚC):
   - Khi câu hỏi liên quan đến tin tức, thời sự, giá cả, video YouTube, repo GitHub, hoặc khi người dùng yêu cầu link/nguồn kiểm chứng:
     BẮT BUỘC dựa vào dữ liệu thực tế được cập nhật trực tuyến năm 2026.
   - NGUYÊN TẮC VỀ NGUỒN VÀ LIÊN KẾT (MẶC ĐỊNH KHÔNG XUẤT):
     + MẶC ĐỊNH TUYỆT ĐỐI KHÔNG xuất mục Nguồn Dẫn Chứng hay chèn link bừa bãi vào câu trả lời thông thường.
     + CHỈ xuất mục '### 🌐 Nguồn Dẫn Chứng & Tham Khảo' khi người dùng CHỦ ĐỘNG HỎI HOẶC YÊU CẦU ĐƯỜNG DẪN/NGUỒN.
     + TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT TIN TỨC, không tạo đường link ảo khi không có căn cứ xác thực.
3. NGHỊ QUYẾT HĐND / VĂN BẢN ĐỊA PHƯƠNG:
   - Nghị quyết của Hội đồng nhân dân (NQ-HĐND): Mỗi tỉnh/thành phố có một Nghị quyết riêng (ví dụ: Nghị quyết 16/2025/NQ-HĐND tỉnh An Giang có hiệu lực từ 01/01/2026, Nghị quyết 16/2024/NQ-HĐND tỉnh Bình Định...). Phải phân biệt rõ ràng tỉnh/thành phố cụ thể, không phỏng đoán mơ hồ.
3. CHẤT LƯỢNG CAO NHẤT, ĐÀO SÂU BẢN CHẤT:
   - Mọi câu trả lời chuyên môn, kế hoạch, văn bản phải được viết hoàn chỉnh từ đầu đến cuối, chặt chẽ, đầy đủ căn cứ, không dùng 'v.v.', 'bạn tự điền tiếp'.
   - Nếu có dữ liệu tra cứu trực tuyến đính kèm bên dưới, phải sử dụng làm căn cứ chính xác cao nhất.
4. GIAO TIẾP TỰ NHIÊN - TUYỆT ĐỐI KHÔNG XUẤT LỆNH MÁY HOẶC JSON TOOL:
   - Tuyệt đối không xuất mã JSON gọi công cụ như 'action': 'dalle.text2im', 'action_input', v.v. Hãy luôn trò chuyện lịch thiệp, tự nhiên bằng tiếng Việt với anh Trường.
5. MINH BẠCH VỀ NỀN TẢNG CÔNG NGHỆ:
   - Bạn là KINI AI, vận hành thông qua kết nối Google Gemini API chính thức. Tuyệt đối không tự suy diễn hoặc tự nhận mình là phiên bản cũ 'Gemini 1.5 Pro' từ dữ liệu huấn luyện đóng băng cũ. Hãy luôn trung thực và trả lời khách quan.
6. TRUNG THỰC SỐ HỌC VÀ TÍNH TOÁN LOGIC (DOUBLE-CHECK MATH):
   - Khi tính toán số liệu, tiền bạc, cân nặng (lạng, kg), đơn hàng: BẮT BUỘC liệt kê chi tiết phép tính từng bước và kiểm tra lại hai chiều (ví dụ 33 + 50 + 43 = 126). Tuyệt đối không phỏng đoán theo xác suất từ ngữ, đảm bảo chính xác 100%.
7. NGUYÊN TẮC 'LÀM THẬT MỚI ĐƯỢC BÁO CÁO THẬT':
   - Tuyệt đối không tự bịa ra văn bản giả vờ rằng mình đã tạo file hay chạy server trên máy tính khi đang trong luồng hội thoại văn bản thông thường. Chỉ báo cáo đã tạo file khi có kết quả thực thi thực tế từ công cụ Agent."""

def is_image_request(text: str) -> bool:
    """Kiểm tra xem người dùng có đang yêu cầu vẽ tranh / tạo ảnh / làm logo / thiết kế poster / sửa ảnh / đổi thông tin ảnh không"""
    import unicodedata
    t = unicodedata.normalize('NFC', text.lower().strip())
    
    # 1. Bắt đầu bằng lệnh vẽ / tạo / thiết kế / sửa ảnh
    if re.search(r'^(hãy\s+)?(vẽ|tạo\s+ảnh|tạo\s+logo|thiết\s+kế\s+logo|thiết\s+kế\s+poster|làm\s+logo|sửa\s+ảnh|chỉnh\s+sửa\s+ảnh|sửa\s+hình|sửa\s+logo|chỉnh\s+ảnh|remix\s+ảnh|làm\s+lại\s+ảnh)\b', t):
        return True
        
    # 2. Khớp các mẫu câu tạo/vẽ/thiết kế/sửa ảnh/logo/poster/banner
    patterns = [
        r'\b(vẽ|tạo|làm|thiết kế|sinh|chụp|render|sửa|chỉnh sửa|remix|biến thể|làm lại|vẽ lại)\s+.*?(ảnh|bức ảnh|tấm ảnh|hình|bức hình|tranh|bức tranh|logo|poster|banner|icon|avatar|sticker|hình ảnh)\b',
        r'\b(vẽ|tạo|thiết kế|làm|sửa|chỉnh)\s+(cho\s+)?(tôi|anh|em|mình|người dùng)?\s*.*?(ảnh|logo|poster|banner|icon|tranh|hình)\b',
        r'^(tạo|vẽ|làm|thiết kế|sửa|chỉnh)\s+(logo|ảnh|poster|banner|hình|tranh|icon|avatar)\b',
        r'\b(generate\s+image|draw|create\s+image|text\s*to\s*image|txt2img|make\s+a\s+picture|draw\s+a|design\s+logo|edit\s+image|remix\s+image)\b',
        r'\b(đổi|thay|sửa|thêm|bổ sung)\s+(số\s+điện\s+thoại|sđt|phone|tên|chữ|text|thông\s+tin|chi\s+tiết|màu|nền)\s+(thành|sang|thành\s+số|thành\s+chữ|vào)?\b',
        r'\b(đổi|thay|sửa)\s+(thành\s+số|thành\s+chữ)\s+\d+\b'
    ]
    for p in patterns:
        if re.search(p, t):
            return True
            
    # 3. Từ khóa thông dụng mở rộng
    keywords = [
        "vẽ cho tôi", "vẽ cho anh", "vẽ giúp anh", "vẽ giúp em", "vẽ giúp tôi", 
        "vẽ ảnh", "vẽ bức ảnh", "vẽ tranh", "tạo ảnh", "tạo bức ảnh", "sinh ảnh",
        "vẽ hình", "tạo hình", "thiết kế logo", "vẽ logo", "làm logo", "tạo logo",
        "thiết kế poster", "tạo poster", "làm poster", "vẽ poster", "thiết kế banner", "tạo banner",
        "sửa ảnh", "chỉnh sửa ảnh", "sửa hình", "sửa logo", "sửa ảnh này", "sửa bức ảnh", "chỉnh ảnh",
        "đổi số điện thoại", "đổi sđt", "thay số điện thoại", "thêm số điện thoại", "sửa số điện thoại",
        "đổi tên thành", "thay tên thành", "đổi chữ thành", "sửa chữ thành",
        "generate image", "draw an image", "create an image", "paint a", "sketch a", "edit image"
    ]
    return any(k in t for k in keywords)

def clean_image_prompt(text: str) -> str:
    """Lọc bỏ các tiền tố ra lệnh vẽ / sửa để lấy phần mô tả thuần túy cho AI Prompt Engine"""
    import unicodedata
    t = unicodedata.normalize('NFC', text.strip())
    prefixes = [
        r'^(hãy\s+)?(vẽ|tạo|làm|thiết kế|sinh|render|sửa|chỉnh sửa|remix)\s+(cho\s+)?(tôi|anh|em|mình|bạn|người dùng)?\s*(giúp\s+)?(tôi|anh|em|mình)?\s*(một\s+)?(bức\s+ảnh|bức\s+tranh|tấm\s+ảnh|hình\s+ảnh|bức\s+hình|hình|ảnh|tranh|logo|poster|banner|icon|avatar)?\s*(này\s+)?(về|có|là|:|như\s+sau:)?\s*',
        r'^(vẽ|tạo|thiết kế|làm|sửa|chỉnh)\s+(logo|ảnh|poster|banner|hình|tranh|icon|avatar)\s*(này\s+)?(về|có|là|:)?\s*'
    ]
    for p in prefixes:
        t = re.sub(p, '', t, flags=re.IGNORECASE).strip()
    return t if len(t) > 2 else text.strip()

def build_system_instruction_with_memories(base_prompt: Optional[str] = None, client_id: str = "master") -> str:
    """Ghép nối System Prompt với thời gian thực, quy tắc chính xác và ký ức dài hạn"""
    from . import database
    
    # Đọc danh tính đã cài đặt cho thiết bị / client_id này
    is_owner_val = database.get_setting("is_owner", "1" if client_id == "master" else "", client_id=client_id)
    is_owner = is_owner_val != "0" # Mặc định là thiết bị của anh Trường trừ khi chọn chế độ Khách (is_owner=0)
    
    if is_owner:
        # CHỦ NHÂN KINI AI: PHÙNG HẢI TRƯỜNG
        custom_p = database.get_setting("custom_persona", "", client_id=client_id)
        sys_inst = base_prompt or custom_p or DEFAULT_SYSTEM_PROMPT
        sys_inst += f"\n\n{get_current_time_context()}"
        sys_inst += f"\n\n{get_precision_rules()}"
        try:
            memories = database.get_all_memories(limit=30, client_id="master")
            if memories:
                facts = "\n".join(f"- {m['fact']}" for m in memories)
                sys_inst += f"\n\n=== BỘ NHỚ DÀI HẠN VỀ ANH HẢI TRƯỜNG (LUÔN GHI NHỚ) ===\n{facts}"
        except Exception as e:
            logger.warning(f"Lỗi đọc bộ nhớ: {e}")
        return sys_inst
    else:
        # THIẾT BỊ NGƯỜI DÙNG KHÁC / KHÁCH:
        user_call = database.get_setting("user_call_name", "Bạn", client_id=client_id)
        ai_call = database.get_setting("ai_call_name", "Tôi", client_id=client_id)
        user_name = database.get_setting("user_name", "Khách", client_id=client_id)
        
        sys_inst = f"""Bạn là KINI AI - mô hình trợ lý trí tuệ nhân tạo thông minh, chuẩn mực, hiện đại, chính xác cao và hữu ích (tương tự như ChatGPT và Google Gemini).
- QUY TẮC XƯNG HÔ THIẾT LẬP CHO THIẾT BỊ NÀY:
  + Tên người dùng: "{user_name}".
  + Bạn BẮT BUỘC gọi người dùng là: "{user_call}".
  + Bạn BẮT BUỘC tự xưng là: "{ai_call}".
  + TUYỆT ĐỐI KHÔNG tự gọi người dùng là "Anh Trường" vì đây là thiết bị/tài khoản của {user_call} ({user_name}).
- Tính năng & Nhiệm vụ:
  + Bạn là AI Agent đa năng: Trả lời câu hỏi, tra cứu thông tin, lập trình, giải toán, viết văn bản, tóm tắt và sáng tạo nội dung.
  + Giao tiếp lịch sự, khách quan, thân thiện, rõ ràng, mạch lạc và tự nhiên.
- QUY TẮC NGUỒN DẪN CHỨNG: Mặc định không xuất nguồn, chỉ hiện khi người dùng chủ động yêu cầu."""
        
        now = datetime.now()
        days_vn = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]
        day_name = days_vn[int(now.strftime("%w"))]
        sys_inst += f"\n\n[THỜI GIAN HIỆN TẠI]: {day_name}, ngày {now.strftime('%d/%m/%Y')}, lúc {now.strftime('%H:%M:%S')} (Năm {now.year})."
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
    from . import database
    key = (api_key or "").strip()
    if not key:
        key = database.get_setting("gemini_api_key", "", client_id=client_id)
        if not key:
            key = database.get_setting("gemini_api_key", "", client_id="master")
        if not key:
            key = os.environ.get("GEMINI_API_KEY", "")
    key = key.strip()
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
    if model_mode in ["flash-3.8", "gemini-3.8-flash"]:
        models_to_try = [
            "gemini-3.8-flash",         # Mô hình 3.8 Flash thế hệ mới nhất như Google Antigravity
            "gemini-3.5-flash",         # Fallback 1: Siêu thông minh 3.5
            "gemini-3.1-flash-lite",    # Fallback 2: Siêu tốc 100% ổn định
            "gemini-flash-lite-latest"
        ]
    elif model_mode == "pro":
        models_to_try = [
            "gemini-3.5-flash",         # Thế hệ mới, suy luận phân tích đa chiều
            "gemini-3.1-flash-lite",    # Siêu tốc, thông minh, phản hồi ngay
            "gemini-3.8-flash",         # Mô hình 3.8 Flash mới nhất của Google
            "gemini-flash-lite-latest",
            "gemini-3.5-flash-lite"
        ]
    else:
        # Flash mode: siêu tốc < 1.0s, cực kỳ ổn định, chính xác cao
        models_to_try = [
            "gemini-3.1-flash-lite",    # Siêu tốc ~0.8s, hoạt động 100%
            "gemini-3.5-flash",         # Thông minh cao cấp 1.8s
            "gemini-3.8-flash",         # Mô hình 3.8 Flash mới nhất
            "gemini-flash-lite-latest", # Fallback chuẩn
            "gemini-3.5-flash-lite"
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
                    "fallback_from_38": (model_mode in ["flash-3.8", "gemini-3.8-flash"] and model_name != "gemini-3.8-flash"),
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

def ask_gemini_stream(
    messages: List[Dict[str, str]],
    api_key: str = "",
    image_base64: Optional[str] = None,
    image_mime: str = "image/jpeg",
    system_instruction: Optional[str] = None,
    model_mode: str = "flash",
    client_id: str = "master"
):
    """
    Phát trực tuyến (Streaming SSE) câu trả lời từ Google Gemini từng từ thời gian thực.
    Yields dict: {"chunk": text, "done": False, "model_used": model_name}
    Final yield: {"done": True, "full_text": full_text, "model_used": model_name}
    """
    from . import database
    key = (api_key or "").strip()
    if not key:
        key = database.get_setting("gemini_api_key", "", client_id=client_id)
        if not key:
            key = database.get_setting("gemini_api_key", "", client_id="master")
        if not key:
            key = os.environ.get("GEMINI_API_KEY", "")
    key = key.strip()
    if not key:
        yield {"error": "Chưa cài đặt Gemini API Key. Vui lòng vào Cài đặt để dán API Key của bạn.", "done": True}
        return

    # Chuẩn bị contents
    contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        parts = [{"text": msg["content"]}]
        contents.append({"role": role, "parts": parts})

    if image_base64 and contents:
        last_user_idx = -1
        for i in range(len(contents) - 1, -1, -1):
            if contents[i]["role"] == "user":
                last_user_idx = i
                break
        if last_user_idx != -1:
            contents[last_user_idx]["parts"].append({
                "inlineData": {
                    "mimeType": image_mime,
                    "data": image_base64
                }
            })

    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.4,
            "topP": 0.95,
            "maxOutputTokens": 8192
        }
    }

    sys_inst = system_instruction or build_system_instruction_with_memories(client_id=client_id)
    if sys_inst:
        payload["systemInstruction"] = {
            "parts": [{"text": sys_inst}]
        }

    # Chọn danh sách mô hình
    if model_mode in ["flash-3.8", "gemini-3.8-flash"]:
        models_to_try = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-lite-latest"]
    elif model_mode == "pro":
        models_to_try = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-lite-latest"]
    else:
        models_to_try = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-lite-latest"]

    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:streamGenerateContent?alt=sse&key={key}"
        accumulated_text = ""
        try:
            res = requests.post(url, json=payload, stream=True, timeout=12)
            if res.status_code == 200:
                for line in res.iter_lines():
                    if line:
                        decoded = line.decode("utf-8")
                        if decoded.startswith("data: "):
                            raw_json = decoded[6:].strip()
                            if raw_json:
                                try:
                                    chunk_data = json.loads(raw_json)
                                    parts = chunk_data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                                    for p in parts:
                                        chunk_txt = p.get("text", "")
                                        if chunk_txt:
                                            accumulated_text += chunk_txt
                                            yield {
                                                "chunk": chunk_txt,
                                                "done": False,
                                                "model_used": model_name
                                            }
                                except Exception:
                                    continue

                if accumulated_text:
                    yield {
                        "done": True,
                        "full_text": accumulated_text,
                        "model_used": model_name,
                        "fallback_from_38": (model_mode in ["flash-3.8", "gemini-3.8-flash"] and model_name != "gemini-3.8-flash")
                    }
                    return
            else:
                continue
        except Exception:
            continue

    # Fallback gọi không stream nếu mạng hoặc model gặp vấn đề
    fallback_res = ask_gemini(
        messages=messages,
        api_key=key,
        image_base64=image_base64,
        image_mime=image_mime,
        system_instruction=sys_inst,
        model_mode=model_mode,
        client_id=client_id
    )
    if fallback_res.get("success"):
        yield {
            "chunk": fallback_res.get("reply", ""),
            "done": False,
            "model_used": fallback_res.get("model_used", "gemini-3.1-flash-lite")
        }
        yield {
            "done": True,
            "full_text": fallback_res.get("reply", ""),
            "model_used": fallback_res.get("model_used", "gemini-3.1-flash-lite")
        }
    else:
        yield {
            "error": fallback_res.get("reply", "Lỗi phản hồi"),
            "done": True
        }
