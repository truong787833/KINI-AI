import sqlite3
import os
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "kini_ai.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cur = conn.cursor()

    # Bảng cuộc hội thoại
    cur.execute("""
    CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # Bảng tin nhắn chat
    cur.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conv_id TEXT NOT NULL,
        role TEXT NOT NULL, -- 'user' hoặc 'assistant'
        content TEXT NOT NULL,
        image_url TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (conv_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
    """)

    # Bảng thư viện ảnh AI (KINI Studio)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt TEXT NOT NULL,
        style TEXT DEFAULT 'realistic',
        image_url TEXT NOT NULL,
        image_path TEXT NOT NULL,
        width INTEGER DEFAULT 1024,
        height INTEGER DEFAULT 1024,
        created_at TEXT NOT NULL
    )
    """)

    # Bảng cài đặt ứng dụng
    cur.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    # Bảng siêu bộ nhớ dài hạn (Long-term Memory)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fact TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        created_at TEXT NOT NULL
    )
    """)

    # Bảng giám sát Quota & Token chi tiết theo thời gian thực (Chuẩn Antigravity)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS api_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        timestamp REAL NOT NULL,
        model_name TEXT NOT NULL,
        prompt_tokens INTEGER DEFAULT 0,
        candidates_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0
    )
    """)

    # Tự động đồng bộ các đoạn chat cũ từ tin nhắn nếu chưa có trong bảng conversations
    cur.execute("""
    INSERT OR IGNORE INTO conversations (id, title, created_at, updated_at)
    SELECT conv_id, 
           CASE WHEN conv_id = 'default' THEN 'Cuộc trò chuyện chính' ELSE 'Đoạn chat ' || substr(conv_id, 1, 8) END,
           min(created_at), 
           max(created_at)
    FROM messages
    WHERE conv_id NOT IN (SELECT id FROM conversations)
    GROUP BY conv_id
    """)

    conn.commit()
    conn.close()

# --- QUẢN LÝ HỘI THOẠI & TIN NHẮN ---
def list_conversations() -> List[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
    SELECT c.*, COUNT(m.id) as msg_count 
    FROM conversations c
    LEFT JOIN messages m ON c.id = m.conv_id
    GROUP BY c.id
    ORDER BY c.is_pinned DESC, c.updated_at DESC
    """)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_conversation_messages(conv_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM messages WHERE conv_id = ? ORDER BY id ASC", (conv_id,))
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def create_conversation(conv_id: str, title: str, category: str = "haitruong"):
    now = datetime.now().isoformat()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("INSERT OR REPLACE INTO conversations (id, title, created_at, updated_at, is_pinned, category) VALUES (?, ?, ?, ?, 0, ?)",
                (conv_id, title, now, now, category))
    conn.commit()
    conn.close()

def update_conversation_title(conv_id: str, title: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
                (title.strip(), datetime.now().isoformat(), conv_id))
    conn.commit()
    conn.close()

def toggle_conversation_pin(conv_id: str) -> bool:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT is_pinned FROM conversations WHERE id = ?", (conv_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return False
    new_pinned = 0 if row["is_pinned"] else 1
    cur.execute("UPDATE conversations SET is_pinned = ?, updated_at = ? WHERE id = ?", 
                (new_pinned, datetime.now().isoformat(), conv_id))
    conn.commit()
    conn.close()
    return bool(new_pinned)

def add_message(conv_id: str, role: str, content: str, image_url: str = "") -> int:
    now = datetime.now().isoformat()
    conn = get_connection()
    cur = conn.cursor()
    
    # Đảm bảo cuộc hội thoại luôn tồn tại trong bảng conversations
    cur.execute("SELECT id, title FROM conversations WHERE id = ?", (conv_id,))
    conv = cur.fetchone()
    if not conv:
        # Tự động đặt tiêu đề theo nội dung câu hỏi đầu tiên
        first_line = content.strip().split("\n")[0]
        clean_title = first_line[:40] if role == "user" else "Đoạn chat mới"
        if not clean_title or len(clean_title) < 2:
            clean_title = "Đoạn chat mới"
        cur.execute("INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
                    (conv_id, clean_title, now, now))
    else:
        # Nếu tiêu đề vẫn là mặc định mà người dùng gửi tin nhắn đầu tiên, cập nhật tiêu đề thông minh
        if role == "user" and conv["title"] in ["Đoạn chat mới", "Cuộc trò chuyện mới"]:
            first_line = content.strip().split("\n")[0]
            clean_title = first_line[:40]
            if clean_title and len(clean_title) >= 3:
                cur.execute("UPDATE conversations SET title = ? WHERE id = ?", (clean_title, conv_id))
        cur.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conv_id))

    cur.execute("INSERT INTO messages (conv_id, role, content, image_url, created_at) VALUES (?, ?, ?, ?, ?)",
                (conv_id, role, content, image_url, now))
    msg_id = cur.lastrowid
    conn.commit()
    conn.close()
    return msg_id

