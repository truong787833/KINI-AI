import os
import io
import re
import uuid
import time
import docx
from docx.shared import Pt, RGBColor, Inches, Mm
from docx.enum.text import WD_ALIGN_PARAGRAPH
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from typing import Optional

EXPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "generated_images")
os.makedirs(EXPORTS_DIR, exist_ok=True)

def export_text_to_docx(content: str, title: str = "Tài Liệu KINI AI") -> str:
    """
    Xuất nội dung văn bản thành file Word (.docx) chuẩn khổ A4 & thể thức Nghị định 30/2020/NĐ-CP:
    - Khổ giấy A4: 210mm x 297mm
    - Lề: Trên 20mm, Dưới 20mm, Trái 30mm, Phải 15mm
    - Font: Times New Roman, cỡ chữ 14pt (nội dung), màu đen chuẩn mực
    """
    doc = docx.Document()

    # Cấu hình khổ giấy A4 & lề chuẩn Nghị định 30/2020/NĐ-CP
    for section in doc.sections:
        section.page_width = Mm(210)
        section.page_height = Mm(297)
        section.top_margin = Mm(20)
        section.bottom_margin = Mm(20)
        section.left_margin = Mm(30)
        section.right_margin = Mm(15)

    # Xử lý nội dung văn bản từng dòng, dọn sạch ký tự markdown ** thừa
    lines = content.split("\n")
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("```"):
            continue

        clean_line = re.sub(r"\*\*(.+?)\*\*", r"\1", stripped)
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.2
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(6)

        if clean_line.startswith("### "):
            run = p.add_run(clean_line[4:].strip())
            run.font.bold = True
            run.font.size = Pt(14)
        elif clean_line.startswith("## "):
            run = p.add_run(clean_line[3:].strip())
            run.font.bold = True
            run.font.size = Pt(14)
        elif clean_line.startswith("# "):
            run = p.add_run(clean_line[2:].strip().upper())
            run.font.bold = True
            run.font.size = Pt(14)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        elif clean_line.startswith("- ") or clean_line.startswith("* "):
            p.paragraph_format.left_indent = Mm(10)
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            run = p.add_run("- " + clean_line[2:].strip())
            run.font.size = Pt(14)
        else:
            p.paragraph_format.first_line_indent = Mm(12.7)
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            run = p.add_run(clean_line)
            run.font.size = Pt(14)

        run.font.name = "Times New Roman"
        run.font.color.rgb = RGBColor(0, 0, 0)

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
