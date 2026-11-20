import os
import uuid
import base64
from typing import Optional, List
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from . import database
from . import gemini_client
from . import image_generator

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")
IMAGES_DIR = os.path.join(BASE_DIR, "generated_images")

database.init_db()

app = FastAPI(title="KINI AI - Siêu Trợ Lý & Studio Sáng Tạo", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def get_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "KINI AI API is running. index.html not found."}

# --- CÁC ENDPOINT QUẢN LÝ HỘI THOẠI & CHAT ---
@app.get("/api/conversations")
def get_conversations():
    return {"conversations": database.list_conversations()}

@app.post("/api/conversations")
def create_new_conversation(data: dict):
    title = data.get("title", "Cuộc trò chuyện mới")
    conv_id = str(uuid.uuid4())[:8]
    database.create_conversation(conv_id, title)
    return {"id": conv_id, "title": title}

@app.get("/api/conversations/{conv_id}/messages")
def get_messages(conv_id: str):
    messages = database.get_conversation_messages(conv_id)
    return {"messages": messages}

@app.delete("/api/conversations/{conv_id}")
def remove_conversation(conv_id: str):
    database.delete_conversation(conv_id)
    return {"success": True}

@app.post("/api/chat")
async def chat_with_kini(
    conv_id: str = Form(...),
    message: str = Form(...),
    image: Optional[UploadFile] = File(None)
):
    api_key = database.get_setting("gemini_api_key", os.environ.get("GEMINI_API_KEY", ""))
    persona = database.get_setting("custom_persona", gemini_client.DEFAULT_SYSTEM_PROMPT)

    image_url = ""
    image_base64 = None
    image_mime = "image/jpeg"

    # Nếu người dùng gửi kèm ảnh
    if image and image.filename:
        image_bytes = await image.read()
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
        image_mime = image.content_type or "image/jpeg"
        
        # Lưu ảnh vào thư mục để hiển thị trên chat
        ext = os.path.splitext(image.filename)[1] or ".jpg"
        img_name = f"upload_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}{ext}"
        img_path = os.path.join(IMAGES_DIR, img_name)
        with open(img_path, "wb") as f:
            f.write(image_bytes)
        image_url = f"/api/images/{img_name}"

    # Lưu tin nhắn của User vào DB
    database.add_message(conv_id, "user", message, image_url=image_url)

    # Lấy lịch sử hội thoại gần nhất (tối đa 12 tin gần nhất để giữ context)
    past_msgs = database.get_conversation_messages(conv_id)[-12:]
    formatted_history = []
    for m in past_msgs:
        formatted_history.append({
            "role": m["role"],
            "content": m["content"]
        })

    # Gọi Google Gemini
    res = gemini_client.ask_gemini(
        messages=formatted_history,
        api_key=api_key,
        system_instruction=persona,
        image_base64=image_base64,
        image_mime=image_mime
    )

    assistant_reply = res.get("reply", "Xin lỗi, đã xảy ra lỗi trong quá trình xử lý.")
    database.add_message(conv_id, "assistant", assistant_reply)

    return {
        "success": res.get("success", False),
        "reply": assistant_reply,
        "image_url": image_url
    }

# --- CÁC ENDPOINT TẠO ẢNH AI (KINI STUDIO) ---
@app.post("/api/generate-image")
def create_image(data: dict):
    prompt = data.get("prompt", "").strip()
    style = data.get("style", "realistic")
    width = int(data.get("width", 1024))
    height = int(data.get("height", 1024))

    if not prompt:
        raise HTTPException(status_code=400, detail="Vui lòng nhập mô tả bức ảnh bạn muốn vẽ.")

    result = image_generator.generate_ai_image(prompt, style=style, width=width, height=height)
    if result["success"]:
        # Lưu tác phẩm vào Gallery
        item_id = database.add_gallery_item(
            prompt=result["prompt"],
            style=result["style"],
            image_url=result["image_url"],
            image_path=result["file_path"],
            width=result["width"],
            height=result["height"]
        )
        result["gallery_id"] = item_id
        return result
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Không thể tạo ảnh"))

@app.get("/api/gallery")
def get_gallery():
    items = database.get_gallery_items(limit=60)
    return {"gallery": items}

@app.get("/api/images/{filename}")
def serve_image(filename: str):
    file_path = os.path.join(IMAGES_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="Không tìm thấy ảnh")

# --- CÁC ENDPOINT CÀI ĐẶT ---
@app.get("/api/settings")
def read_settings():
    return {
        "gemini_api_key": database.get_setting("gemini_api_key", ""),
        "has_api_key": bool(database.get_setting("gemini_api_key", os.environ.get("GEMINI_API_KEY", ""))),
        "custom_persona": database.get_setting("custom_persona", gemini_client.DEFAULT_SYSTEM_PROMPT)
    }

@app.post("/api/settings")
def save_settings(data: dict):
    if "gemini_api_key" in data:
        database.set_setting("gemini_api_key", data["gemini_api_key"].strip())
    if "custom_persona" in data:
        database.set_setting("custom_persona", data["custom_persona"].strip())
    return {"success": True, "message": "Đã lưu cài đặt thành công!"}
