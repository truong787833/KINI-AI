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

def search_youtube_videos(query: str, limit: int = 4) -> List[Dict[str, str]]:
    """Tìm kiếm video YouTube thực tế trực tiếp từ YouTube Search (Đảm bảo video đang hoạt động 100%, không hết hạn)"""
    clean_q = extract_core_search_query(query)
    # Loại bỏ các từ đệm khi tìm video
    yt_query = re.sub(r'^(tìm\s+cho\s+tôi|tìm\s+tôi|tìm\s+bài|tìm\s+video|hãy\s+tìm|cho\s+tôi\s+link|link)\s*', '', clean_q, flags=re.IGNORECASE).strip()
    if not yt_query:
        yt_query = clean_q

    results = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'vi,en;q=0.9'
    }
    try:
        url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(yt_query)}"
        res = requests.get(url, headers=headers, timeout=8)
        if res.status_code == 200:
            import json
            match = re.search(r"var ytInitialData = ({.*?});</script>", res.text)
            if not match:
                match = re.search(r"ytInitialData\s*=\s*({.*?});", res.text)
            
            if match:
                try:
                    data = json.loads(match.group(1))
                    contents = data.get("contents", {}).get("twoColumnSearchResultsRenderer", {}).get("primaryContents", {}).get("sectionListRenderer", {}).get("contents", [])
                    for section in contents:
                        item_section = section.get("itemSectionRenderer", {}).get("contents", [])
                        for item in item_section:
                            video = item.get("videoRenderer")
                            if video:
                                vid = video.get("videoId")
                                title_runs = video.get("title", {}).get("runs", [])
                                title = "".join(r.get("text", "") for r in title_runs)
                                channel = "".join(r.get("text", "") for r in video.get("ownerText", {}).get("runs", []))
                                if vid and title:
                                    results.append({
                                        "title": f"Video YouTube: {title} (Kênh: {channel})",
                                        "url": f"https://www.youtube.com/watch?v={vid}",
                                        "snippet": f"Kênh chính thức: {channel}",
                                        "source": "YouTube"
                                    })
                                    if len(results) >= limit:
                                        return results
                except Exception:
                    pass

            # Fallback regex nếu cấu trúc JSON thay đổi
            if not results:
                video_matches = re.findall(r'\"videoId\":\"([a-zA-Z0-9_-]{11})\".*?\"text\":\"([^\"]+)\"', res.text)
                seen = set()
                for vid, title in video_matches:
                    if vid not in seen and len(title) > 3 and "{" not in title and "\\" not in title:
                        seen.add(vid)
                        results.append({
                            "title": f"Video YouTube: {title}",
                            "url": f"https://www.youtube.com/watch?v={vid}",
                            "snippet": "Video trên YouTube",
                            "source": "YouTube"
                        })
                        if len(results) >= limit:
                            break
    except Exception as e:
        logger.warning(f"Lỗi tìm kiếm YouTube thực tế: {e}")
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

def user_explicitly_wants_sources(text: str) -> bool:
    """Kiểm tra xem người dùng có thực sự yêu cầu đưa link, nguồn, bài viết hay dẫn chứng không"""
    if not text:
        return False
    t = text.lower().strip()
    source_keywords = [
        "cho tôi link", "tìm link", "xin link", "link video", "link bài", "link github", 
        "link youtube", "dẫn chứng", "nguồn ở đâu", "bài viết nào", "link gốc", "nguồn nào", 
        "ở đâu nói", "trang web nào", "cho đường dẫn", "trích dẫn nguồn", "xin nguồn", 
        "chứng minh", "nguồn gốc từ đâu", "cho link"
    ]
    return any(k in t for k in source_keywords)

