import os
import csv
import io
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("FileParser")

def parse_uploaded_file(file_path: str, filename: str) -> Dict[str, Any]:
    """
    Trích xuất nội dung văn bản từ các tệp tài liệu:
    PDF, DOCX, XLSX, CSV, TXT, MD, PY, JSON, HTML, v.v.
    """
    ext = os.path.splitext(filename)[1].lower()
    
    try:
        # 1. Tệp văn bản thuần (TXT, MD, PY, JSON, LOG, HTML, JS...)
        if ext in [".txt", ".md", ".py", ".json", ".js", ".html", ".css", ".log", ".xml", ".yaml", ".yml", ".sql", ".sh", ".bat"]:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            return {
                "success": True,
                "file_type": "text",
                "filename": filename,
                "text": content[:25000] # Giới hạn tối đa 25,000 ký tự
            }

        # 2. Tệp PDF
        elif ext == ".pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(file_path)
                pages_text = []
                for idx, page in enumerate(reader.pages[:40]): # Tối đa 40 trang
                    t = page.extract_text()
                    if t:
                        pages_text.append(f"--- Trang {idx+1} ---\n{t.strip()}")
                full_text = "\n\n".join(pages_text)
                return {
                    "success": True,
                    "file_type": "pdf",
                    "filename": filename,
                    "text": full_text[:30000]
                }
            except Exception as e:
                logger.error(f"Lỗi đọc PDF: {e}")
                return {"success": False, "filename": filename, "error": f"Không thể đọc file PDF: {e}"}

        # 3. Tệp Word (.docx, .doc)
        elif ext in [".docx", ".doc"]:
            try:
                import docx
                doc = docx.Document(file_path)
                paras = [p.text for p in doc.paragraphs if p.text.strip()]
                # Đọc cả bảng trong word nếu có
                tables_data = []
                for table in doc.tables[:5]:
                    t_rows = []
                    for row in table.rows:
                        t_rows.append(" | ".join(cell.text.strip() for cell in row.cells))
                    if t_rows:
                        tables_data.append("\n".join(t_rows))
                
                full_text = "\n".join(paras)
                if tables_data:
                    full_text += "\n\n[Bảng dữ liệu trích xuất]:\n" + "\n\n".join(tables_data)

                return {
                    "success": True,
                    "file_type": "docx",
                    "filename": filename,
                    "text": full_text[:30000]
                }
            except Exception as docx_err:
                # Fallback 1: File .docx/.doc thực chất là gói OOXML ZIP nhưng sai Content-Type (vd: themeManager+xml)
                try:
                    import zipfile
                    import xml.etree.ElementTree as ET
                    if zipfile.is_zipfile(file_path):
                        with zipfile.ZipFile(file_path, "r") as zf:
                            xml_candidates = [n for n in zf.namelist() if n.endswith("document.xml") or n.startswith("word/")]
                            if "word/document.xml" in zf.namelist():
                                xml_candidates = ["word/document.xml"]
                            extracted_paras = []
                            for xml_name in xml_candidates:
                                if not xml_name.endswith(".xml"):
                                    continue
                                data = zf.read(xml_name)
                                root = ET.fromstring(data)
                                for p_elem in root.iter():
                                    if p_elem.tag.endswith("}p") or p_elem.tag == "p":
                                        texts = [t.text for t in p_elem.iter() if (t.tag.endswith("}t") or t.tag == "t") and t.text]
                                        line = "".join(texts).strip()
                                        if line:
                                            extracted_paras.append(line)
                            if extracted_paras:
                                return {
                                    "success": True,
                                    "file_type": "docx_xml",
                                    "filename": filename,
                                    "text": "\n".join(extracted_paras)[:30000]
                                }
                except Exception:
                    pass

                # Fallback 2: File .doc lưu dưới dạng HTML/MHT hoặc RTF
                try:
                    import re, html
                    with open(file_path, "rb") as rf:
                        raw = rf.read(500000)
                    head_lower = raw[:2048].lower()
                    if b"<html" in head_lower or b"mime-version:" in head_lower:
                        decoded = raw.decode("utf-8", errors="ignore")
                        cleaned = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", decoded)
                        cleaned = re.sub(r"(?is)<[^>]+>", "\n", cleaned)
                        cleaned = html.unescape(cleaned)
                        lines = [ln.strip() for ln in cleaned.splitlines() if ln.strip()]
                        if lines:
                            return {
                                "success": True,
                                "file_type": "doc_html",
                                "filename": filename,
                                "text": "\n".join(lines)[:30000]
                            }
                except Exception:
                    pass

                # Fallback 3: File .doc nhị phân cũ (Word 97-2003) trên Windows qua MS Word COM nếu có
                if ext == ".doc" and os.name == "nt":
                    try:
                        import pythoncom
                        import win32com.client
                        pythoncom.CoInitialize()
                        word = win32com.client.Dispatch("Word.Application")
                        word.Visible = False
                        doc_com = word.Documents.Open(os.path.abspath(file_path), ReadOnly=True)
                        com_text = doc_com.Content.Text or ""
                        doc_com.Close(False)
                        word.Quit()
                        if com_text.strip():
                            return {
                                "success": True,
                                "file_type": "doc_com",
                                "filename": filename,
                                "text": com_text.strip()[:30000]
                            }
                    except Exception:
                        pass

                logger.error(f"Lỗi đọc DOCX/DOC: {docx_err}")
                return {
                    "success": False,
                    "filename": filename,
                    "error": f"Không thể đọc file Word '{filename}'. Nếu đây là file .doc đời cũ hoặc định dạng đặc biệt, anh hãy mở bằng Word rồi Save As sang .docx (hoặc chụp ảnh/PDF) để nạp nhé! ({docx_err})"
                }

        # 4. Tệp Excel (.xlsx, .xls)
        elif ext in [".xlsx", ".xls"]:
            try:
                import openpyxl
                wb = openpyxl.load_workbook(file_path, data_only=True)
                sheets_output = []
                for sheet_name in wb.sheetnames[:5]: # Tối đa 5 sheet đầu
                    ws = wb[sheet_name]
                    rows_text = []
                    for row in list(ws.iter_rows(values_only=True))[:100]: # Tối đa 100 dòng
                        row_vals = [str(c) if c is not None else "" for c in row]
                        if any(row_vals):
                            rows_text.append(" | ".join(row_vals))
                    if rows_text:
                        sheets_output.append(f"### Sheet: {sheet_name}\n" + "\n".join(rows_text))

                return {
                    "success": True,
                    "file_type": "excel",
                    "filename": filename,
                    "text": "\n\n".join(sheets_output)[:30000]
                }
            except Exception as e:
                logger.error(f"Lỗi đọc Excel: {e}")
                return {"success": False, "filename": filename, "error": f"Không thể đọc file Excel: {e}"}

        # 5. Tệp CSV
        elif ext == ".csv":
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    reader = csv.reader(f)
                    lines = [" | ".join(row) for idx, row in enumerate(reader) if idx < 150]
                return {
                    "success": True,
                    "file_type": "csv",
                    "filename": filename,
                    "text": "\n".join(lines)[:25000]
                }
            except Exception as e:
                return {"success": False, "filename": filename, "error": f"Lỗi đọc CSV: {e}"}

        else:
            return {
                "success": False,
                "filename": filename,
                "error": f"Định dạng tệp {ext} chưa được hỗ trợ trích xuất văn bản trực tiếp."
            }

    except Exception as e:
        return {"success": False, "filename": filename, "error": str(e)}
