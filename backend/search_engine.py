import os
import re
import urllib.parse
import requests
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("SearchEngine")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
}

def extract_core_search_query(text: str) -> str:
    """Trích xuất từ khóa cốt lõi từ câu hỏi"""
    clean_t = text.strip()
    
    # 1. Nếu có chứa Điều/Khoản và tên Luật/Nghị định/Nghị quyết
    law_match = re.search(r'(Điều\s+\d+.*?(?:Luật|Nghị định|Thông tư|Nghị quyết|Quyết định|Pháp lệnh)[^\?,\n]+)', clean_t, re.IGNORECASE)
    if law_match:
        return law_match.group(1).replace("-", " ").strip()

    # 2. Nếu hỏi tên văn bản cụ thể
    doc_match = re.search(r'((?:Luật|Nghị định|Thông tư|Nghị quyết|Quyết định)\s+[\w\d\/\-]+[^\?,\n]*)', clean_t, re.IGNORECASE)
    if doc_match:
        return doc_match.group(1).replace("-", " ").strip()

    # 3. Lọc bỏ các từ đệm xưng hô
    filler_patterns = [
        r'^(vậy\s+)?(em\s+)?(hãy\s+)?(cho\s+anh\s+biết|nêu|trích\s+dẫn|tìm|tra\s+cứu|giải\s+thích|cho\s+tôi\s+biết|báo\s+cáo)\s*',
        r'^(nội\s+dung\s+)?(nguyên\s+văn\s+)?(khoản\s+[\d\s,và\.]*\s+)?(của\s+)?',
        r'(như\s+thế\s+nào|là\s+gì|ở\s+đâu|\?)+$'
    ]
    for p in filler_patterns:
        clean_t = re.sub(p, '', clean_t, flags=re.IGNORECASE).strip()

    return clean_t if len(clean_t) >= 4 else text.strip()

def fetch_verbatim_law_article(text: str) -> Optional[str]:
    """
    Tự động truy xuất nguyên văn toàn bộ Điều luật từ các cổng dữ liệu chính phủ
    (xaydungchinhsach.chinhphu.vn, congbao.chinhphu.vn, hethongphapluat.com)
    """
    article_match = re.search(r'Điều\s+(\d+)', text, re.IGNORECASE)
    if not article_match:
        return None

    article_num = int(article_match.group(1))
    next_article_num = article_num + 1
    core_q = extract_core_search_query(text)

    try:
        from bs4 import BeautifulSoup
        res = requests.post("https://lite.duckduckgo.com/lite/", data={"q": f"{core_q} toan van"}, headers=HEADERS, timeout=8)
        if res.status_code != 200:
            return None

        soup = BeautifulSoup(res.text, "html.parser")
        candidate_urls = []
        for a in soup.select("table tr a"):
            href = a.get("href", "")
            if href and ("chinhphu.vn" in href or "hethongphapluat.com" in href or "luatvietnam.vn" in href or "luatminhkhue.vn" in href or "thuvienphapluat.vn" in href):
                if not href.startswith("/"):
                    candidate_urls.append(href)

        # Ưu tiên các trang có toàn văn văn bản
        candidate_urls.sort(key=lambda u: 0 if ("xaydungchinhsach" in u or "toan-van" in u or "hethongphapluat" in u) else 1)

        for url in candidate_urls[:5]:
            try:
                page_res = requests.get(url, headers=HEADERS, timeout=8)
                if page_res.status_code == 200:
                    page_soup = BeautifulSoup(page_res.text, "html.parser")
                    body = page_soup.select_one('.detail-content') or page_soup.select_one('article') or page_soup
                    page_text = body.get_text(separator="\n")
                    
                    # Regex tìm chính xác Điều {article_num} đến Điều {next_article_num}
                    pattern = rf'(Điều\s+{article_num}\.[\s\S]+?)(?=(?:Điều\s+{next_article_num}\.|\Z))'
                    match = re.search(pattern, page_text)
                    if match:
                        raw_article = match.group(1).strip()
                        raw_lines = [l.strip() for l in raw_article.split("\n") if l.strip()]
                        
                        # Chuẩn hóa nếu thiếu số 1. ở khoản đầu tiên
                        formatted_lines = []
                        has_first_num = False
                        for i, line in enumerate(raw_lines):
                            if i == 1 and not line.startswith("1.") and re.match(r'^[A-ZÀ-Ỹ]', line) and not line.startswith("Điều"):
                                line = "1. " + line
                            formatted_lines.append(line)
                            
                        clean_article = "\n".join(formatted_lines)
                        logger.info(f"Đã trích xuất NGUYÊN VĂN Điều {article_num} thành công từ {url}")
                        return (
                            f"=== VĂN BẢN GỐC CHÍNH THỨC NGUYÊN VĂN (TRÍCH TỪ {url}) ===\n"
                            f"{clean_article}\n"
                            f"=== YÊU CẦU BẮT BUỘC: ĐÂY LÀ VĂN BẢN PHÁP LUẬT NGUYÊN VĂN CHUẨN XÁC 100%. "
                            f"KINI PHẢI TRÍCH DẪN ĐÚNG Y HỆT NGUYÊN VĂN TỪNG TỪ, TỪNG CHỮ CỦA ĐIỀU {article_num} NÀY. "
                            f"TUYỆT ĐỐI KHÔNG DÙNG TRÍ NHỚ CŨ BỊ SAI VỀ ĐIỀU KHOẢN NÀY! ==="
                        )
            except Exception as e:
                continue

    except Exception as e:
        logger.warning(f"Lỗi truy xuất nguyên văn điều luật: {e}")

    return None

