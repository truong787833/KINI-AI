"""
KINI AI - Ultra-Lightweight OTA Packager (Công cụ Đóng Gói OTA Siêu Nhẹ)
Tác giả: Phùng Hải Trường
Chức năng:
- Đóng gói toàn bộ backend, static, và version.json thành gói cập nhật OTA siêu nhẹ (~1MB - 3MB).
- Tự động loại bỏ cache (__pycache__, .pyc, logs, db) để tối ưu dung lượng và tốc độ truyền tải.
- Xuất file latest_ota_package.zip và update_v{version}.zip sẵn sàng phát hành.
"""

import os
import sys
import json
import zipfile
import argparse
from datetime import datetime

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSION_FILE = os.path.join(ROOT_DIR, "version.json")
OUTPUT_DIR = os.path.join(ROOT_DIR, "dist_ota")


def load_version():
    if os.path.exists(VERSION_FILE):
        with open(VERSION_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "version": "4.3.0",
        "build_number": 430,
        "release_date": datetime.now().strftime("%Y-%m-%d"),
        "channel": "stable",
        "app_name": "KINI AI Desktop",
        "latest_version": "4.3.0",
        "latest_build": 430,
        "has_update": False,
        "changelog": []
    }


def save_version(data):
    with open(VERSION_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def pack_ota(bump=None, custom_version=None, changelog_msg=None):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    ver_data = load_version()

    old_ver = ver_data.get("version", "4.3.0")
    old_build = int(ver_data.get("build_number", 430))

    if custom_version:
        new_ver = custom_version
        new_build = old_build + 1
    elif bump == "patch":
        parts = old_ver.split(".")
        parts[-1] = str(int(parts[-1]) + 1)
        new_ver = ".".join(parts)
        new_build = old_build + 1
    elif bump == "minor":
        parts = old_ver.split(".")
        parts[1] = str(int(parts[1]) + 1)
        parts[2] = "0"
        new_ver = ".".join(parts)
        new_build = old_build + 10
    else:
        new_ver = old_ver
        new_build = old_build

    ver_data["version"] = new_ver
    ver_data["latest_version"] = new_ver
    ver_data["build_number"] = new_build
    ver_data["latest_build"] = new_build
    ver_data["release_date"] = datetime.now().strftime("%Y-%m-%d")
    ver_data["has_update"] = False

    if changelog_msg:
        if "changelog" not in ver_data:
            ver_data["changelog"] = []
        ver_data["changelog"].insert(0, changelog_msg)

    save_version(ver_data)

    latest_zip_path = os.path.join(OUTPUT_DIR, "latest_ota_package.zip")
    versioned_zip_path = os.path.join(OUTPUT_DIR, f"update_v{new_ver}.zip")

    print("=" * 60)
    print("   KINI AI - ĐÓNG GÓI BẢN VÁ OTA SIÊU TỐC")
    print(f"   Phiên bản: v{new_ver} (Build {new_build})")
    print("=" * 60)

    # Các thư mục & tệp cần đóng gói
    include_targets = [
        ("backend", os.path.join(ROOT_DIR, "backend")),
        ("static", os.path.join(ROOT_DIR, "static")),
        ("version.json", VERSION_FILE),
        ("run.py", os.path.join(ROOT_DIR, "run.py")),
        ("requirements.txt", os.path.join(ROOT_DIR, "requirements.txt"))
    ]

    # Tạo tệp zip
    temp_zip = os.path.join(OUTPUT_DIR, "_packing_temp.zip")
    if os.path.exists(temp_zip):
        os.remove(temp_zip)

    packed_files = 0
    with zipfile.ZipFile(temp_zip, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for arc_base, real_path in include_targets:
            if not os.path.exists(real_path):
                continue
            if os.path.isfile(real_path):
                zf.write(real_path, arc_base)
                packed_files += 1
            else:
                for root, dirs, files in os.walk(real_path):
                    # Bỏ qua __pycache__
                    dirs[:] = [d for d in dirs if d != "__pycache__" and not d.startswith(".")]
                    for f in files:
                        if f.endswith(".pyc") or f.endswith(".pyo") or f.endswith(".tmp"):
                            continue
                        full_f = os.path.join(root, f)
                        rel_f = os.path.relpath(full_f, ROOT_DIR)
                        zf.write(full_f, rel_f)
                        packed_files += 1

    # Copy ra cả 2 tên file
    import shutil
    shutil.copy2(temp_zip, latest_zip_path)
    shutil.copy2(temp_zip, versioned_zip_path)
    os.remove(temp_zip)

    size_kb = os.path.getsize(latest_zip_path) / 1024
    size_mb = size_kb / 1024

    print(f"\n[+] Đã đóng gói thành công {packed_files} tệp tin!")
    print(f"[+] Kích thước gói OTA: {size_kb:.1f} KB ({size_mb:.2f} MB) - Siêu nhẹ!")
    print(f"[+] Tệp 1 (dùng phát hành chung): {latest_zip_path}")
    print(f"[+] Tệp 2 (theo phiên bản): {versioned_zip_path}")
    print("=" * 60)
    print("Sẵn sàng: Chỉ cần gửi file này hoặc nạp qua giao diện KINI AI để cập nhật ngay trong 1 giây!\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Đóng gói OTA KINI AI")
    parser.add_argument("--bump", choices=["patch", "minor"], help="Tăng phiên bản patch hoặc minor")
    parser.add_argument("--version", dest="custom_version", help="Chỉ định phiên bản cụ thể")
    parser.add_argument("--msg", dest="changelog_msg", help="Nội dung changelog")
    args = parser.parse_args()

    pack_ota(bump=args.bump, custom_version=args.custom_version, changelog_msg=args.changelog_msg)
