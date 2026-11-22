"""
Module Image Editor cho KINI AI:
Hỗ trợ chỉnh sửa ảnh trực tiếp, thay đổi thông tin (Số điện thoại, Văn bản),
inpaint xóa chữ cũ và vẽ chữ 3D bóng bẩy (3D Jelly / Pixar Emboss) chuẩn nét.
"""
import os
import re
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from typing import Dict, Any, Optional

IMAGES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "generated_images")
os.makedirs(IMAGES_DIR, exist_ok=True)

def render_3d_jelly_text(text: str, font_path: str = r"C:\Windows\Fonts\COOPBL.TTF", scale: int = 2) -> Image.Image:
    """Vẽ chữ số/văn bản 3D nổi khối phong cách Jelly/Pixar với viền kem và đổ bóng mềm"""
    font_size = 114 * scale
    font = ImageFont.truetype(font_path, font_size)
    
    char_info = []
    cur_x = 20 * scale
    y_pos = 15 * scale
    for c in text:
        bbox = font.getbbox(c)
        cw = bbox[2] - bbox[0]
        char_info.append((c, cur_x, cw))
        cur_x += int((cw - 2 * scale) * 0.91)

    W = cur_x + 30 * scale
    H = 145 * scale

    palette = [
        np.array([45, 145, 240]),   # 0
        np.array([32, 175, 245]),   # 3
        np.array([25, 205, 215]),   # 6
        np.array([38, 215, 175]),   # 7
        np.array([48, 220, 145]),   # 7
        np.array([55, 215, 115]),   # 2
        np.array([42, 200, 140]),   # 2
        np.array([30, 185, 205]),   # 0
        np.array([40, 150, 235]),   # 9
        np.array([48, 138, 240])    # 1
    ]

    text_mask = np.zeros((H, W), dtype=np.uint8)
    color_map = np.zeros((H, W, 3), dtype=np.float32)

    for i, (c, x, cw) in enumerate(char_info):
        c_img = Image.new('L', (W, H), 0)
        c_draw = ImageDraw.Draw(c_img)
        c_draw.text((x, y_pos), c, font=font, fill=255)
        c_arr = np.array(c_img)
        text_mask = np.maximum(text_mask, c_arr)
        color_idx = i % len(palette)
        color_map[c_arr > 10] = palette[color_idx]

    dist = cv2.distanceTransform(text_mask, cv2.DIST_L2, 5)
    dist_smooth = cv2.GaussianBlur(dist, (11, 11), 3.5)

    gx = cv2.Sobel(dist_smooth, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(dist_smooth, cv2.CV_32F, 0, 1, ksize=3)
    gz = np.ones_like(dist) * 2.2

    norm = np.sqrt(gx**2 + gy**2 + gz**2) + 1e-6
    nx = -gx / norm
    ny = -gy / norm
    nz = gz / norm

    lx, ly, lz = -0.4, -0.6, 0.75
    l_len = np.sqrt(lx**2 + ly**2 + lz**2)
    lx, ly, lz = lx/l_len, ly/l_len, lz/l_len

    diffuse = np.clip(nx*lx + ny*ly + nz*lz, 0, 1)
    rx = 2 * (nx*lx + ny*ly + nz*lz) * nx - lx
    ry = 2 * (nx*lx + ny*ly + nz*lz) * ny - ly
    rz = 2 * (nx*lx + ny*ly + nz*lz) * nz - lz
    specular = np.clip(rz, 0, 1) ** 22

    shaded_rgb = color_map * (0.62 + 0.38 * diffuse[:, :, None]) + (specular[:, :, None] * 235)
    shaded_rgb = np.clip(shaded_rgb, 0, 255).astype(np.uint8)

    jelly_pil = Image.fromarray(np.dstack([shaded_rgb, text_mask]), 'RGBA')

    border_size = int(5.5 * scale)
    border_mask = cv2.dilate(text_mask, np.ones((border_size*2+1, border_size*2+1), np.uint8))
    shadow_mask = cv2.dilate(text_mask, np.ones((border_size*2+7, border_size*2+7), np.uint8))

    border_pil = Image.fromarray(border_mask, 'L')
    border_rgba = Image.new('RGBA', (W, H), (255, 248, 235, 255))
    border_rgba.putalpha(border_pil)

    shadow_rgba = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    shadow_pil = Image.fromarray(shadow_mask, 'L')
    shadow_rgba.paste((80, 40, 10, 140), (0, int(3.5 * scale)), mask=shadow_pil)
    shadow_rgba = shadow_rgba.filter(ImageFilter.GaussianBlur(radius=2.5 * scale))

    comp = Image.alpha_composite(shadow_rgba, border_rgba)
    comp = Image.alpha_composite(comp, jelly_pil)
    return comp

def update_badge_phone_number(source_image_path: str, new_phone: str) -> Dict[str, Any]:
    """Cập nhật số điện thoại trên huy hiệu logo chip chip một cách hoàn hảo và tự nhiên"""
    try:
        orig = Image.open(source_image_path).convert('RGBA')
        orig_w, orig_h = orig.size
        arr = np.array(orig)

        # Tọa độ vùng số điện thoại trên ảnh chuẩn 2048x2048
        scale_ratio = orig_w / 2048.0
        y1 = int(1640 * scale_ratio)
        y2 = int(1768 * scale_ratio)
        x1 = int(802 * scale_ratio)
        x2 = int(1412 * scale_ratio)

        sub = arr[y1:y2, x1:x2, :3]
        b_mask = (sub[:, :, 2] > 135) | ((sub[:, :, 1] > 170) & (sub[:, :, 0] < 120)) | (sub[:, :, 0] < 115) | (sub[:, :, 2] > sub[:, :, 1])
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
        mask_dilated = cv2.dilate(b_mask.astype(np.uint8) * 255, kernel)

        inpainted = cv2.inpaint(sub, mask_dilated, inpaintRadius=9, flags=cv2.INPAINT_TELEA)
        blur_inp = cv2.GaussianBlur(inpainted, (7, 7), 2)
        mask_f = (mask_dilated.astype(np.float32) / 255.0)[:, :, None]
        final_sub = (blur_inp * mask_f + inpainted * (1.0 - mask_f)).astype(np.uint8)
        arr[y1:y2, x1:x2, :3] = final_sub

        # Vẽ số điện thoại mới 3D
        rendered_3d = render_3d_jelly_text(new_phone)
        target_w = int(608 * scale_ratio)
        target_h = int(rendered_3d.height * (target_w / rendered_3d.width))
        rendered_target = rendered_3d.resize((target_w, target_h), Image.Resampling.LANCZOS)

        bg_pil = Image.fromarray(arr, 'RGBA')
        paste_x = int(804 * scale_ratio)
        paste_y = int(1642 * scale_ratio)
        bg_pil.paste(rendered_target, (paste_x, paste_y), rendered_target)

        out_name = f"edited_logo_{int(cv2.getTickCount())}.png"
        out_path = os.path.join(IMAGES_DIR, out_name)
        bg_pil.save(out_path)

        return {
            "success": True,
            "filename": out_name,
            "file_path": out_path,
            "image_url": f"/api/images/{out_name}",
            "width": orig_w,
            "height": orig_h
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
