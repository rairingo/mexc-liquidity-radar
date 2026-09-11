import asyncio
from contextlib import asynccontextmanager
import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, PlainTextResponse, Response, FileResponse
from fastapi.staticfiles import StaticFiles

from mexc_client import MexcClient
from analyzer import LiquidityAnalyzer

logger = logging.getLogger("mexc_radar")
logging.basicConfig(level=logging.INFO)

# メガキャップ（大手主導通貨）および既知ステーブルコイン・合成資産の完全除外リスト
EXCLUDED_SYMBOLS = {
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT",
    "ADAUSDT", "AVAXUSDT", "LINKUSDT", "SUIUSDT", "TONUSDT", "SHIBUSDT",
    "TRXUSDT", "DOTUSDT", "LTCUSDT", "NEARUSDT", "BCHUSDT", "UNIUSDT",
    "APTUSDT", "XLMUSDT", "USDCUSDT", "FDUSDUSDT", "TUSDUSDT", "USDDUSDT",
    "EURUSDT", "DAIUSDT", "WBTCUSDT", "WETHUSDT", "PYUSDUSDT", "USDVUSDT",
    "FRAXUSDT", "LUSDUSDT", "CRVUSDUSDT", "GUSDUSDT", "CUSDUSDT", "XAUTUSDT",
    "PAXGUSDT", "EURSUSDT", "EURTUSDT", "USDEUSDT", "ENAUSDT", "BUSDUSDT",
    "XUSDUSDT", "LEEUSDT", "COPUSDT", "MXNUSDT", "BRLUSDT", "TRYUSDT",
    "USDJUSDT", "USDXUSDT", "USDFUSDT", "MUSDUSDT", "CUSDUSDT", "DJEDUSDT"
}

# 法定通貨・ステーブルコインキーワード（シンボルに含まれる場合に除外）
FIAT_STABLE_KEYWORDS = ["USD", "EUR", "GBP", "JPY", "BRL", "TRY", "AUD", "CAD", "CHF"]

MEXC_INVITE_CODE = os.getenv("MEXC_INVITE_CODE", "3tZTP")

client = MexcClient()

# グローバルメモリ状態（ローテーションワーカーが継続更新）
GLOBAL_STATE: Dict[str, Any] = {
    "items_map": {},      # symbol -> analysis dict
    "target_pool": [],    # 現在の巡回対象リスト
    "futures_symbols": set(), # MEXC先物上場シンボルのセット (例: 'BTC_USDT', 'BTCUSDT')
    "last_ticker_sync": 0.0,
    "last_batch_sync": 0.0,
    "backoff_until": 0.0, # 429検知時のグローバルクールダウン時刻
    "is_running": True,
}

# 巡回設定（MEXC APIレート制限遵守: 1秒あたり3〜4 reqの極めて安全な巡回）
BATCH_SIZE = 3            # 1バッチあたりの並行取得数
BATCH_SLEEP_SECONDS = 1.0 # バッチ間のウェイト（WAFと429を完全に回避）

