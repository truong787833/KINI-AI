import os
import io
import re
import html as html_lib
import uuid
import time
import docx
from docx.shared import Pt, RGBColor, Inches, Mm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from typing import Optional, List, Tuple

EXPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "generated_images")
os.makedirs(EXPORTS_DIR, exist_ok=True)


def _set_table_borderless(table) -> None:
    tbl_pr = table._tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for side in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:val"), "none")
        borders.append(el)
    tbl_pr.append(borders)


def _clean_html_inline(text: str) -> str:
    text = html_lib.unescape(text or "")
    text = re.sub(r"(?i)<br\s*/?>\s*\n?", "\n", text)
    text = re.sub(r"(?i)</?(div|p|span|tr|td|th|table|tbody|thead|ul|ol|li|hr)[^>]*>", "", text)
    return text


def _add_formatted_runs(
    paragraph,
    text: str,
    font_size: int = 14,
    default_bold: bool = False,
    default_italic: bool = False,
    underline: bool = False,
) -> None:
    """Chuyển đổi **bold**, *italic*, <strong>, <em> thành các run Word chuẩn Times New Roman."""
    s = html_lib.unescape(text or "")
    s = re.sub(r"(?is)<(strong|b)\b[^>]*>(.*?)</\1>", r"**\2**", s)
    s = re.sub(r"(?is)<(em|i)\b[^>]*>(.*?)</\1>", r"*\2*", s)
    s = re.sub(r"<[^>]+>", "", s)

    token_pattern = re.compile(r"(\*\*[^*]+\*\*|\*[^*]+\*)")
    parts = token_pattern.split(s)
    for part in parts:
        if not part:
            continue
        is_bold = default_bold
        is_italic = default_italic
        chunk = part
        if part.startswith("**") and part.endswith("**") and len(part) > 4:
            chunk = part[2:-2]
            is_bold = True
        elif part.startswith("*") and part.endswith("*") and len(part) > 2:
            chunk = part[1:-1]
            is_italic = True

        run = paragraph.add_run(chunk.replace("**", ""))
        run.font.name = "Times New Roman"
        run.font.size = Pt(font_size)
        run.font.color.rgb = RGBColor(0, 0, 0)
        run.font.bold = is_bold
        run.font.italic = is_italic
        if underline:
            run.font.underline = True


def _strip_chat_chatter(lines: List[str]) -> List[str]:
    """Loại bỏ lời chào/lời dẫn ở đầu và lời hướng dẫn/chém gió ở cuối tin nhắn chat khi xuất Word."""
    # 1. Cắt phần lời dẫn ở đầu nếu có văn bản chính thức bên dưới
    intro_markers = (
        "thưa anh", "thưa chị", "chào anh", "chào bạn", "dưới đây là",
        "để anh có thể", "em đã hiểu", "em xin gửi", "sau đây là",
    )
    first_doc_idx = None
    has_intro = any(any(m in ln.lower() for m in intro_markers) for ln in lines[:8])
    if has_intro:
        for idx, ln in enumerate(lines[:20]):
            low = re.sub(r"<[^>]+>", "", ln).strip().lower()
            if not low:
                continue
            if any(m in low for m in intro_markers) or low.endswith("trực tiếp:") or low.endswith("như sau:"):
                continue
            # Nếu gặp bảng Quốc hiệu, hoặc tên cơ quan (UBND, BCH, ĐỒN, CÔNG TY, SỞ, BỘ...), hoặc KẾ HOẠCH/BÁO CÁO
            if (
                "cộng hòa xã hội" in low
                or (ln.strip().startswith("|") and "cộng hòa" in low)
                or re.match(r"^(bch|ubnd|ban |đồn |công ty|sở |bộ |trường |kế hoạch|báo cáo|tờ trình|công văn|quyết định|thông báo)\b", low)
                or ln.strip().startswith("# ")
            ):
                first_doc_idx = idx
                break
    if first_doc_idx is not None and first_doc_idx > 0:
        lines = lines[first_doc_idx:]

    # 2. Cắt phần lời kết/hướng dẫn chat ở cuối (sau phần chữ ký hoặc nội dung chính)
    outro_markers = (
        "📂", "👉", "💡", "file word đã sẵn sàng", "em đã tự động tạo",
        "em đã tự động sinh", "anh chỉ cần mở", "anh chỉ cần bấm",
        "hướng dẫn tải file thật", "nếu anh cần điều chỉnh", "nếu anh muốn",
    )
    cut_idx = len(lines)
    start_scan = max(0, len(lines) - 18)
    for idx in range(start_scan, len(lines)):
        low = lines[idx].strip().lower()
        if any(m in low for m in outro_markers):
            # Nếu ngay trước đó là dòng '---', cắt luôn dòng '---'
            cut_idx = idx - 1 if (idx > 0 and _is_divider_line(lines[idx - 1])) else idx
            break
    return lines[:cut_idx]


