import sys
import os
import webbrowser
import threading
import time
import uvicorn

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

def open_browser(url, delay=1.5):
    time.sleep(delay)
    print(f"\n[*] Đang tự động mở trình duyệt tới: {url}")
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"[!] Không thể tự mở trình duyệt: {e}")

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 8000))
    HOST = "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1"
    URL = f"http://{HOST}:{PORT}" if HOST != "0.0.0.0" else f"http://127.0.0.1:{PORT}"

    print("=" * 65)
    print("   KINI AI - Siêu Trợ Lý Thông Minh & Studio Sáng Tạo Ảnh")
    print("   Phát triển bởi: Phùng Hải Trường")
    print("=" * 65)
    print(f"[*] Máy chủ Web đang khởi động tại: {URL}")
    print("[*] Nhấn Ctrl + C để dừng máy chủ bất kỳ lúc nào.\n")

    # Mở trình duyệt khi chạy local
    if not os.environ.get("PORT"):
        threading.Thread(target=open_browser, args=(URL,), daemon=True).start()

    from backend.app import app
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
