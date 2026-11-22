import os
import uuid
import time
import asyncio
import logging
import re
from typing import Dict, Any, Optional

logger = logging.getLogger("TTSService")

AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "generated_audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

VOICES = {
    "female": "vi-VN-HoaiMyNeural",  # Giọng nữ ngọt ngào, truyền cảm
    "male": "vi-VN-NamMinhNeural"     # Giọng nam ấm áp, phát thanh viên
}

def clean_markdown_for_speech(text: str) -> str:
    """Loại bỏ ký tự markdown, code, emoji để đọc mượt mà"""
    # Bỏ khối code
    text = re.sub(r'```[\s\S]*?```', ' Khối mã nguồn ', text)
    # Bỏ inline code
    text = re.sub(r'`(.*?)`', r'\1', text)
    # Bỏ link markdown [title](url) -> title
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
    # Bỏ tiêu đề #
    text = re.sub(r'#+\s*', '', text)
    # Bỏ in đậm, in nghiêng
    text = re.sub(r'[*_~]', '', text)
    # Bỏ bullet points
    text = re.sub(r'^\s*[-*+]\s+', '', text, flags=re.MULTILINE)
    return text.strip()

async def generate_vietnamese_audio_async(text: str, voice_type: str = "female") -> Dict[str, Any]:
    """
    Chuyển văn bản thành giọng nói tiếng Việt chuẩn Neural (Bất đồng bộ - Async).
    """
    if not text or not text.strip():
        return {"success": False, "error": "Văn bản rỗng"}

    import edge_tts
    voice = VOICES.get(voice_type, VOICES["female"])
    filename = f"kini_voice_{int(time.time())}_{uuid.uuid4().hex[:6]}.mp3"
    file_path = os.path.join(AUDIO_DIR, filename)

    clean = clean_markdown_for_speech(text)[:3000].strip()
    if not clean:
        clean = "Dạ, em nghe rõ rồi ạ."

    try:
        # rate="+18%": Đọc lưu loát, năng động, chuẩn đàm thoại tự nhiên, không bị chậm chạp
        comm = edge_tts.Communicate(clean, voice=voice, rate="+18%")
        await comm.save(file_path)

        if os.path.exists(file_path) and os.path.getsize(file_path) > 200:
            return {
                "success": True,
                "filename": filename,
                "audio_url": f"/api/audio/{filename}",
                "file_path": file_path
            }
        else:
            return {"success": False, "error": "Không tạo được tệp âm thanh"}

    except Exception as e:
        logger.error(f"Lỗi tạo giọng đọc TTS: {e}")
        return {"success": False, "error": str(e)}

def generate_vietnamese_audio(text: str, voice_type: str = "female") -> Dict[str, Any]:
    """Hàm đồng bộ chạy qua asyncio.run"""
    return asyncio.run(generate_vietnamese_audio_async(text, voice_type))
