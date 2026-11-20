import os
import io
import re
import uuid
import time
import docx
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from typing import Optional

EXPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "generated_images")
os.makedirs(EXPORTS_DIR, exist_ok=True)

def export_text_to_docx(content: str, title: str = "Tài Liệu KINI AI") -> str:
    """
    Xuất nội dung văn bản thành file Word (.docx) chuyên nghiệp chuẩn thể thức.
    """
    doc = docx.Document()
    
    # Cấu hình lề chuẩn văn bản
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1.1)
        section.right_margin = Inches(0.9)

    # Tiêu đề
    title_p = doc.add_paragraph()
    title_run = title_p.add_run(title.upper())
    title_run.font.name = "Times New Roman"
    title_run.font.size = Pt(15)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(30, 58, 138)
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Thời gian tạo
    time_p = doc.add_paragraph()
    time_run = time_p.add_run(f"Được tạo bởi KINI AI vào lúc: {time.strftime('%H:%M:%S ngày %d/%m/%Y')}")
    time_run.font.name = "Times New Roman"
    time_run.font.size = Pt(10)
    time_run.font.italic = True
    time_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph("─" * 45).alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Xử lý nội dung văn bản từng dòng
    lines = content.split("\n")
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
            
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.25
        p.paragraph_format.space_after = Pt(4)

        # Tiêu đề lớn
        if stripped.startswith("### "):
            run = p.add_run(stripped[4:])
            run.font.bold = True
            run.font.size = Pt(13)
            run.font.color.rgb = RGBColor(15, 23, 42)
        elif stripped.startswith("## "):
            run = p.add_run(stripped[3:])
            run.font.bold = True
            run.font.size = Pt(14)
            run.font.color.rgb = RGBColor(30, 58, 138)
        elif stripped.startswith("# "):
            run = p.add_run(stripped[2:])
            run.font.bold = True
            run.font.size = Pt(15)
            run.font.color.rgb = RGBColor(14, 116, 144)
        elif stripped.startswith("- ") or stripped.startswith("* "):
            p.paragraph_format.left_indent = Inches(0.25)
            run = p.add_run("• " + stripped[2:])
            run.font.size = Pt(12)
        else:
            run = p.add_run(stripped)
            run.font.size = Pt(12)
            
        run.font.name = "Times New Roman"

    filename = f"kini_doc_{int(time.time())}_{uuid.uuid4().hex[:6]}.docx"
    file_path = os.path.join(EXPORTS_DIR, filename)
    doc.save(file_path)
    return filename

def export_table_to_xlsx(content: str, title: str = "Bang_Du_Lieu_KINI") -> str:
    """
    Trích xuất các bảng dữ liệu dạng markdown hoặc CSV thành file Excel đẹp.
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Dữ Liệu"

    header_font = Font(name="Times New Roman", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    cell_font = Font(name="Times New Roman", size=11)
    thin_border = Border(
        left=Side(style="thin", color="CCCCCC"),
        right=Side(style="thin", color="CCCCCC"),
        top=Side(style="thin", color="CCCCCC"),
        bottom=Side(style="thin", color="CCCCCC")
    )

    rows = []
    # Tìm các dòng có dấu gạch đứng |
    for line in content.split("\n"):
        if "|" in line:
            # Bỏ qua dòng kẻ ngang |-|-|-|
            if re.match(r'^[\s|:-]+$', line.strip()):
                continue
            cols = [c.strip() for c in line.strip().strip("|").split("|")]
            if any(cols):
                rows.append(cols)

    # Nếu không tìm thấy bảng có |, tách theo dòng thông thường
    if not rows:
        for line in content.split("\n"):
            if line.strip():
                rows.append([line.strip()])

    for row_idx, row_data in enumerate(rows, start=1):
        for col_idx, val in enumerate(row_data, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.border = thin_border
            if row_idx == 1 and len(rows) > 1:
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.font = cell_font
                cell.alignment = Alignment(vertical="center")

    # Tự động dãn cột
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 50)

    filename = f"kini_sheet_{int(time.time())}_{uuid.uuid4().hex[:6]}.xlsx"
    file_path = os.path.join(EXPORTS_DIR, filename)
    wb.save(file_path)
    return filename
