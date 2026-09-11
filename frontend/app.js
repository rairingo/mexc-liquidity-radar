// MEXC Liquidity Terminal - Frontend Application Logic (v4.4.0 Composite EV & Dimensionless Probability Model)
const APP_VERSION = "4.4.0";

let marketData = [];
let currentMode = "all"; // 'all', 'avalanche', 'squeeze'
let activeSortKey = "opportunity_composite"; // default: Composite EV Score
let activeSortDirection = "desc"; // 'asc' or 'desc'
let currentViewMode = "table"; // Default to TradingView Screener Table View
let searchQuery = "";
let displayLimit = 50; // Items per batch

// User Customizable Filter & Alert Settings (Dual Min & Max Range)
const DEFAULT_SETTINGS = {
  minProb: 0,
  maxProb: 99,
  minImpact: 0,
  maxImpact: 99,
  minCost: 0,
  maxCost: 999999999,
  minVol: 0,
  maxVol: 999999999999,
  minDistance: 0.0,
  maxDistance: 999,
  minChange: -999,
  maxChange: 999,
  alertMinProb: 70,
  alertMaxCost: 5000,
};

let userSettings = { ...DEFAULT_SETTINGS };

// Watchlist (Pinned Favorites) - Persisted in localStorage
let watchlist = new Set();
try {
  const savedWatchlist = localStorage.getItem("mexc_watchlist");
  if (savedWatchlist) {
    watchlist = new Set(JSON.parse(savedWatchlist));
  }
} catch (e) {
  console.debug("Watchlist load error:", e);
}

// Rapid Wall Thinning (⚡ 急変検知) previous costs cache
let prevCostsMap = new Map();

// Active Inline TradingView Chart Symbol
let activeChartSymbol = null;

// Load user settings from localStorage if available
try {
  const saved = localStorage.getItem("mexc_user_settings_v2");
  if (saved) {
    userSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  }
} catch (e) {
  console.debug("Settings load error:", e);
}

// MEXC Referral Invite Code for Affiliate Kickbacks
const MEXC_INVITE_CODE = "3tZTP";

function getMexcTradeUrl(item) {
  if (item && item.mexc_trade_url) {
    if (!item.mexc_trade_url.includes("inviteCode")) {
      const sep = item.mexc_trade_url.includes("?") ? "&" : "?";
      return `${item.mexc_trade_url}${sep}inviteCode=${MEXC_INVITE_CODE}`;
    }
    return item.mexc_trade_url;
  }
  const sym = (item && item.symbol) ? item.symbol : "BTCUSDT";
  const cleanUnder = sym.replace("USDT", "_USDT");
  if (item && item.has_futures === false) {
    return `https://www.mexc.com/exchange/${cleanUnder}?inviteCode=${MEXC_INVITE_CODE}`;
  }
  return `https://futures.mexc.com/exchange/${cleanUnder}?inviteCode=${MEXC_INVITE_CODE}`;
}

// DOM Elements
const cardsContainer = document.getElementById("cards-container");
const tableContainer = document.getElementById("table-container");
const tableBody = document.getElementById("table-body");
const loadingState = document.getElementById("loading-state");
const btnRefresh = document.getElementById("btn-refresh");
const inputSearch = document.getElementById("input-search");
const sortChips = document.querySelectorAll(".tv-pill");
const viewModeCardBtn = document.getElementById("view-mode-card");
const viewModeTableBtn = document.getElementById("view-mode-table");
const lastSyncTimeEl = document.getElementById("last-sync-time");
const refreshIcon = document.querySelector(".refresh-icon");

// Mode Switch Tabs
const tabModeAll = document.getElementById("tab-mode-all");
const tabModeAvalanche = document.getElementById("tab-mode-avalanche");
const tabModeSqueeze = document.getElementById("tab-mode-squeeze");
const tabModeWatchlist = document.getElementById("tab-mode-watchlist");

// Concept Accordion Elements
const btnToggleConcept = document.getElementById("btn-toggle-concept");
const conceptDrawer = document.getElementById("concept-drawer");
const conceptChevron = document.getElementById("concept-chevron");

// Export Dropdown Elements
const btnExportMenu = document.getElementById("btn-export-menu");
const exportDropdown = document.getElementById("export-dropdown");
const btnExportCsv = document.getElementById("btn-export-csv");
const btnExportJson = document.getElementById("btn-export-json");

// Stats Overview Elements
const statScannedCount = document.getElementById("stat-scanned-count");
const statHighRiskCount = document.getElementById("stat-high-risk-count");
const statMinTriggerCost = document.getElementById("stat-min-trigger-cost");
const statMinTriggerSymbol = document.getElementById("stat-min-trigger-symbol");
const statAvgImbalance = document.getElementById("stat-avg-imbalance");

// Modal Elements
const methodologyModal = document.getElementById("methodology-modal");
const btnMethodology = document.getElementById("btn-methodology");
const modalCloseBtn = document.getElementById("modal-close-btn");
const btnAudioToggle = document.getElementById("btn-audio-toggle");
const audioIconSvg = document.getElementById("audio-icon-svg");
const audioLabel = document.getElementById("audio-label");

// Settings Modal Elements
const settingsModal = document.getElementById("settings-modal");
const btnOpenSettings = document.getElementById("btn-open-settings");
const settingsModalClose = document.getElementById("settings-modal-close");
const btnApplySettings = document.getElementById("btn-apply-settings");
const btnResetSettings = document.getElementById("btn-reset-settings");
const activeFilterBadge = document.getElementById("active-filter-badge");

// Settings Inputs (Dual Min-Max Range Controls)
const cfgMinProb = document.getElementById("cfg-min-prob");
const cfgMaxProb = document.getElementById("cfg-max-prob");
const cfgMinImpact = document.getElementById("cfg-min-impact");
const cfgMaxImpact = document.getElementById("cfg-max-impact");
const cfgMinCost = document.getElementById("cfg-min-cost");
const cfgMaxCost = document.getElementById("cfg-max-cost");
const cfgMinVol = document.getElementById("cfg-min-vol");
const cfgMaxVol = document.getElementById("cfg-max-vol");
const cfgMinDistance = document.getElementById("cfg-min-distance");
const cfgMaxDistance = document.getElementById("cfg-max-distance");
const cfgMinChange = document.getElementById("cfg-min-change");
const cfgMaxChange = document.getElementById("cfg-max-change");
const cfgAlertMinProb = document.getElementById("cfg-alert-min-prob");
const dispAlertMinProb = document.getElementById("disp-alert-min-prob");
const cfgAlertMaxCost = document.getElementById("cfg-alert-max-cost");

