import os
import subprocess
import json
import re
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
    """Liệt kê danh sách file và thư mục trong workspace"""
    try:
        target_dir = os.path.join(WORKSPACE_DIR, os.path.normpath(sub_dir).lstrip("\\/."))
        if not os.path.exists(target_dir):
            return {"success": False, "error": "Thư mục không tồn tại"}
        tree = []
        for root, dirs, files in os.walk(target_dir):
            rel_root = os.path.relpath(root, WORKSPACE_DIR)
            for d in dirs:
                tree.append(f"📁 {os.path.join(rel_root, d) if rel_root != '.' else d}")
            for f in files:
                tree.append(f"📄 {os.path.join(rel_root, f) if rel_root != '.' else f}")
        return {"success": True, "items": tree[:50]}
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

QUY TRÌNH LÀM VIỆC CỦA BẠN:
1. Lên kế hoạch ngắn gọn các bước thực hiện.
2. Tự động viết đầy đủ các file code cần thiết (không viết dở dang, không dùng 'pass' hoặc 'viết tiếp ở đây').
   - NGUYÊN TẮC ZERO-INSTALL (CỰC KỲ QUAN TRỌNG): Khi viết game/app giao diện trên Windows, ưu tiên sử dụng thư viện tiêu chuẩn có sẵn trong Python (như `tkinter`, `turtle`) để chạy được ngay 100% mà không bị lỗi thiếu thư viện hay lỗi pip.
   - LUÔN TẠO FILE `run.bat` HOẶC `run_game.bat`: Chứa lệnh khởi chạy để anh Trường chỉ cần click đúp chuột là phần mềm/game mở lên ngay lập tức, không bắt anh phải mở CMD gõ lệnh thủ công.
3. Chạy kiểm thử cú pháp nếu cần (`python -m py_compile ...`).
4. Báo cáo hoàn thành cho anh Trường, nêu rõ đường dẫn file đã tạo trên máy tính và báo anh chỉ cần click đúp vào file `.bat` để trải nghiệm.
5. Luôn lễ phép, xưng 'Em' và gọi 'Anh Trường'."""

def run_agent_task(task_prompt: str, api_key: str = "", max_turns: int = 4) -> Dict[str, Any]:
    """
    Vòng lặp Agentic Runner: Tự suy nghĩ, gọi công cụ, kiểm tra kết quả và tự sửa lỗi cho đến khi xong bài toán
    """
    from . import gemini_client
    
    actions_taken = []
    messages = [
        {"role": "user", "content": f"Anh Trường giao nhiệm vụ Agent: \"{task_prompt}\". Hãy tự động lập kế hoạch và thực thi đầy đủ các file mã nguồn/dự án vào workspace."}
    ]
    
    final_reply = ""
    for turn in range(max_turns):
        res = gemini_client.ask_gemini(
            messages=messages,
            api_key=api_key,
            system_instruction=AGENT_SYSTEM_PROMPT,
            model_mode="flash"
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
                    tool_results_text += f"\n[Kết quả run_command '{cmd}']: ExitCode={r.get('returncode')}\nSTDOUT:\n{r.get('stdout', '')[:500]}\nSTDERR:\n{r.get('stderr', '')[:500]}"
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
