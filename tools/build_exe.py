"""
KINI AI - Desktop EXE Compiler Script
Sử dụng PyInstaller đóng gói launcher_desktop.py thành KINI_AI.exe
"""

import os
import sys
import shutil
import subprocess

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAUNCHER_SCRIPT = os.path.join(ROOT_DIR, "launcher_desktop.py")
ICON_PATH = os.path.join(ROOT_DIR, "static", "app_icon.ico")
DIST_DIR = os.path.join(ROOT_DIR, "dist_release")
BUILD_DIR = os.path.join(ROOT_DIR, "build_temp")

def build_exe():
    print("=" * 65)
    print("   BẮT ĐẦU ĐÓNG GÓI NATIVE DESKTOP EXE: KINI_AI.exe")
    print("   Phát triển bởi: Phùng Hải Trường")
    print("=" * 65)

    os.makedirs(DIST_DIR, exist_ok=True)
    os.makedirs(BUILD_DIR, exist_ok=True)

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--name=KINI_AI",
        "--onefile",
        "--windowed", # Chạy không hiện cửa sổ command prompt đen
        f"--icon={ICON_PATH}" if os.path.exists(ICON_PATH) else "",
        f"--distpath={DIST_DIR}",
        f"--workpath={BUILD_DIR}",
        f"--specpath={BUILD_DIR}",
        "--clean",
        "-y",
        LAUNCHER_SCRIPT
    ]
    # Lọc bỏ các phần tử rỗng
    cmd = [c for c in cmd if c]

    print(f"[*] Thực thi: {' '.join(cmd)}\n")
    proc = subprocess.run(cmd, cwd=ROOT_DIR)

    if proc.returncode == 0:
        exe_src = os.path.join(DIST_DIR, "KINI_AI.exe")
        exe_dest = os.path.join(ROOT_DIR, "KINI_AI.exe")
        
        if os.path.exists(exe_src):
            shutil.copy2(exe_src, exe_dest)
            print("\n" + "=" * 65)
            print("🎉 BIÊN DỊCH THÀNH CÔNG KINI_AI.exe!")
            print(f"[+] File EXE tại thư mục gốc: {exe_dest}")
            print(f"[+] File EXE tại dist: {exe_src}")
            print(f"[+] Kích thước: {os.path.getsize(exe_dest) / (1024*1024):.2f} MB")
            print("=" * 65)
            
            # Dọn dẹp build temp để chống phình ổ cứng
            try:
                shutil.rmtree(BUILD_DIR, ignore_errors=True)
                print("[*] Đã tự động dọn dẹp thư mục build tạm (Anti-bloat)!")
            except Exception:
                pass
            return True
    else:
        print(f"\n[!] Lỗi biên dịch PyInstaller. Mã thoát: {proc.returncode}")
        return False

if __name__ == "__main__":
    success = build_exe()
    sys.exit(0 if success else 1)
