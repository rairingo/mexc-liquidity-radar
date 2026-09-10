// MEXC Liquidity Terminal - Frontend Application Logic (v4.0 TradingView Pro Edition)

let marketData = [];
let currentMode = "all"; // 'all', 'avalanche', 'squeeze'
let activeSortKey = "opportunity_prob"; // default: Probability
let currentViewMode = "table"; // Default to TradingView Screener Table View
let searchQuery = "";
let displayLimit = 50; // Items per batch

// User Customizable Filter & Alert Settings
const DEFAULT_SETTINGS = {
  minProb: 0,
  minImpact: 0,
  maxCost: 999999999,
  minVol: 0,
  maxDistance: 10.0,
  alertMinProb: 70,
  alertMaxCost: 5000,
};

let userSettings = { ...DEFAULT_SETTINGS };

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
  return `https://www.mexc.com/exchange/${sym.replace("USDT", "_USDT")}?inviteCode=${MEXC_INVITE_CODE}`;
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

// Settings Inputs
const cfgMinProb = document.getElementById("cfg-min-prob");
const dispMinProb = document.getElementById("disp-min-prob");
const cfgMinImpact = document.getElementById("cfg-min-impact");
const dispMinImpact = document.getElementById("disp-min-impact");
const cfgMaxCost = document.getElementById("cfg-max-cost");
const cfgMinVol = document.getElementById("cfg-min-vol");
const cfgMaxDistance = document.getElementById("cfg-max-distance");
const dispMaxDistance = document.getElementById("disp-max-distance");
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

    const url = `${API_BASE}/api/scan?mode=${currentMode}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    marketData = data.items || [];

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

// Filter and Sort Data (Applying User Criteria)
function getFilteredAndSortedData() {
  let list = [...marketData];

  // Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toUpperCase();
    list = list.filter((item) => item.symbol.toUpperCase().includes(q));
  }

  // User Custom Display Filters
  list = list.filter((item) => {
    if (item.opportunity_prob < userSettings.minProb) return false;
    if (item.opportunity_impact < userSettings.minImpact) return false;
    if (item.opportunity_cost > userSettings.maxCost) return false;
    if (item.volume_24h_usdt < userSettings.minVol) return false;
    if (Math.abs(item.opportunity_distance) > userSettings.maxDistance) return false;
    return true;
  });

  // Sorting
  list.sort((a, b) => {
    let key = activeSortKey;
    let valA = a[key] ?? 0;
    let valB = b[key] ?? 0;

    const ascendingDefaultKeys = ["opportunity_cost", "opportunity_distance"];
    const shouldAsc = ascendingDefaultKeys.includes(key);

    return shouldAsc ? valA - valB : valB - valA;
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

// Render Screener Table View (TradingView High-Density Grid with Smart DOM Diffing)
function renderTable(items, totalCount) {
  if (items.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--tv-text-muted); padding: 40px;">${t("noData")}</td></tr>`;
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

  const activeSymbols = new Set(items.map((x) => x.symbol));

  // Remove rows no longer in filtered list
  existingRowsMap.forEach((tr, sym) => {
    if (!activeSymbols.has(sym)) {
      tr.remove();
      existingRowsMap.delete(sym);
    }
  });

  items.forEach((item) => {
    const isSqueeze = item.opportunity_side === "squeeze";
    const prob = item.opportunity_prob;
    const impact = item.opportunity_impact;

    const changeClass = item.price_change_24h_pct >= 0 ? "color-green" : "color-red";
    const changeSign = item.price_change_24h_pct >= 0 ? "+" : "";

    const typeTag = isSqueeze
      ? `<span class="col-type-tag tag-short">${t("directionShort")}</span>`
      : `<span class="col-type-tag tag-long">${t("directionLong")}</span>`;

    const impactClass = impact >= 75 ? "score-badge badge-impact high" : "score-badge badge-impact";

    let tr = existingRowsMap.get(item.symbol);
    if (tr) {
      // Check for price change & flash
      const prevPrice = parseFloat(tr.getAttribute("data-price") || "0");
      if (prevPrice > 0 && prevPrice !== item.current_price) {
        flashElement(tr, item.current_price > prevPrice);
      }
      tr.setAttribute("data-price", item.current_price);

      tr.innerHTML = `
        <td class="col-symbol">
          <a href="/pair/${item.symbol}" class="tv-symbol-link" title="${item.symbol} Orderbook Deep Dive">
            ${item.symbol}
          </a>
        </td>
        <td>${typeTag}</td>
        <td class="col-mono">$${formatPrice(item.current_price)}</td>
        <td class="col-mono ${changeClass}">${changeSign}${item.price_change_24h_pct.toFixed(2)}%</td>
        <td class="col-mono">$${formatPrice(item.opportunity_target)}</td>
        <td class="col-mono">${isSqueeze ? "+" : "-"}${item.opportunity_distance}%</td>
        <td class="col-mono" style="font-weight: 700; color: ${isSqueeze ? 'var(--tv-green)' : 'var(--tv-red)'}">${formatUSDT(item.opportunity_cost)}</td>
        <td><span class="score-badge badge-prob">${prob}</span></td>
        <td><span class="${impactClass}">${impact}</span></td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="tv-table-link" onclick="copyShareText('${item.symbol}', '${item.opportunity_side}', ${item.opportunity_cost}, ${item.opportunity_target}, ${prob}, ${impact})" title="Copy Alert for Discord/Telegram" style="cursor: pointer; background: transparent; color: #38bdf8; border-color: rgba(56,189,248,0.3); display: flex; align-items: center; gap: 4px;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
              <span>Share</span>
            </button>
            <a href="/pair/${item.symbol}" class="tv-table-link" style="color: var(--tv-text-secondary); border-color: var(--tv-border);">
              Details
            </a>
            <a href="${getMexcTradeUrl(item)}" target="_blank" rel="noopener noreferrer" class="tv-table-link" title="Trade on MEXC (Fee Discount Applied)">
              MEXC ↗
            </a>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    } else {
      tr = document.createElement("tr");
      tr.setAttribute("data-symbol", item.symbol);
      tr.setAttribute("data-price", item.current_price);
      tr.innerHTML = `
        <td class="col-symbol">
          <a href="/pair/${item.symbol}" class="tv-symbol-link" title="${item.symbol} Orderbook Deep Dive">
            ${item.symbol}
          </a>
        </td>
        <td>${typeTag}</td>
        <td class="col-mono">$${formatPrice(item.current_price)}</td>
        <td class="col-mono ${changeClass}">${changeSign}${item.price_change_24h_pct.toFixed(2)}%</td>
        <td class="col-mono">$${formatPrice(item.opportunity_target)}</td>
        <td class="col-mono">${isSqueeze ? "+" : "-"}${item.opportunity_distance}%</td>
        <td class="col-mono" style="font-weight: 700; color: ${isSqueeze ? 'var(--tv-green)' : 'var(--tv-red)'}">${formatUSDT(item.opportunity_cost)}</td>
        <td><span class="score-badge badge-prob">${prob}</span></td>
        <td><span class="${impactClass}">${impact}</span></td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="tv-table-link" onclick="copyShareText('${item.symbol}', '${item.opportunity_side}', ${item.opportunity_cost}, ${item.opportunity_target}, ${prob}, ${impact})" title="Copy Alert for Discord/Telegram" style="cursor: pointer; background: transparent; color: #38bdf8; border-color: rgba(56,189,248,0.3); display: flex; align-items: center; gap: 4px;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
              <span>Share</span>
            </button>
            <a href="/pair/${item.symbol}" class="tv-table-link" style="color: var(--tv-text-secondary); border-color: var(--tv-border);">
              Details
            </a>
            <a href="${getMexcTradeUrl(item)}" target="_blank" rel="noopener noreferrer" class="tv-table-link" title="Trade on MEXC (Fee Discount Applied)">
              MEXC ↗
            </a>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    }
  });

  // Load more handling for table
  renderLoadMore(tableContainer, totalCount);
}