async def analyze_single_symbol(item: Dict[str, Any], use_klines: bool = False) -> Optional[Dict[str, Any]]:
    symbol = item.get("symbol", "")
    try:
        current_price = float(item.get("lastPrice", 0.0))
        volume_24h = float(item.get("quoteVolume", 0.0))
        price_change_pct = float(item.get("priceChangePercent", 0.0)) * 100.0
        swing_high = float(item.get("highPrice", 0.0))
        swing_low = float(item.get("lowPrice", 0.0))

        if current_price <= 0:
            return None

        # 板情報（Depth）の取得
        depth = await client.get_order_book(symbol, limit=70)

        # 個別詳細ページ等でローソク足併用が指定された場合のみ klines を取得して精密スイング計算
        klines = None
        if use_klines:
            try:
                klines = await client.get_klines(symbol, interval="15m", limit=96)
            except Exception as e_kline:
                logger.debug(f"Failed fetching klines for {symbol}: {e_kline}")

        futures_set = GLOBAL_STATE.get("futures_symbols", set())
        clean_under = symbol.replace("USDT", "_USDT")
        has_fut = (clean_under in futures_set) or (symbol in futures_set) if futures_set else None

        return LiquidityAnalyzer.analyze_symbol(
            symbol=symbol,
            current_price=current_price,
            volume_24h_usdt=volume_24h,
            price_change_24h_pct=price_change_pct,
            depth=depth,
            klines=klines,
            swing_low=swing_low,
            swing_high=swing_high,
            has_futures=has_fut,
        )
    except Exception as e:
        err_str = str(e)
        # 429 Too Many Requests検知時はグローバルバックオフを発動（10秒間全体一時停止）
        if "429" in err_str or "Too Many Requests" in err_str:
            cooldown = 10.0
            GLOBAL_STATE["backoff_until"] = max(GLOBAL_STATE.get("backoff_until", 0.0), time.time() + cooldown)
            logger.warning(f"Rate limit 429 triggered on {symbol}. Global backoff set for {cooldown}s.")
        logger.debug(f"Failed analyzing {symbol}: {e}")
        return None

async def update_target_pool():
    """MEXCから新興草コイン・アルトコインの条件を満たす【全銘柄】をプールに登録"""
    try:
        tickers = await client.get_24hr_tickers()
        filtered = []
        for t in tickers:
            symbol = t.get("symbol", "")
            if symbol in EXCLUDED_SYMBOLS:
                continue

            # レバレッジトークン（3L, 3S, 5L, 5S等）を除外
            base_asset = symbol[:-4] if symbol.endswith("USDT") else symbol
            if any(base_asset.endswith(lev) for lev in ["3L", "3S", "4L", "4S", "5L", "5S"]):
                continue

            try:
                vol = float(t.get("quoteVolume", 0.0))
                last = float(t.get("lastPrice", 0.0))
                high = float(t.get("highPrice", 0.0))
                low = float(t.get("lowPrice", 0.0))

                if last <= 0:
                    continue

                # 1. ステーブルコイン・動かないバーコードチャートの徹底排除
                # $1付近（0.96〜1.04）はドルペグ通貨/ステーブルのため無条件で排除
                if 0.96 <= last <= 1.04:
                    continue

                # ベース名にUSDやEURなどの法定通貨コードが含まれ、価格が0.8〜1.2の範囲にあるものも排除
                if any(kw in base_asset for kw in FIAT_STABLE_KEYWORDS) and (0.8 <= last <= 1.25):
                    continue

                # 24Hの値幅が3.5%未満（動かないバーコードチャート通貨）を排除
                price_range_pct = (high - low) / last
                if price_range_pct < 0.035:
                    continue

                # 2. 出来高2万〜250万USDT（過疎すぎず、メジャーすぎない草コイン全対象）
                if 20000.0 <= vol <= 2500000.0:
                    filtered.append(t)
            except (ValueError, TypeError):
                continue

        # 条件を満たす全銘柄をそのまま監視プールに設定（上限なし）
        GLOBAL_STATE["target_pool"] = filtered
        GLOBAL_STATE["last_ticker_sync"] = time.time()
        logger.info(f"Updated monitoring pool to ALL eligible symbols: {len(GLOBAL_STATE['target_pool'])} symbols")

        # MEXC先物コントラクト一覧を取得してキャッシュ
        try:
            fut_set = await client.get_futures_symbols()
            if fut_set:
                GLOBAL_STATE["futures_symbols"] = fut_set
                logger.info(f"Updated MEXC futures contract cache: {len(fut_set)} symbols")
        except Exception as e_fut:
            logger.warning(f"Failed fetching futures contracts: {e_fut}")

        # 銘柄リストをディスクキャッシュに保存
        try:
            cache_file = Path(__file__).resolve().parent / "pool_cache.json"
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(filtered, f)
        except Exception:
            pass

        # 監視対象外となった古い銘柄をキャッシュから安全にパージ（メモリ健全化）
        valid_symbols = {t.get("symbol") for t in filtered if t.get("symbol")}
        stale_symbols = [s for s in list(GLOBAL_STATE["items_map"].keys()) if s not in valid_symbols]
        for s in stale_symbols:
            GLOBAL_STATE["items_map"].pop(s, None)
        if stale_symbols:
            logger.info(f"Cleaned up {len(stale_symbols)} stale symbols from memory cache")
    except Exception as e:
        logger.error(f"Failed updating target pool: {e}")
        GLOBAL_STATE["backoff_until"] = time.time() + 60.0
        # ディスクキャッシュからの復元を試行
        if not GLOBAL_STATE["target_pool"]:
            try:
                cache_file = Path(__file__).resolve().parent / "pool_cache.json"
                if cache_file.exists():
                    with open(cache_file, "r", encoding="utf-8") as f:
                        cached = json.load(f)
                    if cached:
                        GLOBAL_STATE["target_pool"] = cached
                        logger.info(f"Restored {len(cached)} symbols from disk cache")
            except Exception:
                pass


