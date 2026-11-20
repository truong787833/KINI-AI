import os
import uuid
import time
import random
import urllib.parse
import requests
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("ImageGenerator")

IMAGES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "generated_images")
os.makedirs(IMAGES_DIR, exist_ok=True)

# Từ điển phong cách nghệ thuật
STYLE_PROMPTS = {
    "realistic": "photorealistic, hyper-realistic, 8k resolution, highly detailed, dramatic studio lighting, masterpiece",
    "3d": "3D render, Pixar style, Unreal Engine 5, smooth textures, vibrant colors, raytracing, cute 3D character, octane render",
    "cinematic": "cinematic shot, moody lighting, depth of field, 35mm photograph, IMAX quality, atmospheric, epic composition",
    "anime": "modern anime style, Makoto Shinkai style, vibrant colors, detailed line art, beautiful lighting, aesthetic",
    "cyberpunk": "cyberpunk style, neon lights, futuristic city, glowing neon cyan and purple, high tech, highly detailed",
    "oil": "classic oil painting, visible brushstrokes, textured canvas, artistic lighting, fine art masterpiece"
}

def optimize_prompt_with_gemini(prompt: str, style: str = "realistic", api_key: str = "") -> str:
    """
    Sử dụng Gemini AI để dịch và tối ưu hóa mô tả tiếng Việt thành Prompt tiếng Anh đỉnh cao.
    Đặc biệt xử lý xuất sắc các yêu cầu về Logo, Typography 3D, Chân dung, Phong cảnh.
    """
    try:
        from . import gemini_client
        sys_prompt = (
            "You are a world-class AI Image Prompt Engineer. "
            "Convert the user's Vietnamese request into a concise, vivid, ultra-detailed English prompt for AI image generation (FLUX.1 / Stable Diffusion). "
            "CRITICAL GUIDELINES:\n"
            "- If the user asks for a LOGO, NAME, BRAND or TYPOGRAPHY (e.g. 'KINI AI', 'Logo KINI'): "
            "You MUST specify: 'A magnificent 3D typography centerpiece spelling the exact text \"<NAME>\", massive bold metallic chrome block letters, "
            "vibrant glowing neon cyan and magenta edge lighting, intricate circuit board grooves etched onto the metal, dark moody background, "
            "volumetric smoke, cinematic lighting, 8k resolution, octane 3D render, raytracing, sharp focus, NO humans, NO people, NO faces, centered composition'.\n"
            "- If the user asks for portrait/landscape: describe subject, textures, lighting, cinematic depth of field.\n"
            "- Output ONLY the English prompt in one single paragraph. Do not include markdown or explanations."
        )
        res = gemini_client.ask_gemini(
            messages=[{"role": "user", "content": f"Hãy viết prompt tạo ảnh cho: '{prompt}' theo phong cách {style}"}],
            api_key=api_key,
            system_instruction=sys_prompt
        )
        if res.get("success") and res.get("reply"):
            enhanced = res["reply"].strip().replace('"', '').replace('\n', ' ')
            logger.info(f"Prompt tối ưu từ Gemini: {enhanced[:120]}...")
            return enhanced
    except Exception as e:
        logger.warning(f"Không thể tối ưu prompt qua Gemini: {e}")

    # Fallback nếu không gọi được Gemini
    style_suffix = STYLE_PROMPTS.get(style, STYLE_PROMPTS["realistic"])
    return f"{prompt}, {style_suffix}"

def generate_ai_image(
    prompt: str, 
    style: str = "realistic", 
    width: int = 1024, 
    height: int = 1024,
    api_key: str = ""
) -> Dict[str, Any]:
    """
    Tạo ảnh AI từ mô tả tiếng Việt hoặc tiếng Anh với bộ não tối ưu hóa Gemini.
    """
    clean_prompt = prompt.strip()
    if not clean_prompt:
        return {"success": False, "error": "Vui lòng nhập mô tả bức ảnh."}

    # 1. Tối ưu hóa Prompt bằng Gemini
    english_prompt = optimize_prompt_with_gemini(clean_prompt, style=style, api_key=api_key)
    
    filename = f"kini_{int(time.time())}_{uuid.uuid4().hex[:8]}.jpg"
    file_path = os.path.join(IMAGES_DIR, filename)

    # 2. Thử lần lượt các Engine tạo ảnh chất lượng cao (FLUX.1 và SANA độ phân giải cao)
    models_to_try = ["flux", "sana"]
    seed = random.randint(100000, 9999999)
    encoded_prompt = urllib.parse.quote(english_prompt)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }

    last_error = ""
    for model in models_to_try:
        api_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&model={model}&seed={seed}&nologo=true"
        try:
            logger.info(f"Đang tạo ảnh với model: {model}...")
            res = requests.get(api_url, headers=headers, timeout=35)
            if res.status_code == 200 and len(res.content) > 1000:
                with open(file_path, "wb") as f:
                    f.write(res.content)
                
                return {
                    "success": True,
                    "filename": filename,
                    "file_path": file_path,
                    "image_url": f"/api/images/{filename}",
                    "prompt": clean_prompt,
                    "optimized_prompt": english_prompt,
                    "style": style,
                    "model_used": model,
                    "width": width,
                    "height": height
                }
            elif res.status_code == 402 or res.status_code == 503:
                last_error = f"Model {model} đang bận ({res.status_code})"
                continue
        except Exception as e:
            last_error = str(e)
            continue

    # Fallback cuối cùng: Thử gọi không chỉ định model
    try:
        fallback_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&seed={seed}&nologo=true"
        res = requests.get(fallback_url, headers=headers, timeout=30)
        if res.status_code == 200 and len(res.content) > 1000:
            with open(file_path, "wb") as f:
                f.write(res.content)
            return {
                "success": True,
                "filename": filename,
                "file_path": file_path,
                "image_url": f"/api/images/{filename}",
                "prompt": clean_prompt,
                "optimized_prompt": english_prompt,
                "style": style,
                "model_used": "default",
                "width": width,
                "height": height
            }
    except Exception as e:
        last_error = str(e)

    return {
        "success": False,
        "error": f"Không thể tạo ảnh lúc này ({last_error}). Vui lòng thử lại sau vài giây."
    }
