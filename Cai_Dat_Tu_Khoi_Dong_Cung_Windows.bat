@echo off
chcp 65001 >nul
title KINI AI - Cai Dat Tu Dong Khoi Dong 24/24 Cung Windows
echo ========================================================
echo   KINI AI - TỰ ĐỘNG CHẠY NGẦM 24/24 KHI MỞ MÁY TÍNH
echo ========================================================
echo.
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET_VBS=%~dp0Chay_Ngam_24_7.vbs"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\KINI_AI_24_7.lnk"

echo [*] Đang thiết lập lối tắt tự khởi động cùng Windows...
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_VBS%'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'KINI AI 24/7 Background Service'; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [OK] THÀNH CÔNG! KINI AI đã được cài đặt tự khởi động cùng Windows.
    echo      Từ giờ, mỗi khi anh Trường bật máy tính, KINI AI sẽ tự chạy ngầm 24/24
    echo      mà không cần phải bấm bất kỳ file nào.
) else (
    echo [!] Không thể tạo shortcut tự động. Vui lòng thử lại với quyền Administrator.
)
echo.
pause