async def background_rotation_worker():
    """
    バックグラウンドで全対象銘柄を8銘柄ずつ安全なペースで巡回し続けるワーカー
    APIレートリミットを絶対に踏まず、ユーザーのリクエストには即時0msでキャッシュ応答する
    """
    logger.info("Background rotation worker started.")
    await update_target_pool()

    while GLOBAL_STATE["is_running"]:
        # グローバルバックオフ（429検知後のクールダウン）待機
        now = time.time()
        if GLOBAL_STATE.get("backoff_until", 0.0) > now:
            wait_time = GLOBAL_STATE["backoff_until"] - now
            logger.warning(f"Rate limit backoff active. Pausing worker for {wait_time:.1f}s")
            await asyncio.sleep(wait_time)

        pool = list(GLOBAL_STATE["target_pool"])
        if not pool:
            await asyncio.sleep(10.0)
            await update_target_pool()
            continue

        # 8銘柄ずつチャンク分割してローテーション
        for i in range(0, len(pool), BATCH_SIZE):
            if not GLOBAL_STATE["is_running"]:
                break

            # バッチ実行前にもバックオフチェック
            now = time.time()
            if GLOBAL_STATE.get("backoff_until", 0.0) > now:
                wait_time = GLOBAL_STATE["backoff_until"] - now
                logger.warning(f"Batch pause for backoff: {wait_time:.1f}s")
                await asyncio.sleep(wait_time)

            batch = pool[i : i + BATCH_SIZE]
            tasks = [analyze_single_symbol(item) for item in batch]
            results = await asyncio.gather(*tasks)

            for res in results:
                if res:
                    GLOBAL_STATE["items_map"][res["symbol"]] = res

            GLOBAL_STATE["last_batch_sync"] = time.time()
            await asyncio.sleep(BATCH_SLEEP_SECONDS)

        # 1周巡回したら、5分おきにティッカー全体の最新ランキングを再同期
        if time.time() - GLOBAL_STATE["last_ticker_sync"] > 300.0:
            await update_target_pool()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時
    worker_task = asyncio.create_task(background_rotation_worker())
    yield
    # 終了時
    GLOBAL_STATE["is_running"] = False
    worker_task.cancel()


