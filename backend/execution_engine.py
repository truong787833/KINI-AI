"""
KINI AI - Local Python Execution Engine (Động cơ Thực Thi Python Cục Bộ)
Phát triển bởi: Phùng Hải Trường
Chức năng:
- Thực thi mã Python trực tiếp trên máy tính một cách an toàn và có kiểm soát thời gian.
- Bắt trọn vẹn kết quả hiển thị (stdout), thông báo lỗi (stderr), thời gian chạy.
- Tự động nhận diện biểu đồ sinh ra từ matplotlib / PIL và lưu vào thư mục generated_images.
"""

import os
import sys
import time
import subprocess
import tempfile
import uuid
from typing import Dict, Any

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKSPACE_DIR = os.path.join(BASE_DIR, "workspace")
IMAGES_DIR = os.path.join(BASE_DIR, "generated_images")
os.makedirs(WORKSPACE_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)


def run_python_code(code: str, timeout_sec: int = 20) -> Dict[str, Any]:
    """
    Thực thi đoạn mã Python và trả về kết quả console cùng hình ảnh nếu có.
    """
    if not code or not code.strip():
        return {
            "success": False,
            "stdout": "",
            "stderr": "Mã nguồn Python trống.",
            "returncode": -1,
            "execution_time_ms": 0,
            "has_image": False,
            "image_url": ""
        }

    start_time = time.time()
    temp_file_id = uuid.uuid4().hex[:8]
    script_path = os.path.join(WORKSPACE_DIR, f"_run_{temp_file_id}.py")

    # Kiểm tra xem code có vẽ matplotlib không để chèn cấu hình lưu ảnh tự động
    has_plot = "matplotlib" in code or "plt." in code
    plot_img_name = f"plot_{temp_file_id}.png"
    plot_img_path = os.path.join(IMAGES_DIR, plot_img_name)

    wrapped_code = code
    if has_plot and "plt.show()" in code:
        # Thay thế plt.show() bằng plt.savefig() để tự động chụp ảnh biểu đồ
        wrapped_code = code.replace("plt.show()", f"plt.savefig(r'{plot_img_path}', bbox_inches='tight', dpi=150)\nprint('[KINI_PLOT_GENERATED]')")
    elif has_plot and "savefig" not in code:
        wrapped_code = code + f"\nimport matplotlib.pyplot as plt\nplt.savefig(r'{plot_img_path}', bbox_inches='tight', dpi=150)\nprint('[KINI_PLOT_GENERATED]')\n"

    try:
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(wrapped_code)

        # Chạy subprocess
        creationflags = 0
        if sys.platform == "win32":
            creationflags = subprocess.CREATE_NO_WINDOW

        proc = subprocess.run(
            [sys.executable, script_path],
            cwd=WORKSPACE_DIR,
            capture_output=True,
            text=True,
            timeout=timeout_sec,
            creationflags=creationflags
        )

        exec_ms = int((time.time() - start_time) * 1000)
        stdout_clean = proc.stdout.replace("[KINI_PLOT_GENERATED]", "").strip()
        stderr_clean = proc.stderr.strip()

        # Kiểm tra xem có file ảnh plot sinh ra không
        generated_image = False
        image_url = ""
        if os.path.exists(plot_img_path) and os.path.getsize(plot_img_path) > 100:
            generated_image = True
            image_url = f"/generated_images/{plot_img_name}"

        return {
            "success": proc.returncode == 0,
            "stdout": stdout_clean if stdout_clean else ("(Chạy thành công, không có output)" if proc.returncode == 0 else ""),
            "stderr": stderr_clean,
            "returncode": proc.returncode,
            "execution_time_ms": exec_ms,
            "elapsed": round(exec_ms / 1000, 2),
            "has_image": generated_image,
            "image_url": image_url,
            "plots": [image_url] if generated_image else []
        }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "stdout": "",
            "stderr": f"Lỗi: Quá thời gian thực thi tối đa ({timeout_sec}s). Vòng lặp vô tận đã bị ngắt an toàn.",
            "returncode": -1,
            "execution_time_ms": int(timeout_sec * 1000),
            "has_image": False,
            "image_url": ""
        }
    except Exception as e:
        return {
            "success": False,
            "stdout": "",
            "stderr": f"Lỗi thực thi hệ thống: {str(e)}",
            "returncode": -1,
            "execution_time_ms": int((time.time() - start_time) * 1000),
            "has_image": False,
            "image_url": ""
        }
    finally:
        # Tự động dọn dẹp file script tạm
        if os.path.exists(script_path):
            try:
                os.remove(script_path)
            except Exception:
                pass