// Audio Alert State
let isAudioAlertEnabled = localStorage.getItem("mexc_audio_alert") === "true";
let previousAlertSymbols = new Set();

// Web Audio API Synth Chime
function playFinancialChime() {
  if (!isAudioAlertEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Dual-tone high frequency pleasant financial notification
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.15); // E6

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(440, now);
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch (e) {
    console.debug("Audio error:", e);
  }
}

// Copy Share Text for Discord / Telegram
async function copyShareText(symbol, oppSide, cost, targetPrice, prob, impact) {
  const isSqueeze = oppSide === "squeeze";
  const typeText = isSqueeze ? "SHORT SQUEEZE BREAKOUT" : "LONG LIQUIDATION CASCADE";
  const costLabel = isSqueeze ? "Pump Capital Needed" : "Dump Capital Needed";
  const pairUrl = `${window.location.origin}/pair/${symbol}`;

  const text = `[MEXC RADAR] ${symbol} ${typeText}\n` +
    `${costLabel}: ${formatUSDT(cost)} (Target: $${formatPrice(targetPrice)})\n` +
    `Probability: ${prob}/99 | Impact: ${impact}/99\n` +
    `Live Depth & Analysis: ${pairUrl}`;

  try {
    await navigator.clipboard.writeText(text);
    showToast(`Alert for ${symbol} copied to clipboard.`);
  } catch (err) {
    prompt("Copy this alert for Discord/Telegram:", text);
  }
}

function showToast(msg) {
  let toast = document.getElementById("tv-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "tv-toast";
    toast.style.cssText = "position: fixed; bottom: 24px; right: 24px; background: #1e222d; color: #089981; border: 1px solid #089981; padding: 10px 18px; border-radius: 4px; font-size: 12px; font-weight: 600; z-index: 9999; box-shadow: 0 4px 16px rgba(0,0,0,0.5);";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 3500);
}

// Formatters
const formatUSDT = (val) => {
  if (val === undefined || val === null || isNaN(val)) return "$0";
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}k`;
  return `$${val.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
};

const formatPrice = (price) => {
  if (!price) return "0.00";
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.0001) return price.toFixed(6);
  return price.toFixed(8);
};

// API Base URL
const API_BASE = window.location.protocol === "file:" ? "http://127.0.0.1:8000" : "";

// Fetch Market Scan Data
async function fetchScanData(isManual = false) {
  try {
    if (isManual && refreshIcon) refreshIcon.classList.add("rotating");

    const apiMode = currentMode === "watchlist" ? "all" : currentMode;
    const sortParam = activeSortKey ? activeSortKey.replace("opportunity_", "") : "composite";
    const url = `${API_BASE}/api/scan?mode=${apiMode}&sort_by=${sortParam}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    marketData = data.items || [];

    // Rapid Wall Thinning Detection (⚡ 急変検知: 前スキャン比でトリガーコストが25%以上急減した銘柄)
    marketData.forEach((item) => {
      const prevCost = prevCostsMap.get(item.symbol);
      if (prevCost && prevCost > 50 && item.opportunity_cost <= prevCost * 0.75) {
        item.is_wall_thinning = true;
      } else {
        item.is_wall_thinning = false;
      }
      prevCostsMap.set(item.symbol, item.opportunity_cost);
    });

    // Sound Alert Check based on user configured thresholds
    const currentHighAlertSymbols = new Set(
      marketData
        .filter(
          (x) =>
            x.opportunity_prob >= userSettings.alertMinProb &&
            x.opportunity_cost <= userSettings.alertMaxCost
        )
        .map((x) => x.symbol)
    );

    const hasNewAlert = [...currentHighAlertSymbols].some(
      (s) => !previousAlertSymbols.has(s)
    );
    if (hasNewAlert && previousAlertSymbols.size > 0) {
      playFinancialChime();
    }
    previousAlertSymbols = currentHighAlertSymbols;

    renderDashboard();

    if (lastSyncTimeEl) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString();
      lastSyncTimeEl.textContent = t("lastSync", { time: timeStr });
    }
  } catch (err) {
    console.error("Data scan error:", err);
    if (tableBody && marketData.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--tv-red); padding: 40px;">Connection failed. Retrying in background...</td></tr>`;
    }
  } finally {
    if (loadingState) loadingState.classList.add("hidden");
    if (isManual && refreshIcon) {
      setTimeout(() => refreshIcon.classList.remove("rotating"), 500);
    }
  }
}

// Update Snapshot Metrics
function updateStatsOverview(items) {
  if (!items || items.length === 0) return;

  if (statScannedCount) statScannedCount.textContent = items.length;

  // High Risk Squeeze / Cascade
  const highRisk = items.filter((x) => x.opportunity_prob >= 75);
  if (statHighRiskCount) statHighRiskCount.textContent = highRisk.length;

  // Minimum Capital Trigger
  const sortedByCost = [...items].sort((a, b) => a.opportunity_cost - b.opportunity_cost);
  if (sortedByCost.length > 0 && statMinTriggerCost) {
    const minItem = sortedByCost[0];
    statMinTriggerCost.textContent = formatUSDT(minItem.opportunity_cost);
    if (statMinTriggerSymbol) {
      statMinTriggerSymbol.textContent = `${minItem.symbol} (${minItem.opportunity_side === "squeeze" ? "Short" : "Long"})`;
    }
  }

  // Average Imbalance
  const avgBidRatio = items.reduce((acc, curr) => acc + (curr.bid_ratio_pct || 50), 0) / items.length;
  if (statAvgImbalance) {
    statAvgImbalance.textContent = `${avgBidRatio.toFixed(1)}% / ${(100 - avgBidRatio).toFixed(1)}%`;
  }
}

