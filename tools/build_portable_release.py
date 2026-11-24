"""
Công cụ đóng gói bản KINI AI Portable Sạch (Dành cho người dùng mới / Bạn bè)
Phát triển bởi: Phùng Hải Trường
Mục đích:
- Tạo gói phân phối sạch 100%, độc lập trên mỗi máy.
- TUYỆT ĐỐI KHÔNG chứa dữ liệu cá nhân, không chứa kini_ai.db, không chứa .env của anh Trường.
- Tự động nén thành file KINI_AI_v4.2_Portable.zip sẵn sàng chia sẻ.
"""

import os
import shutil
import zipfile

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(ROOT_DIR, "dist_release")
PACKAGE_DIR = os.path.join(DIST_DIR, "KINI_AI_v4.4_Portable")
ZIP_FILE = os.path.join(DIST_DIR, "KINI_AI_v4.4_Portable.zip")

EXCLUDE_PATTERNS = [
    "kini_ai.db",
    ".env",
    "PROJECT_MEMORY.md",
    ".git",
    "dist_release",
    "__pycache__",
    "generated_images",
    "generated_audio",
    "preview_test",
    "test_mask",
    "test_scrollbar",
    ".pytest_cache",
]

README_CONTENT = """========================================================================
           KINI AI STUDIO v4.2 - SIÊU TRỢ LÝ TRÍ TUỆ NHÂN TẠO
                        (BẢN PORTABLE HOÀN TOÀN ĐỘC LẬP)
========================================================================

Chào mừng bạn đến với KINI AI - Siêu hệ điều hành trí tuệ nhân tạo cá nhân!
Bản phân phối này hoạt động hoàn toàn cục bộ (offline/local) trên máy tính của bạn:
- 100% riêng tư: Mọi tin nhắn, ký ức và tệp tin đều chỉ lưu trên ổ cứng của bạn.
- Dùng API riêng: Bạn tự quản lý khóa Google Gemini API miễn phí của mình.

------------------------------------------------------------------------
I. YÊU CẦU HỆ THỐNG
------------------------------------------------------------------------
1. Máy tính chạy Windows 10 hoặc Windows 11 (64-bit).
2. Đã cài đặt Python 3.10 trở lên:
   - Tải Python miễn phí tại: https://www.python.org/downloads/
   - QUAN TRỌNG: Khi cài đặt, hãy nhớ tích chọn vào ô:
     [✔] "Add python.exe to PATH"

------------------------------------------------------------------------
II. HƯỚNG DẪN KHỞI ĐỘNG (CHỈ 1 CÚ CLICK)
------------------------------------------------------------------------
1. Nhấp đúp chuột vào tệp:
   👉 Chay_KINI_AI.bat (hoặc start.bat)

2. Lần đầu tiên chạy:
   - Hệ thống sẽ tự động kiểm tra và cài đặt các thư viện cần thiết.
   - Trình duyệt web của bạn sẽ tự động mở trang: http://127.0.0.1:8000

------------------------------------------------------------------------
III. HƯỚNG DẪN LẤY VÀ NHẬP API KEY MIỄN PHÍ (100% FREE)
------------------------------------------------------------------------
KINI AI sử dụng mô hình AI tiên tiến nhất của Google. Bạn có thể lấy API Key
hoàn toàn miễn phí chỉ trong 1 phút:

1. Truy cập trang: https://aistudio.google.com/app/apikey
2. Đăng nhập bằng tài khoản Google (Gmail) của bạn.
3. Bấm nút "Create API Key" (Tạo khóa API) -> Chọn "Create API key in new project".
4. Sao chép đoạn mã khóa (bắt đầu bằng AIzaSy...).
5. Trên giao diện KINI AI:
   - Mở mục "⚙️ Cài Đặt & API Key" ở góc dưới bên trái (hoặc bảng hiện ra lần đầu).
   - Dán mã API Key của bạn vào ô "Google Gemini API Key" -> Bấm "Lưu cài đặt".
   - Khóa này sẽ được lưu an toàn tuyệt đối ngay trên máy tính của bạn!

------------------------------------------------------------------------
IV. CÁCH DÙNG KINI AI NHƯ APP DESKTOP HOẶC TRÊN ĐIỆN THOẠI
------------------------------------------------------------------------
1. Trên Máy Tính (PC/Laptop):
   - Khi đang mở KINI AI trên trình duyệt Chrome hoặc Edge/Cốc Cốc:
   - Bấm vào biểu tượng "Cài đặt ứng dụng" (Install App) ở góc phải thanh địa chỉ.
   - KINI AI sẽ biến thành một ứng dụng độc lập trên màn hình Desktop!

2. Dùng trên cùng mạng Wifi cho Điện thoại (Android / iPhone):
   - Mở cửa sổ dòng lệnh CMD trên máy tính, gõ: ipconfig
   - Tìm dòng IPv4 Address (ví dụ: 192.168.1.15).
   - Trên điện thoại kết nối chung Wifi, mở trình duyệt vào: http://192.168.1.15:8000
   - Chọn "Thêm vào màn hình chính" (Add to Home Screen) để dùng như App Mobile!

------------------------------------------------------------------------
V. CÁC TÍNH NĂNG NỔI BẬT ĐỂ BẠN KHÁM PHÁ
------------------------------------------------------------------------
- 💬 Chat & Hỏi đáp: Hỗ trợ viết văn bản, dịch thuật, lập trình, tư duy chiến lược.
- 🎨 Vẽ tranh 3D: Gõ "Vẽ cho tôi logo KINI AI 3D phát sáng neon công nghệ tương lai".
- 🎮 Chạy Game trực tiếp: Bấm vào thẻ "Antigravity Studio" để chơi game Rắn săn mồi.
- ⌨️ Lệnh nhanh: Gõ dấu "/" vào ô chat để hiện menu (/game, /web, /plan, /fix, /brain).
- 🧠 Tự dạy AI: Mọi sở thích, quy tắc làm việc bạn dạy sẽ được KINI ghi nhớ sâu!

Chúc bạn có những trải nghiệm tuyệt vời cùng KINI AI!
"""

