@echo off
chcp 65001 >nul
title KINI AI - Xem Link Online Public Dang Hoat Dong
echo ========================================================
echo       KINI AI - ĐƯỜNG DẪN TRUY CẬP ONLINE PUBLIC
echo ========================================================
echo.
if exist "%~dp0active_online_url.txt" (
    echo Đường dẫn online hiện tại của KINI AI là:
    echo.
    type "%~dp0active_online_url.txt"
    echo.
    echo [*] Anh có thể sao chép đường link trên và mở trên Điện thoại hoặc Máy tính khác!
) else (
    echo [!] Chưa tìm thấy link online. Dịch vụ đang khởi động hoặc chưa bật.
    echo     Vui lòng chạy file Chay_Ngam_24_7.vbs hoặc Mo_Link_Public_Online.bat trước.
)
echo.
pause