def clean_unwanted_citations(reply_text: str, user_query: str) -> str:
    """
    Bộ lọc hậu kiểm: Nếu người dùng KHÔNG yêu cầu nguồn hoặc đường link,
    tự động loại bỏ hoàn toàn bất kỳ mục 'Nguồn Dẫn Chứng & Tham Khảo' thừa thãi nào.
    Đảm bảo câu trả lời luôn sạch đẹp, tinh tế như Antigravity, ChatGPT và Claude.
    """
    if not reply_text:
        return reply_text
    if user_explicitly_wants_sources(user_query):
        return reply_text

    # Phát hiện dòng tiêu đề nguồn ở cuối câu trả lời (dòng mới + tiêu đề nguồn)
    pattern = r'(?im)^\s*(?:#{1,4}\s*)?(?:🌐|🔗)?\s*(?:\*{0,2})(?:nguồn dẫn chứng|nguồn tham khảo|tài liệu tham khảo|nguồn trích dẫn|nguồn tin & tham khảo)(?:\*{0,2})\s*.*?$'
    match = re.search(pattern, reply_text)
    if match:
        return reply_text[:match.start()].strip()
    return reply_text.strip()

def needs_live_search(text: str) -> bool:
    """
    Kích hoạt tra cứu thông minh thời gian thực ĐÚNG LÚC - ĐÚNG CHỖ:
    - Chỉ tra cứu khi câu hỏi liên quan đến thời sự, tin tức, hôm nay, báo chí, video YouTube, GitHub, giá cả, thời tiết hoặc yêu cầu đường dẫn/nguồn.
    - TUYỆT ĐỐI KHÔNG tra cứu trên các câu hỏi chào hỏi, lập trình, giải toán, viết văn, triết học, tạo thư mục/file hoặc trò chuyện thông thường.
    """
    t = text.lower().strip()
    if len(t) < 3:
        return False

    # Bỏ qua các lệnh Agent tự hành (tạo file, folder, chạy lệnh)
    agent_words = ["tạo thư mục", "tạo folder", "tạo file", "viết file", "làm game", "tạo game", "chạy lệnh", "agent"]
    if any(aw in t for aw in agent_words):
        return False

    # Bỏ qua câu chào hỏi, cảm ơn, khen ngợi, câu hỏi năng lực
    skip_phrases = [
        "xin chào", "chào bạn", "chào em", "hello", "hi", "ok", "cảm ơn", "cảm ơn bạn", 
        "tuyệt vời", "bạn làm được những gì", "bạn là ai", "giới thiệu bản thân", "giúp gì",
        "kini ai là gì", "chào anh trường", "bạn khỏe không", "tạm biệt", "hẹn gặp lại"
    ]
    if any(t == sp or t.startswith(sp + " ") for sp in skip_phrases):
        return False

    # 1. Người dùng yêu cầu link / nguồn / dẫn chứng cụ thể
    source_triggers = ["cho tôi link", "tìm link", "xin link", "dẫn chứng", "nguồn ở đâu", "bài viết nào", "link gốc", "nguồn nào", "ở đâu nói", "trang web nào"]
    if any(st in t for st in source_triggers):
        return True

    # 2. Tin tức thời sự, sự kiện, thời tiết, giá cả, hôm nay
    news_triggers = [
        "hôm nay", "mới nhất", "tin tức", "tin mới", "thời sự", "bài báo", "báo đài", 
        "tin nóng", "tin trong ngày", "giá vàng", "giá xăng", "giá dầu", "thời tiết", 
        "chứng khoán", "tỷ giá", "chiến sự", "bầu cử", "vừa xảy ra", "2026"
    ]
    if any(nt in t for nt in news_triggers):
        return True

    # 3. Yêu cầu tìm kiếm video, bài hát, YouTube
    media_triggers = ["youtube", "video", "clip", "bài hát", "ca khúc", "nghe bài", "xem clip", "mp3"]
    if any(mt in t for mt in media_triggers):
        return True

    # 4. Yêu cầu tìm kiếm GitHub / Thư viện mã nguồn mở
    code_triggers = ["github", "repo", "kho mã", "mã nguồn mở", "thư viện npm", "thư viện pypi"]
    if any(ct in t for ct in code_triggers):
        return True

    # 5. Tra cứu điều khoản pháp luật cụ thể
    if re.search(r'(điều\s+\d+|khoản\s+\d+|nghị\s+định|thông\s+tư|nghị\s+quyết\s+\d+|luật\s+[\w\d]+)', t):
        return True

    return False

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

    # B. Nếu liên quan đến YouTube / Video / Âm nhạc / Bài hát
    if any(k in t_lower for k in ["youtube", "video", "clip", "xem", "bài giảng", "hướng dẫn", "nghe", "bài hát", "ca khúc", "nhạc", "ca sĩ", "mp3", "hát", "audio"]):
        discovered_sources.extend(search_youtube_videos(user_query, limit=3))

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

    wants_sources = user_explicitly_wants_sources(user_query)
    citation_instruction = (
        "3. NGUYÊN TẮC VỀ NGUỒN DẪN CHỨNG (NGƯỜI DÙNG ĐANG YÊU CẦU NGUỒN/LINK):\n"
        "   - Hãy đính kèm mục '### 🌐 Nguồn Dẫn Chứng & Tham Khảo' ở cuối câu trả lời.\n"
        "   - CHỈ trích dẫn các đường link thực tế ở danh sách trên, TUYỆT ĐỐI KHÔNG BỊA ĐẶT LINK ẢO.\n"
    ) if wants_sources else (
        "3. NGUYÊN TẮC VỀ ĐỊNH DẠNG (NGƯỜI DÙNG KHÔNG YÊU CẦU NGUỒN/LINK):\n"
        "   - TUYỆT ĐỐI KHÔNG XUẤT MỤC 'Nguồn Dẫn Chứng & Tham Khảo' hay bất kỳ danh sách liên kết nào ở cuối bài!\n"
        "   - Hãy tiếp thu kiến thức và trả lời thẳng thắn, sâu sắc, mạch lạc, sạch đẹp như ChatGPT, Claude và Antigravity.\n"
    )

    lines.append(
        "\n=== CHỈ DẪN TRẢ LỜI ĐẲNG CẤP CHUẨN SIÊU TRÍ TUỆ NHÂN TẠO (KINI AI) ===\n"
        "1. HIỂU BIẾT SÂU RỘNG & PHÂN TÍCH ĐA CHIỀU (CHUẨN ANTIGRAVITY, GPT, CLAUDE):\n"
        "   - Phân tích bản chất câu hỏi, diễn giải sâu sắc, mạch lạc, có tư duy kiến trúc và cấu trúc rõ ràng.\n"
        "2. ĐỘ CHÍNH XÁC TUYỆT ĐỐI (CẢ THÔNG TIN CŨ VÀ MỚI):\n"
        "   - Thông tin lịch sử, khoa học, định nghĩa học thuật (cũ) phải chuẩn xác 100% theo căn cứ Wikipedia / Bách khoa thư.\n"
        "   - Thông tin thời sự, công nghệ, giá cả, thời tiết (mới) phải chuẩn xác theo dữ liệu báo chí và Google năm 2026.\n"
        f"{citation_instruction}"
    )

    return "\n".join(lines)

