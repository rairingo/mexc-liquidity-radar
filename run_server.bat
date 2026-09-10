@echo off
cd /d "%~dp0"
python backend\run_server.py
if %errorlevel% neq 0 (
    echo [ERROR] 起動に失敗しました。
    pause
)
