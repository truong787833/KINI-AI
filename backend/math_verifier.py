import re
from typing import List, Dict, Any, Optional

def extract_and_verify_arithmetic(text: str) -> Optional[str]:
    """
    Tự động phát hiện các biểu thức số học hoặc chuỗi phép tính trong câu hỏi của người dùng,
    thực thi tính toán chính xác bằng Python để chống ảo giác số học (Math Hallucination) của LLM.
    """
    if not text:
        return None

    # Tìm các biểu thức số học dạng: a + b + c ... hoặc a * b, a / b
    # Ví dụ: "4+2+3+2+2+2+2+3+4+5+6+3+3" hoặc "33 + 50 + 43" hoặc "4 (Cô thanh) + 2 (Cô nhàn)..."
    results = []

    # 1. Trích xuất các biểu thức cộng/trừ đơn giản
    # Chuẩn hóa: lấy các dòng hoặc đoạn có chứa phép tính số học
    lines = text.splitlines()
    for line in lines:
        # Nếu dòng chứa phép tính có ít nhất 2 số và dấu +, -, *, /
        # Ví dụ: 33 + 50 + 43 hoặc 4 + 2 + 3 + 5
        matches = re.findall(r'(\d+(?:\.\d+)?(?:\s*[\+\-\*\/]\s*\d+(?:\.\d+)?)+)', line)
        for expr in matches:
            # Loại trừ các trường hợp giả như ngày tháng "22/11/2026"
            if re.match(r'^\d{1,2}/\d{1,2}/\d{4}$', expr.strip()):
                continue
            # Chỉ cho phép các toán tử an toàn
            clean_expr = expr.strip()
            if not re.match(r'^[\d\.\s\+\-\*\/]+$', clean_expr):
                continue
            try:
                # Tính toán an toàn bằng eval với môi trường cô lập
                val = eval(clean_expr, {"__builtins__": None}, {})
                if isinstance(val, (int, float)):
                    # Làm tròn đẹp
                    val_str = f"{val:.2f}".rstrip("0").rstrip(".") if isinstance(val, float) else str(val)
                    results.append(f"- Biểu thức `{clean_expr}` = **{val_str}**")
            except Exception:
                pass

    # 2. Xử lý trường hợp chuỗi số có kèm tên khách hàng / chú thích:
    # Ví dụ: "4 (Cô thanh) + 2 (Cô nhàn) + 3 (Vợ anh) + 2 (Họ xuân)..."
    annotated_match = re.findall(r'(\d+(?:\.\d+)?)\s*\([^\)]+\)', text)
    if len(annotated_match) >= 3:
        try:
            total_annotated = sum(float(x) for x in annotated_match)
            total_str = f"{total_annotated:.2f}".rstrip("0").rstrip(".")
            steps = " + ".join(annotated_match)
            results.append(f"- Tổng các số lượng chi tiết (`{steps}`) = **{total_str}**")
        except Exception:
            pass

    if not results:
        return None

    # Loại bỏ trùng lặp giữ nguyên thứ tự
    unique_results = list(dict.fromkeys(results))

    return (
        "=== KẾT QUẢ TÍNH TOÁN XÁC THỰC BẰNG PYTHON (ĐỘ CHÍNH XÁC TUYỆT ĐỐI 100%) ===\n"
        + "\n".join(unique_results) + "\n"
        + "=== CHỈ THỊ BẮT BUỘC: Hãy đối chiếu và sử dụng các kết quả tính toán bằng Python ở trên. "
        + "TUYỆT ĐỐI KHÔNG tính nhẩm sai hoặc đưa ra con số lệch dù chỉ 1 đơn vị. ==="
    )
