# Hướng Dẫn Đưa KINI AI Lên Render.com Chạy 24/7 (Miễn Phí & Không Ngủ)

## Bước 1: Đưa mã nguồn lên GitHub
1. Tạo 1 repository trên GitHub (ví dụ `kini-ai`).
2. Đẩy toàn bộ mã nguồn trong `H:\KINI_AI` lên nhánh `main` (chú ý `.gitignore` đã loại trừ `kini_ai.db` để không lộ dữ liệu riêng).

## Bước 2: Deploy lên Render.com (750 giờ/tháng miễn phí)
1. Đăng nhập [render.com](https://render.com) bằng tài khoản GitHub.
2. Chọn **New +** → **Blueprint** (hoặc **Web Service**) → chọn repository `kini-ai`.
3. Render sẽ tự đọc file `render.yaml`:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python -m uvicorn backend.app:app --host 0.0.0.0 --port $PORT`
   - Health Check Path: `/api/ping`
4. Trong mục **Environment Variables** của Render, thêm `GEMINI_API_KEY` (hoặc nhập trực tiếp trong giao diện `⚙️ Cài Đặt` sau khi mở web).
5. Bấm **Create Web Service** và chờ ~2 phút để nhận đường link cố định dạng `https://kini-ai.onrender.com`.

## Bước 3: Giữ Web Thức Liên Tục 24/7 (Chống ngủ sau 15 phút)
1. Đăng ký tài khoản miễn phí tại [uptimerobot.com](https://uptimerobot.com) (hoặc [cron-job.org](https://cron-job.org)).
2. Tạo 1 Monitor mới loại **HTTP(s)**:
   - URL: `https://<ten-app-cua-anh>.onrender.com/api/ping`
   - Khoảng thời gian (Monitoring Interval): **10 phút** (hoặc 14 phút).
3. Lưu lại → Render sẽ luôn nhận tín hiệu ping đều đặn nên **không bao giờ rơi vào trạng thái ngủ**, chạy 24/24 kể cả khi anh tắt máy tính ở nhà!

> **Lưu ý**: Mỗi tài khoản Render Free nên chỉ chạy **duy nhất 1 web** (31 ngày × 24h = 744h < 750h miễn phí/tháng).
