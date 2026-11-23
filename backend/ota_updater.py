"""
KINI AI - Ultra-Fast Lightweight OTA (Over-The-Air) Update Engine
Phát triển bởi: Phùng Hải Trường
Tuân thủ nghiêm ngặt Quy tắc cốt lõi:
1. Chống lặp cập nhật (Anti-update Loop): Đồng bộ 100% version.json & in-memory state.
2. Chống phình to dung lượng (Anti-bloat): Tự động xóa sạch file zip và file tạm ngay sau khi cập nhật.
"""

import os
import sys
import json
import shutil
import zipfile
import urllib.request
import urllib.error
from typing import Dict, Any, Tuple, Optional

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSION_FILE = os.path.join(BASE_DIR, "version.json")
OTA_TEMP_DIR = os.path.join(BASE_DIR, "tools", "ota_temp")

DEFAULT_VERSION_INFO = {
    "version": "4.3.0",
    "build_number": 430,
    "release_date": "2026-11-23",
    "channel": "stable",
    "app_name": "KINI AI Desktop",
    "latest_version": "4.3.0",
    "latest_build": 430,
    "has_update": False,
    "update_url": "",
    "changelog": [
        "Đóng gói Native Desktop EXE cho KINI AI (Windows App Mode)",
        "Tính năng cập nhật OTA Siêu Tốc (Lightweight Over-The-Air Update)",
        "Cơ chế Chống Lặp Cập Nhật (Anti-loop) & Chống Phình Bộ Nhớ (Anti-bloat)"
    ]
}


