"""
KINI AI Studio - Windows Installer GUI (Trình Cài Đặt Tự Động)
Phát triển bởi: Phùng Hải Trường
Chức năng:
1. Giao diện trực quan hiện đại (Tkinter native).
2. Tự động giải nén gói KINI AI Portable sạch vào thư mục cài đặt (mặc định: %LOCALAPPDATA%\\KINI_AI).
3. Tự động tạo biểu tượng ngoài màn hình Desktop (Desktop Shortcut) và Start Menu.
4. Tự động khởi chạy KINI AI ngay sau khi hoàn tất.
5. 100% độc lập, riêng tư, tự động mở Onboarding chào đón người dùng mới.
"""

import os
import sys
import zipfile
import threading
import subprocess
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

APP_NAME = "KINI AI Studio"
APP_VERSION = "v4.4"
DEFAULT_INSTALL_DIR = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "KINI_AI")

def get_bundle_zip():
    """Tìm tệp zip nguồn được đóng gói bên trong file exe hoặc cùng thư mục"""
    if getattr(sys, 'frozen', False):
        base_dir = getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))

    # Tìm các vị trí có thể chứa file zip
    candidates = [
        os.path.join(base_dir, "KINI_AI_v4.4_Portable.zip"),
        os.path.join(base_dir, "dist_release", "KINI_AI_v4.4_Portable.zip"),
        os.path.join(os.path.dirname(base_dir), "dist_release", "KINI_AI_v4.4_Portable.zip"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist_release", "KINI_AI_v4.4_Portable.zip")
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None

def create_windows_shortcut(target_exe, shortcut_path, icon_path="", working_dir=""):
    """Tạo file shortcut .lnk chuẩn Windows bằng PowerShell WScript.Shell"""
    try:
        working_dir = working_dir or os.path.dirname(target_exe)
        icon_path = icon_path or target_exe
        
        # Escape đường dẫn cho PowerShell
        target_esc = target_exe.replace("'", "''")
        sc_esc = shortcut_path.replace("'", "''")
        icon_esc = icon_path.replace("'", "''")
        wd_esc = working_dir.replace("'", "''")

        ps_script = f"""
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('{sc_esc}')
$Shortcut.TargetPath = '{target_esc}'
$Shortcut.IconLocation = '{icon_esc}'
$Shortcut.WorkingDirectory = '{wd_esc}'
$Shortcut.Save()
"""
        creationflags = 0x08000000 if sys.platform == "win32" else 0
        subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], creationflags=creationflags, check=False)
        return True
    except Exception as e:
        print(f"Lỗi tạo shortcut: {e}")
        return False

