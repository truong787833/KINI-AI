import os
import re
import json
import uuid
import base64
import threading
import mimetypes
from typing import Optional, List
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from . import database
from . import gemini_client
from . import image_generator
from . import file_parser
from . import tts_service
from . import doc_exporter
from . import search_engine
from . import agent_engine

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")
IMAGES_DIR = os.path.join(BASE_DIR, "generated_images")
AUDIO_DIR = os.path.join(BASE_DIR, "generated_audio")
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

database.init_db()

app = FastAPI(title="KINI AI - Siêu Trợ Lý Trí Tuệ Nhân Tạo & Xưởng Sáng Tạo", version="2.0.0")

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
    return {"message": "KINI AI Server is running."}

# ============================================================
# 1. HỘI THOẠI & CHAT CHUẨN GEMINI
# ============================================================
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

@app.post("/api/conversations/{conv_id}/pin")
def pin_conversation(conv_id: str):
    is_pinned = database.toggle_conversation_pin(conv_id)
    return {"success": True, "is_pinned": is_pinned}

@app.post("/api/conversations/{conv_id}/rename")
def rename_conversation(conv_id: str, data: dict):
    title = data.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Tiêu đề không được để trống")
    database.update_conversation_title(conv_id, title)
    return {"success": True, "title": title}

# ============================================================
# HỆ THỐNG PHIÊN BẢN & CẬP NHẬT OTA (CHUẨN GOOGLE ANTIGRAVITY)
# ============================================================
VERSION_FILE = os.path.join(BASE_DIR, "version.json")

def load_version_info() -> dict:
    if os.path.exists(VERSION_FILE):
        try:
            with open(VERSION_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "version": "4.1.0",
        "build_number": 410,
        "release_date": "2026-11-21",
        "channel": "stable",
        "app_name": "KINI AI",
        "latest_version": "4.2.0",
        "has_update": True,
        "changelog": []
    }

