import os
from typing import Any, Dict, List, Optional, Tuple

MEXC_INVITE_CODE = os.getenv("MEXC_INVITE_CODE", "3tZTP")

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
        if not bids or current_price <= 0:
            return {"trigger_cost_usdt": 100.0, "distance_pct": 1.0, "orders_count": 0, "exhausted_book": False, "adjusted_stop": stop_price}

        # 最良買い気配の取得
        try:
            best_bid_p = float(bids[0][0])
            best_bid_q = float(bids[0][1])
            min_physical_cost = max(20.0, round(best_bid_p * best_bid_q, 2))
        except (ValueError, IndexError):
            best_bid_p = current_price
            min_physical_cost = 50.0

        # 目標価格が現在価格以上、または最良気配より高い場合（新安値ブレイク中）
        # → 次なる雪崩れ目標として現在価格の -1.5% 直下を動的設定
        effective_stop = stop_price
        if effective_stop >= current_price or effective_stop >= best_bid_p:
            effective_stop = current_price * 0.985

        distance_pct = max(0.15, ((current_price - effective_stop) / current_price) * 100.0)

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
            if price >= effective_stop:
                total_cost_usdt += price * qty
                orders_count += 1
            else:
                reached_stop = True
                break

        # どんなに薄くても最低保証コスト（最良気配1枚分）は必ず必要
        final_cost = max(min_physical_cost, total_cost_usdt)

        # もし板が薄すぎて70本でもeffective_stopに届かなかった場合、板の平均厚みから外挿補正
        if not reached_stop and orders_count > 0:
            last_price = float(bids[-1][0])
            covered_dist = ((current_price - last_price) / current_price) * 100.0
            if covered_dist > 0 and distance_pct > covered_dist:
                ratio = distance_pct / covered_dist
                final_cost = max(final_cost, total_cost_usdt * min(3.0, ratio))

        return {
            "trigger_cost_usdt": round(final_cost, 2),
            "distance_pct": round(distance_pct, 2),
            "orders_count": max(1, orders_count),
            "exhausted_book": not reached_stop,
            "adjusted_stop": effective_stop,
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
        if not asks or current_price <= 0:
            return {"trigger_cost_usdt": 100.0, "distance_pct": 1.0, "orders_count": 0, "exhausted_book": False, "adjusted_stop": stop_price_short}

        # 最良売り気配の取得
        try:
            best_ask_p = float(asks[0][0])
            best_ask_q = float(asks[0][1])
            min_physical_cost = max(20.0, round(best_ask_p * best_ask_q, 2))
        except (ValueError, IndexError):
            best_ask_p = current_price
            min_physical_cost = 50.0

        # 目標価格が現在価格以下、または最良売り気配より低い場合（新高値ブレイク中）
        # → 次なる踏み上げ目標として現在価格の +1.5% 直上を動的設定
        effective_stop = stop_price_short
        if effective_stop <= current_price or effective_stop <= best_ask_p:
            effective_stop = current_price * 1.015

        distance_pct = max(0.15, ((effective_stop - current_price) / current_price) * 100.0)

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
            if price <= effective_stop:
                total_cost_usdt += price * qty
                orders_count += 1
            else:
                reached_stop = True
                break

        final_cost = max(min_physical_cost, total_cost_usdt)

        # もし板が薄すぎて70本でもeffective_stopに届かなかった場合、外挿補正
        if not reached_stop and orders_count > 0:
            last_price = float(asks[-1][0])
            covered_dist = ((last_price - current_price) / current_price) * 100.0
            if covered_dist > 0 and distance_pct > covered_dist:
                ratio = distance_pct / covered_dist
                final_cost = max(final_cost, total_cost_usdt * min(3.0, ratio))

        return {
            "trigger_cost_usdt": round(final_cost, 2),
            "distance_pct": round(distance_pct, 2),
            "orders_count": max(1, orders_count),
            "exhausted_book": not reached_stop,
            "adjusted_stop": effective_stop,
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

        # ステーブルコイン判定（USDC, FDUSD等のペグ通貨: $0.985〜$1.015 かつ 24hレンジ1%未満）または完全な無風銘柄（24hレンジ0.5%未満）
        is_pegged_stable = (0.985 <= current_price <= 1.015) and (range_24h_pct < 0.01)
        is_flat_barcode = (range_24h_pct < 0.005)
        is_stable_or_barcode = is_pegged_stable or is_flat_barcode

        # --- 5. 下落雪崩: 発生確率スコア & 破壊力スコア ---
        cost_down = avalanche["trigger_cost_usdt"]
        dist_down = avalanche["distance_pct"]
        bid_ratio = imbalance["bid_ratio_pct"]

        # 除外条件: スプレッド過大(>5%)、動かないステーブル/バーコード通貨
        if cost_down <= 0 or spread_pct > 5.0 or dist_down <= 0 or is_stable_or_barcode:
            avalanche_prob = 5.0
            avalanche_impact = 5.0
            vol_ratio_down = 1.0
            avalanche_composite = 5.0
        else:
            # 1分間あたりの平均出来高（USDT）
            vol_1m = max(100.0, volume_24h_usdt / 1440.0)
            
            # 【無次元化 コスト因子 λ_cost】
            # 「貫通に必要な板の厚みが、平均して何分間の市場出来高に相当するか」
            # 1分未満で貫通できるならλ<=1（薄い・高確率）、30分以上かかるならλ>=30（極厚の壁）
            lambda_cost_down = cost_down / vol_1m
            # 対数スケーリングで 0.0 〜 1.0 に正規化（λ=0で1.0、λ>=30で0.0）
            import math
            norm_cost_down = max(0.0, min(1.0, 1.0 - (math.log(1.0 + min(30.0, lambda_cost_down)) / math.log(31.0))))

            # 【無次元化 距離因子 κ_dist】
            # 日中レンジ（高値-安値%）に対する損切りラインまでの距離の比率（無次元化）
            base_range_pct = max(3.0, range_24h_pct * 100.0)
            norm_dist_down = max(0.0, min(1.0, 1.0 - (dist_down / base_range_pct)))

            # 【無次元化 板不均衡因子 f_imb】
            # 売り優勢（買い板が50%未満）な度合いを 0.0 〜 1.0 に正規化
            norm_imb_down = max(0.0, min(1.0, (50.0 - bid_ratio) / 50.0))

            # 無次元正規化スコアの加重合成（距離40% + コスト40% + 不均衡20%）
            weighted_prob_down = (0.40 * norm_dist_down) + (0.40 * norm_cost_down) + (0.20 * norm_imb_down)
            avalanche_prob = round(10.0 + (89.0 * weighted_prob_down), 1)

            # 破壊力スコア (10-99点): 24h出来高に対して板がどれだけ薄いか（流動性の真空度）
            vol_ratio_down = round(volume_24h_usdt / cost_down, 1) if cost_down > 0 else 1.0
            log_ratio = math.log10(max(1.0, vol_ratio_down))
            score_ratio_down = max(10.0, min(75.0, log_ratio * 26.0))
            score_volatility_down = max(5.0, min(24.0, abs(price_change_24h_pct) * 2.0))
            avalanche_impact = round(max(10.0, min(99.0, score_ratio_down + score_volatility_down)), 1)

            # 【総合期待値スコア (Composite EV Score)】
            # 確率(P) × 破壊力(I) の幾何平均（相乗平均）により、両方高い優良機会を最大評価
            avalanche_composite = round(math.sqrt(avalanche_prob * avalanche_impact), 1)

        # --- 6. 上昇踏み上げ: 発生確率スコア & 破壊力スコア ---
        cost_up = squeeze["trigger_cost_usdt"]
        dist_up = squeeze["distance_pct"]
        ask_ratio = imbalance["ask_ratio_pct"]

        # 除外条件: スプレッド過大(>5%)、動かないステーブル/バーコード通貨
        if cost_up <= 0 or spread_pct > 5.0 or dist_up <= 0 or is_stable_or_barcode:
            squeeze_prob = 5.0
            squeeze_impact = 5.0
            vol_ratio_up = 1.0
            squeeze_composite = 5.0
        else:
            vol_1m = max(100.0, volume_24h_usdt / 1440.0)
            lambda_cost_up = cost_up / vol_1m
            import math
            norm_cost_up = max(0.0, min(1.0, 1.0 - (math.log(1.0 + min(30.0, lambda_cost_up)) / math.log(31.0))))

            base_range_pct = max(3.0, range_24h_pct * 100.0)
            norm_dist_up = max(0.0, min(1.0, 1.0 - (dist_up / base_range_pct)))

            # 買い優勢（売り板が50%未満）な度合いを 0.0 〜 1.0 に正規化
            norm_imb_up = max(0.0, min(1.0, (50.0 - ask_ratio) / 50.0))

            weighted_prob_up = (0.40 * norm_dist_up) + (0.40 * norm_cost_up) + (0.20 * norm_imb_up)
            squeeze_prob = round(10.0 + (89.0 * weighted_prob_up), 1)

            vol_ratio_up = round(volume_24h_usdt / cost_up, 1) if cost_up > 0 else 1.0
            log_ratio_up = math.log10(max(1.0, vol_ratio_up))
            score_ratio_up = max(10.0, min(75.0, log_ratio_up * 26.0))
            score_volatility_up = max(5.0, min(24.0, abs(price_change_24h_pct) * 2.0))
            squeeze_impact = round(max(10.0, min(99.0, score_ratio_up + score_volatility_up)), 1)

            # 【総合期待値スコア (Composite EV Score)】
            squeeze_composite = round(math.sqrt(squeeze_prob * squeeze_impact), 1)

        return {
            "symbol": symbol,
            "current_price": current_price,
            "volume_24h_usdt": volume_24h_usdt,
            "price_change_24h_pct": price_change_24h_pct,
            # 下落雪崩関連
            "swing_low": s_low,
            "stop_loss_price": avalanche.get("adjusted_stop", stop_long),
            "distance_to_stop_pct": avalanche["distance_pct"],
            "avalanche_trigger_cost_usdt": avalanche["trigger_cost_usdt"],
            "avalanche_prob_score": avalanche_prob,
            "avalanche_impact_score": avalanche_impact,
            "avalanche_composite_score": avalanche_composite,
            "risk_score": avalanche_prob,
            "vol_ratio_down": vol_ratio_down,
            # 上昇踏み上げ関連
            "swing_high": s_high,
            "squeeze_target_price": squeeze.get("adjusted_stop", stop_short),
            "distance_to_high_pct": squeeze["distance_pct"],
            "squeeze_trigger_cost_usdt": squeeze["trigger_cost_usdt"],
            "squeeze_prob_score": squeeze_prob,
            "squeeze_impact_score": squeeze_impact,
            "squeeze_composite_score": squeeze_composite,
            "squeeze_score": squeeze_prob,
            "vol_ratio_up": vol_ratio_up,
            # 板比率
            "bid_ratio_pct": imbalance["bid_ratio_pct"],
            "ask_ratio_pct": imbalance["ask_ratio_pct"],
            "bid_vol_3pct_usdt": imbalance["bid_vol_usdt"],
            "ask_vol_3pct_usdt": imbalance["ask_vol_usdt"],
            "mexc_trade_url": f"https://www.mexc.com/exchange/{symbol.replace('USDT', '_USDT')}?inviteCode={MEXC_INVITE_CODE}",
        }
