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

def fetch_google_news_top(limit: int = 6) -> List[Dict[str, str]]:
    """Lấy danh sách tin tức thời sự hàng đầu hôm nay từ Google News RSS kèm link dẫn chứng"""
    results = []
    try:
        from bs4 import BeautifulSoup
        import warnings
        from bs4 import XMLParsedAsHTMLWarning
        warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)
        
        url = "https://news.google.com/rss?hl=vi&gl=VN&ceid=VN:vi"
        res = requests.get(url, headers=HEADERS, timeout=7)
        if res.status_code == 200:
            soup = BeautifulSoup(res.content, "html.parser")
            for it in soup.select("item")[:limit]:
                t = it.select_one("title")
                l = it.select_one("link")
                d = it.select_one("pubdate")
                t_txt = t.get_text(strip=True) if t else ""
                d_txt = d.get_text(strip=True) if d else ""
                url_txt = ""
                if it.find("link") and it.find("link").next_sibling:
                    url_txt = str(it.find("link").next_sibling).strip()
                elif l:
                    url_txt = l.get_text(strip=True)
                if t_txt:
                    results.append({"title": t_txt, "date": d_txt, "url": url_txt, "source": "Google News"})
    except Exception as e:
        logger.warning(f"Lỗi lấy Google News Top: {e}")
    return results

def fetch_google_news_search(query: str, limit: int = 5) -> List[Dict[str, str]]:
    """Tìm kiếm tin tức chuyên sâu theo chủ đề từ Google News RSS kèm link dẫn chứng"""
    results = []
    clean_q = extract_core_search_query(query)
    try:
        from bs4 import BeautifulSoup
        import warnings
        from bs4 import XMLParsedAsHTMLWarning
        warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

        encoded_q = urllib.parse.quote(clean_q)
        url = f"https://news.google.com/rss/search?q={encoded_q}&hl=vi&gl=VN&ceid=VN:vi"
        res = requests.get(url, headers=HEADERS, timeout=7)
        if res.status_code == 200:
            soup = BeautifulSoup(res.content, "html.parser")
            for it in soup.select("item")[:limit]:
                t = it.select_one("title")
                l = it.select_one("link")
                d = it.select_one("pubdate")
                t_txt = t.get_text(strip=True) if t else ""
                d_txt = d.get_text(strip=True) if d else ""
                url_txt = ""
                if it.find("link") and it.find("link").next_sibling:
                    url_txt = str(it.find("link").next_sibling).strip()
                elif l:
                    url_txt = l.get_text(strip=True)
                if t_txt:
                    results.append({"title": t_txt, "date": d_txt, "url": url_txt, "source": "Google News"})
    except Exception as e:
        logger.warning(f"Lỗi tìm kiếm Google News cho '{query}': {e}")
    return results

def fetch_vnexpress_latest(limit: int = 5) -> List[Dict[str, str]]:
    """Lấy tin tức mới nhất từng phút từ Báo VnExpress RSS kèm link bài viết gốc"""
    results = []
    try:
        from bs4 import BeautifulSoup
        import warnings
        from bs4 import XMLParsedAsHTMLWarning
        warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

        url = "https://vnexpress.net/rss/tin-moi-nhat.rss"
        res = requests.get(url, headers=HEADERS, timeout=7)
        if res.status_code == 200:
            soup = BeautifulSoup(res.content, "html.parser")
            for it in soup.select("item")[:limit]:
                t = it.select_one("title")
                g = it.select_one("guid")
                d = it.select_one("pubdate")
                desc = it.select_one("description")
                t_txt = t.get_text(strip=True) if t else ""
                d_txt = d.get_text(strip=True) if d else ""
                url_txt = g.get_text(strip=True) if g else ""
                snippet = BeautifulSoup(desc.get_text(strip=True) if desc else "", "html.parser").get_text(strip=True)
                if t_txt:
                    results.append({"title": t_txt, "date": d_txt, "url": url_txt, "snippet": snippet, "source": "VnExpress"})
    except Exception as e:
        logger.warning(f"Lỗi lấy VnExpress RSS: {e}")
    return results