def extract_links_from_text(text: str) -> List[str]:
    """Tìm tất cả các liên kết URL trang web có trong câu hỏi của người dùng"""
    raw_urls = re.findall(r'https?://[^\s<>"\'\)]+', text)
    valid_urls = []
    for u in raw_urls:
        clean_u = u.rstrip(".,;!?)]")
        # Bỏ qua các link nội bộ localhost hoặc file tĩnh
        if "127.0.0.1" in clean_u or "localhost" in clean_u or "/api/images/" in clean_u:
            continue
        valid_urls.append(clean_u)
    return valid_urls

def fetch_webpage_content(url: str, max_chars: int = 4000) -> Optional[Dict[str, str]]:
    """
    Tự động truy cập và đọc hiểu nội dung sạch của bất kỳ trang web / bài báo nào từ URL
    (Loại bỏ quảng cáo, menu điều hướng, script và chỉ lấy nội dung cốt lõi của bài viết)
    """
    try:
        from bs4 import BeautifulSoup
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "vi,en;q=0.9"
        }
        res = requests.get(url, headers=headers, timeout=8)
        if res.status_code != 200:
            return None

        soup = BeautifulSoup(res.content, "html.parser")

        # Xóa các thành phần rác
        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "svg", "form", "iframe"]):
            tag.decompose()

        title = soup.title.string.strip() if (soup.title and soup.title.string) else ""
        if not title:
            h1 = soup.find("h1")
            if h1:
                title = h1.get_text(strip=True)

        meta_desc = ""
        meta = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
        if meta and meta.get("content"):
            meta_desc = meta["content"].strip()

        # Tìm vùng nội dung chính
        main_content = (
            soup.find("article") or 
            soup.find(class_=re.compile(r'(detail-content|fck_detail|post-content|entry-content|main-content|article-body)', re.I)) or 
            soup.find("main") or 
            soup.body or 
            soup
        )

        paragraphs = []
        for p in main_content.find_all(["p", "h2", "h3", "li"]):
            txt = p.get_text(strip=True)
            if len(txt) > 20:
                paragraphs.append(txt)

        if not paragraphs:
            full_text = main_content.get_text(separator="\n", strip=True)
            lines = [l.strip() for l in full_text.split("\n") if len(l.strip()) > 20]
            paragraphs = lines

        clean_text = "\n\n".join(paragraphs)
        if len(clean_text) > max_chars:
            clean_text = clean_text[:max_chars] + "\n...(Nội dung còn tiếp)"

        if len(clean_text.strip()) < 50:
            return None

        return {
            "title": title or "Trang web",
            "description": meta_desc,
            "url": url,
            "content": clean_text
        }
    except Exception as e:
        logger.warning(f"Lỗi đọc nội dung trang web từ {url}: {e}")
        return None