def _render_pipe_cells(doc, left_lines: List[str], right_lines: List[str], is_header: bool = False, is_signature: bool = False) -> None:
    if is_header:
        _render_admin_header(doc, left_lines, right_lines)
        return
    table = doc.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    if is_signature:
        _set_table_borderless(table)
    for c_idx, cell_lines in enumerate((left_lines, right_lines)):
        cell = table.rows[0].cells[c_idx]
        if is_signature:
            cell.width = Mm(82) if c_idx == 0 else Mm(83)
        cell.text = ""
        p_idx = 0
        for ln in cell_lines:
            ln = ln.strip()
            if not ln:
                continue
            p = cell.paragraphs[0] if p_idx == 0 else cell.add_paragraph()
            p_idx += 1
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            if is_signature and c_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                is_nn = "nơi nhận" in ln.lower()
                _add_formatted_runs(p, ln, font_size=12 if is_nn else 11, default_bold=is_nn, default_italic=is_nn)
            elif is_signature and c_idx == 1:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                is_note = ln.startswith("(") or ln.startswith("*(")
                if is_note:
                    p.paragraph_format.space_before = Pt(24)
                _add_formatted_runs(p, ln, font_size=13, default_bold=not is_note, default_italic=is_note)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                _add_formatted_runs(p, ln, font_size=13)


def _is_divider_line(line: str) -> bool:
    s = re.sub(r"<[^>]+>", "", line or "").strip()
    if not s:
        return True
    return bool(re.fullmatch(r"[-_=*·•\s]{3,}", s))


def _render_admin_header(doc, left_lines: List[str], right_lines: List[str]) -> None:
    table = doc.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    _set_table_borderless(table)

    left_cell, right_cell = table.rows[0].cells
    left_cell.width = Mm(75)
    right_cell.width = Mm(90)

    # Cột trái: Cơ quan chủ quản, đơn vị, số văn bản
    left_cell.text = ""
    for idx, raw in enumerate(left_lines):
        p = left_cell.paragraphs[0] if idx == 0 else left_cell.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.15
        clean = re.sub(r"<[^>]+>", "", raw).replace("**", "").strip()
        is_so = clean.lower().startswith("số:")
        is_unit = (idx == len(left_lines) - 2 and any("số:" in x.lower() for x in left_lines)) or (
            not is_so and idx == len(left_lines) - 1
        )
        if is_so:
            p.paragraph_format.space_before = Pt(4)
        _add_formatted_runs(
            p,
            clean,
            font_size=13,
            default_bold=(not is_so and idx > 0),
            underline=is_unit,
        )

    # Cột phải: Quốc hiệu, Tiêu ngữ, Địa danh ngày tháng (sắp xếp đúng thứ tự chuẩn NĐ 30)
    def _right_sort_key(raw_line: str) -> int:
        low_s = re.sub(r"<[^>]+>", "", raw_line).lower()
        if "cộng hòa xã hội" in low_s:
            return 0
        if "độc lập" in low_s and "hạnh phúc" in low_s:
            return 1
        if "ngày" in low_s and "tháng" in low_s:
            return 2
        return 3

    right_lines = sorted(right_lines, key=_right_sort_key)
    right_cell.text = ""
    for idx, raw in enumerate(right_lines):
        p = right_cell.paragraphs[0] if idx == 0 else right_cell.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.15
        clean = re.sub(r"<[^>]+>", "", raw).replace("**", "").strip()
        low = clean.lower()
        is_quoc_hieu = "cộng hòa xã hội" in low
        is_tieu_ngu = "độc lập" in low and "hạnh phúc" in low
        is_date = ("ngày" in low and "tháng" in low) or (clean.startswith("*") and clean.endswith("*"))
        if is_date:
            p.paragraph_format.space_before = Pt(6)
            _add_formatted_runs(p, clean.strip("*"), font_size=13, default_italic=True)
        elif is_tieu_ngu:
            _add_formatted_runs(p, clean, font_size=13, default_bold=True, underline=True)
        else:
            _add_formatted_runs(p, clean, font_size=12 if is_quoc_hieu else 13, default_bold=True)


