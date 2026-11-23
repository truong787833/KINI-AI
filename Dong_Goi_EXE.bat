@echo off
chcp 65001 >nul
title KINI AI - Biên Dịch Desktop EXE
cd /d "%~dp0"

echo ================================================================
echo    KINI AI - BIÊN DỊCH BỘ CHẠY DESKTOP WINDOWS (KINI_AI.exe)
echo    Phát triển bởi: Phùng Hải Trường
echo ================================================================
echo.

python tools\build_exe.py

echo.
pause