def search_web_duckduckgo(query: str, limit: int = 5) -> List[Dict[str, str]]:
    """Tra cứu công cụ tìm kiếm DuckDuckGo HTML để lấy đoạn trích (snippets) và URL dẫn chứng thực tế"""
    clean_q = extract_core_search_query(query)
    results = []
    try:
        from bs4 import BeautifulSoup
        res = requests.post("https://html.duckduckgo.com/html/", data={"q": clean_q}, headers=HEADERS, timeout=7)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, "html.parser")
            for r in soup.select(".result__body")[:limit]:
                a_elem = r.select_one(".result__title a")
                s_elem = r.select_one(".result__snippet")
                if a_elem:
                    raw_href = a_elem.get("href", "")
                    parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_href).query)
                    actual_url = parsed.get("uddg", [raw_href])[0]
                    t_txt = a_elem.get_text(strip=True)
                    s_txt = s_elem.get_text(strip=True) if s_elem else ""
                    if actual_url.startswith("http") and not "duckduckgo.com/y.js" in actual_url:
                        results.append({"title": t_txt, "url": actual_url, "snippet": s_txt, "source": "Google/Web Search"})
    except Exception as e:
        logger.warning(f"Lỗi tìm kiếm Web DuckDuckGo: {e}")
    return results

def search_github_repos(query: str, limit: int = 4) -> List[Dict[str, str]]:
    """Tìm kiếm kho lưu trữ mã nguồn, thư viện, dự án trên GitHub"""
    clean_q = extract_core_search_query(query)
    results = []
    try:
        url = f"https://api.github.com/search/repositories?q={urllib.parse.quote(clean_q)}&per_page={limit}"
        res = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=7)
        if res.status_code == 200:
            data = res.json()
            for it in data.get("items", [])[:limit]:
                name = it.get("full_name", "")
                desc = it.get("description", "") or ""
                url_repo = it.get("html_url", "")
                stars = it.get("stargazers_count", 0)
                results.append({
                    "title": f"GitHub: {name} (⭐ {stars} stars)",
                    "url": url_repo,
                    "snippet": desc,
                    "source": "GitHub"
                })
    except Exception as e:
        logger.warning(f"Lỗi tìm kiếm GitHub: {e}")
    return results

def search_youtube_videos(query: str, limit: int = 3) -> List[Dict[str, str]]:
    """Tìm kiếm video, bài giảng, hướng dẫn và phân tích trên YouTube"""
    clean_q = extract_core_search_query(query)
    results = []
    try:
        from bs4 import BeautifulSoup
        res = requests.post("https://html.duckduckgo.com/html/", data={"q": f"site:youtube.com {clean_q}"}, headers=HEADERS, timeout=7)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, "html.parser")
            for r in soup.select(".result__body"):
                a_elem = r.select_one(".result__title a")
                s_elem = r.select_one(".result__snippet")
                if a_elem:
                    raw_href = a_elem.get("href", "")
                    parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_href).query)
                    actual_url = parsed.get("uddg", [raw_href])[0]
                    if "youtube.com/watch" in actual_url or "youtube.com/@" in actual_url:
                        t_txt = a_elem.get_text(strip=True).replace(" - YouTube", "")
                        s_txt = s_elem.get_text(strip=True) if s_elem else ""
                        results.append({
                            "title": f"Video YouTube: {t_txt}",
                            "url": actual_url,
                            "snippet": s_txt,
                            "source": "YouTube"
                        })
                        if len(results) >= limit:
                            break
    except Exception as e:
        logger.warning(f"Lỗi tìm kiếm YouTube: {e}")
    return results

def search_wikipedia_facts(query: str, limit: int = 3) -> List[Dict[str, str]]:
    """Tìm kiếm bách khoa toàn thư Wikipedia (kiến thức học thuật, lịch sử, nhân vật, sự kiện chuẩn xác)"""
    clean_q = extract_core_search_query(query)
    results = []
    try:
        from bs4 import BeautifulSoup
        url = f"https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(clean_q)}&format=json&utf8="
        res = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=7)
        if res.status_code == 200:
            data = res.json()
            for it in data.get("query", {}).get("search", [])[:limit]:
                title = it.get("title", "")
                snippet = BeautifulSoup(it.get("snippet", ""), "html.parser").get_text(strip=True)
                url_wiki = "https://vi.wikipedia.org/wiki/" + title.replace(" ", "_")
                results.append({
                    "title": f"Wikipedia: {title}",
                    "url": url_wiki,
                    "snippet": snippet,
                    "source": "Wikipedia"
                })
    except Exception as e:
        logger.warning(f"Lỗi tìm kiếm Wikipedia: {e}")
    return results