def search_live_web(query: str, max_results: int = 6) -> List[Dict[str, str]]:
    """Tra cứu DuckDuckGo Lite cho thông tin mới nhất"""
    target_q = extract_core_search_query(query)
    clean_q = re.sub(r'["\']', '', target_q).strip()
    if not clean_q:
        return []

    results = []
    try:
        res = requests.post("https://lite.duckduckgo.com/lite/", data={"q": clean_q}, headers=HEADERS, timeout=7)
        if res.status_code == 200:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(res.text, "html.parser")
            snippets = soup.select(".result-snippet")
            for s in snippets:
                t = s.get_text(strip=True)
                if t and len(t) > 15:
                    results.append({"title": clean_q, "snippet": t})
                if len(results) >= max_results:
                    break
    except Exception as e:
        logger.warning(f"Lỗi tra cứu DuckDuckGo Lite: {e}")

    return results

def needs_live_search(text: str) -> bool:
    """Xác định xem câu hỏi có cần tra cứu trực tuyến thời gian thực không"""
    keywords = [
        "luật", "nghị định", "thông tư", "nghị quyết", "quyết định", "điều", "khoản",
        "thư viện pháp luật", "thuvienphapluat", "hôm nay", "mới nhất", "năm 2025", 
        "năm 2026", "năm 2024", "giá", "thời tiết", "tin tức", "sự kiện", "văn bản", "pháp lệnh",
        "hướng dẫn", "quy chế", "quy chuẩn", "chỉ thị"
    ]
    t = text.lower()
    return any(k in t for k in keywords)

def get_grounded_context(user_query: str) -> str:
    """
    Tập hợp context chính thức: Ưu tiên trích xuất nguyên văn điều luật,
    kết hợp kết quả tra cứu trực tuyến thời gian thực cập nhật từng ngày.
    """
    # 1. Nếu có Điều luật cụ thể, truy xuất nguyên văn chính xác
    verbatim_text = fetch_verbatim_law_article(user_query)
    if verbatim_text:
        return verbatim_text

    # 2. Nếu không, tra cứu thông tin trực tuyến mới nhất
    snippets = search_live_web(user_query)
    if snippets:
        lines = ["=== KẾT QUẢ TRA CỨU TRỰC TUYẾN THỜI GIAN THỰC (CẬP NHẬT TỪNG NGÀY) ==="]
        for idx, r in enumerate(snippets, 1):
            lines.append(f"[{idx}] {r['snippet']}")
        lines.append("=== LƯU Ý BẮT BUỘC CHO KINI: Dựa vào thông tin chính thức trên để trích dẫn NGUYÊN VĂN, CHÍNH XÁC TỪNG TỪ, TỪNG CHỮ. Tuyệt đối không trả lời 'cho có'. ===")
        return "\n".join(lines)

    return ""
