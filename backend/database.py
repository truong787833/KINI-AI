import sqlite3
import os
import json
from datetime import datetime
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
    HAVING msg_count > 0 OR c.id = 'default'
    ORDER BY c.updated_at DESC
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

def create_conversation(conv_id: str, title: str):
    now = datetime.now().isoformat()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("INSERT OR REPLACE INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (conv_id, title, now, now))
    conn.commit()
    conn.close()

def update_conversation_title(conv_id: str, title: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
                (title.strip(), datetime.now().isoformat(), conv_id))
    conn.commit()
    conn.close()

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
