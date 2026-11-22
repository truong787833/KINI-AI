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

def fetch_google_news_top(limit: int = 8) -> List[Dict[str, str]]:
    """Lấy danh sách tin tức thời sự hàng đầu hôm nay từ Google News RSS"""
    results = []
    try:
        import xml.etree.ElementTree as ET
        url = "https://news.google.com/rss?hl=vi&gl=VN&ceid=VN:vi"
        res = requests.get(url, headers=HEADERS, timeout=7)
        if res.status_code == 200:
            root = ET.fromstring(res.content)
            for it in root.findall('.//item')[:limit]:
                t = it.find('title').text if it.find('title') is not None else ""
                d = it.find('pubDate').text if it.find('pubDate') is not None else ""
                if t:
                    results.append({"title": t, "date": d, "source": "Google News"})
    except Exception as e:
        logger.warning(f"Lỗi lấy Google News Top: {e}")
    return results

def fetch_google_news_search(query: str, limit: int = 6) -> List[Dict[str, str]]:
    """Tìm kiếm tin tức chuyên sâu theo chủ đề từ Google News RSS"""
    results = []
    clean_q = extract_core_search_query(query)
    try:
        import xml.etree.ElementTree as ET
        encoded_q = urllib.parse.quote(clean_q)
        url = f"https://news.google.com/rss/search?q={encoded_q}&hl=vi&gl=VN&ceid=VN:vi"
        res = requests.get(url, headers=HEADERS, timeout=7)
        if res.status_code == 200:
            root = ET.fromstring(res.content)
            for it in root.findall('.//item')[:limit]:
                t = it.find('title').text if it.find('title') is not None else ""
                d = it.find('pubDate').text if it.find('pubDate') is not None else ""
                if t:
                    results.append({"title": t, "date": d, "source": "Google News"})
    except Exception as e:
        logger.warning(f"Lỗi tìm kiếm Google News cho '{query}': {e}")
    return results

def fetch_vnexpress_latest(limit: int = 6) -> List[Dict[str, str]]:
    """Lấy tin tức mới nhất từng phút từ Báo VnExpress RSS"""
    results = []
    try:
        import xml.etree.ElementTree as ET
        from bs4 import BeautifulSoup
        url = "https://vnexpress.net/rss/tin-moi-nhat.rss"
        res = requests.get(url, headers=HEADERS, timeout=7)
        if res.status_code == 200:
            root = ET.fromstring(res.content)
            for it in root.findall('.//item')[:limit]:
                t = it.find('title').text if it.find('title') is not None else ""
                d = it.find('pubDate').text if it.find('pubDate') is not None else ""
                desc_raw = it.find('description').text if it.find('description') is not None else ""
                # Bóc tách text thuần từ HTML description
                snippet = BeautifulSoup(desc_raw, "html.parser").get_text(strip=True) if desc_raw else ""
                if t:
                    results.append({"title": t, "date": d, "snippet": snippet, "source": "VnExpress"})
    except Exception as e:
        logger.warning(f"Lỗi lấy VnExpress RSS: {e}")
    return results

def search_duckduckgo_html(query: str, limit: int = 5) -> List[Dict[str, str]]:
    """Tra cứu công cụ tìm kiếm DuckDuckGo HTML để lấy đoạn trích (snippets) chi tiết"""
    clean_q = extract_core_search_query(query)
    results = []
    try:
        from bs4 import BeautifulSoup
        res = requests.post("https://html.duckduckgo.com/html/", data={"q": clean_q}, headers=HEADERS, timeout=7)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, "html.parser")
            for r in soup.select(".result__body")[:limit]:
                t_elem = r.select_one(".result__title")
                s_elem = r.select_one(".result__snippet")
                t_txt = t_elem.get_text(strip=True) if t_elem else ""
                s_txt = s_elem.get_text(strip=True) if s_elem else ""
                if s_txt and len(s_txt) > 20:
                    results.append({"title": t_txt, "snippet": s_txt, "source": "Web Search"})
    except Exception as e:
        logger.warning(f"Lỗi tìm kiếm DuckDuckGo HTML: {e}")
    return results

def search_live_web(query: str, max_results: int = 6) -> List[Dict[str, str]]:
    """Hàm tương thích ngược gọi tìm kiếm chi tiết"""
    return search_duckduckgo_html(query, limit=max_results)

