import os
import re
import json
import uuid
import base64
import threading
import mimetypes
import time
import sys
import subprocess
import urllib.parse
from typing import Optional, List
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Header
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from . import database
from . import gemini_client
from . import image_generator
from . import file_parser
from . import tts_service
from . import doc_exporter
from . import search_engine
from . import agent_engine
from . import math_verifier

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
# 1. HỘI THOẠI & CHAT CHUẨN GEMINI (HỖ TRỢ ĐA NGƯỜI DÙNG / THIẾT BỊ ĐỘC LẬP)
# ============================================================
def get_request_client_id(request: Request) -> str:
    cid = request.headers.get("x-client-id", "").strip()
    if not cid:
        cid = request.query_params.get("client_id", "").strip()
    return cid if cid else "master"

@app.get("/api/conversations")
def get_conversations(request: Request):
    cid = get_request_client_id(request)
    return {"conversations": database.list_conversations(client_id=cid)}

@app.post("/api/conversations")
def create_new_conversation(data: dict, request: Request):
    cid = get_request_client_id(request)
    title = data.get("title", "Cuộc trò chuyện mới")
    conv_id = str(uuid.uuid4())[:8]
    database.create_conversation(conv_id, title, client_id=cid)
    return {"id": conv_id, "title": title}

@app.get("/api/conversations/{conv_id}/messages")
def get_messages(conv_id: str, request: Request):
    cid = get_request_client_id(request)
    messages = database.get_conversation_messages(conv_id, client_id=cid)
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
    request: Request,
    conv_id: str = Form("default"),
    message: str = Form(""),
    model_mode: str = Form("flash"),
    agent_mode: Optional[str] = Form(None),
    confirm_agent: Optional[str] = Form("no"),
    task_prompt: Optional[str] = Form(""),
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    is_voice_live: Optional[str] = Form("0")
):
    cid = get_request_client_id(request)
    api_key = database.get_setting("gemini_api_key", "", client_id=cid)
    if not api_key:
        api_key = database.get_setting("gemini_api_key", os.environ.get("GEMINI_API_KEY", ""), client_id="master")
    
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
    database.add_message(conv_id, "user", full_user_content, image_url=file_display_url, client_id=cid)

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
        # Tự động nhận diện phong cách tốt nhất dựa trên yêu cầu của người dùng
        detected_style = "realistic"
        low_p = message.lower()
        if any(k in low_p for k in ["3d", "pixar", "disney", "chibi", "dễ thương", "glossy", "nổi khối"]):
            detected_style = "3d"
        elif any(k in low_p for k in ["logo", "biểu tượng", "icon", "badge", "emblem"]):
            detected_style = "3d"
        elif any(k in low_p for k in ["anime", "manga", "hoạt hình"]):
            detected_style = "anime"
        elif any(k in low_p for k in ["cyberpunk", "neon", "tương lai", "futuristic", "sci-fi"]):
            detected_style = "cyberpunk"
        elif any(k in low_p for k in ["poster", "banner", "điện ảnh", "cinematic", "phim"]):
            detected_style = "cinematic"
        elif any(k in low_p for k in ["sơn dầu", "tranh vẽ", "oil", "watercolor", "màu nước"]):
            detected_style = "oil"

        # Sử dụng Engine tạo ảnh FLUX.1 tối ưu hóa bằng Gemini
        img_result = image_generator.generate_ai_image(clean_prompt, style=detected_style, api_key=api_key)
        if img_result.get("success"):
            generated_img_url = img_result["image_url"]
            database.add_gallery_item(
                prompt=img_result["prompt"],
                style=img_result.get("style", detected_style),
                image_url=generated_img_url,
                image_path=img_result["file_path"],
                width=img_result.get("width", 1024),
                height=img_result.get("height", 1024)
            )
            if cid == "master":
                assistant_reply = (
                    f"🎨 **Em đã tạo xong tác phẩm cho anh Trường rồi ạ!** ✨\n\n"
                    f"- 📝 **Chủ đề:** *\"{clean_prompt}\"*\n"
                    f"- 🎭 **Phong cách:** *{detected_style.upper()}*\n"
                    f"- ⚡ **Động cơ AI:** *FLUX.1 Pro Ultra HD & Gemini Prompt Engine*\n\n"
                    f"Anh có thể bấm trực tiếp vào ảnh để phóng to, bấm các nút tải HD bên dưới hoặc dặn em tạo thêm các biến thể khác nhé!"
                )
            else:
                assistant_reply = (
                    f"🎨 **Tác phẩm của bạn đã hoàn thành:** ✨\n\n"
                    f"- 📝 **Chủ đề:** *\"{clean_prompt}\"*\n"
                    f"- 🎭 **Phong cách:** *{detected_style.upper()}*\n"
                    f"- ⚡ **Động cơ AI:** *FLUX.1 Pro Ultra HD*\n\n"
                    f"Bạn có thể bấm vào ảnh để phóng to hoặc tải ảnh HD về máy!"
                )
            database.add_message(conv_id, "assistant", assistant_reply, image_url=generated_img_url, client_id=cid)
            return {
                "success": True,
                "reply": assistant_reply,
                "image_url": generated_img_url,
                "is_image_generated": True,
                "model_used": "FLUX.1 AI Engine"
            }
        else:
            if cid == "master":
                fail_reply = f"⚠️ Dạ thưa anh Trường, hệ thống vẽ ảnh FLUX.1 đang bận tạm thời: {img_result.get('error', 'Không phản hồi')}. Anh vui lòng thử bấm gửi lại giúp em nhé!"
            else:
                fail_reply = f"⚠️ Hệ thống tạo ảnh đang bận tạm thời: {img_result.get('error', 'Không phản hồi')}. Bạn vui lòng bấm gửi lại nhé!"
            database.add_message(conv_id, "assistant", fail_reply, client_id=cid)
            return {
                "success": True,
                "reply": fail_reply,
                "image_url": "",
                "is_image_generated": False
            }

    # 3.0. KIỂM TRA LỆNH LẬP KẾ HOẠCH KIẾN TRÚC HỆ THỐNG (/plan) CHUẨN ANTIGRAVITY
    if message.strip().startswith("/plan"):
        clean_goal = message.replace("/plan", "").strip()
        plan_res = agent_engine.run_plan_task(clean_goal, api_key=api_key, client_id=cid)
        reply = plan_res.get("reply", "Không thể lập kế hoạch.")
        database.add_message(conv_id, "assistant", reply, client_id=cid)
        return {
            "success": True,
            "reply": reply,
            "is_plan": True,
            "model_used": plan_res.get("model_used", "gemini-3.1-pro-preview")
        }

    # 3. KIỂM TRA Ý ĐỊNH AGENT TỰ HÀNH CHUẨN ANTIGRAVITY (Hỏi trước hoặc Tự hành Turbo)
    msg_low = message.lower().strip()
    agent_keywords = [
        "tạo thư mục", "tạo folder", "lập thư mục", "tạo cho tôi thư mục", "tạo tệp", "tạo file", 
        "viết file", "tạo dự án", "lập trình dự án", "tạo game", "làm game", "viết code game", 
        "viết script", "tạo script", "chạy lệnh", "agent hãy", "tự động làm", "tạo luôn cho tôi", 
        "tạo thư mục cho máy tính", "tạo folder cho máy tính", "tạo app", "làm app", "viết phần mềm",
        "tự làm hết", "em tự làm", "tự động tạo", "làm luôn cho anh", "làm luôn", "tạo thành ứng dụng",
        "tạo ứng dụng", "làm ứng dụng", "bấm cái là vào xem", "bấm vào xem ngay", "xây dựng ứng dụng",
        "lập trình cho anh", "viết cho anh một web", "dựng cho anh một trang", "tạo web", "làm web",
        "viết trang web", "tạo giao diện web"
    ]
    is_agent_cmd = (
        msg_low.startswith("/agent") or 
        any(k in msg_low for k in agent_keywords)
    )

    # Lấy chế độ Agent: "safe" (Hỏi trước - mặc định) hoặc "turbo" (Tự hành không cần hỏi)
    active_agent_mode = (agent_mode.strip().lower() if agent_mode else "") or database.get_setting("agent_mode", "safe", client_id=cid)
    if active_agent_mode not in ["safe", "turbo"]:
        active_agent_mode = "safe"

    # Kiểm tra xem người dùng có đang gõ câu xác nhận phê duyệt tác vụ vừa đề xuất không
    approval_phrases = [
        "chấp nhận", "đồng ý", "làm đi", "chạy đi", "tiến hành", "chạy ngay", "làm ngay",
        "ok làm đi", "ok tạo đi", "làm luôn đi", "triển khai đi", "ok triển khai", "chạy luôn",
        "làm luôn", "ok làm ngay", "triển khai ngay", "làm giúp anh ngay"
    ]
    is_chat_approval = any(msg_low == ap or msg_low.startswith(ap + " ") or msg_low.endswith(" " + ap) for ap in approval_phrases)
    pending_task_from_history = ""
    if is_chat_approval:
        past_check = database.get_conversation_messages(conv_id)[-6:]
        for pm in reversed(past_check):
            if pm.get("role") == "user" and any(k in pm.get("content", "").lower() for k in agent_keywords):
                pending_task_from_history = pm.get("content", "").strip()
                break
            elif pm.get("role") == "assistant" and "KINI Agent Đề Xuất Kế Hoạch" in pm.get("content", ""):
                m_task = re.search(r'data-task=["\'](.*?)["\']', pm.get("content", ""))
                if m_task:
                    pending_task_from_history = m_task.group(1).strip()
                    break

    is_confirmed_execution = (confirm_agent == "yes") or bool(pending_task_from_history)
    task_to_run = task_prompt.strip() or pending_task_from_history or re.sub(r'^/agent\s*', '', message, flags=re.IGNORECASE).strip()

    # TRƯỜNG HỢP A: THỰC THI NGAY (Khi người dùng đã duyệt HOẶC đang ở chế độ Turbo)
    if (is_agent_cmd and active_agent_mode == "turbo") or (is_confirmed_execution and task_to_run):
        agent_res = agent_engine.run_agent_task(task_to_run, api_key=api_key, client_id=cid)
        if agent_res.get("success"):
            assistant_reply = agent_res.get("reply", "")
            actions = agent_res.get("actions", [])
            if actions:
                summary_lines = ["\n\n🛠️ **Nhật ký KINI Agent đã tự động thực thi trên máy tính:**"]
                for a in actions:
                    if a["tool"] == "write_file":
                        p_file = a.get('path', '')
                        summary_lines.append(f"- 📝 Đã tạo file: `{p_file}`")
                        if p_file.lower().endswith(('.html', '.htm')):
                            summary_lines.append(f"  👉 [🌐 Bấm Vào Đây Để Mở Web Trực Tiếp](/api/workspace/raw?path={urllib.parse.quote(p_file)})")
                    elif a["tool"] == "create_folder":
                        summary_lines.append(f"- 📁 Đã tạo thư mục: `{a.get('path')}`")
                    elif a["tool"] == "run_command":
                        summary_lines.append(f"- ⚡ Đã chạy lệnh: `{a.get('command')}` (Mã: {a.get('returncode')})")
                    elif a["tool"] == "delete_file":
                        summary_lines.append(f"- 🗑️ Đã xóa: `{a.get('path')}`")
                    elif a["tool"] == "rename_file":
                        summary_lines.append(f"- ✏️ Đổi tên: `{a.get('old_path')}` -> `{a.get('new_path')}`")
                assistant_reply += "\n" + "\n".join(summary_lines)
            database.add_message(conv_id, "assistant", assistant_reply, client_id=cid)
            return {
                "success": True,
                "reply": assistant_reply,
                "is_agent": True,
                "actions": actions,
                "agent_mode": active_agent_mode
            }
        else:
            err_reply = agent_res.get("error", "Lỗi thực thi tác vụ.")
            database.add_message(conv_id, "assistant", err_reply, client_id=cid)
            return {
                "success": False,
                "reply": err_reply,
                "is_agent": True
            }

    # TRƯỜNG HỢP B: CHẾ ĐỘ AN TOÀN CHUẨN ANTIGRAVITY (Đề xuất kế hoạch & hỏi xác nhận trước khi làm)
    elif is_agent_cmd and active_agent_mode == "safe":
        proposal = agent_engine.generate_agent_proposal(task_to_run, api_key=api_key, client_id=cid)
        reply = proposal.get("reply", "")
        proposed_actions = proposal.get("proposed_actions", [])
        database.add_message(conv_id, "assistant", reply, client_id=cid)
        return {
            "success": True,
            "reply": reply,
            "is_agent_proposal": True,
            "proposed_actions": proposed_actions,
            "task_prompt": task_to_run,
            "agent_mode": "safe"
        }

    # 4. NẾU LÀ TRÒ CHUYỆN & SUY LUẬN BÌNH THƯỜNG
    # 4.0. TỰ ĐỘNG ĐỌC VÀ TRÍCH XUẤT NỘI DUNG TỪ BẤT KỲ ĐƯỜNG LINK TRANG WEB NÀO ĐƯỢC GỬI
    search_target = message if message.strip() else full_user_content
    webpage_context = ""
    detected_links = search_engine.extract_links_from_text(search_target)
    if detected_links:
        for link_url in detected_links[:2]:
            try:
                page_data = search_engine.fetch_webpage_content(link_url)
                if page_data:
                    desc_str = f"Mô tả tóm tắt: {page_data['description']}\n" if page_data.get('description') else ""
                    webpage_context += (
                        f"\n\n=== NỘI DUNG TRANG WEB TRUY CẬP TRỰC TIẾP TỪ {page_data['url']} ===\n"
                        f"Tiêu đề trang: {page_data['title']}\n"
                        f"{desc_str}"
                        f"Toàn bộ văn bản trích xuất sạch:\n{page_data['content']}\n"
                        f"=== YÊU CẦU: KINI AI hãy đọc hiểu kỹ toàn bộ nội dung trang web trên để tóm tắt, phân tích, trích xuất số liệu hoặc trả lời câu hỏi của người dùng một cách thông minh, chính xác 100%. ==="
                    )
                    print(f"[*] Đã tự động đọc hiểu trang web: {link_url} ({len(page_data['content'])} ký tự)")
            except Exception as e:
                print(f"[!] Lỗi đọc trang web {link_url}: {e}")

    # Tra cứu Internet trực tuyến nếu câu hỏi liên quan đến báo chí, tin tức, thời sự, năm 2026, luật pháp, thông tin mới
    live_search_text = ""
    if not webpage_context and search_engine.needs_live_search(search_target):
        try:
            grounded_data = search_engine.get_grounded_context(search_target)
            if grounded_data:
                live_search_text = f"\n\n{grounded_data}"
                print(f"[*] Đã nạp {len(grounded_data)} ký tự dữ liệu báo chí/Google News/tra cứu thời gian thực cho: {search_target[:60]}")
        except Exception as e:
            print(f"[!] Lỗi tra cứu thời gian thực: {e}")

    past_msgs = database.get_conversation_messages(conv_id)[-12:]
    formatted_history = []
    # Lấy các tin nhắn trước
    for m in past_msgs[:-1]:
        formatted_history.append({
            "role": m["role"],
            "content": m["content"]
        })
    # Gắn tin nhắn hiện tại kèm nội dung trang web và kết quả tra cứu trực tuyến mới nhất
    current_content_with_grounding = full_user_content + webpage_context + live_search_text

    # Tối ưu hóa đặc biệt cho phiên đàm thoại giọng nói 2 chiều (Voice Live Mode)
    if is_voice_live == "1":
        if cid == "master":
            current_content_with_grounding += (
                "\n\n[QUY TẮC ĐÀM THOẠI TRỰC TIẾP LIVE VOICE]: "
                "Bạn đang trò chuyện bằng giọng nói trực tiếp qua micro với anh Trường. "
                "Hãy xưng 'em' và gọi 'anh Trường'. "
                "BẮT BUỘC TRẢ LỜI NGẮN GỌN (1 đến 2 câu ngắn, tối đa 30 từ), súc tích, đi thẳng vào ý chính, "
                "KHÔNG chào hỏi sáo rỗng dài dòng, KHÔNG dùng markdown (*, #, _, code, gạch đầu dòng), "
                "nói tự nhiên, lưu loát như người thật đang trò chuyện trực tiếp."
            )
        else:
            current_content_with_grounding += (
                "\n\n[QUY TẮC ĐÀM THOẠI TRỰC TIẾP LIVE VOICE]: "
                "Bạn đang trò chuyện bằng giọng nói trực tiếp qua micro với người dùng. "
                "BẮT BUỘC TRẢ LỜI NGẮN GỌN (1 đến 2 câu ngắn, tối đa 30 từ), súc tích, đi thẳng vào ý chính, "
                "KHÔNG dùng markdown (*, #, _, code, gạch đầu dòng), "
                "nói tự nhiên như người thật đang trò chuyện trực tiếp."
            )

    # Tự động tính toán số học chuẩn xác 100% bằng Python (Chống ảo giác số học tuyệt đối)
    math_context = math_verifier.extract_and_verify_arithmetic(full_user_content)
    if math_context:
        current_content_with_grounding += f"\n\n{math_context}"
    elif re.search(r'\b(tính|tổng|cộng|trừ|nhân|chia|\+|\=|\d+\s*[\+\-\*\/]\s*\d+|lạng|kg|gam|đơn hàng|tiền)\b', full_user_content.lower()):
        current_content_with_grounding += (
            "\n\n[QUY TẮC BẮT BUỘC VỀ ĐỘ CHÍNH XÁC SỐ HỌC]: "
            "Câu hỏi có chứa số liệu hoặc phép tính. "
            "BẮT BUỘC phải thực hiện phép tính cẩn thận từng bước (Double-Check), diễn giải rõ ràng phép cộng/trừ từng số hạng, "
            "tuyệt đối không được tính nhẩm sai hoặc làm tròn sai số."
        )

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
        model_mode=model_mode,
        client_id=cid
    )

    assistant_reply = res.get("reply", "Xin lỗi, đã xảy ra lỗi trong quá trình xử lý.")

    # BẢO ĐẢM 100% ĐƯỜNG LINK THỰC TẾ (CHỐNG LINK ẢO / LINK HẾT HẠN):
    # Nếu trong dữ liệu tra cứu có link YouTube thực tế, kiểm tra và thay thế mọi link YouTube bị ảo trong câu trả lời
    if "youtube.com/watch?v=" in live_search_text:
        real_yt_links = list(dict.fromkeys(re.findall(r'https://www\.youtube\.com/watch\?v=[a-zA-Z0-9_-]{11}', live_search_text)))
        if real_yt_links:
            reply_yt_links = list(dict.fromkeys(re.findall(r'https://www\.youtube\.com/watch\?v=[a-zA-Z0-9_-]{11}', assistant_reply)))
            for fake_l in reply_yt_links:
                if fake_l not in real_yt_links:
                    assistant_reply = assistant_reply.replace(fake_l, real_yt_links[0])
            
            # Nếu AI chưa trích dẫn link YouTube thực tế nào, chỉ bổ sung nếu người dùng thực sự hỏi video/bài hát/link
            wants_yt = any(k in message.lower() for k in ["youtube", "video", "bài hát", "clip", "nghe", "xem", "link", "nguồn"])
            if wants_yt and not any(rl in assistant_reply for rl in real_yt_links):
                yt_block = "\n\n### 🎬 Video / Bài Hát YouTube Chính Thức (Đã Xác Thực 100% Đang Hoạt Động):\n"
                for ytl in real_yt_links[:3]:
                    yt_block += f"- 🔗 [Xem / Nghe trực tiếp trên YouTube]({ytl})\n"
                assistant_reply += yt_block

    # BỘ LỌC HẬU KIỂM: Loại bỏ triệt để mục Nguồn Dẫn Chứng & Tham Khảo nếu người dùng không yêu cầu
    assistant_reply = search_engine.clean_unwanted_citations(assistant_reply, message)

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
            if cid == "master":
                assistant_reply = (
                    f"🎨 **Tác phẩm do KINI AI tạo ra cho anh Trường:**\n\n"
                    f"*Mô tả gốc:* \"{message}\"\n\n"
                    f"*Prompt tối ưu (English):* `{img_result.get('optimized_prompt', tool_prompt)}`\n\n"
                    f"Anh có thể bấm nút tải ảnh HD bên dưới hoặc yêu cầu em chỉnh sửa thêm chi tiết nhé!"
                )
            else:
                assistant_reply = (
                    f"🎨 **Tác phẩm do KINI AI tạo ra:**\n\n"
                    f"*Mô tả gốc:* \"{message}\"\n\n"
                    f"*Prompt tối ưu (English):* `{img_result.get('optimized_prompt', tool_prompt)}`\n\n"
                    f"Bạn có thể bấm nút tải ảnh HD bên dưới hoặc yêu cầu điều chỉnh thêm chi tiết nhé!"
                )
            database.add_message(conv_id, "assistant", assistant_reply, image_url=generated_img_url, client_id=cid)
            return {
                "success": True,
                "reply": assistant_reply,
                "image_url": generated_img_url,
                "is_image_generated": True
            }
        else:
            if cid == "master":
                assistant_reply = (
                    f"🎨 **KINI AI đã sẵn sàng phác thảo tác phẩm cho anh Trường:**\n\n"
                    f"Dạ thưa anh, cổng tạo ảnh nghệ thuật đang có độ trễ tạm thời: {img_result.get('error', 'Máy chủ bận')}.\n\n"
                    f"💡 *Mô tả ý tưởng:* \"{tool_prompt}\"\n\n"
                    f"Anh vui lòng bấm nút gửi lại hoặc mở mục **KINI Studio (Tạo Ảnh)** để thử ngay nhé!"
                )
            else:
                assistant_reply = (
                    f"🎨 **KINI AI đã sẵn sàng phác thảo tác phẩm:**\n\n"
                    f"Cổng tạo ảnh nghệ thuật đang có độ trễ tạm thời: {img_result.get('error', 'Máy chủ bận')}.\n\n"
                    f"💡 *Mô tả ý tưởng:* \"{tool_prompt}\"\n\n"
                    f"Bạn vui lòng bấm nút gửi lại để thử lại nhé!"
                )
            database.add_message(conv_id, "assistant", assistant_reply, client_id=cid)
            return {
                "success": True,
                "reply": assistant_reply,
                "image_url": "",
                "is_image_generated": False
            }

    database.add_message(conv_id, "assistant", assistant_reply, client_id=cid)

    # Tự động trích xuất ký ức ngầm trong background để KINI luôn ghi nhớ về anh Trường (nếu là master) hoặc người dùng
    threading.Thread(
        target=gemini_client.extract_and_save_memory_async, 
        args=(message, api_key, cid), 
        daemon=True
    ).start()

    return {
        "success": res.get("success", False),
        "reply": assistant_reply,
        "image_url": file_display_url,
        "model_used": res.get("model_used", "gemini"),
        "fallback_from_38": res.get("fallback_from_38", False)
    }

