import os
import socket
import sys
import threading
import time
import webbrowser
from pathlib import Path
import uvicorn

def find_available_port(start_port: int = 8000, max_port: int = 8020) -> int:
    """ポートが塞がっている場合に空いているポートを自動検出"""
    for port in range(start_port, max_port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
    return start_port

def open_browser(port: int):
    """サーバー起動完了に合わせてブラウザを自動オープン"""
    time.sleep(1.5)
    url = f"http://127.0.0.1:{port}"
    print(f"\n[INFO] ブラウザを自動的に開きます: {url}")
    webbrowser.open(url)

def main():
    backend_dir = Path(__file__).resolve().parent
    os.chdir(str(backend_dir))
    sys.path.insert(0, str(backend_dir))

    port = find_available_port(8000)

    print("=" * 60)
    print("    MEXC板監視レーダー (Liquidity & Avalanche Radar)")
    print("=" * 60)
    print(f"ローカルWebサーバーを起動中: http://127.0.0.1:{port}")
    print("※ 終了するにはこの画面で Ctrl + C を押してください。\n")

    # 別スレッドでブラウザを自動起動
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()

    # Uvicornサーバー起動
    uvicorn.run("app:app", host="127.0.0.1", port=port, log_level="info")

if __name__ == "__main__":
    main()
