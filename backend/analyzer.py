import os
from typing import Any, Dict, List, Optional, Tuple

MEXC_INVITE_CODE = os.getenv("MEXC_INVITE_CODE", "mexc-radar")

class LiquidityAnalyzer:
    """
    板情報（Orderbook）とローソク足データから、
    損切り密集ライン・雪崩トリガー額・板の不均衡を客観的に算出する計算エンジン
    """

    @staticmethod
    def calculate_swing_levels(klines: List[List[Any]]) -> Dict[str, float]:
        """
        直近のローソク足からスイング安値（サポート）およびスイング高値（レジスタンス）を算出
        klines format: [open_time, open, high, low, close, volume, ...]
        """
        if not klines:
            return {"swing_low": 0.0, "swing_high": 0.0, "stop_loss_long": 0.0, "stop_loss_short": 0.0}

        lows = [float(k[3]) for k in klines]
        highs = [float(k[2]) for k in klines]

        lowest_price = min(lows)
        highest_price = max(highs)

        # 直近ローソク足（最近の波）の局所安値も考慮
        recent_window = min(len(lows), 24) # 直近6時間相当
        recent_lowest = min(lows[-recent_window:])

        # スイング安値（直近安値と24H最安値の加重）
        swing_low = recent_lowest
        swing_high = highest_price

        # 一般的な損切りライン: サポートラインの -0.5% 直下
        stop_loss_long = swing_low * 0.995
        # ショート勢の損切りライン: レジスタンスラインの +0.5% 直上
        stop_loss_short = swing_high * 1.005

        return {
            "swing_low": swing_low,
            "swing_high": swing_high,
            "stop_loss_long": stop_loss_long,
            "stop_loss_short": stop_loss_short,
        }

    @staticmethod
    def calculate_avalanche_cost(
        bids: List[List[str]],
        current_price: float,
        stop_price: float
    ) -> Dict[str, Any]:
        """
        現在価格から損切りライン(stop_price)までに並んでいる買い板の累積金額（USDT）を計算。
        ＝『あと何ドルの成行売りが入れば損切りラインを貫通・雪崩れるか』
        """
        if not bids or current_price <= 0 or stop_price <= 0:
            return {"trigger_cost_usdt": 0.0, "distance_pct": 0.0, "orders_count": 0, "exhausted_book": False}

        distance_pct = ((current_price - stop_price) / current_price) * 100.0

        total_cost_usdt = 0.0
        orders_count = 0
        reached_stop = False

        for row in bids:
            try:
                price = float(row[0])
                qty = float(row[1])
            except (ValueError, IndexError):
                continue

            # 損切りラインより上の買い指値をすべて合算
            if price >= stop_price:
                total_cost_usdt += price * qty
                orders_count += 1
            else:
                reached_stop = True
                break

        return {
            "trigger_cost_usdt": round(total_cost_usdt, 2),
            "distance_pct": round(distance_pct, 2),
            "orders_count": orders_count,
            "exhausted_book": not reached_stop,
        }

    @staticmethod
    def calculate_squeeze_cost(
        asks: List[List[str]],
        current_price: float,
        stop_price_short: float
    ) -> Dict[str, Any]:
        """
        現在価格からショート勢の損切りライン(stop_price_short)までに並んでいる売り板の累積金額（USDT）を計算。
        ＝『あと何ドルの成行買いが入れば天井を貫通・ショート踏み上げ（爆騰）を起こせるか』
        """
        if not asks or current_price <= 0 or stop_price_short <= 0:
            return {"trigger_cost_usdt": 0.0, "distance_pct": 0.0, "orders_count": 0, "exhausted_book": False}

        distance_pct = ((stop_price_short - current_price) / current_price) * 100.0

        total_cost_usdt = 0.0
        orders_count = 0
        reached_stop = False

        for row in asks:
            try:
                price = float(row[0])
                qty = float(row[1])
            except (ValueError, IndexError):
                continue

            # ショート損切りライン以下の売り指値をすべて合算
            if price <= stop_price_short:
                total_cost_usdt += price * qty
                orders_count += 1
            else:
                reached_stop = True
                break

        return {
            "trigger_cost_usdt": round(total_cost_usdt, 2),
            "distance_pct": round(max(0.0, distance_pct), 2),
            "orders_count": orders_count,
            "exhausted_book": not reached_stop,
        }

    @staticmethod
    def calculate_orderbook_imbalance(
        bids: List[List[str]],
        asks: List[List[str]],
        current_price: float,
        range_pct: float = 0.03
    ) -> Dict[str, Any]:
        """
        現在価格の上下 ±range_pct (デフォルト±3%) 内の板厚を合計し、
        買い板と売り板の比率（Imbalance）を算出する。
        """
        if current_price <= 0:
            return {"bid_vol_usdt": 0.0, "ask_vol_usdt": 0.0, "bid_ratio_pct": 50.0}

        min_bid_price = current_price * (1.0 - range_pct)
        max_ask_price = current_price * (1.0 + range_pct)

        bid_vol_usdt = 0.0
        for row in bids:
            try:
                p = float(row[0])
                q = float(row[1])
                if p >= min_bid_price:
                    bid_vol_usdt += p * q
            except (ValueError, IndexError):
                continue

        ask_vol_usdt = 0.0
        for row in asks:
            try:
                p = float(row[0])
                q = float(row[1])
                if p <= max_ask_price:
                    ask_vol_usdt += p * q
            except (ValueError, IndexError):
                continue

        total_vol = bid_vol_usdt + ask_vol_usdt
        bid_ratio_pct = (bid_vol_usdt / total_vol * 100.0) if total_vol > 0 else 50.0

        return {
            "bid_vol_usdt": round(bid_vol_usdt, 2),
            "ask_vol_usdt": round(ask_vol_usdt, 2),
            "bid_ratio_pct": round(bid_ratio_pct, 1),
            "ask_ratio_pct": round(100.0 - bid_ratio_pct, 1),
        }

    @classmethod
    def analyze_symbol(
        cls,
        symbol: str,
        current_price: float,
        volume_24h_usdt: float,
        price_change_24h_pct: float,
        depth: Dict[str, Any],
        klines: Optional[List[List[Any]]] = None,
        swing_low: Optional[float] = None,
        swing_high: Optional[float] = None,
    ) -> Dict[str, Any]:
        """銘柄ごとの総合解析（下落雪崩 ＆ 上昇踏み上げの両方向）"""
        bids = depth.get("bids", [])
        asks = depth.get("asks", [])

        # 1. スイングレベル判定（klinesローソク足があれば直近の波・局所スイングを精密計算、なければ24h高安値で即判定）
        if klines and len(klines) > 0:
            swing = cls.calculate_swing_levels(klines)
            s_low = swing["swing_low"] or (swing_low or 0.0)
            s_high = swing["swing_high"] or (swing_high or 0.0)
            stop_long = swing["stop_loss_long"] or (s_low * 0.995)
            stop_short = swing["stop_loss_short"] or (s_high * 1.005)
        elif swing_low is not None and swing_high is not None and swing_low > 0 and swing_high > 0:
            s_low = swing_low
            s_high = swing_high
            stop_long = s_low * 0.995
            stop_short = s_high * 1.005
        else:
            s_low = current_price * 0.95
            s_high = current_price * 1.05
            stop_long = s_low * 0.995
            stop_short = s_high * 1.005

        # 2. 下落雪崩（ロング損切り）トリガーコスト
        avalanche = cls.calculate_avalanche_cost(bids, current_price, stop_long)

        # 3. 上昇踏み上げ（ショート損切り）トリガーコスト
        squeeze = cls.calculate_squeeze_cost(asks, current_price, stop_short)

        # 4. 板の不均衡（±3%）
        imbalance = cls.calculate_orderbook_imbalance(bids, asks, current_price, range_pct=0.03)

        # 板の健全性チェック（スプレッド & 最良気配の確認）
        best_bid = float(bids[0][0]) if bids else 0.0
        best_ask = float(asks[0][0]) if asks else 0.0
        spread_pct = ((best_ask - best_bid) / current_price * 100.0) if (best_ask > 0 and current_price > 0) else 99.0
        range_24h_pct = ((s_high - s_low) / current_price) if (current_price > 0 and s_high > 0 and s_low > 0) else 0.0

        # ステーブルコイン判定（$1近辺）または動かないバーコードチャート判定
        is_stable_or_barcode = (0.96 <= current_price <= 1.04) or (range_24h_pct < 0.035)

        # --- 5. 下落雪崩: 発生確率スコア & 破壊力スコア ---
        cost_down = avalanche["trigger_cost_usdt"]
        dist_down = avalanche["distance_pct"]
        bid_ratio = imbalance["bid_ratio_pct"]

        # 除外条件: すでに損切りラインを割っている、板蒸発、スプレッド過大、ステーブル/バーコード通貨
        if best_bid <= stop_long or cost_down < 500.0 or spread_pct > 3.5 or dist_down <= 0 or is_stable_or_barcode:
            avalanche_prob = 5.0
            avalanche_impact = 5.0
            vol_ratio_down = 1.0
        else:
            # 発生確率スコア（距離の近さ ＋ 突き崩しやすさ）
            score_down_dist = max(0.0, min(45.0, (6.0 - dist_down) * 9.0))
            score_down_cost = max(0.0, min(35.0, (35000.0 - cost_down) / 1000.0))
            score_down_imb = max(0.0, min(20.0, (50.0 - bid_ratio) * 0.5))
            avalanche_prob = round(max(10.0, min(99.0, score_down_dist + score_down_cost + score_down_imb)), 1)

            # 破壊力スコア（出来高/板厚比 ＋ ボラティリティ）
            vol_ratio_down = round(volume_24h_usdt / cost_down, 1) if cost_down > 0 else 1.0
            # 比率が 20倍で30点、100倍で55点、200倍で70点（満点）
            score_vol_ratio = max(10.0, min(70.0, vol_ratio_down * 0.4))
            score_volatility = max(5.0, min(30.0, abs(price_change_24h_pct) * 2.5))
            avalanche_impact = round(max(10.0, min(99.0, score_vol_ratio + score_volatility)), 1)

        # --- 6. 上昇踏み上げ: 発生確率スコア & 破壊力スコア ---
        cost_up = squeeze["trigger_cost_usdt"]
        dist_up = squeeze["distance_pct"]
        ask_ratio = imbalance["ask_ratio_pct"]

        # 除外条件: すでに天井突破済み、売り板蒸発、スプレッド過大、ステーブル/バーコード通貨
        if best_ask >= stop_short or cost_up < 500.0 or spread_pct > 3.5 or dist_up <= 0 or is_stable_or_barcode:
            squeeze_prob = 5.0
            squeeze_impact = 5.0
            vol_ratio_up = 1.0
        else:
            score_up_dist = max(0.0, min(45.0, (6.0 - dist_up) * 9.0))
            score_up_cost = max(0.0, min(35.0, (35000.0 - cost_up) / 1000.0))
            score_up_imb = max(0.0, min(20.0, (50.0 - ask_ratio) * 0.5))
            squeeze_prob = round(max(10.0, min(99.0, score_up_dist + score_up_cost + score_up_imb)), 1)

            vol_ratio_up = round(volume_24h_usdt / cost_up, 1) if cost_up > 0 else 1.0
            score_vol_ratio_up = max(10.0, min(70.0, vol_ratio_up * 0.4))
            score_volatility_up = max(5.0, min(30.0, abs(price_change_24h_pct) * 2.5))
            squeeze_impact = round(max(10.0, min(99.0, score_vol_ratio_up + score_volatility_up)), 1)

        return {
            "symbol": symbol,
            "current_price": current_price,
            "volume_24h_usdt": volume_24h_usdt,
            "price_change_24h_pct": price_change_24h_pct,
            # 下落雪崩関連
            "swing_low": s_low,
            "stop_loss_price": stop_long,
            "distance_to_stop_pct": avalanche["distance_pct"],
            "avalanche_trigger_cost_usdt": avalanche["trigger_cost_usdt"],
            "avalanche_prob_score": avalanche_prob,
            "avalanche_impact_score": avalanche_impact,
            "risk_score": avalanche_prob, # 互換性維持
            "vol_ratio_down": vol_ratio_down,
            # 上昇踏み上げ関連
            "swing_high": s_high,
            "squeeze_target_price": stop_short,
            "distance_to_high_pct": squeeze["distance_pct"],
            "squeeze_trigger_cost_usdt": squeeze["trigger_cost_usdt"],
            "squeeze_prob_score": squeeze_prob,
            "squeeze_impact_score": squeeze_impact,
            "squeeze_score": squeeze_prob, # 互換性維持
            "vol_ratio_up": vol_ratio_up,
            # 板比率
            "bid_ratio_pct": imbalance["bid_ratio_pct"],
            "ask_ratio_pct": imbalance["ask_ratio_pct"],
            "bid_vol_3pct_usdt": imbalance["bid_vol_usdt"],
            "ask_vol_3pct_usdt": imbalance["ask_vol_usdt"],
            "mexc_trade_url": f"https://www.mexc.com/exchange/{symbol.replace('USDT', '_USDT')}?inviteCode={MEXC_INVITE_CODE}",
        }
