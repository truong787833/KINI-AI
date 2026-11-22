@echo off
chcp 65001 >nul
title Cài Đặt Phím Tắt Gọi Nhanh KINI AI (Alt + Space)
echo ======================================================================
echo       KINI AI - CÀI ĐẶT PHÍM TẮT GỌI NHANH TOÀN CẦU (GLOBAL HOTKEY)
echo ======================================================================
echo.
echo Phím tắt kích hoạt:
echo   - Alt + Space (Mở KINI AI siêu tốc)
echo   - Ctrl + Shift + K
echo.
echo Đang kích hoạt tiến trình phím tắt chạy ngầm...
start "" pythonw "%~dp0tools\kini_hotkey.pyw"

echo.
echo Đang thêm phím tắt vào thư mục Khởi động cùng Windows (Startup)...
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_SCRIPT=%~dp0Chay_Phim_Tat_KINI.vbs"

echo Set WshShell = CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo WshShell.Run "pythonw """ ^& "%~dp0tools\kini_hotkey.pyw""" , 0, False >> "%VBS_SCRIPT%"

copy /y "%VBS_SCRIPT%" "%STARTUP_FOLDER%\Chay_Phim_Tat_KINI.vbs" >nul

echo [THÀNH CÔNG] Đã kích hoạt và cài đặt phím tắt tự khởi động cùng máy tính!
echo Bây giờ anh Trường có thể bấm [Alt + Space] hoặc [Ctrl + Shift + K] ở bất kỳ đâu để gọi KINI AI!
echo.
pause
