@echo off
chcp 65001 >nul
title KINI AI Studio - He Thong Tro Ly & Tao Anh Thong Minh
echo ========================================================
echo         KINI AI STUDIO - SAN PHAM TRI TUE NHAN TAO
echo                 (Gemini Pro + AI Image Flux)
echo ========================================================
echo.
cd /d "H:\KINI_AI"
echo [1/2] Dang kiem tra thu vien Python...
python -m pip install -r requirements.txt --quiet
echo [2/2] Dang khoi dong may chu KINI AI tai http://127.0.0.1:8000 ...
echo.
python run.py
pause