class KiniInstallerApp:
    def __init__(self, root):
        self.root = root
        self.root.title(f"{APP_NAME} {APP_VERSION} - Trình Cài Đặt")
        self.root.geometry("540x440")
        self.root.resizable(False, False)
        self.root.configure(bg="#0f172a")

        # Căn giữa màn hình
        self.center_window(540, 440)

        self.install_path_var = tk.StringVar(value=DEFAULT_INSTALL_DIR)
        self.create_desktop_sc_var = tk.BooleanVar(value=True)
        self.launch_after_var = tk.BooleanVar(value=True)

        self.build_ui()

    def center_window(self, width, height):
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x = (screen_width - width) // 2
        y = (screen_height - height) // 2
        self.root.geometry(f"{width}x{height}+{x}+{y}")

    def build_ui(self):
        # Header Frame
        header_frame = tk.Frame(self.root, bg="#1e293b", height=85)
        header_frame.pack(fill=tk.X, side=tk.TOP)
        header_frame.pack_propagate(False)

        title_lbl = tk.Label(
            header_frame, 
            text=f"🚀 {APP_NAME} {APP_VERSION}", 
            font=("Segoe UI", 16, "bold"), 
            fg="#60a5fa", 
            bg="#1e293b"
        )
        title_lbl.pack(anchor="w", padx=24, pady=(16, 2))

        sub_lbl = tk.Label(
            header_frame, 
            text="Siêu Trợ Lý Trí Tuệ Nhân Tạo Cá Nhân • Hoạt động 100% độc lập cục bộ", 
            font=("Segoe UI", 9), 
            fg="#94a3b8", 
            bg="#1e293b"
        )
        sub_lbl.pack(anchor="w", padx=24)

        # Body Container
        body_frame = tk.Frame(self.root, bg="#0f172a")
        body_frame.pack(fill=tk.BOTH, expand=True, padx=24, pady=18)

        # Thư mục cài đặt
        dir_lbl = tk.Label(
            body_frame, 
            text="Thư mục cài đặt ứng dụng trên máy tính:", 
            font=("Segoe UI", 10, "bold"), 
            fg="#e2e8f0", 
            bg="#0f172a"
        )
        dir_lbl.pack(anchor="w", pady=(0, 6))

        path_row = tk.Frame(body_frame, bg="#0f172a")
        path_row.pack(fill=tk.X, pady=(0, 14))

        path_entry = tk.Entry(
            path_row, 
            textvariable=self.install_path_var, 
            font=("Segoe UI", 9), 
            bg="#1e293b", 
            fg="#f8fafc", 
            insertbackground="#60a5fa",
            relief=tk.FLAT,
            highlightthickness=1,
            highlightbackground="#334155"
        )
        path_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, ipady=6, padx=(0, 8))

        browse_btn = tk.Button(
            path_row, 
            text="Duyệt...", 
            font=("Segoe UI", 9), 
            bg="#334155", 
            fg="#ffffff", 
            activebackground="#475569",
            activeforeground="#ffffff",
            relief=tk.FLAT,
            cursor="hand2",
            padx=12,
            command=self.browse_directory
        )
        browse_btn.pack(side=tk.RIGHT)

        # Tùy chọn Checkboxes
        opts_frame = tk.Frame(body_frame, bg="#0f172a")
        opts_frame.pack(fill=tk.X, pady=(4, 16))

        cb_sc = tk.Checkbutton(
            opts_frame, 
            text="Tạo biểu tượng KINI AI trên màn hình Desktop", 
            variable=self.create_desktop_sc_var, 
            font=("Segoe UI", 9), 
            fg="#cbd5e1", 
            bg="#0f172a", 
            selectcolor="#1e293b", 
            activebackground="#0f172a",
            activeforeground="#ffffff"
        )
        cb_sc.pack(anchor="w", pady=2)

        cb_launch = tk.Checkbutton(
            opts_frame, 
            text="Khởi chạy KINI AI ngay sau khi cài đặt hoàn tất", 
            variable=self.launch_after_var, 
            font=("Segoe UI", 9), 
            fg="#cbd5e1", 
            bg="#0f172a", 
            selectcolor="#1e293b", 
            activebackground="#0f172a",
            activeforeground="#ffffff"
        )
        cb_launch.pack(anchor="w", pady=2)

        # Thanh tiến trình (Progress Bar)
        self.progress_var = tk.DoubleVar(value=0)
        self.progress_bar = ttk.Progressbar(
            body_frame, 
            variable=self.progress_var, 
            maximum=100
        )
        self.progress_bar.pack(fill=tk.X, pady=(4, 6))

        self.status_lbl = tk.Label(
            body_frame, 
            text="Sẵn sàng cài đặt. Nhấn nút bên dưới để bắt đầu.", 
            font=("Segoe UI", 9), 
            fg="#94a3b8", 
            bg="#0f172a"
        )
        self.status_lbl.pack(anchor="w", pady=(0, 10))

        # Footer Buttons
        footer_frame = tk.Frame(self.root, bg="#0f172a")
        footer_frame.pack(fill=tk.X, side=tk.BOTTOM, padx=24, pady=16)

        self.cancel_btn = tk.Button(
            footer_frame, 
            text="Hủy Bỏ", 
            font=("Segoe UI", 9), 
            bg="#334155", 
            fg="#e2e8f0", 
            relief=tk.FLAT,
            cursor="hand2",
            padx=16,
            pady=6,
            command=self.root.destroy
        )
        self.cancel_btn.pack(side=tk.LEFT)

        self.install_btn = tk.Button(
            footer_frame, 
            text="🚀 Bắt Đầu Cài Đặt", 
            font=("Segoe UI", 10, "bold"), 
            bg="#2563eb", 
            fg="#ffffff", 
            activebackground="#1d4ed8",
            activeforeground="#ffffff",
            relief=tk.FLAT,
            cursor="hand2",
            padx=20,
            pady=6,
            command=self.start_installation
        )
        self.install_btn.pack(side=tk.RIGHT)

    def browse_directory(self):
        chosen = filedialog.askdirectory(initialdir=self.install_path_var.get(), title="Chọn thư mục cài đặt")
        if chosen:
            self.install_path_var.set(os.path.join(chosen, "KINI_AI"))

    def start_installation(self):
        zip_path = get_bundle_zip()
        if not zip_path or not os.path.exists(zip_path):
            messagebox.showerror(
                "Lỗi cài đặt", 
                "Không tìm thấy gói dữ liệu cài đặt KINI_AI_v4.4_Portable.zip!\nVui lòng kiểm tra lại file cài đặt."
            )
            return

        self.install_btn.config(state=tk.DISABLED, text="⏳ Đang cài đặt...")
        self.cancel_btn.config(state=tk.DISABLED)
        self.status_lbl.config(text="Đang giải nén tập tin hệ thống...", fg="#60a5fa")

        # Chạy trong luồng phụ để không bị đơ giao diện
        threading.Thread(target=self.perform_install_thread, args=(zip_path,), daemon=True).start()

    def perform_install_thread(self, zip_path):
        target_dir = self.install_path_var.get().strip()
        try:
            os.makedirs(target_dir, exist_ok=True)

            with zipfile.ZipFile(zip_path, 'r') as zf:
                file_list = zf.namelist()
                total_files = len(file_list)

                # Bỏ qua tiền tố thư mục cha trong zip nếu có
                prefix = ""
                if file_list and file_list[0].startswith("KINI_AI_v4.4_Portable/"):
                    prefix = "KINI_AI_v4.4_Portable/"
                elif file_list and file_list[0].startswith("KINI_AI_v4.2_Portable/"):
                    prefix = "KINI_AI_v4.2_Portable/"

                for idx, item in enumerate(file_list):
                    rel_name = item[len(prefix):] if (prefix and item.startswith(prefix)) else item
                    if not rel_name:
                        continue

                    dest_path = os.path.join(target_dir, rel_name.replace("/", os.sep))
                    if item.endswith("/"):
                        os.makedirs(dest_path, exist_ok=True)
                    else:
                        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                        with zf.open(item) as src, open(dest_path, "wb") as dst:
                            dst.write(src.read())

                    # Cập nhật tiến trình
                    percent = int(((idx + 1) / total_files) * 85)
                    self.progress_var.set(percent)
                    if idx % 15 == 0:
                        self.status_lbl.config(text=f"Đang giải nén ({percent}%): {os.path.basename(rel_name)}")

            # Tạo Desktop Shortcut nếu người dùng chọn
            self.progress_var.set(90)
            self.status_lbl.config(text="Đang tạo biểu tượng Desktop và Start Menu...")

            exe_path = os.path.join(target_dir, "KINI_AI.exe")
            ico_path = os.path.join(target_dir, "static", "app_icon.ico")

            if self.create_desktop_sc_var.get():
                desktop_dir = os.path.join(os.environ.get("USERPROFILE", os.path.expanduser("~")), "Desktop")
                shortcut_file = os.path.join(desktop_dir, f"{APP_NAME}.lnk")
                create_windows_shortcut(exe_path, shortcut_file, ico_path, target_dir)

            # Start Menu Shortcut
            start_menu_dir = os.path.join(os.environ.get("APPDATA", ""), r"Microsoft\Windows\Start Menu\Programs")
            if os.path.exists(start_menu_dir):
                sm_shortcut = os.path.join(start_menu_dir, f"{APP_NAME}.lnk")
                create_windows_shortcut(exe_path, sm_shortcut, ico_path, target_dir)

            self.progress_var.set(100)
            self.status_lbl.config(text="🎉 Cài đặt thành công 100%! Sẵn sàng trải nghiệm.", fg="#34d399")

            # Hiển thị thông báo hoàn tất
            messagebox.showinfo(
                "Cài Đặt Thành Công", 
                f"Chúc mừng bạn! {APP_NAME} đã được cài đặt thành công vào:\n{target_dir}\n\n"
                "Biểu tượng đã được tạo trên màn hình Desktop. Bạn có thể mở sử dụng bất kỳ lúc nào!"
            )

            # Tự động mở nếu được chọn
            if self.launch_after_var.get() and os.path.exists(exe_path):
                subprocess.Popen([exe_path], cwd=target_dir)

            self.root.destroy()

        except Exception as e:
            self.status_lbl.config(text=f"Lỗi: {e}", fg="#f87171")
            messagebox.showerror("Lỗi Cài Đặt", f"Đã xảy ra lỗi trong quá trình cài đặt:\n{e}")
            self.install_btn.config(state=tk.NORMAL, text="Thử Lại")
            self.cancel_btn.config(state=tk.NORMAL)

def main():
    root = tk.Tk()
    app = KiniInstallerApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()