// Filter and Sort Data (Applying User Criteria with Dual Min & Max Range)
function getFilteredAndSortedData() {
  let list = [...marketData];

  // Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toUpperCase();
    list = list.filter((item) => item.symbol.toUpperCase().includes(q));
  }

  // User Custom Display Filters (Min & Max Range Bounds)
  list = list.filter((item) => {
    // Probability Score (0 - 99)
    const prob = item.opportunity_prob ?? 0;
    if (prob < userSettings.minProb || prob > userSettings.maxProb) return false;

    // Impact Multiplier (0 - 99)
    const impact = item.opportunity_impact ?? 0;
    if (impact < userSettings.minImpact || impact > userSettings.maxImpact) return false;

    // Trigger Capital (USDT)
    const cost = item.opportunity_cost ?? 0;
    if (cost < userSettings.minCost || cost > userSettings.maxCost) return false;

    // 24h Volume (USDT)
    const vol = item.volume_24h_usdt ?? 0;
    if (vol < userSettings.minVol || vol > userSettings.maxVol) return false;

    // Distance to Barrier (%)
    const dist = Math.abs(item.opportunity_distance ?? 0);
    if (dist < userSettings.minDistance || dist > userSettings.maxDistance) return false;

    // 24h Price Change (%)
    const change = item.price_change_24h_pct ?? 0;
    if (change < userSettings.minChange || change > userSettings.maxChange) return false;

    return true;
  });

  // Watchlist Mode Filter
  if (currentMode === "watchlist") {
    list = list.filter((item) => watchlist.has(item.symbol));
  }

  // Sorting (Bidirectional ASC / DESC)
  list.sort((a, b) => {
    // Pin Watchlist items to the very top across all modes
    const isFavA = watchlist.has(a.symbol) ? 1 : 0;
    const isFavB = watchlist.has(b.symbol) ? 1 : 0;
    if (isFavA !== isFavB) {
      return isFavB - isFavA; // Pinned favorites always appear first
    }

    let key = activeSortKey;
    let valA = a[key];
    let valB = b[key];

    // String comparison (Symbol, Type)
    if (key === "symbol") {
      const cmp = (a.symbol || "").localeCompare(b.symbol || "");
      return activeSortDirection === "asc" ? cmp : -cmp;
    }
    if (key === "opportunity_side") {
      const cmp = (a.opportunity_side || "").localeCompare(b.opportunity_side || "");
      return activeSortDirection === "asc" ? cmp : -cmp;
    }

    valA = (typeof valA === "number" && !isNaN(valA)) ? valA : 0;
    valB = (typeof valB === "number" && !isNaN(valB)) ? valB : 0;

    return activeSortDirection === "asc" ? valA - valB : valB - valA;
  });

  return list;
}

// Render Dashboard (Cards or Screener Table)
function renderDashboard() {
  const allFiltered = getFilteredAndSortedData();
  updateStatsOverview(marketData);

  const paginatedItems = allFiltered.slice(0, displayLimit);

  if (currentViewMode === "table") {
    tableContainer.classList.remove("hidden");
    cardsContainer.classList.add("hidden");
    renderTable(paginatedItems, allFiltered.length);
  } else {
    tableContainer.classList.add("hidden");
    cardsContainer.classList.remove("hidden");
    renderCards(paginatedItems, allFiltered.length);
  }
}

// Helper for real-time market flash animation
function flashElement(el, isPositive) {
  if (!el) return;
  const cls = isPositive ? "flash-up" : "flash-down";
  el.classList.remove("flash-up", "flash-down");
  void el.offsetWidth; // force reflow
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 1200);
}

// Watchlist Toggle
window.toggleWatchlist = function(symbol, e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (watchlist.has(symbol)) {
    watchlist.delete(symbol);
  } else {
    watchlist.add(symbol);
  }
  try {
    localStorage.setItem("mexc_watchlist", JSON.stringify([...watchlist]));
  } catch (err) {
    console.debug("Failed saving watchlist:", err);
  }
  renderDashboard();
};

// Inline TradingView Chart Toggle
window.toggleInlineChart = function(symbol, e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (activeChartSymbol === symbol) {
    activeChartSymbol = null;
  } else {
    activeChartSymbol = symbol;
  }
  renderDashboard();
};

