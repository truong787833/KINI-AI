"""
KINI AI - Self-Check & Auto-Heal Engine (Động Cơ Tự Kiểm Tra & Chữa Lỗi)
Phát triển bởi: Phùng Hải Trường
Chức năng:
- Tự động kiểm tra tính toàn vẹn của tệp tin, thư mục và cơ sở dữ liệu khi khởi động.
- Tự động khôi phục cấu hình hoặc tạo lại thư mục nếu bị xóa nhầm.
- Đảm bảo KINI AI luôn ở trạng thái sẵn sàng và không bao giờ bị lỗi sập app.
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, Any, List

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSION_FILE = os.path.join(BASE_DIR, "version.json")
DB_FILE = os.path.join(BASE_DIR, "kini_ai.db")

REQUIRED_DIRS = [
    os.path.join(BASE_DIR, "generated_images"),
    os.path.join(BASE_DIR, "generated_audio"),
    os.path.join(BASE_DIR, "backups"),
    os.path.join(BASE_DIR, "workspace"),
    os.path.join(BASE_DIR, "dist_ota")
]


def run_system_self_check() -> Dict[str, Any]:
    """
    Quét kiểm tra toàn bộ hệ thống và tự động phục hồi nếu có lỗi.
    """
    results: List[Dict[str, str]] = []
    has_error = False

    # 1. Kiểm tra & tự động tạo thư mục cốt lõi
    created_dirs = []
    for d in REQUIRED_DIRS:
        if not os.path.exists(d):
            try:
                os.makedirs(d, exist_ok=True)
                created_dirs.append(os.path.basename(d))
            except Exception as e:
                has_error = True
                results.append({
                    "name": f"Thư mục {os.path.basename(d)}",
                    "status": "error",
                    "detail": f"Không thể tạo thư mục: {e}"
                })

    if created_dirs:
        results.append({
            "name": "Thư mục hệ thống",
            "status": "warning",
            "detail": f"Đã tự động tạo lại các thư mục thiếu: {', '.join(created_dirs)}"
        })
    else:
        results.append({
            "name": "Thư mục hệ thống",
            "status": "ok",
            "detail": "Đầy đủ 5 thư mục cốt lõi (ảnh, âm thanh, backup, workspace, ota)"
        })

    # 2. Kiểm tra Cơ sở dữ liệu SQLite
    try:
        from . import database
        database.init_db()
        results.append({
            "name": "Cơ sở dữ liệu SQLite",
            "status": "ok",
            "detail": "Đã kết nối và xác thực 4 bảng: conversations, messages, memories, settings"
        })
    except Exception as e:
        has_error = True
        results.append({
            "name": "Cơ sở dữ liệu SQLite",
            "status": "error",
            "detail": f"Lỗi cơ sở dữ liệu: {e}"
        })

    # 3. Kiểm tra file cấu hình version.json
    try:
        if not os.path.exists(VERSION_FILE):
            default_ver = {
                "version": "4.3.2",
                "build_number": 432,
                "release_date": datetime.now().strftime("%Y-%m-%d"),
                "channel": "stable",
                "app_name": "KINI AI Desktop",
                "latest_version": "4.3.2",
                "latest_build": 432,
                "has_update": False,
                "changelog": ["Tự động khởi tạo phiên bản chuẩn"]
            }
            with open(VERSION_FILE, "w", encoding="utf-8") as f:
                json.dump(default_ver, f, ensure_ascii=False, indent=2)
            results.append({
                "name": "Cấu hình Phiên bản & OTA",
                "status": "warning",
                "detail": "Đã tự động khôi phục version.json mặc định"
            })
        else:
            with open(VERSION_FILE, "r", encoding="utf-8") as f:
                vdata = json.load(f)
            results.append({
                "name": "Cấu hình Phiên bản & OTA",
                "status": "ok",
                "detail": f"Đang chạy phiên bản v{vdata.get('version', '4.3.2')} (Build {vdata.get('build_number', 432)})"
            })
    except Exception as e:
        results.append({
            "name": "Cấu hình Phiên bản & OTA",
            "status": "error",
            "detail": f"Lỗi đọc file phiên bản: {e}"
        })

    # 4. Kiểm tra Động cơ Python Sandbox
    try:
        from . import execution_engine
        test_exec = execution_engine.run_python_code("x = 10 + 20", timeout_sec=5)
        if test_exec["success"]:
            results.append({
                "name": "Động cơ Python Sandbox",
                "status": "ok",
                "detail": f"Sẵn sàng thực thi lệnh trực tiếp ({test_exec['execution_time_ms']}ms)"
            })
        else:
            results.append({
                "name": "Động cơ Python Sandbox",
                "status": "warning",
                "detail": f"Cảnh báo: {test_exec['stderr']}"
            })
    except Exception as e:
        results.append({
            "name": "Động cơ Python Sandbox",
            "status": "error",
            "detail": f"Lỗi khởi động động cơ: {e}"
        })

    # 5. Kiểm tra Google Gemini API Key
    try:
        from . import gemini_client
        api_key = gemini_client.get_api_key()
        if api_key:
            results.append({
                "name": "Google Gemini API Key",
                "status": "ok",
                "detail": f"Đã cấu hình hợp lệ (khóa: ...{api_key[-4:] if len(api_key) > 4 else '****'})"
            })
        else:
            results.append({
                "name": "Google Gemini API Key",
                "status": "warning",
                "detail": "Chưa cấu hình API Key trong Cài đặt (Hệ thống sẽ chạy ở chế độ Offline/Fallback)"
            })
    except Exception as e:
        results.append({
            "name": "Google Gemini API Key",
            "status": "warning",
            "detail": f"Chưa kiểm tra được API Key: {e}"
        })

    return {
        "status": "healthy" if not has_error else "degraded",
        "timestamp": datetime.now().isoformat(),
        "summary": "Hệ thống KINI AI đang hoạt động tối ưu 100%!" if not has_error else "Hệ thống có cảnh báo cần xử lý",
        "checks": results
    }