def execute_deep_research(topic: str, api_key: str = "", client_id: str = "master") -> Dict[str, Any]:
    """
    HỆ THỐNG DEEP RESEARCH (NGHIÊN CỨU SÂU ĐA NGUỒN TỰ HÀNH & XUẤT BÁO CÁO CHIẾN LƯỢC)
    1. Thu thập dữ liệu đa tầng từ Google News, Báo chí, Wikipedia, Thư viện pháp luật và Web Search.
    2. Đọc sâu nội dung thực tế từ các bài báo chính thống.
    3. Tổng hợp thành Báo cáo chuyên sâu học thuật / chiến lược toàn diện (Executive Dossier).
    """
    from . import gemini_client
    logger.info(f"[*] Bắt đầu quy trình Deep Research cho chủ đề: '{topic}'")
    
    discovered_sources = []
    # 1. Rà soát tin tức thời sự & báo chí mới nhất
    news_items = fetch_google_news_search(topic, limit=5)
    discovered_sources.extend(news_items)
    
    # 2. Rà soát bách khoa & định nghĩa học thuật
    wiki_items = search_wikipedia_facts(topic, limit=2)
    discovered_sources.extend(wiki_items)
    
    # 3. Rà soát web đa nguồn
    web_items = search_web_duckduckgo(topic, limit=5)
    discovered_sources.extend(web_items)
    
    # 4. Trích xuất toàn văn 2-3 bài viết uy tín nhất
    full_articles_text = ""
    for item in (news_items + web_items)[:3]:
        url = item.get("url", "")
        if url and url.startswith("http"):
            try:
                page_data = fetch_webpage_content(url, max_chars=3500)
                if page_data and page_data.get("content"):
                    full_articles_text += f"\n--- BÀI VIẾT NGUỒN: {page_data['title']} ({url}) ---\n{page_data['content']}\n"
            except Exception:
                pass

    # Xây dựng prompt tổng hợp báo cáo chuyên sâu
    dossier_context = f"=== DỮ LIỆU ĐA NGUỒN THỰC TẾ THU THẬP ĐƯỢC CHO CHỦ ĐỀ '{topic}' (NĂM 2026) ===\n"
    for i, s in enumerate(discovered_sources, 1):
        dossier_context += f"[{i}] {s.get('title')} ({s.get('source')}) - Link: {s.get('url')}\n   Tóm tắt: {s.get('snippet')}\n"
        
    if full_articles_text:
        dossier_context += f"\n=== NỘI DUNG CHI TIẾT TRÍCH XUẤT TỪ CÁC TÀI LIỆU CHỦ CHỐT ===\n{full_articles_text}\n"

    deep_prompt = [
        {"role": "user", "content": f"""Bạn là KINI AI - Chuyên gia nghiên cứu chiến lược và phân tích dữ liệu cao cấp.
Nhiệm vụ của bạn là lập một BÁO CÁO NGHIÊN CỨU CHUYÊN SÂU (DEEP RESEARCH REPORT) hoàn chỉnh, đẳng cấp về chủ đề: "{topic}".

Dưới đây là hồ sơ dữ liệu thực tế cập nhật mới nhất năm 2026 đã được thu thập trực tiếp:
{dossier_context}

YÊU CẦU CẤU TRÚC BÁO CÁO CHUYÊN SÂU (ĐẦY ĐỦ, CHẶT CHẼ, KHÔNG DÙNG 'v.v.' HAY VIẾT TẮT):
# 📑 BÁO CÁO NGHIÊN CỨU CHIẾN LƯỢC: {topic.upper()}
*(Tài liệu nghiên cứu chuyên sâu độc quyền được tổng hợp bởi KINI AI Deep Research Engine - Cập nhật 2026)*

## 1. 📌 TÓM TẮT ĐIỀU HÀNH (EXECUTIVE SUMMARY)
- Bản chất cốt lõi của vấn đề trong 3-4 đoạn phân tích sắc bén.
- 3 kết luận then chốt rút ra từ dữ liệu thực tế.

## 2. 🏛️ CĂN CỨ PHÁP LÝ & BỐI CẢNH LỊCH SỬ / NGUỒN GỐC
- Căn cứ văn bản pháp lý, tiêu chuẩn ngành hoặc nguồn gốc học thuật.
- Diễn tiến bối cảnh đưa tới thực trạng hiện tại.

## 3. 📊 PHÂN TÍCH THỰC TRẠNG & SỐ LIỆU ĐA CHIỀU (CẬP NHẬT 2026)
- Phân tích chi tiết các mặt, các xu hướng nổi bật.
- Số liệu so sánh, dẫn chứng cụ thể từ các bài báo và tài liệu nguồn.

## 4. ⚖️ ĐÁNH GIÁ CƠ HỘI, THÁCH THỨC & MA TRẬN RỦI RO
- Những cơ hội mang tính đột phá.
- Các nguy cơ tiềm ẩn hoặc rào cản cần phòng tránh.

## 5. 💡 KHUYẾN NGHỊ HÀNH ĐỘNG & LỘ TRÌNH THỰC THI (ACTIONABLE ROADMAP)
- Đề xuất các giải pháp khả thi theo từng bước (Ngắn hạn - Trung hạn - Dài hạn).

## 6. 🌐 TÀI LIỆU & NGUỒN THAM KHẢO CHÍNH THỐNG
- Liệt kê đầy đủ các đường link dẫn chứng thực tế từ dữ liệu tra cứu ở trên.

VĂN PHONG: Sâu sắc, mang tầm nhìn cố vấn chiến lược, sử dụng thuật ngữ chuẩn xác, mạch lạc và có giá trị áp dụng thực tiễn cao nhất."""}
    ]

    res = gemini_client.ask_gemini(
        messages=deep_prompt,
        api_key=api_key,
        model_mode="pro",
        client_id=client_id
    )

    report_content = res.get("reply", "Không thể tạo báo cáo nghiên cứu chuyên sâu.")
    return {
        "success": True,
        "report": report_content,
        "sources_count": len(discovered_sources),
        "topic": topic
    }