def save_version_info(data: dict):
    try:
        with open(VERSION_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving version: {e}")

@app.get("/api/system/version")
def get_system_version():
    return load_version_info()

@app.post("/api/system/check-update")
def check_for_updates():
    info = load_version_info()
    return {
        "has_update": info.get("has_update", False),
        "current_version": info.get("version", "4.1.0"),
        "latest_version": info.get("latest_version", "4.2.0"),
        "changelog": info.get("changelog", [])
    }

@app.post("/api/system/apply-update")
def apply_system_update():
    info = load_version_info()
    new_ver = info.get("latest_version", "4.2.0")
    old_ver = info.get("version", "4.1.0")
    info["version"] = new_ver
    info["has_update"] = False
    info["build_number"] = info.get("build_number", 410) + 10
    save_version_info(info)
    return {
        "success": True,
        "old_version": old_ver,
        "new_version": new_ver,
        "message": f"Đã cập nhật KINI AI lên phiên bản {new_ver} thành công!"
    }

@app.post("/api/system/toggle-demo-update")
def toggle_demo_update(data: dict = {}):
    info = load_version_info()
    enabled = data.get("enabled", not info.get("has_update", False))
    info["has_update"] = enabled
    if enabled and info.get("version") == info.get("latest_version"):
        parts = info.get("version", "4.2.0").split(".")
        parts[-1] = str(int(parts[-1]) + 1)
        info["latest_version"] = ".".join(parts)
    save_version_info(info)
    return {
        "success": True,
        "has_update": info["has_update"],
        "latest_version": info.get("latest_version")
    }

def extract_tool_image_prompt(text: str) -> Optional[str]:
    """Trích xuất prompt vẽ ảnh nếu Gemini tự động sinh JSON tool call (dalle.text2im)"""
    try:
        m = re.search(r'\{[\s\S]*"action"\s*:\s*"dalle\.text2im"[\s\S]*\}', text)
        if m:
            # Tìm đoạn json hoàn chỉnh
            json_str = m.group(0)
            data = json.loads(json_str)
            inp = data.get("action_input", "")
            if isinstance(inp, str):
                try:
                    inp_json = json.loads(inp)
                    p = inp_json.get("prompt", inp)
                    if p: return p
                except Exception:
                    if inp: return inp
            elif isinstance(inp, dict):
                p = inp.get("prompt", "")
                if p: return p
    except Exception:
        pass

    try:
        m_p = re.search(r'"prompt"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', text)
        if m_p:
            cleaned = m_p.group(1).encode('utf-8').decode('unicode_escape', errors='ignore')
            return cleaned
    except Exception:
        pass
    return None

@app.post("/api/chat")
async def chat_with_kini(
    conv_id: str = Form("default"),
    message: str = Form(""),
    model_mode: str = Form("flash"),
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None)
):
    api_key = database.get_setting("gemini_api_key", os.environ.get("GEMINI_API_KEY", ""))
    
    file_display_url = ""
    file_display_name = ""
    image_base64 = None
    image_mime = "image/jpeg"
    extracted_doc_text = ""

    # 1. Xử lý tệp đính kèm (Đơn lẻ, Hàng loạt hoặc Thư mục tải lên)
    upload_list = []
    if files:
        upload_list.extend(files)
    if file and file.filename and file not in upload_list:
        upload_list.append(file)

    for item in upload_list:
        if not item or not item.filename:
            continue
        file_display_name = item.filename
        content_bytes = await item.read()
        ext = os.path.splitext(item.filename)[1].lower()
        
        # Nếu là file ảnh
        if ext in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
            if not image_base64:
                image_base64 = base64.b64encode(content_bytes).decode("utf-8")
                image_mime = item.content_type or "image/jpeg"
            save_name = f"upload_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}{ext}"
            save_path = os.path.join(IMAGES_DIR, save_name)
            with open(save_path, "wb") as f:
                f.write(content_bytes)
            if not file_display_url:
                file_display_url = f"/api/images/{save_name}"
            extracted_doc_text += f"\n[Hình ảnh đính kèm: '{item.filename}']"
            
        # Nếu là tài liệu (PDF, Word, Excel, CSV, Text, Code)
        else:
            temp_name = f"temp_doc_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}{ext}"
            temp_path = os.path.join(IMAGES_DIR, temp_name)
            with open(temp_path, "wb") as f:
                f.write(content_bytes)
            if not file_display_url:
                file_display_url = f"/api/images/{temp_name}"
            
            # Trích xuất văn bản từ tài liệu
            parsed = file_parser.parse_uploaded_file(temp_path, item.filename)
            if parsed.get("success"):
                extracted_doc_text += f"\n\n[DỮ LIỆU TỆP '{item.filename}']:\n{parsed['text']}\n"
            else:
                extracted_doc_text += f"\n\n[Thông báo về tệp '{item.filename}']: Không thể trích xuất toàn bộ: {parsed.get('error')}\n"

    # Ghép văn bản câu hỏi của người dùng kèm dữ liệu tệp nếu có
    full_user_content = message.strip()
    if extracted_doc_text:
        full_user_content += extracted_doc_text

    if not full_user_content and not file_display_url:
        raise HTTPException(status_code=400, detail="Vui lòng nhập câu hỏi hoặc gửi tệp.")

    # Lưu tin nhắn người dùng vào cơ sở dữ liệu
    database.add_message(conv_id, "user", full_user_content, image_url=file_display_url)

    # Tự động cập nhật tiêu đề thông minh cho cuộc trò chuyện mới
    try:
        past_msgs = database.get_conversation_messages(conv_id)
        if len(past_msgs) <= 2:
            clean_title = re.sub(r'^/(agent|plan)\s*', '', message.strip(), flags=re.IGNORECASE)
            if clean_title:
                short_title = clean_title[:38] + ("..." if len(clean_title) > 38 else "")
                database.update_conversation_title(conv_id, short_title)
    except Exception:
        pass

    # 2. KIỂM TRA Ý ĐỊNH VẼ TRANH / TẠO ẢNH / THIẾT KẾ LOGO TRỰC TIẾP
    generated_img_url = ""
    if gemini_client.is_image_request(message):
        clean_prompt = gemini_client.clean_image_prompt(message)
        # Sử dụng Engine tạo ảnh tối ưu hóa bằng Gemini
        img_result = image_generator.generate_ai_image(clean_prompt, style="realistic", api_key=api_key)
        if img_result.get("success"):
            generated_img_url = img_result["image_url"]
            database.add_gallery_item(
                prompt=img_result["prompt"],
                style=img_result.get("style", "realistic"),
                image_url=generated_img_url,
                image_path=img_result["file_path"],
                width=img_result.get("width", 1024),
                height=img_result.get("height", 1024)
            )
            assistant_reply = (
                f"🎨 **Tác phẩm do KINI AI tạo ra cho anh Trường:**\n\n"
                f"*Mô tả gốc:* \"{clean_prompt}\"\n\n"
                f"*Prompt tối ưu (English):* `{img_result.get('optimized_prompt', clean_prompt)}`\n\n"
                f"Anh có thể bấm nút tải ảnh HD bên dưới hoặc yêu cầu em chỉnh sửa thêm chi tiết nhé!"
            )
            database.add_message(conv_id, "assistant", assistant_reply, image_url=generated_img_url)
            return {
                "success": True,
                "reply": assistant_reply,
                "image_url": generated_img_url,
                "is_image_generated": True
            }
        else:
            fail_reply = f"⚠️ Dạ thưa anh Trường, hệ thống vẽ ảnh đang bận hoặc quá tải tạm thời: {img_result.get('error', 'Không phản hồi')}. Anh vui lòng bấm gửi lại giúp em nhé!"
            database.add_message(conv_id, "assistant", fail_reply)
            return {
                "success": True,
                "reply": fail_reply,
                "image_url": "",
                "is_image_generated": False
            }

    # 3.0. KIỂM TRA LỆNH LẬP KẾ HOẠCH KIẾN TRÚC HỆ THỐNG (/plan) CHUẨN ANTIGRAVITY
    if message.strip().startswith("/plan"):
        clean_goal = message.replace("/plan", "").strip()
        plan_res = agent_engine.run_plan_task(clean_goal, api_key=api_key)
        reply = plan_res.get("reply", "Không thể lập kế hoạch.")
        database.add_message(conv_id, "assistant", reply)
        return {
            "success": True,
            "reply": reply,
            "is_plan": True,
            "model_used": plan_res.get("model_used", "gemini-3.1-pro-preview")
        }

    # 3. KIỂM TRA Ý ĐỊNH AGENT TỰ HÀNH CHUẨN ANTIGRAVITY (Tự động tạo dự án, viết code file vào đĩa)
    is_agent_cmd = (
        message.strip().startswith("/agent") or 
        any(k in message.lower() for k in ["tạo game", "làm game", "viết code game", "tạo dự án", "lập trình dự án", "agent hãy", "tự động làm"])
    )
    if is_agent_cmd:
        clean_task = message.replace("/agent", "").strip()
        agent_res = agent_engine.run_agent_task(clean_task, api_key=api_key)
        if agent_res.get("success"):
            assistant_reply = agent_res.get("reply", "")
            actions = agent_res.get("actions", [])
            if actions:
                summary_lines = ["\n\n🛠️ **Nhật ký KINI Agent đã tự động thực thi vào máy tính:**"]
                for a in actions:
                    if a["tool"] == "write_file":
                        summary_lines.append(f"- 📝 Đã tạo file: `H:\\KINI_AI\\workspace\\{a.get('path')}`")
                    elif a["tool"] == "run_command":
                        summary_lines.append(f"- ⚡ Đã chạy lệnh: `{a.get('command')}` (Mã: {a.get('returncode')})")
                assistant_reply += "\n" + "\n".join(summary_lines)
            database.add_message(conv_id, "assistant", assistant_reply)
            return {
                "success": True,
                "reply": assistant_reply,
                "is_agent": True,
                "actions": actions
            }

    # 4. NẾU LÀ TRÒ CHUYỆN & SUY LUẬN BÌNH THƯỜNG
    # Tra cứu Internet trực tuyến nếu câu hỏi liên quan đến luật pháp, thời sự, năm 2025-2026, thông tin mới
    live_search_text = ""
    if search_engine.needs_live_search(message):
        try:
            grounded_data = search_engine.get_grounded_context(message)
            if grounded_data:
                live_search_text = f"\n\n{grounded_data}"
        except Exception as e:
            pass

    past_msgs = database.get_conversation_messages(conv_id)[-12:]
    formatted_history = []
    # Lấy các tin nhắn trước
    for m in past_msgs[:-1]:
        formatted_history.append({
            "role": m["role"],
            "content": m["content"]
        })
    # Gắn tin nhắn hiện tại kèm kết quả tra cứu trực tuyến mới nhất
    current_content_with_grounding = full_user_content + live_search_text
    formatted_history.append({
        "role": "user",
        "content": current_content_with_grounding
    })

    # Gọi Google Gemini với độ chính xác cao và đúng chế độ Flash / Pro
    res = gemini_client.ask_gemini(
        messages=formatted_history,
        api_key=api_key,
        image_base64=image_base64,
        image_mime=image_mime,
        model_mode=model_mode
    )

    assistant_reply = res.get("reply", "Xin lỗi, đã xảy ra lỗi trong quá trình xử lý.")

    # KIỂM TRA NẾU GEMINI TỰ ĐỘNG PHÁT RA LỆNH GỌI CÔNG CỤ VẼ ẢNH (dalle.text2im)
    if "dalle.text2im" in assistant_reply or ('"action":' in assistant_reply and '"prompt"' in assistant_reply):
        tool_prompt = extract_tool_image_prompt(assistant_reply) or gemini_client.clean_image_prompt(message)
        img_result = image_generator.generate_ai_image(tool_prompt, style="realistic", api_key=api_key)
        if img_result.get("success"):
            generated_img_url = img_result["image_url"]
            database.add_gallery_item(
                prompt=img_result["prompt"],
                style=img_result.get("style", "realistic"),
                image_url=generated_img_url,
                image_path=img_result["file_path"],
                width=img_result.get("width", 1024),
                height=img_result.get("height", 1024)
            )
            assistant_reply = (
                f"🎨 **Tác phẩm do KINI AI tạo ra cho anh Trường:**\n\n"
                f"*Mô tả gốc:* \"{message}\"\n\n"
                f"*Prompt tối ưu (English):* `{img_result.get('optimized_prompt', tool_prompt)}`\n\n"
                f"Anh có thể bấm nút tải ảnh HD bên dưới hoặc yêu cầu em chỉnh sửa thêm chi tiết nhé!"
            )
            database.add_message(conv_id, "assistant", assistant_reply, image_url=generated_img_url)
            return {
                "success": True,
                "reply": assistant_reply,
                "image_url": generated_img_url,
                "is_image_generated": True
            }
        else:
            assistant_reply = (
                f"🎨 **KINI AI đã sẵn sàng phác thảo tác phẩm cho anh Trường:**\n\n"
                f"Dạ thưa anh, cổng tạo ảnh nghệ thuật đang có độ trễ tạm thời: {img_result.get('error', 'Máy chủ bận')}.\n\n"
                f"💡 *Mô tả ý tưởng:* \"{tool_prompt}\"\n\n"
                f"Anh vui lòng bấm nút gửi lại hoặc mở mục **KINI Studio (Tạo Ảnh)** để thử ngay nhé!"
            )
            database.add_message(conv_id, "assistant", assistant_reply)
            return {
                "success": True,
                "reply": assistant_reply,
                "image_url": "",
                "is_image_generated": False
            }

    database.add_message(conv_id, "assistant", assistant_reply)

    # Tự động trích xuất ký ức ngầm trong background để KINI luôn ghi nhớ về anh Trường
    threading.Thread(
        target=gemini_client.extract_and_save_memory_async, 
        args=(message, api_key), 
        daemon=True
    ).start()

    return {
        "success": res.get("success", False),
        "reply": assistant_reply,
        "image_url": file_display_url,
        "model_used": res.get("model_used", "gemini")
    }

