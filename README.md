# MEXC Liquidity Terminal (Orderbook Radar & Liquidation Screener)

[![Live Terminal](https://img.shields.io/badge/Live%20Terminal-mexc--liquidity--radar.duckdns.org-22c55e?style=for-the-badge&logo=google-chrome)](https://mexc-liquidity-radar.duckdns.org/)
[![MEXC Discount](https://img.shields.io/badge/MEXC%20Fee%20Discount-Code%3A%203tZTP-f59e0b?style=for-the-badge&logo=bitcoin)](https://www.mexc.com/register?inviteCode=3tZTP)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Languages](https://img.shields.io/badge/Languages-EN%20%7C%20JA%20%7C%20ZH%20%7C%20KO%20%7C%20ES%20%7C%20VI-blue?style=for-the-badge)

A high-performance, real-time quantitative terminal that scans over **1,000+ MEXC spot altcoin orderbooks** to detect structural liquidity traps, stop-loss cluster zones, and trigger capital requirements for **long liquidation cascades** and **short squeeze breakouts**.

---

## 🌐 Live Web Terminal

Access the live production instance directly in your browser:
👉 **[https://mexc-liquidity-radar.duckdns.org/](https://mexc-liquidity-radar.duckdns.org/)**

* **Live Methodology & Mathematical Formulations**: [https://mexc-liquidity-radar.duckdns.org/methodology](https://mexc-liquidity-radar.duckdns.org/methodology)
* **Official MEXC Fee Discount Sign-up**: [Register with Invite Code: 3tZTP](https://www.mexc.com/register?inviteCode=3tZTP) (Permanent fee discount & deposit rebate)

---

## 🚀 Key Features

1. **Cumulative Depth Trigger Cost (USDT)**
   - Computes the exact net market order capital required to consume all resting limit orders up to key 24h swing support/resistance levels.
   - Reveals how few USDT are needed to trigger massive stop-loss cascades or short squeezes.
2. **Dual-Score Quantitative Model**
   - **🎯 Breakout Probability (0-99)**: Combines proximity to barrier, low capital barrier, and depth asymmetry.
   - **💣 Impact Multiplier (0-99)**: Measures liquidity trap severity by comparing 24h turnover against fragile orderbook walls.
3. **TradingView-Inspired Financial UI**
   - Solid, pixel-perfect financial terminal aesthetics without distracting AI glow or clutter.
   - High-density screener table & grid view with real-time audio chimes on breakout alerts.
4. **Instant 1-Click Discord & Telegram Share Snapshots**
   - Real-time Canvas-rendered financial report cards and formatted alert text for direct copy-pasting into trading rooms.
5. **Full SEO Architecture (SSR & Dynamic Sitemaps)**
   - Individual Server-Side Rendered (SSR) permalinks (`/pair/{symbol}`) for 1,000+ pairs with JSON-LD Schema.org structured data.
   - Dynamic `/sitemap.xml` and `/robots.txt` for automatic search engine indexing.
6. **Multi-Language Support (i18n)**
   - Default English (EN), Japanese (JA), Simplified Chinese (ZH), Korean (KO), Spanish (ES), and Vietnamese (VI).

---

## 💻 Quick Start (Local Run)

```bash
# Clone the repository
git clone https://github.com/rairingo/mexc-liquidity-radar.git
cd mexc-liquidity-radar

# Install dependencies
pip install -r backend/requirements.txt

# Run the terminal launcher (or run run_server.bat on Windows)
python backend/run_server.py
```
Visit `http://localhost:8000` in your browser.

---

## 📐 Quantitative Methodology

For detailed mathematical specifications, depth integration equations, and stop-loss clustering algorithms, visit `/methodology` on the live instance or read the documentation.

---

## 🎁 MEXC Fee Rebates & Partner Program

If you trade on MEXC, sign up using our official partner code to receive **permanent trading fee discounts** and VIP fee tier privileges:
- **Referral Link**: [https://www.mexc.com/register?inviteCode=3tZTP](https://www.mexc.com/register?inviteCode=3tZTP)
- **Invite Code**: `3tZTP`

---

## ⚠️ Disclaimer

This terminal is provided for educational and quantitative market research purposes only. No content constitutes financial advice, trading signals, or investment solicitation. Digital asset trading involves substantial risk of loss.