// Render Screener Table View (TradingView High-Density Grid with Smart DOM Diffing)
function renderTable(items, totalCount) {
  if (items.length === 0) {
    const emptyMsg = currentMode === "watchlist" ? t("watchlistEmpty") : t("noData");
    tableBody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: var(--tv-text-muted); padding: 40px;">${emptyMsg}</td></tr>`;
    renderLoadMore(tableContainer, totalCount);
    return;
  }

  // Remove empty placeholder row if present
  const placeholder = tableBody.querySelector("td[colspan]");
  if (placeholder) {
    tableBody.innerHTML = "";
  }

  const existingRowsMap = new Map();
  tableBody.querySelectorAll("tr[data-symbol]").forEach((tr) => {
    existingRowsMap.set(tr.getAttribute("data-symbol"), tr);
  });

  // 現在アクティブなシンボル以外の不要なチャート行のみを安全に削除（表示中のiframeは絶対に破棄しない）
  tableBody.querySelectorAll(".inline-chart-row").forEach((r) => {
    if (!activeChartSymbol || r.id !== `chart-row-${activeChartSymbol}`) {
      r.remove();
    }
  });

  const activeSymbols = new Set(items.map((x) => x.symbol));

  // Remove rows no longer in filtered list
  existingRowsMap.forEach((tr, sym) => {
    if (!activeSymbols.has(sym)) {
      // もしこの銘柄のチャートが開いていたら一緒にクリーンアップ
      const cRow = document.getElementById(`chart-row-${sym}`);
      if (cRow) cRow.remove();
      tr.remove();
      existingRowsMap.delete(sym);
    }
  });

  items.forEach((item) => {
    const isSqueeze = item.opportunity_side === "squeeze";
    const prob = item.opportunity_prob;
    const impact = item.opportunity_impact;
    const composite = item.opportunity_composite ?? Math.round(Math.sqrt((prob || 5) * (impact || 5)) * 10) / 10;
    const isFav = watchlist.has(item.symbol);
    const isChartOpen = activeChartSymbol === item.symbol;

    const changeClass = item.price_change_24h_pct >= 0 ? "color-green" : "color-red";
    const changeSign = item.price_change_24h_pct >= 0 ? "+" : "";

    const typeTag = isSqueeze
      ? `<span class="col-type-tag tag-short">${t("directionShort")}</span>`
      : `<span class="col-type-tag tag-long">${t("directionLong")}</span>`;

    const impactClass = impact >= 75 ? "score-badge badge-impact high" : "score-badge badge-impact";
    const compositeClass = composite >= 75 ? "score-badge badge-composite high" : "score-badge badge-composite";

    const starBtn = `<button class="btn-star-pin ${isFav ? 'active' : ''}" onclick="toggleWatchlist('${item.symbol}', event)" title="${isFav ? t('unpinWatchlist') : t('pinWatchlist')}">${isFav ? '★' : '☆'}</button>`;
    const thinningBadge = item.is_wall_thinning ? `<span class="badge-wall-thinning" title="${t('tooltipWallThinning')}">⚡ ${t('badgeWallThinning')}</span>` : '';

    const rowHtml = `
        <td style="text-align: center;">${starBtn}</td>
        <td class="col-symbol">
          <div style="display: flex; align-items: center; gap: 4px;">
            <a href="/pair/${item.symbol}" class="tv-symbol-link" title="${item.symbol} Orderbook Deep Dive">
              ${item.symbol}
            </a>
            ${thinningBadge}
          </div>
        </td>
        <td>${typeTag}</td>
        <td class="col-mono">$${formatPrice(item.current_price)}</td>
        <td class="col-mono ${changeClass}">${changeSign}${item.price_change_24h_pct.toFixed(2)}%</td>
        <td class="col-mono">$${formatPrice(item.opportunity_target)}</td>
        <td class="col-mono">${isSqueeze ? "+" : "-"}${item.opportunity_distance}%</td>
        <td class="col-mono" style="font-weight: 700; color: ${isSqueeze ? 'var(--tv-green)' : 'var(--tv-red)'}">${formatUSDT(item.opportunity_cost)}</td>
        <td><span class="${compositeClass}" title="${t('compositeDesc')}">${composite}</span></td>
        <td><span class="score-badge badge-prob">${prob}</span></td>
        <td><span class="${impactClass}">${impact}</span></td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="btn-chart-toggle ${isChartOpen ? 'active' : ''}" onclick="toggleInlineChart('${item.symbol}', event)" title="Toggle TradingView Chart">
              <span>📈</span> <span>${isChartOpen ? t('btnInlineChartClose') : t('btnInlineChart')}</span>
            </button>
            <button class="tv-table-link" onclick="copyShareText('${item.symbol}', '${item.opportunity_side}', ${item.opportunity_cost}, ${item.opportunity_target}, ${prob}, ${impact})" title="Copy Alert for Discord/Telegram" style="cursor: pointer; background: transparent; color: #38bdf8; border-color: rgba(56,189,248,0.3); display: flex; align-items: center; gap: 4px;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
              <span>Share</span>
            </button>
            <a href="/pair/${item.symbol}" class="tv-table-link" style="color: var(--tv-text-secondary); border-color: var(--tv-border);">
              Details
            </a>
            <a href="${getMexcTradeUrl(item)}" class="tv-table-link mexc-gateway-link" data-trade-url="${getMexcTradeUrl(item)}" data-symbol="${item.symbol}" title="Trade on MEXC">
              MEXC ↗
            </a>
          </div>
        </td>
    `;

    let tr = existingRowsMap.get(item.symbol);
    if (tr) {
      // Check for price change & flash
      const prevPrice = parseFloat(tr.getAttribute("data-price") || "0");
      if (prevPrice > 0 && prevPrice !== item.current_price) {
        flashElement(tr, item.current_price > prevPrice);
      }
      tr.setAttribute("data-price", item.current_price);

      // 無駄なDOM書き換えを防止（HTMLが同じならinnerHTMLを変更しない）
      if (tr.innerHTML !== rowHtml) {
        tr.innerHTML = rowHtml;
      }
      tableBody.appendChild(tr);
    } else {
      tr = document.createElement("tr");
      tr.setAttribute("data-symbol", item.symbol);
      tr.setAttribute("data-price", item.current_price);
      tr.innerHTML = rowHtml;
      tableBody.appendChild(tr);
    }

    // チャート展開の永続化処理: 既に存在するiframeは絶対に再読み込みさせず再利用
    if (isChartOpen) {
      let chartTr = document.getElementById(`chart-row-${item.symbol}`);
      if (!chartTr) {
        // 初回のみ iframe を生成
        chartTr = document.createElement("tr");
        chartTr.className = "inline-chart-row";
        chartTr.id = `chart-row-${item.symbol}`;
        const cleanSym = item.symbol.replace("USDT", "");
        chartTr.innerHTML = `
          <td colspan="12">
            <div class="inline-chart-wrapper">
              <iframe src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_${item.symbol}&symbol=MEXC%3A${cleanSym}USDT&interval=15&hidesidetoolbar=1&symboledit=1&saveimage=0&toolbarbg=131722&theme=dark&style=1&timezone=exchange"
                      style="width: 100%; height: 100%; border: none;"></iframe>
            </div>
          </td>
        `;
      }
      // 常に該当行の直下に保持・配置（DOM順序が動いても既存iframeはリロードされない）
      tr.after(chartTr);
    }
  });

  // Load more handling for table
  renderLoadMore(tableContainer, totalCount);
  attachGatewayListeners();
}

