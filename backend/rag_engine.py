import math
import re
import unicodedata
from collections import Counter
from datetime import datetime
from typing import Any, Dict, List

from . import database

_VN_STOPWORDS = {
    "và", "của", "là", "có", "trong", "cho", "để", "với", "các", "những", "một",
    "này", "đó", "khi", "thì", "từ", "tại", "về", "được", "bị", "không", "như",
    "đã", "đang", "sẽ", "rằng", "nếu", "vì", "do", "nên", "hoặc", "hay", "nhưng",
    "mà", "ở", "theo", "trên", "dưới", "sau", "trước", "cũng", "vẫn", "còn",
    "the", "and", "for", "with", "that", "this", "from", "are", "was", "were",
}


def init_rag_tables() -> None:
    conn = database.get_connection()
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS rag_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL DEFAULT 'master',
        filename TEXT NOT NULL,
        char_count INTEGER NOT NULL DEFAULT 0,
        chunk_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS rag_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id INTEGER NOT NULL,
        client_id TEXT NOT NULL DEFAULT 'master',
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL
    )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_rag_chunks_client ON rag_chunks(client_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_rag_chunks_doc ON rag_chunks(doc_id)")
    conn.commit()
    conn.close()


def _tokenize(text: str) -> List[str]:
    norm = unicodedata.normalize("NFC", (text or "").lower())
    tokens = re.findall(r"[0-9a-zàáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]+", norm)
    return [t for t in tokens if len(t) >= 2 and t not in _VN_STOPWORDS]


def chunk_text(text: str, chunk_size: int = 900, overlap: int = 150) -> List[str]:
    clean = unicodedata.normalize("NFC", (text or "").strip())
    if not clean:
        return []
    if len(clean) <= chunk_size:
        return [clean]

    paragraphs = [p.strip() for p in re.split(r"\n{2,}", clean) if p.strip()]
    chunks: List[str] = []
    current = ""

    for para in paragraphs:
        if len(para) > chunk_size:
            if current:
                chunks.append(current.strip())
                current = ""
            start = 0
            while start < len(para):
                end = min(len(para), start + chunk_size)
                chunks.append(para[start:end].strip())
                if end >= len(para):
                    break
                start = max(start + 1, end - overlap)
            continue

        if len(current) + len(para) + 2 <= chunk_size:
            current = f"{current}\n\n{para}".strip() if current else para
        else:
            if current:
                chunks.append(current.strip())
            tail = current[-overlap:].strip() if (current and overlap > 0) else ""
            current = f"{tail}\n\n{para}".strip() if tail and len(tail) + len(para) + 2 <= chunk_size else para

    if current:
        chunks.append(current.strip())
    return chunks


def index_document(filename: str, text: str, client_id: str = "master") -> Dict[str, Any]:
    init_rag_tables()
    clean_name = (filename or "document.txt").strip()
    chunks = chunk_text(text)
    if not chunks:
        return {"success": False, "error": "Tài liệu trống, không có nội dung văn bản để lập chỉ mục."}

    conn = database.get_connection()
    cur = conn.cursor()
    # Tránh trùng lặp cùng tên file cho cùng client_id: thay thế bản cũ
    old_rows = cur.execute(
        "SELECT id FROM rag_documents WHERE client_id = ? AND filename = ?",
        (client_id, clean_name),
    ).fetchall()
    for r in old_rows:
        cur.execute("DELETE FROM rag_chunks WHERE doc_id = ?", (r["id"],))
        cur.execute("DELETE FROM rag_documents WHERE id = ?", (r["id"],))

    now = datetime.now().isoformat()
    cur.execute(
        "INSERT INTO rag_documents (client_id, filename, char_count, chunk_count, created_at) VALUES (?, ?, ?, ?, ?)",
        (client_id, clean_name, len(text), len(chunks), now),
    )
    doc_id = cur.lastrowid
    cur.executemany(
        "INSERT INTO rag_chunks (doc_id, client_id, chunk_index, content) VALUES (?, ?, ?, ?)",
        [(doc_id, client_id, idx, ch) for idx, ch in enumerate(chunks)],
    )
    conn.commit()
    conn.close()
    return {
        "success": True,
        "doc_id": doc_id,
        "filename": clean_name,
        "char_count": len(text),
        "chunk_count": len(chunks),
    }


def list_documents(client_id: str = "master") -> List[Dict[str, Any]]:
    init_rag_tables()
    conn = database.get_connection()
    rows = conn.execute(
        "SELECT id, filename, char_count, chunk_count, created_at FROM rag_documents WHERE client_id = ? ORDER BY id DESC",
        (client_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_document(doc_id: int, client_id: str = "master") -> bool:
    init_rag_tables()
    conn = database.get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM rag_chunks WHERE doc_id = ? AND client_id = ?", (doc_id, client_id))
    cur.execute("DELETE FROM rag_documents WHERE id = ? AND client_id = ?", (doc_id, client_id))
    deleted = cur.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def search_relevant_chunks(query: str, client_id: str = "master", top_k: int = 4) -> List[Dict[str, Any]]:
    init_rag_tables()
    q_tokens = _tokenize(query)
    if not q_tokens:
        return []

    conn = database.get_connection()
    rows = conn.execute(
        """
        SELECT c.id, c.doc_id, c.chunk_index, c.content, d.filename
        FROM rag_chunks c
        JOIN rag_documents d ON d.id = c.doc_id
        WHERE c.client_id = ?
        """,
        (client_id,),
    ).fetchall()
    conn.close()

    if not rows:
        return []

    n_docs = len(rows)
    doc_tokens_list = [_tokenize(r["content"]) for r in rows]
    avg_len = sum(len(dt) for dt in doc_tokens_list) / max(1, n_docs)

    df = Counter()
    for dt in doc_tokens_list:
        for tok in set(dt):
            df[tok] += 1

    q_norm = unicodedata.normalize("NFC", query.lower().strip())
    scored = []
    k1 = 1.5
    b = 0.75

    for idx, r in enumerate(rows):
        dt = doc_tokens_list[idx]
        if not dt:
            continue
        tf = Counter(dt)
        doc_len = len(dt)
        score = 0.0
        for qt in set(q_tokens):
            if qt not in tf:
                continue
            idf = math.log(1.0 + (n_docs - df[qt] + 0.5) / (df[qt] + 0.5))
            freq = tf[qt]
            score += idf * (freq * (k1 + 1.0)) / (freq + k1 * (1.0 - b + b * doc_len / max(1.0, avg_len)))

        # Thưởng điểm nếu khớp cụm từ hoặc tên file
        c_low = unicodedata.normalize("NFC", r["content"].lower())
        if len(q_norm) >= 6 and q_norm in c_low:
            score += 3.0
        if r["filename"].lower() in q_norm:
            score += 2.0

        if score > 0:
            scored.append({
                "doc_id": r["doc_id"],
                "filename": r["filename"],
                "chunk_index": r["chunk_index"],
                "content": r["content"],
                "score": round(score, 4),
            })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]