def _render_html_table(doc, table_html: str) -> None:
    rows_raw = re.findall(r"(?is)<tr[^>]*>(.*?)</tr>", table_html)
    if not rows_raw:
        return
    parsed_rows: List[List[str]] = []
    for r_html in rows_raw:
        cells = re.findall(r"(?is)<t[dh][^>]*>(.*?)</t[dh]>", r_html)
        if cells:
            parsed_rows.append(cells)
    if not parsed_rows:
        return

    num_cols = max(len(r) for r in parsed_rows)
    table = doc.add_table(rows=len(parsed_rows), cols=num_cols)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    is_signature_table = "nơi nhận" in table_html.lower() or "t/m" in table_html.lower() or "ký tên" in table_html.lower()
    if is_signature_table or "border: none" in table_html.lower():
        _set_table_borderless(table)

    for r_idx, row_cells in enumerate(parsed_rows):
        for c_idx, cell_html in enumerate(row_cells):
            cell = table.rows[r_idx].cells[c_idx]
            if is_signature_table and num_cols == 2:
                cell.width = Mm(82) if c_idx == 0 else Mm(83)
            cell_text = _clean_html_inline(cell_html)
            lines = [ln.strip() for ln in cell_text.split("\n")]
            cell.text = ""
            p_idx = 0
            for ln in lines:
                if not ln:
                    if is_signature_table and c_idx == 1 and p_idx > 0:
                        p = cell.add_paragraph()
                        p.paragraph_format.space_before = Pt(0)
                        p.paragraph_format.space_after = Pt(10)
                        p_idx += 1
                    continue
                p = cell.paragraphs[0] if p_idx == 0 else cell.add_paragraph()
                p_idx += 1
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.line_spacing = 1.15
                if is_signature_table and c_idx == 0:
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    is_noi_nhan = "nơi nhận" in ln.lower()
                    _add_formatted_runs(
                        p,
                        ln,
                        font_size=12 if is_noi_nhan else 11,
                        default_bold=is_noi_nhan,
                        default_italic=is_noi_nhan,
                    )
                elif is_signature_table and c_idx == 1:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    is_note = ln.startswith("(") or ln.startswith("*(")
                    _add_formatted_runs(
                        p,
                        ln,
                        font_size=13,
                        default_bold=not is_note,
                        default_italic=is_note,
                    )
                else:
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    _add_formatted_runs(p, ln, font_size=13)