// Render Card Grid View (Smooth Zero-Flicker Diffing)
function renderCards(items, totalCount) {
  if (items.length === 0) {
    cardsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--tv-text-muted); padding: 40px;">${t("noData")}</div>`;
    return;
  }

  // プレースホルダーがあれば削除
  if (cardsContainer.querySelector("div[style*='grid-column']")) {
    cardsContainer.innerHTML = "";
  }

  const existingCardsMap = new Map();
  cardsContainer.querySelectorAll(".tv-card[data-symbol]").forEach((card) => {
    existingCardsMap.set(card.getAttribute("data-symbol"), card);
  });

  const activeSymbols = new Set(items.map((x) => x.symbol));
  existingCardsMap.forEach((card, sym) => {
    if (!activeSymbols.has(sym)) {
      card.remove();
      existingCardsMap.delete(sym);
    }
  });

  items.forEach((item) => {
    const isSqueeze = item.opportunity_side === "squeeze";
    const prob = item.opportunity_prob;
    const impact = item.opportunity_impact;

    const changeClass = item.price_change_24h_pct >= 0 ? "color-green" : "color-red";
    const changeSign = item.price_change_24h_pct >= 0 ? "+" : "";

    const triggerCost = item.opportunity_cost;
    const distance = item.opportunity_distance;
    const targetPrice = item.opportunity_target;
    const panelClass = isSqueeze ? "card-cost-panel panel-up" : "card-cost-panel panel-down";
    const costTitle = isSqueeze ? t("labelCostUp") : t("labelCostDown");
    const sideText = isSqueeze ? t("directionShort") : t("directionLong");
    const sideColor = isSqueeze ? "var(--tv-green)" : "var(--tv-red)";

    const descText = isSqueeze
      ? t("descUp", { cost: formatUSDT(triggerCost), price: formatPrice(targetPrice) })
      : t("descDown", { cost: formatUSDT(triggerCost), price: formatPrice(targetPrice) });

    const composite = item.opportunity_composite ?? Math.round(Math.sqrt((prob || 5) * (impact || 5)) * 10) / 10;
    const impactBadgeClass = impact >= 75 ? "score-badge badge-impact high" : "score-badge badge-impact";
    const compositeBadgeClass = composite >= 75 ? "score-badge badge-composite high" : "score-badge badge-composite";

    const isFav = watchlist.has(item.symbol);
    const starBtn = `<button class="btn-star-pin ${isFav ? 'active' : ''}" onclick="toggleWatchlist('${item.symbol}', event)" title="${isFav ? t('unpinWatchlist') : t('pinWatchlist')}">${isFav ? '★' : '☆'}</button>`;
    const thinningBadge = item.is_wall_thinning ? `<span class="badge-wall-thinning" title="${t('tooltipWallThinning')}">⚡ ${t('badgeWallThinning')}</span>` : '';

    const cardHtml = `
      <div>
        <div class="tv-card-header">
          <div style="display: flex; align-items: center; gap: 6px;">
            ${starBtn}
            <a href="/pair/${item.symbol}" class="tv-symbol-link" style="font-size: 15px;" title="${item.symbol} Orderbook Deep Dive">
              ${item.symbol}
            </a>
            ${thinningBadge}
          </div>
          <div style="text-align: right;">
            <div style="font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--tv-text-bright);">$${formatPrice(item.current_price)}</div>
            <div style="font-family: var(--font-mono); font-size: 11px; font-weight: 600;" class="${changeClass}">${changeSign}${item.price_change_24h_pct.toFixed(2)}%</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div style="display: flex; gap: 4px;">
            <span class="${compositeBadgeClass}" title="${t('compositeDesc')}">${t('compositeScore')}: ${composite}</span>
            <span class="score-badge badge-prob" title="${t('probScore')}">${t('probScore')}: ${prob}</span>
            <span class="${impactBadgeClass}" title="${t('impactScore')}">${t('impactScore')}: ${impact}</span>
          </div>
        </div>

        <div class="card-type-row" style="color: ${sideColor}">
          ${sideText}
        </div>

        <div class="${panelClass}">
          <div class="cost-head">
            <span>${costTitle}</span>
            <span>${t("distance")}: ${isSqueeze ? "+" : "-"}${distance}%</span>
          </div>
          <div class="cost-amount" style="color: ${sideColor}">${formatUSDT(triggerCost)}</div>
          <div class="cost-desc">${descText}</div>
        </div>

        <div class="card-stats-list">
          <div class="stat-row">
            <span class="stat-row-label">${t("change24h")}</span>
            <span class="stat-row-val ${changeClass}">${changeSign}${item.price_change_24h_pct.toFixed(2)}%</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">${t("targetPrice")}</span>
            <span class="stat-row-val">$${formatPrice(targetPrice)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">${t("vol24h")}</span>
            <span class="stat-row-val">${formatUSDT(item.volume_24h_usdt)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">${t("imbalance3pct")}</span>
            <span class="stat-row-val">${item.bid_ratio_pct}% / ${item.ask_ratio_pct}%</span>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 8px;">
        <a href="${getMexcTradeUrl(item)}" class="card-action-btn mexc-gateway-link" data-trade-url="${getMexcTradeUrl(item)}" data-symbol="${item.symbol}" style="flex: 2;" title="Trade on MEXC">
          ${t("tradeOnMexc")} ↗
        </a>
        <button onclick="copyShareText('${item.symbol}', '${item.opportunity_side}', ${item.opportunity_cost}, ${item.opportunity_target}, ${prob}, ${impact})" class="card-action-btn" style="flex: 1; cursor: pointer; color: #38bdf8; display: flex; align-items: center; justify-content: center; gap: 4px;" title="Copy Alert for Discord/Telegram">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
          <span>Share</span>
        </button>
      </div>
    `;

    let card = existingCardsMap.get(item.symbol);
    if (card) {
      if (card.innerHTML !== cardHtml) {
        card.innerHTML = cardHtml;
      }
      cardsContainer.appendChild(card);
    } else {
      card = document.createElement("div");
      card.className = "tv-card";
      card.setAttribute("data-symbol", item.symbol);
      card.innerHTML = cardHtml;
      cardsContainer.appendChild(card);
    }
  });

  // Load more handling for cards
  renderLoadMore(cardsContainer, totalCount);
  attachGatewayListeners();
}

// Render "Load More" button if needed
function renderLoadMore(container, totalCount) {
  const existingBtn = document.getElementById("btn-load-more-container");
  if (existingBtn) existingBtn.remove();

  if (totalCount > displayLimit) {
    const remaining = totalCount - displayLimit;
    const loadDiv = document.createElement("div");
    loadDiv.id = "btn-load-more-container";
    loadDiv.className = "load-more-container";
    loadDiv.innerHTML = `
      <button class="tv-load-btn" id="btn-load-more">
        ${t("loadMore", { count: remaining })}
      </button>
    `;
    container.after(loadDiv);

    document.getElementById("btn-load-more").addEventListener("click", () => {
      displayLimit += 50;
      renderDashboard();
    });
  }
}

// Mode Tab Listeners
function setupModeTabs() {
  const tabs = [
    { btn: tabModeAll, mode: "all" },
    { btn: tabModeAvalanche, mode: "avalanche" },
    { btn: tabModeSqueeze, mode: "squeeze" },
    { btn: tabModeWatchlist, mode: "watchlist" },
  ];

  tabs.forEach(({ btn, mode }) => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      tabs.forEach((t) => t.btn && t.btn.classList.remove("active"));
      btn.classList.add("active");
      currentMode = mode;
      displayLimit = 50;
      if (mode === "watchlist") {
        renderDashboard();
      } else {
        fetchScanData(true);
      }
    });
  });
}

// Concept & Universe Screening Criteria Accordion
function setupConceptAccordion() {
  if (!btnToggleConcept || !conceptDrawer) return;

  btnToggleConcept.addEventListener("click", () => {
    const isExpanded = conceptDrawer.style.display === "block";
    if (isExpanded) {
      conceptDrawer.style.display = "none";
      if (conceptChevron) conceptChevron.textContent = "▼";
      btnToggleConcept.style.borderRadius = "var(--radius-sm)";
    } else {
      conceptDrawer.style.display = "block";
      if (conceptChevron) conceptChevron.textContent = "▲";
      btnToggleConcept.style.borderRadius = "var(--radius-sm) var(--radius-sm) 0 0";
    }
  });
}