// Render Card Grid View
function renderCards(items, totalCount) {
  cardsContainer.innerHTML = "";

  if (items.length === 0) {
    cardsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--tv-text-muted); padding: 40px;">${t("noData")}</div>`;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "tv-card";

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

    const impactBadgeClass = impact >= 75 ? "score-badge badge-impact high" : "score-badge badge-impact";

    card.innerHTML = `
      <div>
        <div class="tv-card-header">
          <div class="card-sym-block">
            <a href="/pair/${item.symbol}" class="tv-symbol-link card-symbol">
              ${item.symbol}
            </a>
            <span class="card-price">$${formatPrice(item.current_price)}</span>
          </div>
          <div class="card-badges-row">
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
        <a href="${getMexcTradeUrl(item)}" target="_blank" rel="noopener noreferrer" class="card-action-btn" style="flex: 2;" title="Trade on MEXC (Fee Discount Applied)">
          ${t("tradeOnMexc")} ↗
        </a>
        <button onclick="copyShareText('${item.symbol}', '${item.opportunity_side}', ${item.opportunity_cost}, ${item.opportunity_target}, ${prob}, ${impact})" class="card-action-btn" style="flex: 1; cursor: pointer; color: #38bdf8; display: flex; align-items: center; justify-content: center; gap: 4px;" title="Copy Alert for Discord/Telegram">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
          <span>Share</span>
        </button>
      </div>
    `;

    cardsContainer.appendChild(card);
  });

  // Load more handling for cards
  renderLoadMore(cardsContainer, totalCount);
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
  ];

  tabs.forEach(({ btn, mode }) => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      tabs.forEach((t) => t.btn.classList.remove("active"));
      btn.classList.add("active");
      currentMode = mode;
      displayLimit = 50;
      fetchScanData(true);
    });
  });
}