# ============================================================
# 2. GIỌNG ĐỌC AI TIẾNG VIỆT (TEXT-TO-SPEECH)
# ============================================================
@app.post("/api/tts")
async def text_to_speech(data: dict):
    text = data.get("text", "").strip()
    voice = data.get("voice", "female")
    if not text:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp văn bản cần đọc.")
    
    result = await tts_service.generate_vietnamese_audio_async(text, voice_type=voice)
    if result.get("success"):
        return result
    raise HTTPException(status_code=500, detail=result.get("error", "Lỗi tạo giọng đọc"))

@app.get("/api/audio/{filename}")
def serve_audio(filename: str):
    file_path = os.path.join(AUDIO_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="audio/mpeg")
    raise HTTPException(status_code=404, detail="Không tìm thấy tệp âm thanh")

# ============================================================
# 3. SIÊU BỘ NHỚ DÀI HẠN (LONG-TERM MEMORY)
# ============================================================
@app.get("/api/memories")
def list_memories():
    return {"memories": database.get_all_memories(limit=100)}

@app.post("/api/memories")
def create_memory(data: dict):
    key = data.get("key", "").strip()
    value = data.get("value", "").strip()
    fact = data.get("fact", "").strip()
    category = data.get("category", "personal").strip() or "personal"

    if not fact and (key or value):
        if key and value:
            fact = f"{key}: {value}"
        else:
            fact = key or value

    if not fact and not value:
        raise HTTPException(status_code=400, detail="Nội dung ký ức không được rỗng.")

    mem_id = database.add_memory(fact=fact, category=category, key=key, value=value)
    return {
        "success": True,
        "id": mem_id,
        "key": key,
        "value": value,
        "fact": fact,
        "category": category
    }

