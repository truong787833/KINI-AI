import os
import sys
import time
import subprocess
import re
import signal

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TOOLS_DIR = os.path.join(BASE_DIR, "tools")
CLOUDFLARED_EXE = os.path.join(TOOLS_DIR, "cloudflared.exe")
LOG_DIR = BASE_DIR
CLOUDFLARE_LOG = os.path.join(LOG_DIR, "cloudflared.log")
SERVICE_LOG = os.path.join(LOG_DIR, "service_24_7.log")
ACTIVE_URL_FILE = os.path.join(LOG_DIR, "active_online_url.txt")

def log(msg):
    t = time.strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{t}] {msg}"
    print(formatted)
    try:
        with open(SERVICE_LOG, "a", encoding="utf-8") as f:
            f.write(formatted + "\n")
    except Exception:
        pass

def extract_tunnel_url():
    if not os.path.exists(CLOUDFLARE_LOG):
        return None
    try:
        with open(CLOUDFLARE_LOG, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        urls = re.findall(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", content)
        if urls:
            return urls[-1]
    except Exception as e:
        log(f"Lỗi đọc cloudflared log: {e}")
    return None

def start_backend():
    log("Đang khởi động Backend KINI AI (FastAPI / Uvicorn)...")
    env = os.environ.copy()
    env["PORT"] = "8000"  # Chống tự động mở popup trình duyệt
    proc = subprocess.Popen(
        [sys.executable, os.path.join(BASE_DIR, "run.py")],
        cwd=BASE_DIR,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    )
    log(f"Backend PID: {proc.pid}")
    return proc

def start_cloudflared():
    log("Đang khởi động Cloudflare Tunnel...")
    # Xóa log cũ để nhận URL mới nhất
    if os.path.exists(CLOUDFLARE_LOG):
        try:
            os.remove(CLOUDFLARE_LOG)
        except Exception:
            pass

    token_file = os.path.join(BASE_DIR, "cloudflare_token.txt")
    custom_token = ""
    if os.path.exists(token_file):
        try:
            with open(token_file, "r", encoding="utf-8") as f:
                custom_token = f.read().strip()
        except Exception:
            pass

    if custom_token:
        log("Đang vận hành Cloudflare Tunnel Cố Định Vĩnh Viễn (Named Tunnel với Token)...")
        cmd = [
            CLOUDFLARED_EXE,
            "tunnel",
            "run",
            "--token", custom_token,
            "--logfile", CLOUDFLARE_LOG,
            "--loglevel", "info"
        ]
    else:
        cmd = [
            CLOUDFLARED_EXE,
            "tunnel",
            "--url", "http://127.0.0.1:8000",
            "--logfile", CLOUDFLARE_LOG,
            "--loglevel", "info"
        ]
    proc = subprocess.Popen(
        cmd,
        cwd=BASE_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    )
    log(f"Cloudflare Tunnel PID: {proc.pid}")
    return proc

def main():
    log("==================================================")
    log("  KINI AI - DỊCH VỤ GIÁM SÁT & DUY TRÌ 24/24")
    log("==================================================")

    backend_proc = start_backend()
    time.sleep(2)
    tunnel_proc = start_cloudflared()

    current_url = None

    def cleanup(signum, frame):
        log("Nhận tín hiệu dừng dịch vụ. Đang dọn dẹp tiến trình con...")
        try:
            if backend_proc and backend_proc.poll() is None:
                backend_proc.terminate()
            if tunnel_proc and tunnel_proc.poll() is None:
                tunnel_proc.terminate()
        except Exception:
            pass
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    check_count = 0
    while True:
        try:
            time.sleep(3)
            check_count += 1

            # 1. Kiểm tra Backend
            if backend_proc.poll() is not None:
                log(f"[CẢNH BÁO] Backend bị dừng (Code: {backend_proc.returncode}). Đang tự động khởi động lại...")
                backend_proc = start_backend()

            # 2. Kiểm tra Cloudflared
            if tunnel_proc.poll() is not None:
                log(f"[CẢNH BÁO] Cloudflared bị dừng (Code: {tunnel_proc.returncode}). Đang tự động khởi động lại...")
                tunnel_proc = start_cloudflared()

            # 3. Lấy URL đường dẫn trực tuyến
            new_url = extract_tunnel_url()
            if new_url and new_url != current_url:
                current_url = new_url
                log(f"[THÀNH CÔNG] ĐƯỜNG DẪN ONLINE 24/24 MỚI: {current_url}")
                try:
                    with open(ACTIVE_URL_FILE, "w", encoding="utf-8") as f:
                        f.write(f"{current_url}\nCập nhật lúc: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                except Exception:
                    pass

        except Exception as e:
            log(f"Lỗi trong vòng lặp giám sát: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