// Sort Pills Listeners
function setupSortPills() {
  sortChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      sortChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeSortKey = chip.getAttribute("data-sort");
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


// Settings Modal UI & Logic
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

  // Sliders Live Update
  if (cfgMinProb && dispMinProb) {
    cfgMinProb.addEventListener("input", (e) => {
      dispMinProb.textContent = `≥ ${e.target.value}%`;
    });
  }
  if (cfgMinImpact && dispMinImpact) {
    cfgMinImpact.addEventListener("input", (e) => {
      dispMinImpact.textContent = `≥ ${e.target.value}`;
    });
  }
  if (cfgMaxDistance && dispMaxDistance) {
    cfgMaxDistance.addEventListener("input", (e) => {
      dispMaxDistance.textContent = `≤ ${parseFloat(e.target.value).toFixed(1)}%`;
    });
  }
  if (cfgAlertMinProb && dispAlertMinProb) {
    cfgAlertMinProb.addEventListener("input", (e) => {
      dispAlertMinProb.textContent = `≥ ${e.target.value}%`;
    });
  }

  // Apply Settings Button
  if (btnApplySettings) {
    btnApplySettings.addEventListener("click", () => {
      userSettings.minProb = parseInt(cfgMinProb.value, 10) || 0;
      userSettings.minImpact = parseInt(cfgMinImpact.value, 10) || 0;
      userSettings.maxCost = parseFloat(cfgMaxCost.value) || 999999999;
      userSettings.minVol = parseFloat(cfgMinVol.value) || 0;
      userSettings.maxDistance = parseFloat(cfgMaxDistance.value) || 10.0;
      userSettings.alertMinProb = parseInt(cfgAlertMinProb.value, 10) || 70;
      userSettings.alertMaxCost = parseFloat(cfgAlertMaxCost.value) || 5000;

      saveSettings();
      settingsModal.classList.add("hidden");
      renderDashboard();
      showToast("Filter and alert criteria saved & applied.");
    });
  }

  // Reset Defaults Button
  if (btnResetSettings) {
    btnResetSettings.addEventListener("click", () => {
      userSettings = { ...DEFAULT_SETTINGS };
      saveSettings();
      updateSettingsModalUI();
      renderDashboard();
      showToast("Reset to default thresholds.");
    });
  }
}

function updateSettingsModalUI() {
  if (cfgMinProb) cfgMinProb.value = userSettings.minProb;
  if (dispMinProb) dispMinProb.textContent = `≥ ${userSettings.minProb}%`;

  if (cfgMinImpact) cfgMinImpact.value = userSettings.minImpact;
  if (dispMinImpact) dispMinImpact.textContent = `≥ ${userSettings.minImpact}`;

  if (cfgMaxCost) cfgMaxCost.value = userSettings.maxCost;
  if (cfgMinVol) cfgMinVol.value = userSettings.minVol;

  if (cfgMaxDistance) cfgMaxDistance.value = userSettings.maxDistance;
  if (dispMaxDistance) dispMaxDistance.textContent = `≤ ${userSettings.maxDistance.toFixed(1)}%`;

  if (cfgAlertMinProb) cfgAlertMinProb.value = userSettings.alertMinProb;
  if (dispAlertMinProb) dispAlertMinProb.textContent = `≥ ${userSettings.alertMinProb}%`;

  if (cfgAlertMaxCost) cfgAlertMaxCost.value = userSettings.alertMaxCost;
}

function updateActiveFilterBadge() {
  if (!activeFilterBadge) return;
  let count = 0;
  if (userSettings.minProb > DEFAULT_SETTINGS.minProb) count++;
  if (userSettings.minImpact > DEFAULT_SETTINGS.minImpact) count++;
  if (userSettings.maxCost < DEFAULT_SETTINGS.maxCost) count++;
  if (userSettings.minVol > DEFAULT_SETTINGS.minVol) count++;
  if (userSettings.maxDistance < DEFAULT_SETTINGS.maxDistance) count++;

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

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  setupModeTabs();
  setupSortPills();
  setupSearch();
  setupViewToggles();
  setupRefresh();
  setupModal();
  setupSettingsModal();
  setupAudioToggle();

  // Initial Data Load
  fetchScanData(false);

  // Auto-polling every 8 seconds (0ms instant response from backend cache)
  setInterval(() => {
    fetchScanData(false);
  }, 8000);
});