// Data Export (CSV / JSON)
function setupExportMenu() {
  if (!btnExportMenu || !exportDropdown) return;

  btnExportMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    const isShown = exportDropdown.style.display === "block";
    exportDropdown.style.display = isShown ? "none" : "block";
  });

  document.addEventListener("click", (e) => {
    if (!btnExportMenu.contains(e.target) && !exportDropdown.contains(e.target)) {
      exportDropdown.style.display = "none";
    }
  });

  // Export CSV
  if (btnExportCsv) {
    btnExportCsv.addEventListener("click", () => {
      exportDropdown.style.display = "none";
      const items = getFilteredAndSortedData();
      if (items.length === 0) {
        showToast("No data to export.");
        return;
      }

      const headers = [
        "Symbol",
        "Opportunity_Type",
        "Current_Price",
        "Price_Change_24h_Pct",
        "Trigger_Level",
        "Distance_Pct",
        "Trigger_Capital_USDT",
        "Composite_EV_Score",
        "Probability_Score",
        "Impact_Multiplier",
        "Volume_24h_USDT",
        "MEXC_URL"
      ];

      const rows = items.map(x => [
        x.symbol,
        x.opportunity_side,
        x.current_price,
        x.price_change_24h_pct,
        x.opportunity_target,
        x.opportunity_distance,
        x.opportunity_cost,
        x.opportunity_composite ?? Math.round(Math.sqrt((x.opportunity_prob || 5) * (x.opportunity_impact || 5)) * 10) / 10,
        x.opportunity_prob,
        x.opportunity_impact,
        x.volume_24h_usdt,
        getMexcTradeUrl(x)
      ]);

      const csvContent = [headers.join(","), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\r\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
      a.href = url;
      a.download = `MEXC_Liquidity_Radar_${timestamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported ${items.length} pairs to CSV.`);
    });
  }

  // Export JSON
  if (btnExportJson) {
    btnExportJson.addEventListener("click", () => {
      exportDropdown.style.display = "none";
      const items = getFilteredAndSortedData();
      if (items.length === 0) {
        showToast("No data to export.");
        return;
      }

      const jsonContent = JSON.stringify(items, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
      a.href = url;
      a.download = `MEXC_Liquidity_Radar_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported ${items.length} pairs to JSON.`);
    });
  }
}

// Table Header Sorting & Sync with Toolbar Pills
function updateSortHeadersUI() {
  const tableHeaders = document.querySelectorAll(".tv-screener-table thead th.sortable");
  tableHeaders.forEach((th) => {
    const key = th.getAttribute("data-sort");
    const icon = th.querySelector(".sort-icon");
    if (key === activeSortKey) {
      th.classList.add("active");
      if (icon) icon.textContent = activeSortDirection === "asc" ? " ▲" : " ▼";
    } else {
      th.classList.remove("active");
      if (icon) icon.textContent = " ⇅";
    }
  });
}

function syncSortPillsUI() {
  sortChips.forEach((chip) => {
    const key = chip.getAttribute("data-sort");
    if (key === activeSortKey) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });
}

function setupTableSorting() {
  const tableHeaders = document.querySelectorAll(".tv-screener-table thead th.sortable");
  tableHeaders.forEach((th) => {
    th.addEventListener("click", () => {
      const sortKey = th.getAttribute("data-sort");
      if (!sortKey) return;

      if (activeSortKey === sortKey) {
        // 同じカラムを再度クリックした場合は昇順・降順を反転
        activeSortDirection = activeSortDirection === "asc" ? "desc" : "asc";
      } else {
        // 新しいカラムをクリックした場合
        activeSortKey = sortKey;
        // コスト・距離・シンボルは初期昇順（小さい順/A-Z）、それ以外は初期降順（大きい順）
        const defaultAscKeys = ["opportunity_cost", "opportunity_distance", "symbol", "opportunity_side"];
        activeSortDirection = defaultAscKeys.includes(sortKey) ? "asc" : "desc";
      }

      updateSortHeadersUI();
      syncSortPillsUI();
      renderDashboard();
    });
  });
}

// Sort Pills Listeners
function setupSortPills() {
  sortChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const sortKey = chip.getAttribute("data-sort");
      if (!sortKey) return;

      if (activeSortKey === sortKey) {
        activeSortDirection = activeSortDirection === "asc" ? "desc" : "asc";
      } else {
        activeSortKey = sortKey;
        const defaultAscKeys = ["opportunity_cost", "opportunity_distance", "symbol", "opportunity_side"];
        activeSortDirection = defaultAscKeys.includes(sortKey) ? "asc" : "desc";
      }

      updateSortHeadersUI();
      syncSortPillsUI();
      renderDashboard();
    });
  });
}

// Search Input Listener
function setupSearch() {
  if (!inputSearch) return;
  inputSearch.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    displayLimit = 50;
    renderDashboard();
  });
}

// View Mode Toggle (Table vs Cards)
function setupViewToggles() {
  if (viewModeTableBtn && viewModeCardBtn) {
    viewModeTableBtn.addEventListener("click", () => {
      currentViewMode = "table";
      viewModeTableBtn.classList.add("active");
      viewModeCardBtn.classList.remove("active");
      renderDashboard();
    });

    viewModeCardBtn.addEventListener("click", () => {
      currentViewMode = "card";
      viewModeCardBtn.classList.add("active");
      viewModeTableBtn.classList.remove("active");
      renderDashboard();
    });
  }
}

// Refresh Button Listener
function setupRefresh() {
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      fetchScanData(true);
    });
  }
}

// Methodology Navigation
function setupModal() {
  if (btnMethodology) {
    btnMethodology.addEventListener("click", (e) => {
      // Direct navigation to dedicated /methodology page
      window.location.href = "/methodology";
    });
  }
}

