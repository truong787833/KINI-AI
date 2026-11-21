import os
import subprocess
import json
import re
import shutil
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger("AgentEngine")

WORKSPACE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "workspace")
os.makedirs(WORKSPACE_DIR, exist_ok=True)

# ============================================================
# CÁC CÔNG CỤ CỤC BỘ DÀNH CHO KINI AI AGENT
# ============================================================
def tool_write_file(rel_path: str, content: str) -> Dict[str, Any]:
    """Tạo hoặc ghi đè file trong thư mục workspace"""
    try:
        # Chuẩn hóa đường dẫn an toàn
        clean_path = os.path.normpath(rel_path).lstrip("\\/.")
        full_path = os.path.join(WORKSPACE_DIR, clean_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
        return {"success": True, "path": clean_path, "bytes": len(content.encode("utf-8"))}
    except Exception as e:
        return {"success": False, "error": str(e)}

def tool_read_file(rel_path: str) -> Dict[str, Any]:
    """Đọc nội dung file từ thư mục workspace"""
    try:
        clean_path = os.path.normpath(rel_path).lstrip("\\/.")
        full_path = os.path.join(WORKSPACE_DIR, clean_path)
        if not os.path.exists(full_path):
            return {"success": False, "error": f"Không tìm thấy file: {clean_path}"}
        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read(15000) # Đọc tối đa 15,000 ký tự
        return {"success": True, "content": content, "path": clean_path}
    except Exception as e:
        return {"success": False, "error": str(e)}

def tool_list_files(sub_dir: str = "") -> Dict[str, Any]:
    """Liệt kê danh sách file và thư mục trong workspace với cấu trúc chi tiết cho Studio IDE"""
    try:
        target_dir = os.path.join(WORKSPACE_DIR, os.path.normpath(sub_dir).lstrip("\\/."))
        if not os.path.exists(target_dir):
            return {"success": False, "error": "Thư mục không tồn tại"}
        items = []
        tree_nodes = []
        for root, dirs, files in os.walk(target_dir):
            rel_root = os.path.relpath(root, WORKSPACE_DIR)
            for d in dirs:
                rel_d = os.path.normpath(os.path.join(rel_root, d) if rel_root != '.' else d).replace("\\", "/")
                items.append(f"📁 {rel_d}")
                tree_nodes.append({
                    "path": rel_d,
                    "name": d,
                    "is_dir": True,
                    "size": 0,
                    "ext": ""
                })
            for f in files:
                rel_f = os.path.normpath(os.path.join(rel_root, f) if rel_root != '.' else f).replace("\\", "/")
                f_full = os.path.join(root, f)
                f_size = os.path.getsize(f_full) if os.path.exists(f_full) else 0
                ext = os.path.splitext(f)[1].lower()
                items.append(f"📄 {rel_f}")
                tree_nodes.append({
                    "path": rel_f,
                    "name": f,
                    "is_dir": False,
                    "size": f_size,
                    "ext": ext
                })
        return {"success": True, "items": items[:80], "tree_nodes": tree_nodes[:150]}
    except Exception as e:
        return {"success": False, "error": str(e)}

def tool_run_command(command: str) -> Dict[str, Any]:
    """Thực thi câu lệnh terminal (PowerShell/cmd) bên trong workspace"""
    try:
        # Cấm các lệnh nguy hiểm
        blocked = ["format", "del /s", "rmdir /s /q c:", "shutdown"]
        if any(b in command.lower() for b in blocked):
            return {"success": False, "error": "Lệnh nguy hiểm bị chặn bởi hệ thống bảo vệ KINI AI."}
        
        proc = subprocess.run(
            command,
            shell=True,
            cwd=WORKSPACE_DIR,
            capture_output=True,
            text=True,
            timeout=35
        )
        return {
            "success": proc.returncode == 0,
            "stdout": proc.stdout[:3000],
            "stderr": proc.stderr[:3000],
            "returncode": proc.returncode
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Lệnh chạy quá thời gian (Timeout 35s)"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def tool_create_folder(rel_path: str) -> Dict[str, Any]:
    """Tạo thư mục mới trong workspace"""
    try:
        clean_path = os.path.normpath(rel_path).lstrip("\\/.")
        full_path = os.path.join(WORKSPACE_DIR, clean_path)
        os.makedirs(full_path, exist_ok=True)
        return {"success": True, "path": clean_path}
    except Exception as e:
        return {"success": False, "error": str(e)}

def tool_delete_path(rel_path: str) -> Dict[str, Any]:
    """Xóa file hoặc thư mục trong workspace an toàn"""
    try:
        clean_path = os.path.normpath(rel_path).lstrip("\\/.")
        if not clean_path or clean_path in [".", "/", "\\"]:
            return {"success": False, "error": "Không được phép xóa thư mục gốc"}
        full_path = os.path.join(WORKSPACE_DIR, clean_path)
        if not os.path.exists(full_path):
            return {"success": False, "error": "Không tìm thấy tệp hoặc thư mục"}
        if os.path.isdir(full_path):
            shutil.rmtree(full_path)
        else:
            os.remove(full_path)
        return {"success": True, "path": clean_path}
    except Exception as e:
        return {"success": False, "error": str(e)}

def tool_rename_path(old_path: str, new_path: str) -> Dict[str, Any]:
    """Đổi tên file hoặc thư mục trong workspace"""
    try:
        clean_old = os.path.normpath(old_path).lstrip("\\/.")
        clean_new = os.path.normpath(new_path).lstrip("\\/.")
        full_old = os.path.join(WORKSPACE_DIR, clean_old)
        full_new = os.path.join(WORKSPACE_DIR, clean_new)
        if not os.path.exists(full_old):
            return {"success": False, "error": "Không tìm thấy đường dẫn gốc"}
        os.makedirs(os.path.dirname(full_new), exist_ok=True)
        os.rename(full_old, full_new)
        return {"success": True, "old_path": clean_old, "new_path": clean_new}
    except Exception as e:
        return {"success": False, "error": str(e)}

def tool_search_in_files(keyword: str) -> Dict[str, Any]:
    """Tìm kiếm từ khóa trong toàn bộ các file mã nguồn/văn bản của workspace"""
    try:
        keyword = keyword.strip()
        if not keyword:
            return {"success": False, "error": "Từ khóa tìm kiếm trống"}
        results = []
        for root, _, files in os.walk(WORKSPACE_DIR):
            for file in files:
                if file.endswith((".py", ".js", ".html", ".css", ".json", ".txt", ".md", ".bat", ".csv")):
                    full_p = os.path.join(root, file)
                    rel_p = os.path.relpath(full_p, WORKSPACE_DIR).replace("\\", "/")
                    try:
                        with open(full_p, "r", encoding="utf-8", errors="ignore") as f:
                            for idx, line in enumerate(f, 1):
                                if keyword.lower() in line.lower():
                                    results.append({
                                        "file": rel_p,
                                        "line": idx,
                                        "content": line.strip()[:200]
                                    })
                                    if len(results) >= 50:
                                        break
                    except Exception:
                        pass
        return {"success": True, "keyword": keyword, "matches": results, "total": len(results)}
    except Exception as e:
        return {"success": False, "error": str(e)}

# ============================================================
# SYSTEM PROMPT VÀ AGENT RUNNER LOOP CHUẨN ANTIGRAVITY
# ============================================================
AGENT_SYSTEM_PROMPT = """Bạn là KINI AI Autonomous Agent - Kỹ sư AI Tự Hành Tối Thượng của anh Hải Trường (chuẩn kiến trúc Antigravity).
Nhiệm vụ của bạn là: Khi anh Trường giao một bài toán (ví dụ: làm game 2D, viết script tự động hóa, tạo website, phân tích dữ liệu), bạn KHÔNG CHỈ TRẢ LỜI BẰNG LỜI NÓI mà BẠN PHẢI TỰ ĐỘNG THỰC THI TOÀN BỘ CÔNG VIỆC VÀO Ổ ĐĨA `H:\\KINI_AI\\workspace\\`.

BẠN CÓ CÁC CÔNG CỤ SAU (Gọi bằng định dạng JSON):
1. Ghi file mã nguồn / tài liệu:
```json
{
  "tool": "write_file",
  "path": "ten_du_an/main.py",
  "content": "noi_dung_code"
}
```

2. Đọc file để kiểm tra / nâng cấp:
```json
{
  "tool": "read_file",
  "path": "ten_du_an/main.py"
}
```

3. Xem danh sách thư mục dự án:
```json
{
  "tool": "list_files",
  "path": "ten_du_an"
}
```

4. Chạy lệnh kiểm thử / cài thư viện / chạy file:
```json
{
  "tool": "run_command",
  "command": "python -m py_compile ten_du_an/main.py"
}
```

5. Tìm kiếm đoạn code / từ khóa trong toàn bộ workspace:
```json
{
  "tool": "search_in_files",
  "keyword": "tên_hàm_hoặc_biến"
}
```

6. Tạo thư mục dự án mới:
```json
{
  "tool": "create_folder",
  "path": "ten_du_an/assets"
}
```

7. Xóa hoặc đổi tên file nếu cần dọn dẹp:
```json
{
  "tool": "delete_file",
  "path": "ten_file_tam.txt"
}
```
hoặc
```json
{
  "tool": "rename_file",
  "old_path": "ten_cu.py",
  "new_path": "ten_moi.py"
}
```

QUY TRÌNH LÀM VIỆC CỦA BẠN:
1. Lên kế hoạch ngắn gọn các bước thực hiện.
2. Tự động viết đầy đủ các file code cần thiết (không viết dở dang, không dùng 'pass' hoặc 'viết tiếp ở đây').
   - NGUYÊN TẮC ZERO-INSTALL (CỰC KỲ QUAN TRỌNG): Khi viết game/app giao diện trên Windows, ưu tiên sử dụng thư viện tiêu chuẩn có sẵn trong Python (như `tkinter`, `turtle`) để chạy được ngay 100% mà không bị lỗi thiếu thư viện hay lỗi pip.
   - LUÔN TẠO FILE `run.bat` HOẶC `run_game.bat`: Chứa lệnh khởi chạy để anh Trường chỉ cần click đúp chuột là phần mềm/game mở lên ngay lập tức, không bắt anh phải mở CMD gõ lệnh thủ công.
3. Chạy kiểm thử cú pháp nếu cần (`python -m py_compile ...`).
4. Báo cáo hoàn thành cho anh Trường, nêu rõ đường dẫn file đã tạo trên máy tính và báo anh chỉ cần click đúp vào file `.bat` để trải nghiệm.
5. Luôn lễ phép, xưng 'Em' và gọi 'Anh Trường'."""

VISITOR_AGENT_PROMPT = """Bạn là KINI AI Autonomous Agent - Kỹ sư AI Tự Hành thông minh, chuẩn mực và đa năng.
Nhiệm vụ của bạn là: Khi người dùng giao bài toán (ví dụ: làm game, viết code, tạo website, xử lý dữ liệu), bạn hãy tự động lập kế hoạch và thực thi đầy đủ các file mã nguồn vào thư mục workspace.
Các công cụ có sẵn (gọi bằng định dạng JSON): write_file, read_file, run_command, list_files, search_in_files, create_folder, delete_file, rename_file.
Xưng hô: 'Tôi' - 'Bạn', phong cách chuyên nghiệp, khách quan và hữu ích."""

def run_agent_task(task_prompt: str, api_key: str = "", max_turns: int = 6, client_id: str = "master") -> Dict[str, Any]:
    """
    Vòng lặp Agentic Runner: Tự suy nghĩ, gọi công cụ, kiểm tra kết quả và tự sửa lỗi (Self-Healing) cho đến khi xong bài toán
    """
    from . import gemini_client
    
    actions_taken = []
    if client_id == "master":
        sys_prompt = AGENT_SYSTEM_PROMPT
        user_msg = f"Anh Trường giao nhiệm vụ Agent: \"{task_prompt}\". Hãy tự động lập kế hoạch và thực thi đầy đủ các file mã nguồn/dự án vào workspace."
    else:
        sys_prompt = VISITOR_AGENT_PROMPT
        user_msg = f"Yêu cầu Agent: \"{task_prompt}\". Hãy tự động lập kế hoạch và thực thi đầy đủ các file mã nguồn/dự án vào workspace."

    messages = [
        {"role": "user", "content": user_msg}
    ]
    
    final_reply = ""
    for turn in range(max_turns):
        res = gemini_client.ask_gemini(
            messages=messages,
            api_key=api_key,
            system_instruction=sys_prompt,
            model_mode="flash",
            client_id=client_id
        )
        if not res.get("success"):
            return {
                "success": False,
                "reply": res.get("reply", "Lỗi gọi AI Agent"),
                "actions": actions_taken
            }
        
        reply = res["reply"]
        final_reply = reply
        
        # Tìm các khối tool call JSON trong câu trả lời
        tool_matches = re.findall(r'```json\s*(\{[\s\S]*?\})\s*```', reply)
        if not tool_matches:
            # Tìm dạng json thuần
            tool_matches = re.findall(r'(\{\s*"tool"\s*:\s*"[^"]+"[\s\S]*?\})', reply)
            
        if not tool_matches:
            # Agent đã hoàn thành và trả lời người dùng
            break
            
        executed_any = False
        tool_results_text = ""
        
        for m_str in tool_matches:
            try:
                tool_data = json.loads(m_str)
                tool_name = tool_data.get("tool")
                
                if tool_name == "write_file":
                    p = tool_data.get("path", "project/script.py")
                    c = tool_data.get("content", "")
                    r = tool_write_file(p, c)
                    actions_taken.append({"tool": "write_file", "path": p, "success": r.get("success")})
                    tool_results_text += f"\n[Kết quả write_file '{p}']: {'Thành công' if r.get('success') else r.get('error')}"
                    executed_any = True
                    
                elif tool_name == "run_command":
                    cmd = tool_data.get("command", "")
                    r = tool_run_command(cmd)
                    actions_taken.append({"tool": "run_command", "command": cmd, "returncode": r.get("returncode")})
                    stderr = r.get('stderr', '')
                    stdout = r.get('stdout', '')
                    tool_results_text += f"\n[Kết quả run_command '{cmd}']: ExitCode={r.get('returncode')}\nSTDOUT:\n{stdout[:500]}\nSTDERR:\n{stderr[:500]}"
                    if r.get("returncode") != 0:
                        # Trích xuất dòng traceback trọng yếu để Agent định vị ngay dòng lỗi
                        tb_lines = [line for line in stderr.splitlines() if "File " in line or "Error" in line or "Exception" in line or "line " in line]
                        tb_hint = "\n".join(tb_lines[-4:]) if tb_lines else stderr[:300]
                        tool_results_text += f"\n⚠️ [AUTONOMOUS DEBUGGER - KÍCH HOẠT TỰ SỬA LỖI ĐA BƯỚC]: Lệnh '{cmd}' trả về mã lỗi {r.get('returncode')}!\nTrích xuất lỗi chính:\n{tb_hint}\nYêu cầu KINI Agent: Tự phân tích traceback trên, dùng 'read_file' kiểm tra file gặp sự cố, dùng 'write_file' chỉnh sửa chính xác và dùng 'run_command' kiểm thử lại ngay!"
                    executed_any = True
                    
                elif tool_name == "read_file":
                    p = tool_data.get("path", "")
                    r = tool_read_file(p)
                    actions_taken.append({"tool": "read_file", "path": p, "success": r.get("success")})
                    tool_results_text += f"\n[Kết quả read_file '{p}']: {r.get('content', '')[:1000]}"
                    executed_any = True
                    
                elif tool_name == "list_files":
                    p = tool_data.get("path", "")
                    r = tool_list_files(p)
                    actions_taken.append({"tool": "list_files", "path": p, "count": len(r.get("items", []))})
                    tool_results_text += f"\n[Kết quả list_files]: {', '.join(r.get('items', [])[:10])}"
                    executed_any = True

                elif tool_name == "search_in_files":
                    kw = tool_data.get("keyword", "")
                    r = tool_search_in_files(kw)
                    actions_taken.append({"tool": "search_in_files", "keyword": kw, "total": r.get("total", 0)})
                    matches_summary = [f"{m['file']}:{m['line']} -> {m['content']}" for m in r.get("matches", [])[:5]]
                    tool_results_text += f"\n[Kết quả search_in_files '{kw}']: Tìm thấy {r.get('total', 0)} kết quả. Mẫu:\n" + "\n".join(matches_summary)
                    executed_any = True

                elif tool_name == "create_folder":
                    p = tool_data.get("path", "")
                    r = tool_create_folder(p)
                    actions_taken.append({"tool": "create_folder", "path": p, "success": r.get("success")})
                    tool_results_text += f"\n[Kết quả create_folder '{p}']: {'Thành công' if r.get('success') else r.get('error')}"
                    executed_any = True

                elif tool_name == "delete_file":
                    p = tool_data.get("path", "")
                    r = tool_delete_path(p)
                    actions_taken.append({"tool": "delete_file", "path": p, "success": r.get("success")})
                    tool_results_text += f"\n[Kết quả delete_file '{p}']: {'Thành công' if r.get('success') else r.get('error')}"
                    executed_any = True

                elif tool_name == "rename_file":
                    old_p = tool_data.get("old_path", "")
                    new_p = tool_data.get("new_path", "")
                    r = tool_rename_path(old_p, new_p)
                    actions_taken.append({"tool": "rename_file", "old": old_p, "new": new_p, "success": r.get("success")})
                    tool_results_text += f"\n[Kết quả rename_file]: {old_p} -> {new_p} ({'Thành công' if r.get('success') else r.get('error')})"
                    executed_any = True
            except Exception as e:
                logger.warning(f"Lỗi phân tích cú pháp tool: {e}")
                
        if not executed_any:
            break
            
        # Gửi lại kết quả công cụ cho Gemini tiếp tục xử lý bước tiếp theo
        messages.append({"role": "assistant", "content": reply})
        messages.append({"role": "user", "content": f"Kết quả thực thi công cụ cục bộ từ hệ thống:{tool_results_text}\nHãy tiếp tục các bước tiếp theo hoặc hoàn thiện báo cáo cho anh Trường."})
    
    return {
        "success": True,
        "reply": final_reply,
        "actions": actions_taken,
        "workspace": WORKSPACE_DIR
    }

# ============================================================
# KIẾN TRÚC SƯ LẬP KẾ HOẠCH HỆ THỐNG (/plan) CHUẨN ANTIGRAVITY
# ============================================================
PLANNER_SYSTEM_PROMPT = """Bạn là KINI AI Chief Architect & Strategic Planner của anh Hải Trường (chuẩn kiến trúc Antigravity).
Khi anh Trường yêu cầu lập kế hoạch (/plan), bạn KHÔNG viết code vội vàng mà phải lập một BẢN QUY HOẠCH HỆ THỐNG TOÀN DIỆN (Architectural Blueprint):

Cấu trúc bắt buộc gồm 5 phần:
1. 🎯 MỤC TIÊU CỐT LÕI & TIÊU CHUẨN ĐẠT ĐƯỢC (Definition of Done)
2. 🧩 MA TRẬN PHÂN CHIA MODULE & CÔNG NGHỆ LỰA CHỌN (Kèm lý do tại sao chọn)
3. 🔄 SƠ ĐỒ LUỒNG HOẠT ĐỘNG (Render bằng code Mermaid chuẩn)
4. 📋 KẾ HOẠCH TRIỂN KHAI TỪNG BƯỚC (Checklist chi tiết từng file cần tạo)
5. ⚠️ DỰ BÁO RỦI RO KỸ THUẬT & PHƯƠNG ÁN PHÒNG NGỪA (Risk Matrix)
6. ❓ 1 CÂU HỎI QUYẾT ĐỊNH để chốt với anh Trường trước khi kích hoạt Agent viết code.

Xưng hô: 'Em' - 'Anh Trường', phong cách sắc bén, tư duy chiến lược đỉnh cao."""

VISITOR_PLANNER_PROMPT = """Bạn là KINI AI Chief Architect & Strategic Planner.
Khi người dùng yêu cầu lập kế hoạch (/plan), bạn hãy thiết lập một BẢN QUY HOẠCH HỆ THỐNG TOÀN DIỆN (Architectural Blueprint) gồm:
1. 🎯 MỤC TIÊU CỐT LÕI & TIÊU CHUẨN ĐẠT ĐƯỢC
2. 🧩 PHÂN CHIA MODULE & CÔNG NGHỆ LỰA CHỌN
3. 🔄 SƠ ĐỒ LUỒNG HOẠT ĐỘNG (Render bằng code Mermaid chuẩn)
4. 📋 KẾ HOẠCH TRIỂN KHAI TỪNG BƯỚC (Checklist chi tiết từng file cần tạo)
5. ⚠️ DỰ BÁO RỦI RO KỸ THUẬT & PHƯƠNG ÁN PHÒNG NGỪA
Xưng hô: 'Tôi' - 'Bạn', phong cách logic, sắc bén và chuyên nghiệp."""

def run_plan_task(goal: str, api_key: str = "", client_id: str = "master") -> Dict[str, Any]:
    """Lập bản kế hoạch kiến trúc hệ thống chuyên sâu trước khi bắt tay thực thi"""
    from . import gemini_client
    if client_id == "master":
        sys_prompt = PLANNER_SYSTEM_PROMPT
        user_msg = f"Anh Trường yêu cầu lập kế hoạch chiến lược (/plan): \"{goal}\". Hãy thiết lập bản quy hoạch hệ thống toàn diện theo chuẩn Antigravity."
    else:
        sys_prompt = VISITOR_PLANNER_PROMPT
        user_msg = f"Yêu cầu lập kế hoạch kiến trúc (/plan): \"{goal}\". Hãy thiết lập bản quy hoạch hệ thống toàn diện."

    messages = [
        {"role": "user", "content": user_msg}
    ]
    res = gemini_client.ask_gemini(
        messages=messages,
        api_key=api_key,
        system_instruction=sys_prompt,
        model_mode="pro",
        client_id=client_id
    )
    return res
