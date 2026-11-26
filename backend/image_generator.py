import os
import uuid
import time
import random
import urllib.parse
import requests
import re
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

def clean_image_watermark(image_path: str):
    """Tự động loại bỏ hoàn toàn watermark @pollinations.ai ở mép đáy của ảnh"""
    try:
        from PIL import Image
        img = Image.open(image_path)
        w, h = img.size
        # Cắt bỏ 38 pixel chứa watermark ở mép đáy
        cropped = img.crop((0, 0, w, h - 38))
        # Khôi phục lại kích thước chuẩn bằng thuật toán Lanczos siêu mịn
        restored = cropped.resize((w, h), Image.Resampling.LANCZOS)
        restored.save(image_path, quality=95)
    except Exception as e:
        logger.warning(f"Không thể cắt watermark: {e}")

def optimize_prompt_with_gemini(prompt: str, style: str = "realistic", api_key: str = "") -> str:
    """
    Sử dụng Gemini AI để dịch và tối ưu hóa mô tả tiếng Việt thành Prompt tiếng Anh đỉnh cao,
    chuẩn xác đúng nội dung người dùng yêu cầu và am hiểu văn hóa Việt Nam.
    """
    try:
        from . import gemini_client
        p_low = prompt.lower()
        extra_rules = ""
        if any(k in p_low for k in ["mây", "gạo", "chip chip", "chipchip"]):
            extra_rules += (
                "- SPECIAL CONTEXT: 'Mây' and 'Gạo' are the cute names of two lovely Vietnamese toddler children. "
                "NEVER translate to literal rice grains or sky clouds.\n"
            )
        if any(k in p_low for k in ["cờ tổ quốc", "quốc kỳ", "cờ việt nam", "cờ đỏ sao vàng", "lá cờ việt"]):
            extra_rules += (
                "- VIETNAMESE NATIONAL FLAG (CRITICAL): 'cờ tổ quốc' / 'quốc kỳ' ALWAYS means the **National Flag of Vietnam**! "
                "Describe it explicitly as: 'a vibrant crimson red flag with a single large sharp five-pointed golden yellow star centered cleanly in the middle (National Flag of Vietnam), waving heroically in golden sunlight'. "
                "STRICTLY FORBIDDEN to generate the US flag or any other country's flag.\n"
            )

        sys_prompt = (
            "You are a world-class AI Image Prompt Engineer specializing in FLUX.1, Midjourney v6, and DALL-E 3.\n"
            "Convert the user's request faithfully into ONE ultra-detailed, artistic English prompt paragraph.\n\n"
            "STRICT RULES:\n"
            "1. FAITHFULNESS: Follow ONLY what the user actually asked for! NEVER invent random children, babies, or unrelated characters unless the user explicitly asked for them.\n"
            "2. VIETNAMESE CULTURAL ACCURACY: Understand Vietnamese terms accurately (e.g., 'cờ tổ quốc' = National Flag of Vietnam: red background with one large 5-pointed yellow star in the center; 'áo dài' = traditional Vietnamese dress; 'chùa Một Cột', 'Hồ Gươm', etc.).\n"
            f"{extra_rules}"
            "3. 3D LOGO / BADGE (if requested): Design a sleek, clean, luxury 3D metallic & glass circular emblem badge with crisp lighting, Octane 3D render, Pixar-grade material quality, 8K, centered composition, NO distorted faces.\n"
            "4. REALISTIC PHOTOGRAPHY (if requested): Hyper-realistic 8K DSLR photograph, natural lighting, sharp focus, dramatic composition, no AI artifacts.\n"
            "5. Output ONLY the final English prompt. No explanations, no markdown, no quotes."
        )
        res = gemini_client.ask_gemini(
            messages=[{"role": "user", "content": f"Create a faithful, ultra-high quality FLUX.1 English prompt for: '{prompt}' (Art style: {style})"}],
            api_key=api_key,
            system_instruction=sys_prompt
        )
        if res.get("success") and res.get("reply"):
            enhanced = res["reply"].strip().replace('"', '').replace('\n', ' ').strip()
            if enhanced.startswith("Prompt:"):
                enhanced = enhanced[7:].strip()
            logger.info(f"Prompt tối ưu từ Gemini: {enhanced[:150]}...")
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

    # 2. Thử lần lượt các Engine tạo ảnh chất lượng cao
    models_to_try = ["flux", "turbo", "flux-realism", ""]
    seed = random.randint(100000, 9999999)
    encoded_prompt = urllib.parse.quote(english_prompt)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }

    last_error = ""
    already_waited = False
    for model in models_to_try:
        if model:
            api_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&model={model}&seed={seed}&nologo=true"
        else:
            api_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&seed={seed}&nologo=true"
        try:
            logger.info(f"Đang tạo ảnh với model: {model or 'default'}...")
            res = requests.get(api_url, headers=headers, timeout=28)
            if res.status_code == 200 and len(res.content) > 1000:
                with open(file_path, "wb") as f:
                    f.write(res.content)
                clean_image_watermark(file_path)
                
                return {
                    "success": True,
                    "filename": filename,
                    "file_path": file_path,
                    "image_url": f"/api/images/{filename}",
                    "prompt": clean_prompt,
                    "optimized_prompt": english_prompt,
                    "style": style,
                    "model_used": model or "flux",
                    "width": width,
                    "height": height
                }
            elif res.status_code == 402 or res.status_code == 503 or res.status_code == 429:
                m = re.search(r'Retry after (\d+)s', res.text)
                if m:
                    wait_sec = int(m.group(1))
                    if not already_waited and wait_sec <= 45:
                        already_waited = True
                        logger.info(f"Đang chờ giãn cách {wait_sec}s để tạo ảnh chất lượng cao...")
                        time.sleep(wait_sec + 1)
                        try:
                            retry_res = requests.get(api_url, headers=headers, timeout=28)
                            if retry_res.status_code == 200 and len(retry_res.content) > 1000:
                                with open(file_path, "wb") as f:
                                    f.write(retry_res.content)
                                clean_image_watermark(file_path)
                                return {
                                    "success": True,
                                    "filename": filename,
                                    "file_path": file_path,
                                    "image_url": f"/api/images/{filename}",
                                    "prompt": clean_prompt,
                                    "optimized_prompt": english_prompt,
                                    "style": style,
                                    "model_used": model or "flux",
                                    "width": width,
                                    "height": height
                                }
                        except Exception:
                            pass
                    last_error = f"Giới hạn giãn cách miễn phí (Vui lòng chờ {wait_sec} giây)"
                    if res.status_code == 402:
                        break
                else:
                    last_error = f"Model {model or 'default'} đang bận ({res.status_code})"
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
            clean_image_watermark(file_path)
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
