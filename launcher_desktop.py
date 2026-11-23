"""
KINI AI - Native Desktop Application Launcher (Bộ Chạy Desktop Windows)
Phát triển bởi: Phùng Hải Trường
Chức năng:
1. Tự động kiểm tra và khởi chạy KINI AI Server nếu chưa chạy.
2. Mở KINI AI trong cửa sổ Desktop độc lập (Native Window App Mode) không thanh địa chỉ, không tabs.
3. Hỗ trợ cập nhật OTA siêu tốc: Khi có bản vá OTA mới, chỉ cần tải về mà không cần build lại EXE!
"""

import os
import sys
import time
import subprocess
import urllib.request
import urllib.error
import webbrowser

def get_app_dir():
    """Xác định thư mục gốc của KINI AI dù chạy dưới dạng script hay file EXE đóng gói"""
    if getattr(sys, 'frozen', False):
        exe_dir = os.path.dirname(sys.executable)
        # Nếu file exe nằm ở dist_release hoặc thư mục con, tìm thư mục cha có backend/static
        if os.path.exists(os.path.join(exe_dir, "backend")) and os.path.exists(os.path.join(exe_dir, "static")):
            return exe_dir
        parent_dir = os.path.dirname(exe_dir)
        if os.path.exists(os.path.join(parent_dir, "backend")) and os.path.exists(os.path.join(parent_dir, "static")):
            return parent_dir
        # Mặc định ổ H:\KINI_AI nếu có
        if os.path.exists(r"H:\KINI_AI\backend"):
            return r"H:\KINI_AI"
        return exe_dir
    else:
        return os.path.dirname(os.path.abspath(__file__))

APP_DIR = get_app_dir()
SERVER_URL = "http://127.0.0.1:8000"


def is_server_running(timeout=1.0) -> bool:
    """Kiểm tra xem máy chủ KINI AI đã hoạt động hay chưa"""
    try:
        req = urllib.request.Request(f"{SERVER_URL}/api/system/version")
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status == 200
    except Exception:
        return False


def start_backend_server():
    """Khởi động máy chủ backend KINI AI ngầm nếu chưa chạy"""
    if is_server_running():
        return None

    run_script = os.path.join(APP_DIR, "run.py")
    if not os.path.exists(run_script):
        print(f"[!] Không tìm thấy run.py tại {APP_DIR}")
        return None

    # Tìm Python executable phù hợp
    py_exe = sys.executable if not getattr(sys, 'frozen', False) else "python"
    
    print("[*] Đang khởi động KINI AI Engine ngầm...")
    # Khởi chạy ngầm không hiện cửa sổ console đen khó chịu
    creationflags = 0
    if sys.platform == "win32":
        creationflags = subprocess.CREATE_NO_WINDOW

    proc = subprocess.Popen(
        [py_exe, run_script],
        cwd=APP_DIR,
        creationflags=creationflags,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    # Chờ tối đa 10 giây để máy chủ sẵn sàng
    for _ in range(20):
        time.sleep(0.5)
        if is_server_running():
            print("[+] KINI AI Engine đã sẵn sàng!")
            return proc

    return proc


def find_browser_app_runner():
    """Tìm đường dẫn Edge hoặc Chrome để chạy chế độ App Mode Native"""
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe")
    ]
    for p in edge_paths:
        if os.path.exists(p):
            return p, "edge"

    chrome_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe")
    ]
    for p in chrome_paths:
        if os.path.exists(p):
            return p, "chrome"

    return None, "fallback"


def launch_desktop_window():
    """Mở giao diện KINI AI ở chế độ Native Desktop Window cao cấp"""
    runner_path, runner_type = find_browser_app_runner()
    user_data_dir = os.path.expandvars(r"%LOCALAPPDATA%\KINI_AI_Desktop\UserProfile")
    os.makedirs(user_data_dir, exist_ok=True)

    if runner_path:
        cmd = [
            runner_path,
            f"--app={SERVER_URL}",
            f"--user-data-dir={user_data_dir}",
            "--window-size=1440,900",
            "--window-name=KINI AI",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-features=Translate",
            "--disable-save-password-bubble"
        ]
        try:
            print(f"[*] Đang mở KINI AI Desktop App ({runner_type})...")
            p = subprocess.Popen(cmd)
            p.wait()
            return
        except Exception as e:
            print(f"[!] Lỗi khi mở App Mode: {e}")

    # Fallback nếu không có Edge/Chrome
    print("[*] Mở trên trình duyệt mặc định...")
    webbrowser.open(SERVER_URL)


def main():
    print("=" * 60)
    print("   KINI AI - NATIVE DESKTOP STUDIO")
    print("   Phát triển bởi: Phùng Hải Trường")
    print("=" * 60)

    # 1. Khởi chạy backend nếu chưa chạy
    start_backend_server()

    # 2. Mở Desktop Window
    launch_desktop_window()


if __name__ == "__main__":
    main()
