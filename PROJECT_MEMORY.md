# PROJECT MEMORY - KINI AI (Next-Gen Multi-Modal AI Assistant & Image Studio)

## 1. Thông Tin & Mục Tiêu Dự Án
- **Tên dự án**: KINI AI (Trợ lý AI Đa Năng & Xưởng Sáng Tạo Ảnh Nghệ Thuật)
- **Thư mục dự án**: `H:\KINI_AI`
- **Chủ sở hữu / Tác giả**: Phùng Hải Trường (`truong787833`)
- **Mục tiêu**:
  1. **KINI Chat (Bộ Não Trí Tuệ Nhân Tạo)**:
     - Tích hợp mô hình Google Gemini AI thế hệ mới (Gemini 2.0 Flash / 1.5 Flash).
     - Trò chuyện thông minh, hiểu tiếng Việt sâu sắc, tham mưu ý tưởng, viết báo cáo văn bản, giải thích tài liệu.
     - Tùy biến tính cách và phong cách xưng hô theo ý người dùng.
  2. **KINI Studio (Xưởng Tạo Ảnh Nghệ Thuật AI)**:
     - Tạo ảnh nghệ thuật chất lượng cao từ mô tả tiếng Việt (Text-to-Image).
     - Đa dạng phong cách: 3D Render, Điện ảnh (Cinematic), Anime, Tranh sơn dầu, Cyberpunk, Hiện thực (Photorealistic).
     - Nút tải ảnh HD về máy tính / điện thoại với 1 chạm.
  3. **KINI Vision (Thị Giác & Phân Tích Ảnh)**:
     - Tải ảnh lên để AI phân tích nội dung, nhận diện vật thể, trích xuất chữ và giải đáp thắc mắc từ hình ảnh.
  4. **Kiến Trúc Web App Độc Lập Chuẩn Mobile (PWA)**:
     - Chạy mượt mà trên cả Máy tính lẫn Điện thoại.
     - Hỗ trợ PWA "Thêm vào màn hình chính" (Add to Home Screen) để mở toàn màn hình như một App APK thực thụ.
     - Sẵn sàng triển khai lên Cloud (Render.com) để truy cập mọi lúc mọi nơi 24/7.

---

## 2. Kiến Trúc Hệ Thống & Cấu Trúc Thư Mục
- **Backend**: Python 3 (FastAPI + Uvicorn + SQLite + Google GenAI / Gemini API + AI Image Engine)
- **Frontend**: HTML5, Modern CSS (Glassmorphism, Neon Cyberpunk Accent, Responsive Mobile-First), Vanilla JS (PWA, Streaming/Fetch, Image Gallery).
- **Cấu trúc thư mục**:
  ```text
  H:\KINI_AI\
  ├── backend/
  │   ├── app.py                # FastAPI Server & API Endpoints
  │   ├── database.py           # SQLite quản lý lịch sử chat và ảnh đã tạo
  │   ├── gemini_client.py      # Tương tác Google Gemini API (Chat & Vision)
  │   └── image_generator.py    # Engine tạo ảnh nghệ thuật AI độ nét cao
  ├── static/
  │   ├── index.html            # Giao diện Web App chuẩn Mobile
  │   ├── style.css             # Thiết kế hiện đại KINI AI
  │   ├── app.js                # Xử lý tương tác, chat, tạo ảnh
  │   └── manifest.json         # Cấu hình PWA cài đặt lên màn hình điện thoại
  ├── generated_images/         # Thư mục lưu trữ các tác phẩm ảnh do AI vẽ
  ├── PROJECT_MEMORY.md         # Bộ nhớ dự án xuyên suốt (Bắt buộc)
  ├── requirements.txt          # Danh sách thư viện Python
  ├── run.py                    # Khởi động ứng dụng nội bộ
  └── start.bat                 # File click đúp chạy nhanh
  ```

---