@app.post("/api/chat/stream")
async def chat_with_kini_stream(
    request: Request,
    conv_id: str = Form("default"),
    message: str = Form(""),
    model_mode: str = Form("flash"),
    agent_mode: Optional[str] = Form(None),
    confirm_agent: Optional[str] = Form("no"),
    task_prompt: Optional[str] = Form(""),
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    is_voice_live: Optional[str] = Form("0")
):
    cid = get_request_client_id(request)
    api_key = database.get_setting("gemini_api_key", "", client_id=cid)
    if not api_key:
        api_key = database.get_setting("gemini_api_key", os.environ.get("GEMINI_API_KEY", ""), client_id="master")
    
    file_display_url = ""
    file_display_name = ""
    image_base64 = None
    image_mime = "image/jpeg"
    extracted_doc_text = ""

    upload_list = []
    if files:
        upload_list.extend(files)
    if file and file.filename and file not in upload_list:
        upload_list.append(file)

    for item in upload_list:
        if not item or not item.filename:
            continue
        content_bytes = await item.read()
        ext = os.path.splitext(item.filename)[1].lower()
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
        else:
            temp_name = f"temp_doc_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}{ext}"
            temp_path = os.path.join(IMAGES_DIR, temp_name)
            with open(temp_path, "wb") as f:
                f.write(content_bytes)
            if not file_display_url:
                file_display_url = f"/api/images/{temp_name}"
            parsed = file_parser.parse_uploaded_file(temp_path, item.filename)
            if parsed.get("success"):
                extracted_doc_text += f"\n\n[DỮ LIỆU TỆP '{item.filename}']:\n{parsed['text']}\n"
            else:
                extracted_doc_text += f"\n\n[Thông báo về tệp '{item.filename}']: Không thể trích xuất toàn bộ: {parsed.get('error')}\n"

    full_user_content = message.strip()
    if extracted_doc_text:
        full_user_content += extracted_doc_text

    if not full_user_content and not file_display_url:
        raise HTTPException(status_code=400, detail="Vui lòng nhập câu hỏi hoặc gửi tệp.")

    database.add_message(conv_id, "user", full_user_content, image_url=file_display_url, client_id=cid)

    # 1. KIỂM TRA TẠO ẢNH TRỰC TIẾP
    if gemini_client.is_image_request(message):
        clean_prompt = gemini_client.clean_image_prompt(message)
        detected_style = "realistic"
        low_p = message.lower()
        if any(k in low_p for k in ["3d", "pixar", "disney", "chibi", "dễ thương", "glossy", "nổi khối"]):
            detected_style = "3d"
        elif any(k in low_p for k in ["logo", "biểu tượng", "icon", "badge", "emblem"]):
            detected_style = "3d"
        elif any(k in low_p for k in ["anime", "manga", "hoạt hình"]):
            detected_style = "anime"
        elif any(k in low_p for k in ["cyberpunk", "neon", "tương lai", "futuristic", "sci-fi"]):
            detected_style = "cyberpunk"
        elif any(k in low_p for k in ["poster", "banner", "điện ảnh", "cinematic", "phim"]):
            detected_style = "cinematic"
        elif any(k in low_p for k in ["sơn dầu", "tranh vẽ", "oil", "watercolor", "màu nước"]):
            detected_style = "oil"

        img_result = image_generator.generate_ai_image(clean_prompt, style=detected_style, api_key=api_key)
        if img_result.get("success"):
            gen_url = img_result["image_url"]
            database.add_gallery_item(
                prompt=img_result["prompt"],
                style=img_result.get("style", detected_style),
                image_url=gen_url,
                image_path=img_result["file_path"],
                width=img_result.get("width", 1024),
                height=img_result.get("height", 1024)
            )
            if cid == "master":
                reply = (
                    f"🎨 **Em đã tạo xong tác phẩm cho anh Trường rồi ạ!** ✨\n\n"
                    f"- 📝 **Chủ đề:** *\"{clean_prompt}\"*\n"
                    f"- 🎭 **Phong cách:** *{detected_style.upper()}*\n"
                    f"- ⚡ **Động cơ AI:** *FLUX.1 Pro Ultra HD & Gemini Prompt Engine*\n\n"
                    f"Anh có thể bấm trực tiếp vào ảnh để phóng to, bấm các nút tải HD bên dưới hoặc dặn em tạo thêm các biến thể khác nhé!"
                )
            else:
                reply = (
                    f"🎨 **Tác phẩm của bạn đã hoàn thành:** ✨\n\n"
                    f"- 📝 **Chủ đề:** *\"{clean_prompt}\"*\n"
                    f"- 🎭 **Phong cách:** *{detected_style.upper()}*\n"
                    f"- ⚡ **Động cơ AI:** *FLUX.1 Pro Ultra HD*\n\n"
                    f"Bạn có thể bấm vào ảnh để phóng to hoặc tải ảnh HD về máy!"
                )
            database.add_message(conv_id, "assistant", reply, image_url=gen_url, client_id=cid)
            async def event_generator():
                yield f"data: {json.dumps({'type': 'chunk', 'text': reply})}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'reply': reply, 'image_url': gen_url, 'is_image_generated': True, 'model_used': 'FLUX.1 AI Engine'})}\n\n"
            return StreamingResponse(event_generator(), media_type="text/event-stream")
        else:
            if cid == "master":
                fail_reply = f"⚠️ Dạ thưa anh Trường, hệ thống vẽ ảnh FLUX.1 đang bận tạm thời: {img_result.get('error', 'Không phản hồi')}. Anh vui lòng thử bấm gửi lại giúp em nhé!"
            else:
                fail_reply = f"⚠️ Hệ thống tạo ảnh đang bận tạm thời: {img_result.get('error', 'Không phản hồi')}. Bạn vui lòng bấm gửi lại nhé!"
            database.add_message(conv_id, "assistant", fail_reply, client_id=cid)
            async def event_generator():
                yield f"data: {json.dumps({'type': 'chunk', 'text': fail_reply})}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'reply': fail_reply, 'image_url': '', 'is_image_generated': False})}\n\n"
            return StreamingResponse(event_generator(), media_type="text/event-stream")

    # 2. KIỂM TRA LỆNH PLAN
    if message.strip().startswith("/plan"):
        clean_goal = message.replace("/plan", "").strip()
        plan_res = agent_engine.run_plan_task(clean_goal, api_key=api_key, client_id=cid)
        reply = plan_res.get("reply", "Không thể lập kế hoạch.")
        database.add_message(conv_id, "assistant", reply, client_id=cid)
        async def event_generator():
            yield f"data: {json.dumps({'type': 'chunk', 'text': reply})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'reply': reply, 'is_plan': True})}\n\n"
        return StreamingResponse(event_generator(), media_type="text/event-stream")

    # 3. KIỂM TRA AGENT / TURBO
    msg_low = message.lower().strip()
    agent_keywords = [
        "tạo thư mục", "tạo folder", "lập thư mục", "tạo cho tôi thư mục", "tạo tệp", "tạo file", 
        "viết file", "tạo dự án", "lập trình dự án", "tạo game", "làm game", "viết code game", 
        "viết script", "tạo script", "chạy lệnh", "agent hãy", "tự động làm", "tạo luôn cho tôi", 
        "tạo thư mục cho máy tính", "tạo folder cho máy tính", "tạo app", "làm app", "viết phần mềm"
    ]
    is_agent_cmd = (msg_low.startswith("/agent") or any(k in msg_low for k in agent_keywords))
    active_agent_mode = (agent_mode.strip().lower() if agent_mode else "") or database.get_setting("agent_mode", "safe", client_id=cid)
    if active_agent_mode not in ["safe", "turbo"]:
        active_agent_mode = "safe"

    approval_phrases = ["chấp nhận", "đồng ý", "làm đi", "chạy đi", "tiến hành", "chạy ngay", "ok làm đi", "ok tạo đi", "làm luôn đi", "triển khai đi", "ok triển khai", "chạy luôn"]
    is_chat_approval = any(msg_low == ap or msg_low.startswith(ap + " ") or msg_low.endswith(" " + ap) for ap in approval_phrases)
    pending_task_from_history = ""
    if is_chat_approval:
        past_check = database.get_conversation_messages(conv_id)[-4:]
        for pm in reversed(past_check):
            if pm.get("role") == "user" and any(k in pm.get("content", "").lower() for k in agent_keywords):
                pending_task_from_history = pm.get("content", "").strip()
                break

    is_confirmed_execution = (confirm_agent == "yes") or bool(pending_task_from_history)
    task_to_run = task_prompt.strip() or pending_task_from_history or re.sub(r'^/agent\s*', '', message, flags=re.IGNORECASE).strip()

    if (is_agent_cmd and active_agent_mode == "turbo") or (is_confirmed_execution and task_to_run):
        agent_res = agent_engine.run_agent_task(task_to_run, api_key=api_key, client_id=cid)
        assistant_reply = agent_res.get("reply", "")
        actions = agent_res.get("actions", [])
        if actions:
            summary_lines = ["\n\n🛠️ **Nhật ký KINI Agent đã tự động thực thi trên máy tính:**"]
            for a in actions:
                if a["tool"] == "write_file":
                    summary_lines.append(f"- 📝 Đã tạo file: `{a.get('path')}`")
                elif a["tool"] == "create_folder":
                    summary_lines.append(f"- 📁 Đã tạo thư mục: `{a.get('path')}`")
                elif a["tool"] == "run_command":
                    summary_lines.append(f"- ⚡ Đã chạy lệnh: `{a.get('command')}` (Mã: {a.get('returncode')})")
                elif a["tool"] == "delete_file":
                    summary_lines.append(f"- 🗑️ Đã xóa: `{a.get('path')}`")
                elif a["tool"] == "rename_file":
                    summary_lines.append(f"- ✏️ Đổi tên: `{a.get('old_path')}` -> `{a.get('new_path')}`")
            assistant_reply += "\n" + "\n".join(summary_lines)
        database.add_message(conv_id, "assistant", assistant_reply, client_id=cid)
        async def event_generator():
            yield f"data: {json.dumps({'type': 'chunk', 'text': assistant_reply})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'reply': assistant_reply, 'is_agent': True, 'actions': actions, 'agent_mode': active_agent_mode})}\n\n"
        return StreamingResponse(event_generator(), media_type="text/event-stream")

    elif is_agent_cmd and active_agent_mode == "safe":
        proposal = agent_engine.generate_agent_proposal(task_to_run, api_key=api_key, client_id=cid)
        reply = proposal.get("reply", "")
        proposed_actions = proposal.get("proposed_actions", [])
        database.add_message(conv_id, "assistant", reply, client_id=cid)
        async def event_generator():
            yield f"data: {json.dumps({'type': 'chunk', 'text': reply})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'reply': reply, 'is_agent_proposal': True, 'proposed_actions': proposed_actions, 'task_prompt': task_to_run, 'agent_mode': 'safe'})}\n\n"
        return StreamingResponse(event_generator(), media_type="text/event-stream")

    # 4. CHUYỆN TRÒ / LẬP LUẬN / SUY LUẬN STREAMING THỜI GIAN THỰC
    search_target = message if message.strip() else full_user_content
    webpage_context = ""
    detected_links = search_engine.extract_links_from_text(search_target)
    if detected_links:
        for link_url in detected_links[:2]:
            try:
                page_data = search_engine.fetch_webpage_content(link_url)
                if page_data:
                    desc_str = f"Mô tả tóm tắt: {page_data['description']}\n" if page_data.get('description') else ""
                    webpage_context += (
                        f"\n\n=== NỘI DUNG TRANG WEB TRUY CẬP TRỰC TIẾP TỪ {page_data['url']} ===\n"
                        f"Tiêu đề trang: {page_data['title']}\n"
                        f"{desc_str}"
                        f"Toàn bộ văn bản trích xuất sạch:\n{page_data['content']}\n"
                        f"=== YÊU CẦU: KINI AI hãy đọc hiểu kỹ toàn bộ nội dung trang web trên để tóm tắt, phân tích, trích xuất số liệu hoặc trả lời câu hỏi của người dùng một cách thông minh, chính xác 100%. ==="
                    )
            except Exception:
                pass

    live_search_text = ""
    if not webpage_context and search_engine.needs_live_search(search_target):
        try:
            grounded_data = search_engine.get_grounded_context(search_target)
            if grounded_data:
                live_search_text = f"\n\n{grounded_data}"
        except Exception:
            pass

    past_msgs = database.get_conversation_messages(conv_id)[-12:]
    formatted_history = []
    for m in past_msgs[:-1]:
        formatted_history.append({"role": m["role"], "content": m["content"]})
    current_content = full_user_content + webpage_context + live_search_text
    # Tự động tính toán số học chuẩn xác 100% bằng Python (Chống ảo giác số học tuyệt đối)
    math_context = math_verifier.extract_and_verify_arithmetic(full_user_content)
    if math_context:
        current_content += f"\n\n{math_context}"
    elif re.search(r'\b(tính|tổng|cộng|trừ|nhân|chia|\+|\=|\d+\s*[\+\-\*\/]\s*\d+|lạng|kg|gam|đơn hàng|tiền)\b', full_user_content.lower()):
        current_content += (
            "\n\n[QUY TẮC BẮT BUỘC VỀ ĐỘ CHÍNH XÁC SỐ HỌC]: "
            "Câu hỏi có chứa số liệu hoặc phép tính. "
            "BẮT BUỘC phải thực hiện phép tính cẩn thận từng bước (Double-Check), diễn giải rõ ràng phép cộng/trừ từng số hạng, "
            "tuyệt đối không được tính nhẩm sai hoặc làm tròn sai số."
        )
    formatted_history.append({"role": "user", "content": current_content})

    async def chat_sse_streamer():
        accumulated_reply = ""
        model_used = "gemini-3.1-flash-lite"
        for item in gemini_client.ask_gemini_stream(
            messages=formatted_history,
            api_key=api_key,
            image_base64=image_base64,
            image_mime=image_mime,
            model_mode=model_mode,
            client_id=cid
        ):
            if item.get("error"):
                err_text = f"⚠️ {item['error']}"
                accumulated_reply = err_text
                yield f"data: {json.dumps({'type': 'chunk', 'text': err_text})}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'reply': err_text, 'model_used': model_used})}\n\n"
                break
            if not item.get("done"):
                chunk = item.get("chunk", "")
                if chunk:
                    accumulated_reply += chunk
                    yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
            else:
                model_used = item.get("model_used", model_used)
                final_text = item.get("full_text", accumulated_reply) or accumulated_reply
                if not final_text.strip():
                    final_text = "Chào anh, em đã kết nối thành công. Anh cần em hỗ trợ tác vụ nào ạ?"

                # Kiểm tra link YouTube
                if "youtube.com/watch?v=" in live_search_text:
                    real_yt_links = list(dict.fromkeys(re.findall(r'https://www\.youtube\.com/watch\?v=[a-zA-Z0-9_-]{11}', live_search_text)))
                    if real_yt_links:
                        reply_yt_links = list(dict.fromkeys(re.findall(r'https://www\.youtube\.com/watch\?v=[a-zA-Z0-9_-]{11}', final_text)))
                        for fake_l in reply_yt_links:
                            if fake_l not in real_yt_links:
                                final_text = final_text.replace(fake_l, real_yt_links[0])
                        wants_yt = any(k in message.lower() for k in ["youtube", "video", "bài hát", "clip", "nghe", "xem", "link", "nguồn"])
                        if wants_yt and not any(rl in final_text for rl in real_yt_links):
                            yt_block = "\n\n### 🎬 Video / Bài Hát YouTube Chính Thức (Đã Xác Thực 100% Đang Hoạt Động):\n"
                            for ytl in real_yt_links[:3]:
                                ytl_str = f"- 🔗 [Xem / Nghe trực tiếp trên YouTube]({ytl})\n"
                                yt_block += ytl_str
                            final_text += yt_block

                # BỘ LỌC HẬU KIỂM: Loại bỏ triệt để mục Nguồn Dẫn Chứng & Tham Khảo nếu người dùng không yêu cầu
                final_text = search_engine.clean_unwanted_citations(final_text, message)

                # Lưu vào DB
                database.add_message(conv_id, "assistant", final_text, client_id=cid)
                threading.Thread(
                    target=gemini_client.extract_and_save_memory_async, 
                    args=(message, api_key, cid), 
                    daemon=True
                ).start()

                yield f"data: {json.dumps({'type': 'done', 'reply': final_text, 'model_used': model_used})}\n\n"

    return StreamingResponse(chat_sse_streamer(), media_type="text/event-stream")

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
def list_memories(request: Request):
    cid = get_request_client_id(request)
    return {"memories": database.get_all_memories(limit=100, client_id=cid)}