// Settings Modal UI & Logic (Dual Min & Max Range Controls)
function setupSettingsModal() {
  if (!settingsModal) return;

  // Open / Close
  if (btnOpenSettings) {
    btnOpenSettings.addEventListener("click", () => {
      updateSettingsModalUI();
      settingsModal.classList.remove("hidden");
    });
  }
  if (settingsModalClose) {
    settingsModalClose.addEventListener("click", () => {
      settingsModal.classList.add("hidden");
    });
  }
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.add("hidden");
    }
  });

  // Sliders Live Update (Alert)
  if (cfgAlertMinProb && dispAlertMinProb) {
    cfgAlertMinProb.addEventListener("input", (e) => {
      dispAlertMinProb.textContent = `≥ ${e.target.value}%`;
    });
  }

  // Apply Settings Button
  if (btnApplySettings) {
    btnApplySettings.addEventListener("click", () => {
      // 1. Probability (Min - Max)
      let minProb = parseInt(cfgMinProb.value, 10);
      let maxProb = parseInt(cfgMaxProb.value, 10);
      if (isNaN(minProb) || minProb < 0) minProb = 0;
      if (isNaN(maxProb) || maxProb > 99) maxProb = 99;
      if (minProb > maxProb) {
        const tmp = minProb; minProb = maxProb; maxProb = tmp;
      }
      userSettings.minProb = minProb;
      userSettings.maxProb = maxProb;

      // 2. Impact Multiplier (Min - Max)
      let minImpact = parseInt(cfgMinImpact.value, 10);
      let maxImpact = parseInt(cfgMaxImpact.value, 10);
      if (isNaN(minImpact) || minImpact < 0) minImpact = 0;
      if (isNaN(maxImpact) || maxImpact > 99) maxImpact = 99;
      if (minImpact > maxImpact) {
        const tmp = minImpact; minImpact = maxImpact; maxImpact = tmp;
      }
      userSettings.minImpact = minImpact;
      userSettings.maxImpact = maxImpact;

      // 3. Trigger Capital (Min - Max)
      let minCost = parseFloat(cfgMinCost.value) || 0;
      let maxCost = parseFloat(cfgMaxCost.value) || 999999999;
      if (minCost > maxCost) {
        const tmp = minCost; minCost = maxCost; maxCost = tmp;
      }
      userSettings.minCost = minCost;
      userSettings.maxCost = maxCost;

      // 4. Distance to Barrier (Min - Max)
      let minDist = parseFloat(cfgMinDistance.value) || 0.0;
      let maxDist = parseFloat(cfgMaxDistance.value) || 999;
      if (minDist > maxDist) {
        const tmp = minDist; minDist = maxDist; maxDist = tmp;
      }
      userSettings.minDistance = minDist;
      userSettings.maxDistance = maxDist;

      // 5. 24h Volume (Min - Max)
      let minVol = parseFloat(cfgMinVol.value) || 0;
      let maxVol = parseFloat(cfgMaxVol.value) || 999999999999;
      if (minVol > maxVol) {
        const tmp = minVol; minVol = maxVol; maxVol = tmp;
      }
      userSettings.minVol = minVol;
      userSettings.maxVol = maxVol;

      // 6. 24h Price Change (Min - Max)
      let minChange = parseFloat(cfgMinChange.value) || -999;
      let maxChange = parseFloat(cfgMaxChange.value) || 999;
      if (minChange > maxChange) {
        const tmp = minChange; minChange = maxChange; maxChange = tmp;
      }
      userSettings.minChange = minChange;
      userSettings.maxChange = maxChange;

      // Audio Alert Thresholds
      userSettings.alertMinProb = parseInt(cfgAlertMinProb.value, 10) || 70;
      userSettings.alertMaxCost = parseFloat(cfgAlertMaxCost.value) || 5000;

      saveSettings();
      settingsModal.classList.add("hidden");
      renderDashboard();
      showToast("Filter criteria applied.");
    });
  }

  // Reset Defaults Button
  if (btnResetSettings) {
    btnResetSettings.addEventListener("click", () => {
      userSettings = { ...DEFAULT_SETTINGS };
      saveSettings();
      updateSettingsModalUI();
      renderDashboard();
      showToast("Reset to default filters.");
    });
  }
}

function updateSettingsModalUI() {
  if (cfgMinProb) cfgMinProb.value = userSettings.minProb ?? 0;
  if (cfgMaxProb) cfgMaxProb.value = userSettings.maxProb ?? 99;

  if (cfgMinImpact) cfgMinImpact.value = userSettings.minImpact ?? 0;
  if (cfgMaxImpact) cfgMaxImpact.value = userSettings.maxImpact ?? 99;

  if (cfgMinCost) cfgMinCost.value = userSettings.minCost ?? 0;
  if (cfgMaxCost) cfgMaxCost.value = userSettings.maxCost ?? 999999999;

  if (cfgMinDistance) cfgMinDistance.value = userSettings.minDistance ?? 0.0;
  if (cfgMaxDistance) cfgMaxDistance.value = userSettings.maxDistance ?? 999;

  if (cfgMinVol) cfgMinVol.value = userSettings.minVol ?? 0;
  if (cfgMaxVol) cfgMaxVol.value = userSettings.maxVol ?? 999999999999;

  if (cfgMinChange) cfgMinChange.value = userSettings.minChange ?? -999;
  if (cfgMaxChange) cfgMaxChange.value = userSettings.maxChange ?? 999;

  if (cfgAlertMinProb) cfgAlertMinProb.value = userSettings.alertMinProb ?? 70;
  if (dispAlertMinProb) dispAlertMinProb.textContent = `≥ ${userSettings.alertMinProb ?? 70}%`;
  if (cfgAlertMaxCost) cfgAlertMaxCost.value = userSettings.alertMaxCost ?? 5000;
}

function updateActiveFilterBadge() {
  if (!activeFilterBadge) return;
  let count = 0;
  if ((userSettings.minProb ?? 0) > DEFAULT_SETTINGS.minProb) count++;
  if ((userSettings.maxProb ?? 99) < DEFAULT_SETTINGS.maxProb) count++;
  if ((userSettings.minImpact ?? 0) > DEFAULT_SETTINGS.minImpact) count++;
  if ((userSettings.maxImpact ?? 99) < DEFAULT_SETTINGS.maxImpact) count++;
  if ((userSettings.minCost ?? 0) > DEFAULT_SETTINGS.minCost) count++;
  if ((userSettings.maxCost ?? 999999999) < DEFAULT_SETTINGS.maxCost) count++;
  if ((userSettings.minDistance ?? 0) > DEFAULT_SETTINGS.minDistance) count++;
  if ((userSettings.maxDistance ?? 999) < DEFAULT_SETTINGS.maxDistance) count++;
  if ((userSettings.minVol ?? 0) > DEFAULT_SETTINGS.minVol) count++;
  if ((userSettings.maxVol ?? 999999999999) < DEFAULT_SETTINGS.maxVol) count++;
  if ((userSettings.minChange ?? -999) > DEFAULT_SETTINGS.minChange) count++;
  if ((userSettings.maxChange ?? 999) < DEFAULT_SETTINGS.maxChange) count++;

  if (count > 0) {
    activeFilterBadge.textContent = count;
    activeFilterBadge.style.display = "inline-block";
  } else {
    activeFilterBadge.style.display = "none";
  }
}

