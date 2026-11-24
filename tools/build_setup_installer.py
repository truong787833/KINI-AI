"""
KINI AI Studio - Setup EXE Builder Script
Đóng gói bộ cài đặt tự động KINI_AI_Setup_v4.4.exe hoàn chỉnh
"""

import os
import sys
import shutil
import subprocess

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(ROOT_DIR, "dist_release")
INSTALLER_SCRIPT = os.path.join(ROOT_DIR, "tools", "installer_gui.py")
ZIP_PAYLOAD = os.path.join(DIST_DIR, "KINI_AI_v4.4_Portable.zip")
ICON_PATH = os.path.join(ROOT_DIR, "static", "app_icon.ico")
BUILD_DIR = os.path.join(ROOT_DIR, "build_installer_temp")

def build_setup_installer():
    print("=" * 65)
    print("   BẮT ĐẦU ĐÓNG GÓI BỘ CÀI ĐẶT SETUP EXE: KINI_AI_Setup_v4.4.exe")
    print("   Phát triển bởi: Phùng Hải Trường")
    print("=" * 65)

    # 1. Đảm bảo gói ZIP Portable sạch đã tồn tại và mới nhất
    if not os.path.exists(ZIP_PAYLOAD):
        print("[*] Gói zip chưa tồn tại. Đang chạy build_portable_release.py...")
        from build_portable_release import build_package
        build_package()

    os.makedirs(DIST_DIR, exist_ok=True)
    os.makedirs(BUILD_DIR, exist_ok=True)

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--name=KINI_AI_Setup_v4.4",
        "--onefile",
        "--windowed",
        f"--icon={ICON_PATH}" if os.path.exists(ICON_PATH) else "",
        f"--add-data={ZIP_PAYLOAD};.",
        f"--distpath={DIST_DIR}",
        f"--workpath={BUILD_DIR}",
        f"--specpath={BUILD_DIR}",
        "--clean",
        "-y",
        INSTALLER_SCRIPT
    ]
    cmd = [c for c in cmd if c]

    print(f"[*] Thực thi đóng gói: {' '.join(cmd)}\n")
    proc = subprocess.run(cmd, cwd=ROOT_DIR)

    if proc.returncode == 0:
        setup_exe = os.path.join(DIST_DIR, "KINI_AI_Setup_v4.4.exe")
        setup_generic = os.path.join(DIST_DIR, "KINI_AI_Setup.exe")
        if os.path.exists(setup_exe):
            shutil.copy2(setup_exe, setup_generic)
            exe_size_mb = os.path.getsize(setup_exe) / (1024 * 1024)
            print("\n" + "=" * 65)
            print("🎉 BIÊN DỊCH BỘ CÀI ĐẶT SETUP THÀNH CÔNG!")
            print(f"[+] File Setup phiên bản: {setup_exe}")
            print(f"[+] File Setup dùng chung: {setup_generic}")
            print(f"[+] Dung lượng: {exe_size_mb:.2f} MB")
            print("=" * 65)

            # Dọn dẹp thư mục tạm để chống phình ổ đĩa (Anti-bloat)
            try:
                shutil.rmtree(BUILD_DIR, ignore_errors=True)
                print("[*] Đã tự động dọn dẹp thư mục build tạm (Anti-bloat)!")
            except Exception:
                pass
            return True
    else:
        print(f"\n[!] Lỗi biên dịch Setup. Mã thoát: {proc.returncode}")
        return False

if __name__ == "__main__":
    success = build_setup_installer()
    sys.exit(0 if success else 1)
