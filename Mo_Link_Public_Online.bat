@echo off
chcp 65001 >nul
title KINI AI - Bat Link Online Public Cho Mobile & May Tinh Khac
echo ========================================================
echo       KINI AI - KET NOI ONLINE PUBLIC (CLOUDFLARE)
echo ========================================================
echo.
cd /d "%~dp0"

echo [*] Dang tao duong dan truc tuyen bao mat (HTTPS)...
echo [*] Vui long doi trong giay lat...
echo.
tools\cloudflared.exe tunnel --url http://127.0.0.1:8000
pause