## 3. Nhật Ký Quyết Định & Các Mốc Phát Triển
- **2026-11-20**:
  - Người dùng quyết định chọn tên thương hiệu: **KINI AI**.
  - Yêu cầu đặt dự án tại ổ đĩa: `H:\KINI_AI`.
  - Yêu cầu trọng tâm: Tích hợp khả năng **Tạo Ảnh AI (Image Generation)** bên cạnh tính năng Chatbot thông minh.
  - Khởi tạo toàn bộ cấu trúc mã nguồn:
    + Backend FastAPI (`backend/app.py`, `backend/database.py`, `backend/gemini_client.py`, `backend/image_generator.py`).
    + Frontend Web App chuẩn Mobile PWA (`static/index.html`, `static/style.css`, `static/app.js`, `static/manifest.json`, icon app).
    + Script chạy tự động `run.py` và `start.bat`.
    + Đã kiểm thử thành công tạo ảnh mẫu bằng AI Image Engine với tốc độ ~7 giây/ảnh.
- **2026-11-20 (Khắc phục kết nối Gemini API)**:
  - **Hiện tượng**: Người dùng nhập API Key nhưng khi chat báo lỗi `❌ Không thể kết nối với dịch vụ Gemini...`.
  - **Nguyên nhân**: Phía Google Gemini API đã ngưng hỗ trợ định danh model cũ (`gemini-2.0-flash` và `gemini-1.5-flash` trả về lỗi 404 từ máy chủ Google v1beta).
  - **Xử lý**: Cập nhật `backend/gemini_client.py` chuyển sang danh sách model Gemini Flash thế hệ mới nhất (`gemini-3.1-flash-lite`, `gemini-flash-lite-latest`, `gemini-3-flash-preview`), lưu cố định API Key vào SQLite database và cải tiến cơ chế báo lỗi chi tiết.
  - **Kiểm thử**: Đã gọi thử nghiệm HTTP endpoint `/api/chat` thành công 100%, phản hồi thông minh trong vòng 2 giây ("Chào anh Trường! Em là KINI AI...").

- **2026-11-20 (Thu thập bộ yêu cầu Đột Phá - Chuẩn Gemini / ChatGPT)**:
  - **Người dùng phản hồi thực tế**:
    1. *Giao diện*: Phải sang trọng, tối giản, tinh tế như Google Gemini gốc (Ảnh đính kèm: dòng chữ *"Chúng ta nên bắt đầu từ đâu nhỉ?"*, thanh nhập liệu hình viên thuốc ở giữa màn hình có nút `+`, chọn Model, Micro, nút Cuộc trò chuyện/Nhiệm vụ).
    2. *Tạo ảnh*: Tạo ảnh hiện tại chưa thông minh (gõ *"Logo KINI AI..."* lại vẽ ra cô gái cyberpunk). Cần dùng chính bộ não Gemini để dịch và tối ưu prompt tiếng Anh chuyên sâu về chữ viết/typography/chi tiết trước khi vẽ, và cho phép vẽ trực tiếp ngay trong ô chat như Gemini.
    3. *Tạo giọng đọc (Text-to-Speech)*: Chuyển văn bản thành giọng đọc truyền cảm tự nhiên.
    4. *Tạo Video AI*: Tạo video hoạt cảnh ngắn từ mô tả văn bản hoặc từ hình ảnh.
    5. *Tải lên Mọi loại File, Thư mục, Ảnh*: Cho phép tải bất kỳ tệp tài liệu (PDF, Word, Excel, Code, Thư mục) để KINI học hỏi, phân tích và chỉnh sửa.
  - **QUY TẮC BẮT BUỘC**: Tiếp tục lưu vào bộ nhớ, KHÔNG tự ý sửa code lúc này. Chỉ bắt tay triển khai khi người dùng nói lệnh *"làm ngay"*.

---