def get_local_version() -> Dict[str, Any]:
    """Đọc thông tin phiên bản hiện tại từ version.json"""
    if os.path.exists(VERSION_FILE):
        try:
            with open(VERSION_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Đảm bảo các trường cơ bản luôn tồn tại
                for k, v in DEFAULT_VERSION_INFO.items():
                    if k not in data:
                        data[k] = v
                return data
        except Exception as e:
            print(f"[OTA] Lỗi khi đọc version.json: {e}")
    return DEFAULT_VERSION_INFO.copy()


def save_local_version(info: Dict[str, Any]) -> bool:
    """Ghi đĩa thông tin phiên bản mới vào version.json"""
    try:
        with open(VERSION_FILE, "w", encoding="utf-8") as f:
            json.dump(info, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"[OTA] Lỗi khi lưu version.json: {e}")
        return False


def clean_ota_cache():
    """Chống phình to dung lượng: Dọn dẹp sạch sẽ mọi file zip, tmp trong thư mục tạm"""
    try:
        if os.path.exists(OTA_TEMP_DIR):
            shutil.rmtree(OTA_TEMP_DIR, ignore_errors=True)
    except Exception as e:
        print(f"[OTA] Dọn dẹp cache tạm: {e}")

    # Quét dọn các file .zip tạm ở root nếu có
    for item in os.listdir(BASE_DIR):
        if item.startswith("ota_temp_") and item.endswith(".zip"):
            try:
                os.remove(os.path.join(BASE_DIR, item))
            except Exception:
                pass


def check_for_updates(remote_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Kiểm tra xem có bản cập nhật OTA mới hay không.
    So sánh build_number hoặc version chuỗi semantic.
    """
    local = get_local_version()
    
    # Nếu không truyền remote_url, kiểm tra URL trong local config hoặc trả về trạng thái hiện thời
    target_url = remote_url or local.get("update_url")
    
    if target_url and target_url.startswith("http"):
        try:
            req = urllib.request.Request(target_url, headers={"User-Agent": "KINI-AI-Desktop-OTA"})
            with urllib.request.urlopen(req, timeout=5) as response:
                remote_data = json.loads(response.read().decode("utf-8"))
                
                remote_ver = remote_data.get("version", local["version"])
                remote_build = int(remote_data.get("build_number", remote_data.get("latest_build", 0)))
                local_build = int(local.get("build_number", 0))
                
                has_new = (remote_build > local_build) or (remote_ver != local.get("version") and remote_build >= local_build)
                
                local["latest_version"] = remote_ver
                local["latest_build"] = remote_build
                local["has_update"] = has_new
                if "changelog" in remote_data:
                    local["changelog"] = remote_data["changelog"]
                if "download_url" in remote_data:
                    local["download_url"] = remote_data["download_url"]
                
                save_local_version(local)
                
                return {
                    "has_update": has_new,
                    "current_version": local["version"],
                    "current_build": local["build_number"],
                    "latest_version": remote_ver,
                    "latest_build": remote_build,
                    "changelog": remote_data.get("changelog", local.get("changelog", [])),
                    "download_url": remote_data.get("download_url", "")
                }
        except Exception as e:
            print(f"[OTA] Không thể kiểm tra từ remote_url: {e}")

    # Fallback kiểm tra từ cấu hình nội bộ
    return {
        "has_update": local.get("has_update", False),
        "current_version": local.get("version", "4.3.0"),
        "current_build": local.get("build_number", 430),
        "latest_version": local.get("latest_version", local.get("version", "4.3.0")),
        "latest_build": local.get("latest_build", local.get("build_number", 430)),
        "changelog": local.get("changelog", [])
    }


def apply_ota_zip(zip_file_path: str) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Áp dụng gói cập nhật OTA từ file zip.
    Thực hiện:
    1. Giải nén an toàn đè lên các tệp static, backend, version.json.
    2. Chống lặp cập nhật: Đồng bộ 100% version.json và gán has_update = False.
    3. Chống phình to dung lượng: Xóa ngay file zip sau khi cài đặt xong!
    """
    if not os.path.exists(zip_file_path):
        return False, f"Không tìm thấy gói OTA: {zip_file_path}", {}

    old_info = get_local_version()
    new_info = old_info.copy()
    
    extracted_count = 0
    
    try:
        with zipfile.ZipFile(zip_file_path, "r") as z:
            namelist = z.namelist()
            
            # Kiểm tra xem trong zip có version.json không
            if "version.json" in namelist:
                try:
                    ver_bytes = z.read("version.json")
                    new_info = json.loads(ver_bytes.decode("utf-8"))
                except Exception as e:
                    print(f"[OTA] Không đọc được version.json trong zip: {e}")

            # Giải nén an toàn đè vào BASE_DIR
            for member in namelist:
                # Bỏ qua các đường dẫn nguy hiểm hoặc file tạm
                if member.startswith("/") or member.startswith("\\") or ".." in member:
                    continue
                if "__pycache__" in member or member.endswith(".pyc"):
                    continue
                
                target_path = os.path.join(BASE_DIR, member)
                
                if member.endswith("/"):
                    os.makedirs(target_path, exist_ok=True)
                    continue
                
                os.makedirs(os.path.dirname(target_path), exist_ok=True)
                with z.open(member) as source, open(target_path, "wb") as dest:
                    dest.write(source.read())
                extracted_count += 1

        # QUY TẮC BẮT BUỘC 1: Chống lặp cập nhật (Anti-update loop)
        # Đồng bộ chính xác 100% phiên bản mới vào version.json trên đĩa
        latest_ver = new_info.get("version", old_info.get("latest_version", "4.3.0"))
        latest_bld = int(new_info.get("build_number", old_info.get("latest_build", 430)))
        
        final_info = get_local_version() # đọc lại vừa được giải nén
        final_info["version"] = latest_ver
        final_info["latest_version"] = latest_ver
        final_info["build_number"] = latest_bld
        final_info["latest_build"] = latest_bld
        final_info["has_update"] = False  # BẮT BUỘC: Đánh dấu đã cập nhật xong, tuyệt đối không lặp lại!
        save_local_version(final_info)

    except Exception as e:
        return False, f"Lỗi giải nén gói OTA: {str(e)}", {}
    finally:
        # QUY TẮC BẮT BUỘC 2: Chống phình to dung lượng (Anti-bloat)
        # Xóa ngay lập tức file zip và dọn dẹp thư mục tạm
        try:
            if os.path.exists(zip_file_path):
                os.remove(zip_file_path)
                print(f"[OTA - Anti-bloat] Đã xóa tệp zip cài đặt: {zip_file_path}")
        except Exception as e:
            print(f"[OTA] Lỗi xóa file zip: {e}")
        clean_ota_cache()

    return True, f"Cập nhật OTA thành công ({extracted_count} tệp được nâng cấp)!", final_info
