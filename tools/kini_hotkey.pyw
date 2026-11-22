"""
KINI AI - GLOBAL DESKTOP HOTKEY LISTENER (Phím Tắt Toàn Cầu)
- Nhấn Alt + Space hoặc Ctrl + Shift + K ở bất kỳ đâu trên Windows để mở ngay KINI AI!
- Chạy ngầm 100% không hiện cửa sổ đen (pythonw.exe).
"""

import sys
import os
import time
import ctypes
from ctypes import wintypes
import webbrowser

# Định nghĩa Windows Hotkey Constants
MOD_ALT = 0x0001
MOD_CONTROL = 0x0002
MOD_SHIFT = 0x0004
MOD_NOREPEAT = 0x4000

VK_SPACE = 0x20
VK_K = 0x4B

HOTKEY_ID_ALT_SPACE = 101
HOTKEY_ID_CTRL_SHIFT_K = 102

user32 = ctypes.windll.user32

def log_msg(msg):
    log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kini_hotkey.log")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}\n")

def open_kini_ai():
    url = "http://127.0.0.1:8000"
    log_msg("Đã bấm phím tắt! Mở giao diện KINI AI...")
    try:
        # Thử tìm cửa sổ trình duyệt có tiêu đề KINI AI để focus
        opened = False
        def enum_windows_callback(hwnd, extra):
            nonlocal opened
            length = user32.GetWindowTextLengthW(hwnd)
            if length > 0:
                buff = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buff, length + 1)
                title = buff.value
                if "KINI AI" in title:
                    user32.ShowWindow(hwnd, 9) # SW_RESTORE
                    user32.SetForegroundWindow(hwnd)
                    opened = True
                    return False
            return True

        WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
        user32.EnumWindows(WNDENUMPROC(enum_windows_callback), 0)

        if not opened:
            webbrowser.open(url)
    except Exception as e:
        log_msg(f"Lỗi mở trình duyệt: {e}")
        webbrowser.open(url)

def main():
    log_msg("=== KHỞI ĐỘNG KINI AI GLOBAL HOTKEY ===")
    
    # 1. Đăng ký Alt + Space
    res1 = user32.RegisterHotKey(None, HOTKEY_ID_ALT_SPACE, MOD_ALT | MOD_NOREPEAT, VK_SPACE)
    # 2. Đăng ký Ctrl + Shift + K
    res2 = user32.RegisterHotKey(None, HOTKEY_ID_CTRL_SHIFT_K, MOD_CONTROL | MOD_SHIFT | MOD_NOREPEAT, VK_K)
    
    log_msg(f"Đăng ký Hotkey Alt+Space: {'Thành công' if res1 else 'Không thể đăng ký (đã bị chiếm)'}")
    log_msg(f"Đăng ký Hotkey Ctrl+Shift+K: {'Thành công' if res2 else 'Không thể đăng ký (đã bị chiếm)'}")

    msg = wintypes.MSG()
    try:
        while user32.GetMessageW(ctypes.byref(msg), None, 0, 0) != 0:
            if msg.message == 0x0312: # WM_HOTKEY
                if msg.wParam in [HOTKEY_ID_ALT_SPACE, HOTKEY_ID_CTRL_SHIFT_K]:
                    open_kini_ai()
            user32.TranslateMessage(ctypes.byref(msg))
            user32.DispatchMessageW(ctypes.byref(msg))
    finally:
        user32.UnregisterHotKey(None, HOTKEY_ID_ALT_SPACE)
        user32.UnregisterHotKey(None, HOTKEY_ID_CTRL_SHIFT_K)
        log_msg("Đã hủy đăng ký hotkey và thoát.")

if __name__ == "__main__":
    main()
