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
  - Khởi tạo cấu trúc thư mục, khởi tạo `PROJECT_MEMORY.md`.

---

## 4. Danh Sách Tính Năng Hoàn Thành & Đang Hoạt Động Ổn Định
- [ ] KINI Chatbot (Google Gemini API).
- [ ] KINI Image Studio (Tạo ảnh từ tiếng Việt).
- [ ] Quản lý lịch sử hội thoại & Thư viện ảnh cá nhân.
- [ ] Giao diện Web App chuẩn Mobile (PWA).
- [ ] Sẵn sàng Deploy lên Render.com.
