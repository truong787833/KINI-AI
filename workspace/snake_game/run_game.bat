@echo off
title Snake Game - KINI AI Agent (Hệ Thống Tự Hành)
cd /d "%~dp0"

echo ===================================================
echo     DANG KHOI CHAY TRO CHOI RAN SAN MOI (KINI AI)
echo ===================================================
echo [*] Khoi chay ngay voi ban giao dien Cyberpunk Zero-Install...
python snake_tkinter.py
if %errorlevel% neq 0 (
    echo [!] Thu chuyen sang ban pygame...
    python main.py
)
