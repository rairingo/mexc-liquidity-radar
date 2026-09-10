import asyncio
import logging
from typing import Any, Dict, List, Optional
import httpx

logger = logging.getLogger("mexc_client")
logging.basicConfig(level=logging.INFO)

MEXC_BASE_URL = "https://api.mexc.com"

class MexcClient:
    def __init__(self, timeout: float = 6.0):
        self.timeout = timeout
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive",
        }
        # コネクションプール（TCP/SSL再接続オーバーヘッドを完全排除）
        self.limits = httpx.Limits(max_keepalive_connections=50, max_connections=100)
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                headers=self.headers,
                timeout=self.timeout,
                limits=self.limits,
                http2=False,
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def get_24hr_tickers(self) -> List[Dict[str, Any]]:
        """全現物銘柄の24時間統計を取得し、USDTペアのみを抽出して返す"""
        url = f"{MEXC_BASE_URL}/api/v3/ticker/24hr"
        client = self._get_client()
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list):
            return [
                item for item in data
                if isinstance(item, dict) and item.get("symbol", "").endswith("USDT")
            ]
        return []

    async def get_order_book(self, symbol: str, limit: int = 70) -> Dict[str, Any]:
        """板情報（Depth: bids, asks）を高速取得"""
        url = f"{MEXC_BASE_URL}/api/v3/depth"
        params = {"symbol": symbol, "limit": limit}
        client = self._get_client()
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()

    async def get_klines(self, symbol: str, interval: str = "15m", limit: int = 96) -> List[List[Any]]:
        """ローソク足データを取得（必要時のみ）"""
        url = f"{MEXC_BASE_URL}/api/v3/klines"
        params = {"symbol": symbol, "interval": interval, "limit": limit}
        client = self._get_client()
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()