def search_live_web(query: str, max_results: int = 6) -> List[Dict[str, str]]:
    """Hàm tương thích ngược tìm kiếm tổng hợp"""
    return search_web_duckduckgo(query, limit=max_results)

def needs_live_search(text: str) -> bool:
    """
    Xác định thông minh xem câu hỏi có cần tra cứu dữ liệu thực tế / dẫn chứng không:
    - Tin tức, báo chí, thời sự, năm 2026, ngày tháng, sự kiện nóng.
    - Lập trình, thư viện, mã nguồn GitHub.
    - Video, YouTube, nhạc, bài giảng.
    - Lịch sử, nhân vật, định nghĩa học thuật Wikipedia.
    - Pháp luật, nghị định, thông tư.
    - Giá cả, thời tiết, chứng khoán, thể thao.
    """
    t = text.lower().strip()
    # Nếu câu hỏi quá ngắn như "chào bạn", "ok", "cảm ơn" -> không cần tra cứu
    if len(t) < 5 or t in ["xin chào", "chào bạn", "hello", "hi", "ok", "cảm ơn", "tuyệt vời", "kini ai"]:
        return False

    keywords = [
        "luật", "nghị định", "thông tư", "nghị quyết", "quyết định", "điều", "khoản",
        "thư viện pháp luật", "thuvienphapluat", "hôm nay", "mới nhất", "năm 2025", 
        "năm 2026", "năm 2024", "giá", "thời tiết", "tin tức", "tin", "bài báo", "báo", "sự kiện", 
        "thời sự", "báo chí", "google", "sáng nay", "tối nay", "đêm qua", "chiến sự", "bóng đá",
        "kết quả", "thế giới", "việt nam", "ở đâu", "ai là", "tổng thống", "thủ tướng", "chủ tịch",
        "chứng khoán", "vàng", "xăng dầu", "tình hình", "diễn biến", "quy chế", "chỉ thị",
        "github", "repo", "thư viện", "code", "lập trình", "source code", "open source",
        "youtube", "video", "bài giảng", "xem", "kênh", "podcast",
        "lịch sử", "năm nào", "tiểu sử", "quê ở", "nguồn gốc", "định nghĩa", "khái niệm", "wiki",
        "facebook", "tiktok", "mạng xã hội", "xu hướng", "trend", "so sánh", "đánh giá", "review"
    ]
    return any(k in t for k in keywords)

