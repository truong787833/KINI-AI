@echo off
chcp 65001 >nul
title KINI AI - Cài Đặt Tên Miền Cố Định Vĩnh Viễn
color 0b

echo =====================================================================
echo          KINI AI - HỆ THỐNG CỐ ĐỊNH TÊN MIỀN ONLINE VĨNH VIỄN
echo =====================================================================
echo.
echo Hiện tại KINI AI đang chạy ngầm 24/24 qua Cloudflare Quick Tunnel.
echo Nếu anh muốn cố định một đường link hoặc tên miền riêng (ví dụ kini.cuatoi.com)
echo vĩnh viễn không bao giờ thay đổi dù tắt máy hay khởi động lại:
echo.
echo BƯỚC 1: Đăng ký tài khoản Cloudflare miễn phí tại https://dash.cloudflare.com
echo BƯỚC 2: Vào mục Zero Trust -> Networks -> Tunnels -> Create a Tunnel.
echo BƯỚC 3: Chọn Cloudflared và copy chuỗi TOKEN (khoảng 60-80 ký tự).
echo BƯỚC 4: Dán chuỗi TOKEN đó vào bên dưới:
echo.
echo =====================================================================
set /p TOKEN=">> Dán chuỗi Cloudflare Tunnel Token của anh vào đây (hoặc Enter để bỏ qua): "

if not "%TOKEN%"=="" (
    echo %TOKEN% > "%~dp0cloudflare_token.txt"
    echo.
    echo [OK] Đã lưu mã Token cố định vào file cloudflare_token.txt!
    echo Dịch vụ 24/7 của KINI AI sẽ tự động kích hoạt tên miền riêng của anh.
) else (
    echo.
    echo Không có Token nào được nhập. KINI AI vẫn duy trì link online 24/24 tự động.
)

echo.
echo Bấm phím bất kỳ để đóng cửa sổ này...
pause >nul
