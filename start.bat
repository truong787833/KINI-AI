@echo off
chcp 65001 >nul
title KINI AI Studio - He Thong Tro Ly & Tao Anh Thong Minh
echo ========================================================
echo         KINI AI STUDIO - SAN PHAM TRI TUE NHAN TAO
echo             (AI OS Chuan Antigravity & Gemini)
echo ========================================================
echo.
cd /d "%~dp0"

:: Kiem tra Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Khong tim thay Python tren may cua ban!
    echo [*] Vui long tai va cai dat Python tu: https://www.python.org/downloads/
    echo [*] Luu y: Nho tich chon "Add python.exe to PATH" khi cai dat.
    echo.
    pause
    exit /b 1
)

:: Kiem tra va cai dat thu vien neu thieu
python -c "import fastapi, uvicorn" >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Dang cai dat cac goi thu vien can thiet (chi mat 1-2 phut lan dau)...
    pip install -r requirements.txt
)

echo [*] Dang khoi dong may chu KINI AI tai http://127.0.0.1:8000 ...
echo [*] Trinh duyet se tu dong mo len trong giay lat...
echo.
python run.py
pause