@app.put("/api/memories/{memory_id}")
def update_memory_route(memory_id: int, data: dict):
    key = data.get("key", "").strip()
    value = data.get("value", "").strip()
    fact = data.get("fact", "").strip()
    category = data.get("category", "").strip()

    if not fact and (key or value):
        if key and value:
            fact = f"{key}: {value}"
        else:
            fact = key or value

    success = database.update_memory(memory_id, key=key, value=value, category=category, fact=fact)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi ký ức để cập nhật.")
    return {
        "success": True,
        "id": memory_id,
        "key": key,
        "value": value,
        "category": category,
        "fact": fact
    }

@app.delete("/api/memories/{memory_id}")
def delete_single_memory(memory_id: int):
    database.delete_memory(memory_id)
    return {"success": True, "id": memory_id}

@app.delete("/api/memories")
def clear_all_memories():
    database.clear_memories()
    return {"success": True}

# ============================================================
# 4. XUẤT FILE 1 CHẠM (WORD .DOCX & EXCEL .XLSX)
# ============================================================
@app.post("/api/export-docx")
def export_docx(data: dict):
    content = data.get("content", "").strip()
    title = data.get("title", "Tài Liệu KINI AI").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Không có nội dung để xuất Word.")
    filename = doc_exporter.export_text_to_docx(content, title=title)
    return {"success": True, "download_url": f"/api/images/{filename}", "filename": filename}