app = FastAPI(
    title="MEXC Liquidity & Avalanche Radar",
    description="MEXC現物アルトコインの板不均衡・損切り雪崩＆踏み上げリアルタイム監視システム",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/scan")
async def scan_market(
    mode: str = Query("all", description="'all'(総合ミックス), 'avalanche'(下落雪崩のみ), 'squeeze'(上昇踏み上げのみ)"),
    sort_by: str = Query("composite", description="'composite'(総合スコア降順), 'prob'(発生確率降順), 'impact'(破壊力降順), 'cost'(所要資金昇順)"),
) -> Dict[str, Any]:
    """
    バックグラウンド巡回ワーカーが集計した最新データを即時返却（待ち時間0ms）
    両方向（下落雪崩 ＆ 上昇踏み上げ）を統合し、総合期待値スコア(Composite EV)等をデフォルト提供
    """
    import math

    raw_items = list(GLOBAL_STATE["items_map"].values())

    # 初回起動直後でまだデータが少ない場合は、初期バッチを同期取得
    if len(raw_items) < 10 and GLOBAL_STATE["target_pool"]:
        first_batch = GLOBAL_STATE["target_pool"][:15]
        tasks = [analyze_single_symbol(item) for item in first_batch]
        initial_results = await asyncio.gather(*tasks)
        for res in initial_results:
            if res:
                GLOBAL_STATE["items_map"][res["symbol"]] = res
        raw_items = list(GLOBAL_STATE["items_map"].values())

    processed_items = []
    for item in raw_items:
        r_prob = item.get("avalanche_prob_score", 5.0)
        s_prob = item.get("squeeze_prob_score", 5.0)
        r_impact = item.get("avalanche_impact_score", 5.0)
        s_impact = item.get("squeeze_impact_score", 5.0)
        r_comp = item.get("avalanche_composite_score", round(math.sqrt(r_prob * r_impact), 1))
        s_comp = item.get("squeeze_composite_score", round(math.sqrt(s_prob * s_impact), 1))
        r_cost = item.get("avalanche_trigger_cost_usdt", 0.0)
        s_cost = item.get("squeeze_trigger_cost_usdt", 0.0)

        # 総合期待値スコアまたは確率を比較して優位な方向を選択
        if r_cost > 0 and s_cost > 0:
            use_avalanche = (r_comp >= s_comp) if (r_comp != s_comp) else (r_prob >= s_prob)
        elif r_cost > 0:
            use_avalanche = True
        elif s_cost > 0:
            use_avalanche = False
        else:
            use_avalanche = (r_comp >= s_comp)

        if use_avalanche:
            opp_side = "avalanche"
            opp_prob = r_prob
            opp_impact = r_impact
            opp_comp = r_comp
            opp_cost = max(30.0, r_cost)
            opp_dist = max(0.2, item.get("distance_to_stop_pct", 1.0))
            opp_target = item.get("stop_loss_price", item.get("current_price", 0.0) * 0.985)
            opp_vol_ratio = item.get("vol_ratio_down", 1.0)
        else:
            opp_side = "squeeze"
            opp_prob = s_prob
            opp_impact = s_impact
            opp_comp = s_comp
            opp_cost = max(30.0, s_cost)
            opp_dist = max(0.2, item.get("distance_to_high_pct", 1.0))
            opp_target = item.get("squeeze_target_price", item.get("current_price", 0.0) * 1.015)
            opp_vol_ratio = item.get("vol_ratio_up", 1.0)

        enriched = dict(item)
        sym = item.get("symbol", "")
        clean_under = sym.replace("USDT", "_USDT")
        fut_set = GLOBAL_STATE.get("futures_symbols", set())
        has_fut = (clean_under in fut_set) or (sym in fut_set) if fut_set else item.get("has_futures", True)
        mexc_url = (
            f"https://futures.mexc.com/exchange/{clean_under}?inviteCode={MEXC_INVITE_CODE}"
            if has_fut
            else f"https://www.mexc.com/exchange/{clean_under}?inviteCode={MEXC_INVITE_CODE}"
        )
        enriched["has_futures"] = has_fut
        enriched["mexc_trade_url"] = mexc_url
        enriched["opportunity_side"] = opp_side
        enriched["opportunity_prob"] = opp_prob
        enriched["opportunity_impact"] = opp_impact
        enriched["opportunity_composite"] = opp_comp
        enriched["opportunity_score"] = opp_comp # 互換性および総合スコアをプライマリに設定
        enriched["opportunity_cost"] = round(opp_cost, 2)
        enriched["opportunity_distance"] = round(opp_dist, 2)
        enriched["opportunity_target"] = opp_target
        enriched["opportunity_vol_ratio"] = opp_vol_ratio
        processed_items.append(enriched)

    # モードによる絞り込み
    if mode == "avalanche":
        items = [x for x in processed_items if x["opportunity_side"] == "avalanche"]
    elif mode == "squeeze":
        items = [x for x in processed_items if x["opportunity_side"] == "squeeze"]
    else:  # 'all' (デフォルト)
        items = processed_items

    # ソート順の適用
    if sort_by == "prob":
        items.sort(key=lambda x: x["opportunity_prob"], reverse=True)
    elif sort_by == "impact":
        items.sort(key=lambda x: x["opportunity_impact"], reverse=True)
    elif sort_by == "cost":
        items.sort(key=lambda x: x["opportunity_cost"])
    else:  # "composite" (デフォルト: 総合期待値スコア降順)
        items.sort(key=lambda x: x["opportunity_composite"], reverse=True)

    return {
        "count": len(items),
        "total_monitored": len(GLOBAL_STATE["target_pool"]),
        "updated_at": GLOBAL_STATE["last_batch_sync"] or time.time(),
        "mode": mode,
        "sort_by": sort_by,
        "items": items,
    }


# =========================================================================
# SEO & SSR Endpoints (クローラー・検索エンジン最適化 & パーマリンク)
# =========================================================================

frontend_dir = Path(__file__).resolve().parent.parent / "frontend"

@app.api_route("/favicon.ico", methods=["GET", "HEAD"], include_in_schema=False)
@app.api_route("/favicon.svg", methods=["GET", "HEAD"], include_in_schema=False)
async def get_favicon():
    fav_path = frontend_dir / "favicon.svg"
    if fav_path.exists():
        return FileResponse(fav_path, media_type="image/svg+xml")
    raise HTTPException(status_code=404, detail="Favicon not found")


@app.api_route("/robots.txt", methods=["GET", "HEAD"], response_class=PlainTextResponse)
async def robots_txt(request: Request):
    """Google等のクローラー巡回を歓迎し、動的sitemap.xmlへ誘導"""
    base_url = "https://mexc-liquidity-radar.duckdns.org"
    return f"User-agent: *\nAllow: /\n\nSitemap: {base_url}/sitemap.xml\n"


@app.api_route("/sitemap.xml", methods=["GET", "HEAD"])
async def sitemap_xml(request: Request):
    """全監視銘柄（約700〜1,000件）の個別URLを動的生成したXMLサイトマップ"""
    base_url = "https://mexc-liquidity-radar.duckdns.org"

    symbols = [t.get("symbol") for t in GLOBAL_STATE["target_pool"] if t.get("symbol")]
    # キャッシュ済みのシンボルも補完
    symbols = sorted(list(set(symbols + list(GLOBAL_STATE["items_map"].keys()))))

    urls = [
        f"  <url>\n    <loc>{base_url}/</loc>\n    <changefreq>always</changefreq>\n    <priority>1.0</priority>\n  </url>",
        f"  <url>\n    <loc>{base_url}/methodology</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>",
        f"  <url>\n    <loc>{base_url}/screener/under-1000-trigger</loc>\n    <changefreq>hourly</changefreq>\n    <priority>0.9</priority>\n  </url>",
        f"  <url>\n    <loc>{base_url}/screener/high-squeeze-alert</loc>\n    <changefreq>hourly</changefreq>\n    <priority>0.9</priority>\n  </url>",
        f"  <url>\n    <loc>{base_url}/screener/long-liquidation-cascade</loc>\n    <changefreq>hourly</changefreq>\n    <priority>0.9</priority>\n  </url>",
    ]

    import urllib.parse

    for sym in symbols:
        # 中国語や特殊文字を含むミームコインを正しくURLエンコード
        encoded_sym = urllib.parse.quote(sym, safe="")
        urls.append(
            f"  <url>\n    <loc>{base_url}/pair/{encoded_sym}</loc>\n    <changefreq>hourly</changefreq>\n    <priority>0.7</priority>\n  </url>"
        )

    xml_content = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>"
    )
    return Response(content=xml_content, media_type="application/xml")