## 4. Danh Sách Tính Năng Hoàn Thành & Đang Hoạt Động Ổn Định
- [x] **KINI Chatbot (Google Gemini API)**: Đầy đủ tính năng Chat thông minh, ngữ cảnh hội thoại đa lượt, phân tích ảnh đính kèm (Vision).
- [x] **KINI Image Studio**: Tạo ảnh nghệ thuật từ mô tả tiếng Việt (6 phong cách: Hiện thực 8K, 3D Pixar, Điện ảnh Cinematic, Anime, Cyberpunk, Sơn dầu), chọn tỉ lệ ảnh (Vuông, Dọc, Ngang).
- [x] **KINI Gallery**: Quản lý bộ sưu tập ảnh đã vẽ, xem phóng to (Lightbox), tải ảnh HD về máy với 1 chạm.
- [x] **Cài đặt & Cá nhân hóa**: Lưu API Key Gemini, điều chỉnh nhiệt độ sáng tạo (Temperature), tùy biến Persona (phong cách xưng hô của trợ lý).
- [x] **Giao diện Web App Mobile-First (PWA)**: Thanh điều hướng đáy (Bottom Navigation) trên điện thoại, Sidebar trên máy tính, cài đặt trực tiếp vào màn hình chính điện thoại.
- [x] **File Khởi Chạy Nhanh (`start.bat`)**: Chỉ cần bấm đúp là tự cài thư viện và mở web app trên trình duyệt.
- [x] **Sẵn sàng Deploy lên Render.com**: Hỗ trợ nhận biến môi trường `PORT` tự động khi đẩy lên cloud.

---

## 5. Danh Sách Tính Năng Cần Nâng Cấp Đồng Bộ (Chờ Lệnh "làm ngay")
- [ ] 🎨 **Tái Thiết Kế Giao Diện Chuẩn Google Gemini**:
  - Giao diện tối giản sang trọng, câu chào *"Chúng ta nên bắt đầu từ đâu nhỉ?"* ở giữa màn hình.
  - Thanh nhập lệnh dạng viên thuốc (Pill Bar) trung tâm với nút `+` (Tải lên file/ảnh), chọn Model (Flash / Pro), Micro thu âm giọng nói, nút gửi.
  - Hỗ trợ trò chuyện và ra lệnh tạo ảnh/tạo video/đọc file trực tiếp ngay trong cùng 1 khung chat (Unified Chat Canvas).
- [ ] 🧠 **Bộ Não Tối Ưu Hóa Tạo Ảnh & Logo Thông Minh**:
  - Dùng chính Gemini AI làm cầu nối: Tự động dịch mô tả tiếng Việt, nhận diện yêu cầu thiết kế logo/chữ viết, viết lại Prompt tiếng Anh chuyên sâu cho bộ tạo ảnh (giải quyết triệt để lỗi gõ "Logo KINI AI" ra "cô gái cyberpunk").
  - Tích hợp vẽ ảnh trực tiếp ngay khi chat (ví dụ gõ: *"Vẽ cho tôi logo KINI 3D neon"* -> AI vẽ và gửi ảnh trả lời ngay trong dòng chat).
- [ ] 🎙️ **Tạo Giọng Đọc Văn Bản (Text-to-Speech) & Thu Âm Giọng Nói (Speech-to-Text)**:
  - Cho phép KINI đọc câu trả lời bằng giọng nói tiếng Việt tự nhiên.
  - Nút chuyển văn bản bất kỳ thành file âm thanh để tải về máy.
- [ ] 🎬 **Tạo Video AI Ngắn (Text-to-Video & Image-to-Video)**:
  - Tích hợp Engine tạo video ngắn từ câu lệnh văn bản hoặc làm ảnh chuyển động.
- [ ] 📂 **Tải Lên Bất Kỳ File, Thư Mục, Tệp, Ảnh Để Học Hỏi & Chỉnh Sửa**:
  - Hỗ trợ tải lên file tài liệu (PDF, Word, Excel, CSV, TXT, Code, ảnh chụp tài liệu).
  - KINI đọc hiểu, tóm tắt, học kiến thức mới và chỉnh sửa văn bản theo yêu cầu rồi xuất file tải về máy.
- [ ] 💾 **Hệ Thống Siêu Bộ Nhớ Dài Hạn (Persistent Long-term Memory)**:
  - Luôn ghi nhớ thông tin về anh Trường xuyên suốt các phiên làm việc.
  - Mục xem và quản lý bộ nhớ trong Cài Đặt.