@app.post("/api/export-xlsx")
def export_xlsx(data: dict):
    content = data.get("content", "").strip()
    title = data.get("title", "Bang_Du_Lieu").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Không có dữ liệu bảng để xuất Excel.")
    filename = doc_exporter.export_table_to_xlsx(content, title=title)
    return {"success": True, "download_url": f"/api/images/{filename}", "filename": filename}

# ============================================================
# 5. TẠO ẢNH & GALLERY (KINI STUDIO)
# ============================================================
@app.post("/api/generate-image")
def create_image(data: dict):
    prompt = data.get("prompt", "").strip()
    style = data.get("style", "realistic")
    width = int(data.get("width", 1024))
    height = int(data.get("height", 1024))
    api_key = database.get_setting("gemini_api_key", os.environ.get("GEMINI_API_KEY", ""))

    if not prompt:
        raise HTTPException(status_code=400, detail="Vui lòng nhập mô tả bức ảnh bạn muốn vẽ.")

    result = image_generator.generate_ai_image(prompt, style=style, width=width, height=height, api_key=api_key)
    if result["success"]:
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
    raise HTTPException(status_code=404, detail="Không tìm thấy tệp")

# ============================================================
# 5.1. KINI AI AGENT TỰ HÀNH (AUTONOMOUS AGENT CHUẨN ANTIGRAVITY)
# ============================================================
@app.post("/api/agent/run")
async def run_agent_endpoint(data: dict):
    task = data.get("task", "").strip()
    conv_id = data.get("conv_id", "default")
    api_key = database.get_setting("gemini_api_key", os.environ.get("GEMINI_API_KEY", ""))
    if not task:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp nội dung nhiệm vụ.")
    
    database.add_message(conv_id, "user", f"🤖 [Yêu cầu Agent]: {task}")
    agent_res = agent_engine.run_agent_task(task, api_key=api_key)
    assistant_reply = agent_res.get("reply", "")
    actions = agent_res.get("actions", [])
    if actions:
        summary_lines = ["\n\n🛠️ **Nhật ký KINI Agent đã tự động thực thi vào máy tính:**"]
        for a in actions:
            if a["tool"] == "write_file":
                summary_lines.append(f"- 📝 Đã tạo file: `H:\\KINI_AI\\workspace\\{a.get('path')}`")
            elif a["tool"] == "run_command":
                summary_lines.append(f"- ⚡ Đã chạy lệnh: `{a.get('command')}` (Mã: {a.get('returncode')})")
        assistant_reply += "\n" + "\n".join(summary_lines)
    database.add_message(conv_id, "assistant", assistant_reply)
    return {
        "success": True,
        "reply": assistant_reply,
        "actions": actions
    }