def should_exclude(path):
    for pattern in EXCLUDE_PATTERNS:
        if pattern in path:
            return True
    return False

def build_package():
    print("=" * 65)
    print("   BẮT ĐẦU ĐÓNG GÓI BẢN KINI AI PORTABLE (PHÁT HÀNH SẠCH)")
    print("=" * 65)

    if os.path.exists(PACKAGE_DIR):
        print(f"[*] Đang dọn dẹp thư mục cũ: {PACKAGE_DIR}")
        shutil.rmtree(PACKAGE_DIR)
    if os.path.exists(ZIP_FILE):
        os.remove(ZIP_FILE)

    os.makedirs(PACKAGE_DIR, exist_ok=True)

    # 1. Sao chép thư mục backend (loại trừ __pycache__ và db)
    print("[*] Đang sao chép mã nguồn backend...")
    shutil.copytree(
        os.path.join(ROOT_DIR, "backend"),
        os.path.join(PACKAGE_DIR, "backend"),
        ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.db", "*.sqlite", "*.sqlite3")
    )

    # 2. Sao chép thư mục static (giao diện web, css, js, icons)
    print("[*] Đang sao chép giao diện static...")
    shutil.copytree(
        os.path.join(ROOT_DIR, "static"),
        os.path.join(PACKAGE_DIR, "static")
    )

    # 3. Tạo thư mục workspace sạch kèm file mẫu
    print("[*] Đang khởi tạo workspace sạch cho người dùng...")
    clean_workspace = os.path.join(PACKAGE_DIR, "workspace")
    os.makedirs(clean_workspace, exist_ok=True)
    with open(os.path.join(clean_workspace, "README.txt"), "w", encoding="utf-8") as f:
        f.write("Thư mục dự án cá nhân của bạn. Các mã nguồn code hoặc game tạo ra sẽ được lưu tại đây.\n")

    # 4. Sao chép các tệp thực thi cốt lõi
    core_files = [
        "KINI_AI.exe",
        "launcher_desktop.py",
        "run.py",
        "start.bat",
        "Chay_KINI_AI.bat",
        "requirements.txt",
        "version.json"
    ]
    for filename in core_files:
        src = os.path.join(ROOT_DIR, filename)
        if os.path.exists(src):
            print(f"[*] Đang sao chép: {filename}")
            shutil.copy2(src, os.path.join(PACKAGE_DIR, filename))

    # 5. Ghi tệp hướng dẫn sử dụng
    print("[*] Đang tạo tệp HUONG_DAN_SU_DUNG.txt...")
    with open(os.path.join(PACKAGE_DIR, "HUONG_DAN_SU_DUNG.txt"), "w", encoding="utf-8") as f:
        f.write(README_CONTENT)

    # 6. Kiểm tra an ninh nghiêm ngặt: Đảm bảo KHÔNG có file nhạy cảm
    print("[*] Đang kiểm tra tính an toàn và bảo mật dữ liệu...")
    sensitive_leaks = []
    for root, dirs, files in os.walk(PACKAGE_DIR):
        for file in files:
            full_p = os.path.join(root, file)
            if file.endswith(".db") or file == ".env" or "PROJECT_MEMORY" in file:
                sensitive_leaks.append(full_p)
    
    if sensitive_leaks:
        print("[!] NGUY HIỂM: Phát hiện tệp dữ liệu cá nhân bị lọt vào gói:")
        for leak in sensitive_leaks:
            print("    -", leak)
        raise RuntimeError("Đã hủy bỏ quá trình đóng gói để bảo vệ dữ liệu cá nhân!")

    print("[✔] Kiểm tra an toàn: 100% SẠCH, không chứa kini_ai.db và không chứa thông tin riêng của tác giả!")

    # 7. Nén thành file zip
    print(f"[*] Đang nén toàn bộ thành file: {ZIP_FILE} ...")
    with zipfile.ZipFile(ZIP_FILE, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(PACKAGE_DIR):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, PACKAGE_DIR)
                zf.write(full_path, arcname=os.path.join("KINI_AI_v4.2_Portable", rel_path))

    zip_size_mb = os.path.getsize(ZIP_FILE) / (1024 * 1024)
    print("=" * 65)
    print(f"[✔] HOÀN TẤT ĐÓNG GÓI THÀNH CÔNG!")
    print(f"[+] Thư mục Portable: {PACKAGE_DIR}")
    print(f"[+] Tệp nén sẵn sàng chia sẻ: {ZIP_FILE} ({zip_size_mb:.2f} MB)")
    print("=" * 65)

if __name__ == "__main__":
    build_package()