def export_text_to_docx(content: str, title: str = "Tài Liệu KINI AI") -> str:
    """
    Xuất nội dung văn bản thành file Word (.docx) chuẩn khổ A4 & thể thức Nghị định 30/2020/NĐ-CP:
    - Khổ giấy A4: 210mm x 297mm
    - Lề: Trên 20mm, Dưới 20mm, Trái 30mm, Phải 15mm
    - Font: Times New Roman, cỡ chữ 14pt (nội dung), màu đen chuẩn mực
    - Tự động chuyển Quốc hiệu/Tiêu ngữ & Nơi nhận/Chữ ký thành bảng 2 cột không viền chuẩn hành chính.
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

    # 1. Tách các bảng HTML (<table>...</table>) ra trước để dựng thành bảng Word thật
    tables_found: List[str] = []

    def _replace_table(match):
        idx = len(tables_found)
        tables_found.append(match.group(0))
        return f"\n__KINI_TABLE_{idx}__\n"

    processed = re.sub(r"(?is)<table\b[^>]*>.*?</table>", _replace_table, content or "")

    # 2. Chuẩn hóa <br> thành xuống dòng, bỏ thẻ <div> mở/đóng nhưng giữ đánh dấu căn giữa nếu có (trừ khối Quốc hiệu float:right)
    processed = re.sub(r"(?i)<br\s*/?>\s*\n?", "\n", processed)

    def _mark_center_div(m):
        full_tag = m.group(0)
        inner = m.group(1)
        if "float:" in full_tag.lower() or "cộng hòa xã hội" in inner.lower():
            return "\n" + inner + "\n"
        return "\n__CENTER_START__\n" + inner + "\n__CENTER_END__\n"

    processed = re.sub(r"(?is)<div[^>]*text-align:\s*center[^>]*>(.*?)</div>", _mark_center_div, processed)
    processed = re.sub(r"(?i)</?div[^>]*>", "\n", processed)
    processed = re.sub(r"(?i)<hr\s*/?>", "\n", processed)

    raw_lines = _strip_chat_chatter([ln.strip() for ln in processed.split("\n")])

    # 3. Nhận diện khối Quốc hiệu & Cơ quan ban hành ở đầu văn bản
    start_idx = 0
    top_slice = [ln for ln in raw_lines[:22] if ln]
    has_quoc_hieu = (
        bool(top_slice)
        and not top_slice[0].startswith("|")
        and any("cộng hòa xã hội chủ nghĩa việt nam" in ln.lower() for ln in top_slice)
    )
    if has_quoc_hieu:
        left_lines: List[str] = []
        right_lines: List[str] = []
        in_right = False
        for idx, ln in enumerate(raw_lines):
            if idx > 28:
                break
            if not ln or _is_divider_line(ln):
                if in_right and right_lines and idx > 3:
                    start_idx = idx + 1
                    break
                continue
            low = re.sub(r"<[^>]+>", "", ln).lower()
            if "__center_start__" in low or any(k in low for k in ["kế hoạch", "báo cáo", "tờ trình", "công văn", "quyết định", "thông báo"]) and len(low) < 40 and ("cộng hòa" not in low):
                start_idx = idx
                break
            if "cộng hòa xã hội" in low:
                in_right = True
                right_lines.append(ln)
            elif in_right:
                right_lines.append(ln)
            else:
                # Nếu dòng ngày tháng bị đặt bên trái trước thẻ div, chuyển sang cột phải
                if ("ngày" in low and "tháng" in low and "năm" in low):
                    right_lines.append(ln)
                else:
                    left_lines.append(ln)
            start_idx = idx + 1

        if left_lines or right_lines:
            _render_admin_header(doc, left_lines, right_lines)
            spacer = doc.add_paragraph()
            spacer.paragraph_format.space_before = Pt(0)
            spacer.paragraph_format.space_after = Pt(6)

    # 4. Duyệt phần nội dung còn lại
    in_center_block = False
    for line in raw_lines[start_idx:]:
        stripped = line.strip()
        if not stripped or stripped.startswith("```"):
            continue
        if stripped == "__CENTER_START__":
            in_center_block = True
            continue
        if stripped == "__CENTER_END__":
            in_center_block = False
            continue
        if _is_divider_line(stripped):
            continue

        # Xử lý bảng Markdown dạng | cột trái | cột phải | (Quốc hiệu hoặc Nơi nhận/Chữ ký)
        if stripped.startswith("|") and stripped.endswith("|") and stripped.count("|") >= 3:
            if re.fullmatch(r"[\|\s:-]+", stripped):
                continue
            cols = [c.strip() for c in stripped.strip("|").split("|")]
            if len(cols) >= 2:
                def _split_cell(c_text: str) -> List[str]:
                    # Tách theo xuống dòng hoặc 2+ dấu cách liên tiếp (khi innerText gộp <br> thành 2 spaces)
                    parts_c = re.split(r"\n|\s{2,}", c_text)
                    return [x.strip() for x in parts_c if x.strip()]

                l_lines = _split_cell(cols[0])
                r_lines = _split_cell(cols[1])
                low_all = stripped.lower()
                if "cộng hòa xã hội" in low_all:
                    _render_pipe_cells(doc, l_lines, r_lines, is_header=True)
                elif "nơi nhận" in low_all or "t/m" in low_all or "ký tên" in low_all:
                    _render_pipe_cells(doc, l_lines, r_lines, is_signature=True)
                else:
                    _render_pipe_cells(doc, l_lines, r_lines)
                continue

        tbl_match = re.fullmatch(r"__KINI_TABLE_(\d+)__", stripped)
        if tbl_match:
            t_idx = int(tbl_match.group(1))
            if 0 <= t_idx < len(tables_found):
                _render_html_table(doc, tables_found[t_idx])
            continue

        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.2
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(5)

        plain_check = re.sub(r"<[^>]+>", "", stripped).replace("**", "").replace("*", "").strip()

        if in_center_block or plain_check in ("KẾ HOẠCH", "BÁO CÁO", "TỜ TRÌNH", "THÔNG BÁO", "QUYẾT ĐỊNH"):
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(4)
            _add_formatted_runs(p, stripped, font_size=14, default_bold=True)
        elif stripped.startswith("### ") or stripped.startswith("## ") or stripped.startswith("# "):
            level_text = re.sub(r"^#{1,3}\s+", "", stripped)
            if stripped.startswith("# "):
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                p.paragraph_format.space_before = Pt(6)
            _add_formatted_runs(p, level_text, font_size=14, default_bold=True)
        elif re.match(r"^[IVX]+\.\s+", plain_check):
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.first_line_indent = Mm(12.7)
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(4)
            _add_formatted_runs(p, stripped, font_size=14, default_bold=True)
        elif re.match(r"^\d+\.\s+[^:]{2,80}:", plain_check):
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.first_line_indent = Mm(12.7)
            colon_pos = stripped.find(":")
            head_part = stripped[:colon_pos + 1].replace("**", "")
            tail_part = stripped[colon_pos + 1:].lstrip()
            if tail_part.startswith("**"):
                tail_part = tail_part[2:].lstrip()
            _add_formatted_runs(p, head_part, font_size=14, default_bold=True)
            if tail_part:
                _add_formatted_runs(p, " " + tail_part, font_size=14, default_bold=False)
        elif stripped.startswith("- ") or (stripped.startswith("* ") and not stripped.endswith("*")):
            p.paragraph_format.left_indent = Mm(12.7)
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            _add_formatted_runs(p, "- " + stripped[2:].strip(), font_size=14)
        else:
            p.paragraph_format.first_line_indent = Mm(12.7)
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            _add_formatted_runs(p, stripped, font_size=14)

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