@app.get("/api/agent/workspace")
def get_workspace_files():
    return agent_engine.tool_list_files()

@app.post("/api/agent/open")
def open_agent_path(data: dict):
    rel_path = data.get("path", "").strip()
    full_path = os.path.join(agent_engine.WORKSPACE_DIR, os.path.normpath(rel_path).lstrip("\\/."))
    if os.path.exists(full_path):
        try:
            os.startfile(full_path)
            return {"success": True, "path": full_path}
        except Exception as e:
            return {"success": False, "error": str(e)}
    return {"success": False, "error": "Đường dẫn không tồn tại"}

@app.get("/api/agent/file")
def get_workspace_file_content(path: str = ""):
    res = agent_engine.tool_read_file(path)
    if res.get("success"):
        return res
    raise HTTPException(status_code=404, detail=res.get("error", "Không tìm thấy file"))

@app.post("/api/agent/file")
def save_workspace_file_content(data: dict):
    path = data.get("path", "").strip()
    content = data.get("content", "")
    if not path:
        raise HTTPException(status_code=400, detail="Thiếu đường dẫn file")
    res = agent_engine.tool_write_file(path, content)
    if res.get("success"):
        return res
    raise HTTPException(status_code=500, detail=res.get("error", "Không thể ghi file"))

@app.post("/api/agent/create_file")
def create_workspace_file(data: dict):
    path = data.get("path", "").strip()
    content = data.get("content", "")
    if not path:
        raise HTTPException(status_code=400, detail="Thiếu đường dẫn file mới")
    res = agent_engine.tool_write_file(path, content)
    return res

@app.post("/api/agent/create_folder")
def create_workspace_folder(data: dict):
    path = data.get("path", "").strip()
    if not path:
        raise HTTPException(status_code=400, detail="Thiếu đường dẫn thư mục mới")
    res = agent_engine.tool_create_folder(path)
    return res

@app.post("/api/agent/delete")
def delete_workspace_item(data: dict):
    path = data.get("path", "").strip()
    if not path:
        raise HTTPException(status_code=400, detail="Thiếu đường dẫn cần xóa")
    res = agent_engine.tool_delete_path(path)
    return res

@app.post("/api/agent/rename")
def rename_workspace_item(data: dict):
    old_path = data.get("old_path", "").strip()
    new_path = data.get("new_path", "").strip()
    if not old_path or not new_path:
        raise HTTPException(status_code=400, detail="Thiếu đường dẫn cũ hoặc mới")
    res = agent_engine.tool_rename_path(old_path, new_path)
    return res

@app.post("/api/agent/search")
def search_workspace_files(data: dict):
    keyword = data.get("keyword", "").strip()
    res = agent_engine.tool_search_in_files(keyword)
    return res

@app.get("/api/agent/preview/{filepath:path}")
def serve_agent_preview(filepath: str):
    full_path = os.path.join(agent_engine.WORKSPACE_DIR, os.path.normpath(filepath).lstrip("\\/."))
    if os.path.exists(full_path) and os.path.isfile(full_path):
        return FileResponse(full_path)
    raise HTTPException(status_code=404, detail="Không tìm thấy tệp xem trước")