def delete_conversation(conv_id: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM messages WHERE conv_id = ?", (conv_id,))
    cur.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
    conn.commit()
    conn.close()

# --- QUẢN LÝ THƯ VIỆN ẢNH KINI STUDIO ---
def add_gallery_item(prompt: str, style: str, image_url: str, image_path: str, width: int = 1024, height: int = 1024) -> int:
    now = datetime.now().isoformat()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
    INSERT INTO gallery (prompt, style, image_url, image_path, width, height, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (prompt, style, image_url, image_path, width, height, now))
    item_id = cur.lastrowid
    conn.commit()
    conn.close()
    return item_id

def get_gallery_items(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM gallery ORDER BY id DESC LIMIT ?", (limit,))
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# --- QUẢN LÝ CÀI ĐẶT ---
def get_setting(key: str, default: str = "") -> str:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cur.fetchone()
    conn.close()
    return row["value"] if row else default

def set_setting(key: str, value: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))
    conn.commit()
    conn.close()

# --- QUẢN LÝ SIÊU BỘ NHỚ DÀI HẠN (LONG-TERM MEMORY) ---
def add_memory(fact: str, category: str = "general") -> int:
    clean_fact = fact.strip()
    if not clean_fact:
        return 0
    now = datetime.now().isoformat()
    conn = get_connection()
    cur = conn.cursor()
    # Kiểm tra trùng lặp
    cur.execute("SELECT id FROM memories WHERE fact = ?", (clean_fact,))
    existing = cur.fetchone()
    if existing:
        conn.close()
        return existing["id"]
        
    cur.execute("INSERT INTO memories (fact, category, created_at) VALUES (?, ?, ?)",
                (clean_fact, category, now))
    mem_id = cur.lastrowid
    conn.commit()
    conn.close()
    return mem_id

def get_all_memories(limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM memories ORDER BY id DESC LIMIT ?", (limit,))
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def delete_memory(memory_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
    conn.commit()
    conn.close()

def clear_memories():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM memories")
    conn.commit()
    conn.close()


# ============================================================
# QUẢN LÝ & GIÁM SÁT HẠN MỨC QUOTA VÀ TOKEN (CHUẨN ANTIGRAVITY)
# ============================================================
def record_api_usage(model_name: str, prompt_tokens: int, candidates_tokens: int, total_tokens: int):
    """Ghi nhận chi tiết từng lượt gọi và lượng token chính xác từng đơn vị"""
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    ts = now.timestamp()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
    INSERT INTO api_usage (date, timestamp, model_name, prompt_tokens, candidates_tokens, total_tokens)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (today_str, ts, model_name, prompt_tokens, candidates_tokens, total_tokens))
    conn.commit()
    conn.close()

def get_usage_statistics() -> Dict[str, Any]:
    """Tính toán chính xác % hạn mức quota và lượng token đã sử dụng"""
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    one_minute_ago = now.timestamp() - 60
    
    conn = get_connection()
    cur = conn.cursor()
    
    # 1. Thống kê hôm nay
    cur.execute("""
    SELECT count(*), 
           coalesce(sum(prompt_tokens), 0), 
           coalesce(sum(candidates_tokens), 0), 
           coalesce(sum(total_tokens), 0)
    FROM api_usage
    WHERE date = ?
    """, (today_str,))
    today_stats = cur.fetchone()
    requests_today = today_stats[0]
    prompt_tokens_today = today_stats[1]
    candidates_tokens_today = today_stats[2]
    total_tokens_today = today_stats[3]
    
    # 2. Số lượt gửi trong 1 phút gần nhất (RPM)
    cur.execute("""
    SELECT count(*) FROM api_usage WHERE timestamp >= ?
    """, (one_minute_ago,))
    requests_last_minute = cur.fetchone()[0]
    
    conn.close()
    
    # Định mức chuẩn Google Gemini Free Tier
    DAILY_REQUEST_LIMIT = 1500 # 1.500 lượt / ngày
    RPM_LIMIT = 15             # 15 lượt / phút
    
    # Phần trăm còn lại
    daily_requests_left = max(0, DAILY_REQUEST_LIMIT - requests_today)
    daily_requests_percent = round((daily_requests_left / DAILY_REQUEST_LIMIT) * 100, 1)
    
    rpm_left = max(0, RPM_LIMIT - requests_last_minute)
    rpm_percent = round((rpm_left / RPM_LIMIT) * 100, 1)
    
    # Thời gian reset tự động (đến 00:00 đêm)
    tomorrow = datetime(now.year, now.month, now.day) + timedelta(days=1)
    seconds_until_reset = int((tomorrow - now).total_seconds())
    hours_until_reset = seconds_until_reset // 3600
    minutes_until_reset = (seconds_until_reset % 3600) // 60
    
    return {
        "requests_today": requests_today,
        "daily_limit": DAILY_REQUEST_LIMIT,
        "daily_left": daily_requests_left,
        "daily_percent": daily_requests_percent,
        
        "rpm_current": requests_last_minute,
        "rpm_limit": RPM_LIMIT,
        "rpm_left": rpm_left,
        "rpm_percent": rpm_percent,
        
        "prompt_tokens_today": prompt_tokens_today,
        "candidates_tokens_today": candidates_tokens_today,
        "total_tokens_today": total_tokens_today,
        
        "resets_in": f"{hours_until_reset}h {minutes_until_reset}m"
    }