@app.post("/api/memories")
def create_memory(data: dict, request: Request):
    cid = get_request_client_id(request)
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

    mem_id = database.add_memory(fact=fact, category=category, key=key, value=value, client_id=cid)
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
def create_image(data: dict, request: Request):
    cid = get_request_client_id(request)
    prompt = data.get("prompt", "").strip()
    style = data.get("style", "realistic")
    width = int(data.get("width", 1024))
    height = int(data.get("height", 1024))
    conv_id = data.get("conv_id")
    api_key = database.get_setting("gemini_api_key", "", client_id=cid) or database.get_setting("gemini_api_key", os.environ.get("GEMINI_API_KEY", ""), client_id="master")

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
        if conv_id and conv_id != "default":
            if cid == "master":
                reply_text = f"🎨 **Em vừa hoàn thành tác phẩm trong KINI Art Studio cho anh Trường:**\n\n- 📝 **Chủ đề:** \"{prompt}\"\n- 🎭 **Phong cách:** {style.upper()} ({width}x{height})"
            else:
                reply_text = f"🎨 **Tác phẩm từ KINI Art Studio:**\n\n- 📝 **Chủ đề:** \"{prompt}\"\n- 🎭 **Phong cách:** {style.upper()} ({width}x{height})"
            database.add_message(conv_id, "assistant", reply_text, image_url=result["image_url"], client_id=cid)
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
# 5.3. PYTHON CODE INTERPRETER & DATA ANALYSIS SANDBOX
# ============================================================
@app.post("/api/code/run")
def execute_python_code_interpreter(data: dict):
    code = data.get("code", "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="Mã nguồn không được để trống")
    
    sandbox_dir = os.path.join(agent_engine.WORKSPACE_DIR, ".sandbox")
    os.makedirs(sandbox_dir, exist_ok=True)
    snippet_id = uuid.uuid4().hex[:8]
    script_file = os.path.join(sandbox_dir, f"snippet_{snippet_id}.py")
    
    # Tiền xử lý code: Nếu có matplotlib.pyplot, tự động thiết lập non-interactive backend (Agg) để lưu ảnh mà không treo GUI
    if "matplotlib" in code or "plt." in code:
        header_mpl = "import matplotlib\nmatplotlib.use('Agg')\n"
        full_script = header_mpl + code
    else:
        full_script = code
        
    with open(script_file, "w", encoding="utf-8") as f:
        f.write(full_script)
        
    start_time = time.time()
    try:
        proc = subprocess.run(
            [sys.executable, script_file],
            cwd=agent_engine.WORKSPACE_DIR,
            capture_output=True,
            text=True,
            timeout=18,
            encoding="utf-8",
            errors="replace"
        )
        elapsed = round(time.time() - start_time, 3)
        
        # Quét các file ảnh mới tạo trong vòng 20s qua trong workspace (ví dụ plt.savefig)
        generated_plots = []
        for root, _, files in os.walk(agent_engine.WORKSPACE_DIR):
            if ".sandbox" in root:
                continue
            for f in files:
                if f.lower().endswith(('.png', '.jpg', '.jpeg', '.svg')):
                    f_path = os.path.join(root, f)
                    try:
                        if os.path.getmtime(f_path) >= start_time - 1:
                            rel = os.path.relpath(f_path, agent_engine.WORKSPACE_DIR).replace("\\", "/")
                            generated_plots.append(f"/api/workspace/raw?path={urllib.parse.quote(rel)}")
                    except Exception:
                        pass
                        
        return {
            "success": proc.returncode == 0,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "returncode": proc.returncode,
            "elapsed": elapsed,
            "plots": generated_plots[:4]
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "stdout": "",
            "stderr": "⚠️ Quá thời gian thực thi (Timeout 18 giây). Vui lòng tối ưu vòng lặp hoặc thuật toán.",
            "returncode": -1,
            "elapsed": 18.0,
            "plots": []
        }
    except Exception as e:
        return {
            "success": False,
            "stdout": "",
            "stderr": f"Lỗi thực thi: {str(e)}",
            "returncode": -1,
            "elapsed": 0.0,
            "plots": []
        }
    finally:
        if os.path.exists(script_file):
            try: os.remove(script_file)
            except: pass

# ============================================================
# 5.4. DEEP RESEARCH STRATEGIC DOSSIER & REPORT ENGINE
# ============================================================
@app.post("/api/research/deep")
async def execute_deep_research_endpoint(request: Request, data: dict):
    topic = data.get("topic", "").strip()
    conv_id = data.get("conv_id", "default").strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Vui lòng nhập chủ đề nghiên cứu sâu.")
        
    cid = get_request_client_id(request)
    api_key = database.get_setting("gemini_api_key", "", client_id=cid)
    if not api_key:
        api_key = database.get_setting("gemini_api_key", os.environ.get("GEMINI_API_KEY", ""), client_id="master")
        
    database.add_message(conv_id, "user", f"🔬 [Nghiên Cứu Sâu - Deep Research]: {topic}", client_id=cid)
    
    # Thu thập và tổng hợp báo cáo chiến lược
    research_dossier = search_engine.execute_deep_research(topic, api_key=api_key, client_id=cid)
    report_text = research_dossier.get("report") or research_dossier.get("reply", "")
    sources_investigated = research_dossier.get("sources_count", 0)
    
    database.add_message(conv_id, "assistant", report_text, client_id=cid)
    
    return {
        "success": True,
        "reply": report_text,
        "sources_count": sources_investigated,
        "topic": topic
    }

# ============================================================
# 5.5. QUẢN LÝ DANH TÍNH THIẾT BỊ & XƯNG HÔ (DEVICE IDENTITY)
# ============================================================
@app.get("/api/device/identity")
def get_device_identity(request: Request):
    cid = get_request_client_id(request)
    is_owner_val = database.get_setting("is_owner", "1" if cid == "master" else "", client_id=cid)
    # Nếu chưa cấu hình trên thiết bị này, mặc định là owner nếu cid là master
    is_owner = is_owner_val != "0"
    user_name = database.get_setting("user_name", "Truong Hai" if is_owner else "Khách", client_id=cid)
    user_call_name = database.get_setting("user_call_name", "Anh Trường" if is_owner else "Bạn", client_id=cid)
    ai_call_name = database.get_setting("ai_call_name", "Em" if is_owner else "Tôi", client_id=cid)
    user_email = database.get_setting("user_email", "haitruongproqt1@gmail.com" if is_owner else "", client_id=cid)
    has_configured = database.get_setting("identity_configured", "1" if cid == "master" else "0", client_id=cid)
    
    return {
        "client_id": cid,
        "is_owner": is_owner,
        "user_name": user_name,
        "user_call_name": user_call_name,
        "ai_call_name": ai_call_name,
        "user_email": user_email,
        "is_pro": is_owner,
        "has_configured": has_configured == "1"
    }

@app.post("/api/device/identity")
def update_device_identity(request: Request, data: dict):
    cid = get_request_client_id(request)
    is_owner = bool(data.get("is_owner", False))
    user_name = data.get("user_name", "Truong Hai" if is_owner else "Khách").strip()
    user_call_name = data.get("user_call_name", "Anh Trường" if is_owner else "Bạn").strip()
    ai_call_name = data.get("ai_call_name", "Em" if is_owner else "Tôi").strip()
    user_email = data.get("user_email", "haitruongproqt1@gmail.com" if is_owner else "").strip()
    
    database.set_setting("is_owner", "1" if is_owner else "0", client_id=cid)
    database.set_setting("user_name", user_name, client_id=cid)
    database.set_setting("user_call_name", user_call_name, client_id=cid)
    database.set_setting("ai_call_name", ai_call_name, client_id=cid)
    database.set_setting("user_email", user_email, client_id=cid)
    database.set_setting("identity_configured", "1", client_id=cid)
    
    return {
        "success": True,
        "client_id": cid,
        "is_owner": is_owner,
        "user_name": user_name,
        "user_call_name": user_call_name,
        "ai_call_name": ai_call_name,
        "user_email": user_email,
        "is_pro": is_owner
    }

# ============================================================
# 6. CÀI ĐẶT
# ============================================================
@app.get("/api/settings")
def read_settings(request: Request):
    cid = get_request_client_id(request)
    api_k = database.get_setting("gemini_api_key", "", client_id=cid)
    is_using_master_key = False
    if not api_k:
        api_k = database.get_setting("gemini_api_key", os.environ.get("GEMINI_API_KEY", ""), client_id="master")
        is_using_master_key = True
    saved_persona = database.get_setting("custom_persona", "", client_id=cid)
    persona = saved_persona if saved_persona else database.get_setting("custom_persona", gemini_client.DEFAULT_SYSTEM_PROMPT, client_id="master")
    agent_mode = database.get_setting("agent_mode", "safe", client_id=cid)
    return {
        "gemini_api_key": api_k if cid == "master" else ("●●●●●● (Kế thừa từ máy chủ)" if api_k else ""),
        "has_api_key": bool(api_k),
        "is_using_master_key": is_using_master_key,
        "custom_persona": persona,
        "agent_mode": agent_mode,
        "client_id": cid,
        "is_master": cid == "master"
    }

@app.post("/api/settings")
def save_settings(data: dict, request: Request):
    cid = get_request_client_id(request)
    if "gemini_api_key" in data:
        database.set_setting("gemini_api_key", data["gemini_api_key"].strip(), client_id=cid)
    if "custom_persona" in data:
        database.set_setting("custom_persona", data["custom_persona"].strip(), client_id=cid)
    if "agent_mode" in data:
        m = data["agent_mode"].strip().lower()
        if m in ["safe", "turbo"]:
            database.set_setting("agent_mode", m, client_id=cid)
    return {"success": True, "message": "Đã lưu cài đặt thành công!"}

@app.get("/api/system/agent-mode")
def get_agent_mode(request: Request):
    cid = get_request_client_id(request)
    mode = database.get_setting("agent_mode", "safe", client_id=cid)
    return {"success": True, "agent_mode": mode}

@app.post("/api/system/agent-mode")
def set_agent_mode(data: dict, request: Request):
    cid = get_request_client_id(request)
    mode = data.get("agent_mode", "safe").strip().lower()
    if mode not in ["safe", "turbo"]:
        mode = "safe"
    database.set_setting("agent_mode", mode, client_id=cid)
    return {"success": True, "agent_mode": mode}