# ============================================================
# 5.2. WORKSPACE FILE MANAGER (CHUẨN STUDIO IDE & IFRAME PREVIEW)
# ============================================================
@app.post("/api/workspace/create-file")
@app.post("/api/workspace/create_file")
def workspace_create_file(data: dict):
    path = data.get("path", "").strip()
    content = data.get("content", "")
    if not path:
        raise HTTPException(status_code=400, detail="Thiếu đường dẫn file")
    res = agent_engine.tool_write_file(path, content)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Lỗi tạo file"))
    return res

@app.post("/api/workspace/create-folder")
@app.post("/api/workspace/create_folder")
def workspace_create_folder(data: dict):
    path = data.get("path", "").strip()
    if not path:
        raise HTTPException(status_code=400, detail="Thiếu đường dẫn thư mục")
    res = agent_engine.tool_create_folder(path)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Lỗi tạo thư mục"))
    return res

@app.post("/api/workspace/rename")
def workspace_rename_item(data: dict):
    old_path = data.get("old_path", "").strip()
    new_path = data.get("new_path", "").strip()
    if not old_path or not new_path:
        raise HTTPException(status_code=400, detail="Thiếu đường dẫn cũ hoặc mới")
    res = agent_engine.tool_rename_path(old_path, new_path)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Lỗi đổi tên"))
    return res

@app.post("/api/workspace/delete")
def workspace_delete_item(data: dict):
    path = data.get("path", "").strip()
    if not path:
        raise HTTPException(status_code=400, detail="Thiếu đường dẫn cần xóa")
    res = agent_engine.tool_delete_path(path)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Lỗi xóa tệp/thư mục"))
    return res

@app.get("/api/workspace/raw")
def serve_workspace_raw(path: str = ""):
    if not path:
        raise HTTPException(status_code=400, detail="Thiếu tham số path")
    clean_path = os.path.normpath(path).lstrip("\\/.")
    full_path = os.path.join(agent_engine.WORKSPACE_DIR, clean_path)

    # Đảm bảo đường dẫn nằm trong thư mục workspace an toàn
    real_workspace = os.path.realpath(agent_engine.WORKSPACE_DIR)
    real_target = os.path.realpath(full_path)
    if not (real_target == real_workspace or real_target.startswith(real_workspace + os.sep)):
        raise HTTPException(status_code=403, detail="Đường dẫn không hợp lệ ngoài workspace")

    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp")

    mime_type, _ = mimetypes.guess_type(full_path)
    ext = os.path.splitext(full_path)[1].lower()

    if ext in [".html", ".htm"]:
        mime_type = "text/html; charset=utf-8"
    elif ext in [".js", ".mjs"]:
        mime_type = "application/javascript; charset=utf-8"
    elif ext in [".css"]:
        mime_type = "text/css; charset=utf-8"
    elif ext in [".json"]:
        mime_type = "application/json; charset=utf-8"
    elif ext in [".svg"]:
        mime_type = "image/svg+xml"
    elif ext in [".png"]:
        mime_type = "image/png"
    elif ext in [".jpg", ".jpeg"]:
        mime_type = "image/jpeg"
    elif ext in [".gif"]:
        mime_type = "image/gif"
    elif ext in [".webp"]:
        mime_type = "image/webp"
    elif ext in [".ico"]:
        mime_type = "image/x-icon"
    elif ext in [".mp3"]:
        mime_type = "audio/mpeg"
    elif ext in [".wav"]:
        mime_type = "audio/wav"
    elif ext in [".mp4"]:
        mime_type = "video/mp4"
    elif ext in [".txt", ".md", ".py"]:
        mime_type = "text/plain; charset=utf-8"
    elif not mime_type:
        mime_type = "application/octet-stream"

    return FileResponse(
        path=full_path,
        media_type=mime_type,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Access-Control-Allow-Origin": "*"
        }
    )

@app.get("/api/usage")
def get_quota_usage():
    return database.get_usage_statistics()

# ============================================================
# 6. CÀI ĐẶT
# ============================================================
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