function loadSettings() {
  try {
    const saved = localStorage.getItem("mexc_terminal_settings");
    if (saved) {
      userSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.debug("Error reading stored settings:", e);
  }
  updateSettingsModalUI();
  updateActiveFilterBadge();
}

function saveSettings() {
  try {
    localStorage.setItem("mexc_terminal_settings", JSON.stringify(userSettings));
  } catch (e) {
    console.debug("Error saving settings:", e);
  }
  updateActiveFilterBadge();
}

// Audio Alert Toggle Listener
function setupAudioToggle() {
  if (!btnAudioToggle) return;
  const updateBtn = () => {
    if (audioLabel) audioLabel.textContent = isAudioAlertEnabled ? "Alert: ON" : "Alert: OFF";
    if (isAudioAlertEnabled) {
      btnAudioToggle.style.color = "var(--tv-blue)";
      btnAudioToggle.style.borderColor = "rgba(41, 98, 255, 0.4)";
      btnAudioToggle.style.backgroundColor = "var(--tv-blue-tint)";
      if (audioIconSvg) {
        audioIconSvg.style.stroke = "var(--tv-blue)";
        audioIconSvg.style.fill = "rgba(41, 98, 255, 0.2)";
      }
    } else {
      btnAudioToggle.style.color = "var(--tv-text-secondary)";
      btnAudioToggle.style.borderColor = "var(--tv-border)";
      btnAudioToggle.style.backgroundColor = "transparent";
      if (audioIconSvg) {
        audioIconSvg.style.stroke = "currentColor";
        audioIconSvg.style.fill = "none";
      }
    }
  };
  updateBtn();
  btnAudioToggle.addEventListener("click", () => {
    isAudioAlertEnabled = !isAudioAlertEnabled;
    localStorage.setItem("mexc_audio_alert", isAudioAlertEnabled);
    updateBtn();
    if (isAudioAlertEnabled) playFinancialChime();
  });
}

// Language Change Callback from i18n.js
window.onLanguageChange = function (newLang) {
  renderDashboard();
};

// =========================================================================
// MEXC Smart Gateway Modal
// Shows two choices when user clicks "MEXC ↗":
//   1. New User → /register?inviteCode=3tZTP  (affiliate link)
//   2. Existing User → direct trading chart URL
// Preference stored in localStorage so repeat users skip the dialog.
// =========================================================================

const MEXC_REGISTER_URL = `https://www.mexc.com/register?inviteCode=${MEXC_INVITE_CODE}`;

let _gatewayTradeUrl = "";

function openMexcGateway(tradeUrl, symbolLabel) {
  console.log("[Gateway] openMexcGateway called", { tradeUrl, symbolLabel });

  // If user previously chose "always go direct", skip the modal
  const pref = localStorage.getItem("mexc_gateway_pref");
  console.log("[Gateway] pref =", pref);
  if (pref === "trade") {
    window.open(tradeUrl, "_blank", "noopener,noreferrer");
    return;
  }
  if (pref === "register") {
    window.open(MEXC_REGISTER_URL, "_blank", "noopener,noreferrer");
    return;
  }

  try {
    // Populate modal
    _gatewayTradeUrl = tradeUrl;
    const langTitle  = t("gatewayTitle").replace("{symbol}", symbolLabel);

    document.getElementById("gateway-title").textContent = langTitle;
    document.getElementById("gateway-desc").textContent  = t("gatewayDesc");
    document.getElementById("gateway-btn-register-text").textContent = t("gatewayRegister");
    document.getElementById("gateway-btn-trade-text").textContent    = t("gatewayTrade");
    document.getElementById("gateway-remember-text").textContent     = t("gatewayRemember");

    document.getElementById("gateway-trade-btn").href = tradeUrl;
    document.getElementById("gateway-remember-choice").checked = false;

    const modal = document.getElementById("mexc-gateway-modal");
    console.log("[Gateway] modal element:", modal);
    if (!modal) {
      console.error("[Gateway] Modal element #mexc-gateway-modal NOT FOUND!");
      window.open(tradeUrl, "_blank", "noopener,noreferrer");
      return;
    }
    modal.style.display = "flex";
    console.log("[Gateway] Modal should now be visible");
  } catch (err) {
    console.error("[Gateway] Error in openMexcGateway:", err);
    window.open(tradeUrl, "_blank", "noopener,noreferrer");
  }
}

function closeMexcGateway() {
  const modal = document.getElementById("mexc-gateway-modal");
  if (modal) modal.style.display = "none";
}

function setupGatewayModal() {
  const registerBtn = document.getElementById("gateway-register-btn");
  const tradeBtn    = document.getElementById("gateway-trade-btn");
  const closeBtn    = document.getElementById("gateway-close-btn");
  const modalDiv   = document.getElementById("mexc-gateway-modal");
  const rememberCb  = document.getElementById("gateway-remember-choice");

  if (!registerBtn) return;

  registerBtn.addEventListener("click", () => {
    if (rememberCb.checked) {
      localStorage.setItem("mexc_gateway_pref", "register");
    }
    closeMexcGateway();
  });

  tradeBtn.addEventListener("click", () => {
    if (rememberCb.checked) {
      localStorage.setItem("mexc_gateway_pref", "trade");
    }
    closeMexcGateway();
  });

  if (closeBtn) closeBtn.addEventListener("click", closeMexcGateway);
  // Click on backdrop (parent overlay) to close
  if (modalDiv) modalDiv.addEventListener("click", (e) => {
    if (e.target === modalDiv) closeMexcGateway();
  });
}

// Helper: intercept link click and show gateway
function mexcLinkClickHandler(e) {
  e.preventDefault();
  e.stopPropagation();
  console.log("[Gateway] Click intercepted!", e.currentTarget.dataset);
  const tradeUrl   = e.currentTarget.dataset.tradeUrl || e.currentTarget.href;
  const symbolLabel = e.currentTarget.dataset.symbol || "this pair";
  openMexcGateway(tradeUrl, symbolLabel);
  return false;
}

// Attach gateway intercept to freshly rendered links after each render
function attachGatewayListeners() {
  const links = document.querySelectorAll("a.mexc-gateway-link");
  console.log(`[Gateway] Attaching listeners to ${links.length} links`);
  links.forEach(link => {
    link.removeEventListener("click", mexcLinkClickHandler);
    link.addEventListener("click", mexcLinkClickHandler);
  });
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  console.log(`%c MEXC Liquidity Terminal v${APP_VERSION} `, "background:#2962ff;color:#fff;font-weight:bold;border-radius:4px;padding:2px 6px;");

  loadSettings();
  setupModeTabs();
  setupSortPills();
  setupSearch();
  setupViewToggles();
  setupRefresh();
  setupModal();
  setupSettingsModal();
  setupTableSorting();
  updateSortHeadersUI();
  setupAudioToggle();
  setupGatewayModal();
  setupConceptAccordion();
  setupExportMenu();

  // Inject version badge into page
  const versionBadge = document.getElementById("app-version-badge");
  if (versionBadge) versionBadge.textContent = `v${APP_VERSION}`;

  // Initial Data Load
  fetchScanData(false);

  // Auto-polling every 8 seconds (0ms instant response from backend cache)
  setInterval(() => {
    fetchScanData(false);
  }, 8000);
});