@app.get("/screener/{category}", response_class=HTMLResponse)
async def screener_category_page(category: str):
    """特化型ロングテール検索（例: under-1000-trigger, high-squeeze）のSEO受け皿"""
    index_path = frontend_dir / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="Screener page not found")


@app.get("/methodology", response_class=HTMLResponse)
async def methodology_page():
    """学術・技術検索クエリに対応する独立した仕様・数式定義ページ"""
    method_path = frontend_dir / "methodology.html"
    if method_path.exists():
        return FileResponse(method_path)
    raise HTTPException(status_code=404, detail="Methodology page not found")


@app.get("/pair/{symbol}", response_class=HTMLResponse)
async def pair_detail_page(symbol: str, request: Request):
    """
    個別銘柄のSSRパーマリンク（Server-Side Rendered HTML）
    クローラーがJSを実行しなくても最新の板情報・損切りコスト・Schema.org構造化データを即座にインデックス可能
    """
    sym_clean = symbol.strip().upper()
    item = GLOBAL_STATE["items_map"].get(sym_clean)

    # 対象銘柄のティッカー情報を取得
    target_ticker = next((t for t in GLOBAL_STATE["target_pool"] if t.get("symbol") == sym_clean), None)
    if not target_ticker:
        try:
            tickers = await client.get_24hr_tickers()
            target_ticker = next((x for x in tickers if x.get("symbol") == sym_clean), None)
        except Exception:
            pass

    # 個別ページ表示時は、15m足ローソク足（klines）を併用した精密スイング分析をオンデマンド実行
    if target_ticker:
        precision_item = await analyze_single_symbol(target_ticker, use_klines=True)
        if precision_item:
            item = precision_item
            GLOBAL_STATE["items_map"][sym_clean] = precision_item

    if not item:
        raise HTTPException(status_code=404, detail=f"Pair {sym_clean} not found or not eligible")

    # テンプレート読み込み
    pair_tmpl_path = frontend_dir / "pair.html"
    if not pair_tmpl_path.exists():
        raise HTTPException(status_code=500, detail="Pair template missing")

    template_html = pair_tmpl_path.read_text(encoding="utf-8")

    # パラメータ整形
    current_price = item.get("current_price", 0.0)
    change_pct = item.get("price_change_24h_pct", 0.0)
    r_prob = item.get("avalanche_prob_score", 5.0)
    s_prob = item.get("squeeze_prob_score", 5.0)

    is_squeeze = s_prob > r_prob
    prob_score = s_prob if is_squeeze else r_prob
    impact_score = item.get("squeeze_impact_score" if is_squeeze else "avalanche_impact_score", 5.0)
    import math
    comp_score = item.get("squeeze_composite_score" if is_squeeze else "avalanche_composite_score", round(math.sqrt(prob_score * impact_score), 1))
    trigger_cost = item.get("squeeze_trigger_cost_usdt" if is_squeeze else "avalanche_trigger_cost_usdt", 0.0)
    distance = item.get("distance_to_high_pct" if is_squeeze else "distance_to_stop_pct", 0.0)
    target_price = item.get("squeeze_target_price" if is_squeeze else "stop_loss_price", 0.0)

    opp_type_text = "SHORT SQUEEZE BREAKOUT" if is_squeeze else "LONG LIQUIDATION CASCADE"
    opp_tag_class = "tag-short" if is_squeeze else "tag-long"
    cost_panel_class = "panel-up" if is_squeeze else "panel-down"
    cost_title = "⚡ Capital to Pierce Resistance" if is_squeeze else "💥 Capital to Break Support"
    dist_sign = "+" if is_squeeze else "-"
    change_sign = "+" if change_pct >= 0 else ""
    change_color = "var(--tv-green)" if change_pct >= 0 else "var(--tv-red)"

    desc_action = (
        f"Only ${trigger_cost:,.2f} USDT of aggressive market buying is needed to pierce key resistance at ${target_price:,.6f}, triggering short liquidations."
        if is_squeeze
        else f"Only ${trigger_cost:,.2f} USDT of aggressive market selling is needed to pierce key support at ${target_price:,.6f}, triggering long stop loss cascades."
    )

    meta_title = f"{sym_clean} Liquidity Depth & {opp_type_text} Radar | MEXC Terminal"
    meta_desc = f"{sym_clean} orderbook analysis: Current price ${current_price}. {desc_action} Composite EV: {comp_score}/99, Probability: {prob_score}/99, Impact: {impact_score}/99."

    canonical_url = f"https://mexc-liquidity-radar.duckdns.org/pair/{sym_clean}"

    # 置換マッピング
    replacements = {
        "{{TITLE}}": meta_title,
        "{{DESCRIPTION}}": meta_desc,
        "{{CANONICAL_URL}}": canonical_url,
        "{{SYMBOL}}": sym_clean,
        "{{PRICE}}": f"{current_price:,.6f}" if current_price < 1 else f"{current_price:,.4f}",
        "{{CHANGE_PCT}}": f"{abs(change_pct):.2f}",
        "{{CHANGE_SIGN}}": change_sign,
        "{{CHANGE_COLOR}}": change_color,
        "{{OPP_TYPE_TEXT}}": opp_type_text,
        "{{OPP_TAG_CLASS}}": opp_tag_class,
        "{{COST_PANEL_CLASS}}": cost_panel_class,
        "{{COST_TITLE}}": cost_title,
        "{{DIST_SIGN}}": dist_sign,
        "{{DISTANCE}}": f"{distance:.2f}",
        "{{TRIGGER_COST}}": f"{trigger_cost:,.2f}",
        "{{TRIGGER_DESC}}": desc_action,
        "{{TARGET_PRICE}}": f"{target_price:,.6f}" if target_price < 1 else f"{target_price:,.4f}",
        "{{HIGH_PRICE}}": f"{item.get('swing_high', 0.0):,.4f}",
        "{{LOW_PRICE}}": f"{item.get('swing_low', 0.0):,.4f}",
        "{{COMPOSITE_SCORE}}": f"{comp_score}",
        "{{VOLUME_24H}}": f"{item.get('volume_24h_usdt', 0.0):,.2f}",
        "{{BID_RATIO}}": f"{item.get('bid_ratio_pct', 50.0):.1f}",
        "{{ASK_RATIO}}": f"{item.get('ask_ratio_pct', 50.0):.1f}",
        "{{PROB_SCORE}}": f"{prob_score}",
        "{{MEXC_URL}}": (
            item.get("mexc_trade_url")
            or (
                f"https://futures.mexc.com/exchange/{sym_clean.replace('USDT', '_USDT')}?inviteCode={MEXC_INVITE_CODE}"
                if ((sym_clean.replace("USDT", "_USDT") in GLOBAL_STATE.get("futures_symbols", set())) or (sym_clean in GLOBAL_STATE.get("futures_symbols", set())))
                else f"https://www.mexc.com/exchange/{sym_clean.replace('USDT', '_USDT')}?inviteCode={MEXC_INVITE_CODE}"
            )
        ),
    }

    rendered_html = template_html
    for placeholder, val in replacements.items():
        rendered_html = rendered_html.replace(placeholder, str(val))

    return HTMLResponse(content=rendered_html)


# フロントエンド静的ファイルのホスティング
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