def get_grounded_context(user_query: str) -> str:
    """
    SIÊU HỆ THỐNG TRÍ TUỆ ĐA NGUỒN (UNIVERSAL MULTI-SOURCE SEARCH & CITATION ENGINE):
    1. Tra cứu nguyên văn Điều luật từ Cổng thông tin Chính phủ & Thư viện Pháp luật.
    2. Tổng hợp luồng thời sự Google News & VnExpress cho các câu hỏi tin tức hôm nay.
    3. Tra cứu GitHub Public API cho các câu hỏi kỹ thuật, lập trình, thư viện, công nghệ.
    4. Tra cứu YouTube cho video, bài giảng, clip review.
    5. Tra cứu Wikipedia cho kiến thức lịch sử, học thuật, nhân vật, khái niệm ("cũ đều chuẩn xác").
    6. Tra cứu Google/Web Search đa nguồn cho tất cả các lĩnh vực khác.
    => Trả về đầy đủ Tiêu đề, Cơ quan phát hành, Thời gian và ĐƯỜNG LINK DẪN CHỨNG CHUẨN XÁC (URL) để AI trích dẫn.
    """
    # 1. Nếu có Điều luật cụ thể, ưu tiên trích xuất nguyên văn chính thức
    verbatim_text = fetch_verbatim_law_article(user_query)
    if verbatim_text:
        return verbatim_text

    t_lower = user_query.lower()
    discovered_sources = []

    # 2. Phân loại và điều phối truy vấn đa nguồn:
    
    # A. Nếu liên quan đến GitHub / Lập trình / Công nghệ
    if any(k in t_lower for k in ["github", "repo", "thư viện", "code", "lập trình", "framework", "sdk", "api"]):
        discovered_sources.extend(search_github_repos(user_query, limit=3))

    # B. Nếu liên quan đến YouTube / Video / Xem bài giảng
    if any(k in t_lower for k in ["youtube", "video", "clip", "xem", "bài giảng", "hướng dẫn", "nghe"]):
        discovered_sources.extend(search_youtube_videos(user_query, limit=2))

    # C. Nếu liên quan đến Lịch sử / Nhân vật / Định nghĩa / Khái niệm ("cũ đều chuẩn xác")
    if any(k in t_lower for k in ["lịch sử", "là ai", "năm nào", "tiểu sử", "quê ở", "nguồn gốc", "định nghĩa", "khái niệm", "thời kỳ"]):
        discovered_sources.extend(search_wikipedia_facts(user_query, limit=2))

    # D. Nếu hỏi về tin tức thời sự chung hôm nay
    is_general_news = any(k in t_lower for k in [
        "tin tức", "tin mới", "bài báo", "thời sự hôm nay", "có gì mới", "tin nóng", 
        "tin trong ngày", "tin 24h", "báo chí", "tin nổi bật", "báo đài"
    ])
    if is_general_news:
        discovered_sources.extend(fetch_google_news_top(limit=5))
        discovered_sources.extend(fetch_vnexpress_latest(limit=4))
    else:
        # Nếu có từ khóa thời sự hoặc sự kiện cụ thể
        if any(k in t_lower for k in ["tin", "báo", "sự kiện", "chiến sự", "giá", "thời tiết", "chứng khoán", "vàng", "hôm nay"]):
            discovered_sources.extend(fetch_google_news_search(user_query, limit=4))

    # E. Luôn bổ sung Web Search để có góc nhìn đa chiều và URL kiểm chứng
    discovered_sources.extend(search_web_duckduckgo(user_query, limit=4))

    if not discovered_sources:
        return ""

    # Ghép nối dữ liệu nguồn chuẩn hóa với đường link dẫn chứng
    lines = [
        "=== DỮ LIỆU TRA CỨU ĐA NGUỒN THỰC TẾ & ĐƯỜNG DẪN CHỨNG CHUẨN XÁC (CẬP NHẬT 2026) ===",
        "Dưới đây là các tài liệu, bài báo, kho lưu trữ và dữ liệu thực tế được truy xuất trực tiếp:",
    ]

    for idx, item in enumerate(discovered_sources, 1):
        title = item.get("title", "")
        url = item.get("url", "")
        source = item.get("source", "Web")
        date = item.get("date", "")
        snippet = item.get("snippet", "")

        date_str = f" | Thời gian: {date}" if date else ""
        url_str = f" | Link: {url}" if url else ""
        snip_str = f"\n   Tóm tắt: {snippet}" if snippet else ""

        lines.append(f"[{idx}] {title} (Nguồn: {source}{date_str}{url_str}){snip_str}")

    lines.append(
        "\n=== CHỈ DẪN TRẢ LỜI ĐẲNG CẤP CHUẨN SIÊU TRÍ TUỆ NHÂN TẠO (KINI AI) ===\n"
        "1. HIỂU BIẾT SÂU RỘNG & PHÂN TÍCH ĐA CHIỀU (NHƯ GPT, GEMINI, CLAUDE):\n"
        "   - Phân tích bản chất câu hỏi, diễn giải sâu sắc, mạch lạc, có cấu trúc rõ ràng (Mở đầu -> Phân tích chi tiết -> Đánh giá & Khuyến nghị).\n"
        "2. ĐỘ CHÍNH XÁC TUYỆT ĐỐI (CẢ THÔNG TIN CŨ VÀ MỚI):\n"
        "   - Thông tin lịch sử, khoa học, định nghĩa học thuật (cũ) phải chuẩn xác 100% theo căn cứ Wikipedia / Bách khoa thư.\n"
        "   - Thông tin thời sự, công nghệ, giá cả, thời tiết (mới) phải chuẩn xác theo dữ liệu báo chí và Google năm 2026.\n"
        "3. BẮT BUỘC ĐÍNH KÈM ĐƯỜNG DẪN CHỨNG CHUẨN XÁC (WORKING CITATIONS):\n"
        "   - Ở cuối câu trả lời, LUÔN CÓ MỤC:\n"
        "     ### 🌐 Nguồn Dẫn Chứng & Tham Khảo\n"
        "     - [Tên nguồn/Tiêu đề bài viết](URL) - Đơn vị xuất bản (Thời gian)\n"
        "   - Sử dụng ĐÚNG các đường link thực tế ở danh sách trên, TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT LINK KHÔNG CÓ THẬT."
    )

    return "\n".join(lines)
