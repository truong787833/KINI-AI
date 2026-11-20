import os
import uuid
import time
import urllib.parse
import requests
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("ImageGenerator")

IMAGES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "generated_images")
os.makedirs(IMAGES_DIR, exist_ok=True)

# Từ điển phong cách nghệ thuật
STYLE_PROMPTS = {
    "realistic": "photorealistic, hyper-realistic, 8k resolution, highly detailed, dramatic lighting, masterpiece",
    "3d": "3D render, Pixar style, Unreal Engine 5, smooth textures, vibrant colors, raytracing, cute 3D character",
    "cinematic": "cinematic shot, moody lighting, depth of field, 35mm photograph, IMAX quality, atmospheric",
    "anime": "modern anime style, Makoto Shinkai style, vibrant colors, detailed line art, beautiful lighting",
    "cyberpunk": "cyberpunk style, neon lights, futuristic city, glowing neon blue and purple, high tech, highly detailed",
    "oil": "classic oil painting, visible brushstrokes, textured canvas, artistic lighting, fine art masterpiece"
}

def generate_ai_image(prompt: str, style: str = "realistic", width: int = 1024, height: int = 1024) -> Dict[str, Any]:
    """
    Tạo ảnh AI từ mô tả tiếng Việt hoặc tiếng Anh.
    Hỗ trợ đa phong cách (Photorealistic, 3D, Anime, Cyberpunk, Cinematic).
    """
    clean_prompt = prompt.strip()
    style_suffix = STYLE_PROMPTS.get(style, STYLE_PROMPTS["realistic"])
    full_prompt = f"{clean_prompt}, {style_suffix}"
    
    filename = f"kini_{int(time.time())}_{uuid.uuid4().hex[:8]}.jpg"
    file_path = os.path.join(IMAGES_DIR, filename)

    try:
        encoded_prompt = urllib.parse.quote(full_prompt)
        # Sử dụng Engine tạo ảnh AI FLUX / Turbo
        api_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&model=flux&nologo=true"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        logger.info(f"Đang tạo ảnh AI: {clean_prompt} (Phong cách: {style})")
        res = requests.get(api_url, headers=headers, timeout=45)
        
        if res.status_code == 200 and len(res.content) > 1000:
            with open(file_path, "wb") as f:
                f.write(res.content)
            
            return {
                "success": True,
                "filename": filename,
                "file_path": file_path,
                "image_url": f"/api/images/{filename}",
                "prompt": clean_prompt,
                "full_prompt": full_prompt,
                "style": style,
                "width": width,
                "height": height
            }
        else:
            return {
                "success": False,
                "error": f"Máy chủ tạo ảnh trả về mã lỗi {res.status_code}"
            }
    except Exception as e:
        logger.error(f"Lỗi tạo ảnh: {e}")
        return {
            "success": False,
            "error": f"Lỗi kết nối tạo ảnh: {str(e)}"
        }
