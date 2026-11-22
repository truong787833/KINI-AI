@echo off
chcp 65001 >nul
title KINI AI - Dung Dich Vu 24/24
echo ========================================================
echo       KINI AI - DUNG TIEN TRINH CHAY NGAM
echo ========================================================
echo.
echo [*] Dang dung tien trinh cloudflared.exe va python service...
taskkill /F /IM cloudflared.exe >nul 2>&1
wmic process where "CommandLine like '%%service_24_7.py%%'" call terminate >nul 2>&1
echo [OK] Da dung tat ca tien trinh KINI AI 24/24!
echo.
pause