def needs_live_search(text: str) -> bool:
    """Xác định xem câu hỏi có cần tra cứu trực tuyến thời gian thực không (Báo chí, Thời sự, Google, Luật...)"""
    keywords = [
        "luật", "nghị định", "thông tư", "nghị quyết", "quyết định", "điều", "khoản",
        "thư viện pháp luật", "thuvienphapluat", "hôm nay", "mới nhất", "năm 2025", 
        "năm 2026", "năm 2024", "giá", "thời tiết", "tin tức", "tin", "bài báo", "báo", "sự kiện", 
        "thời sự", "báo chí", "google", "sáng nay", "tối nay", "đêm qua", "chiến sự", "bóng đá",
        "kết quả", "thế giới", "việt nam", "ở đâu", "ai là", "tổng thống", "thủ tướng", "chủ tịch",
        "chứng khoán", "vàng", "xăng dầu", "tình hình", "diễn biến", "quy chế", "chỉ thị"
    ]
    t = text.lower()
    return any(k in t for k in keywords)

def get_grounded_context(user_query: str) -> str:
    """
    Tập hợp context chính thức:
    1. Ưu tiên trích xuất nguyên văn điều luật nếu hỏi Luật/Nghị định.
    2. Nếu hỏi tin tức chung hoặc bài báo: Nạp trực tiếp Google News Top và VnExpress mới nhất trong ngày.
    3. Nếu hỏi chủ đề cụ thể: Tìm kiếm chuyên sâu Google News Topic và DuckDuckGo HTML snippets.
    Đảm bảo 100% dữ liệu thực tế, có nguồn báo và thời gian để AI trả lời chuẩn xác.
    """
    # 1. Nếu có Điều luật cụ thể, truy xuất nguyên văn chính xác
    verbatim_text = fetch_verbatim_law_article(user_query)
    if verbatim_text:
        return verbatim_text

    t_lower = user_query.lower()
    is_general_news = any(k in t_lower for k in [
        "tin tức", "tin mới", "bài báo", "thời sự hôm nay", "có gì mới", "tin nóng", 
        "tin trong ngày", "tin 24h", "báo chí", "tin nổi bật"
    ])

    news_items = []
    web_snippets = []

    if is_general_news:
        # Nạp tin tức hàng đầu từ Google News & VnExpress
        news_items.extend(fetch_google_news_top(limit=6))
        news_items.extend(fetch_vnexpress_latest(limit=4))
    else:
        # Tìm kiếm theo chủ đề cụ thể từ Google News và Web
        news_items.extend(fetch_google_news_search(user_query, limit=5))
        web_snippets.extend(search_duckduckgo_html(user_query, limit=4))

    # Ghép nối dữ liệu nguồn chính thống
    lines = [
        "=== DỮ LIỆU BÁO CHÍ & TÌM KIẾM THỰC TẾ THỜI GIAN THỰC (CẬP NHẬT TỪNG NGÀY NĂM 2026) ===",
        "Dưới đây là các thông tin và bài báo mới nhất được trích xuất trực tiếp từ các hãng thông tấn chính thống (Google News, VnExpress, Dân Trí, Tiền Phong, Tuổi Trẻ, v.v.):"
    ]

    count = 1
    for n in news_items:
        snippet_part = f" - Tóm tắt: {n['snippet']}" if n.get('snippet') else ""
        lines.append(f"[{count}] {n['title']} (Thời gian: {n.get('date', 'Mới nhất')}){snippet_part}")
        count += 1

    for w in web_snippets:
        lines.append(f"[{count}] {w['title']}: {w['snippet']}")
        count += 1

    if count > 1:
        lines.append(
            "\n=== QUY TẮC BẮT BUỘC VỀ ĐỘ CHÍNH XÁC (KHÔNG TRẢ LỜI CHO CÓ): ===\n"
            "1. Dựa trên các thông tin báo chí và kết quả tìm kiếm thực tế trên để trả lời đầy đủ, mạch lạc, trung thực.\n"
            "2. Nêu rõ tên cơ quan báo chí (như Báo Dân trí, Báo Tiền Phong, VnExpress, Tuổi Trẻ...) và thời gian bài viết để người dùng dễ kiểm chứng.\n"
            "3. TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT TIN TỨC hoặc thông tin sai lệch khi không có căn cứ xác thực."
        )
        return "\n".join(lines)

    return ""
