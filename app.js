"use strict";

const FIELDS = "close,change,change_abs";
const ENDPOINT = "https://scanner.tradingview.com/symbol";
const REFRESH_MS = 30000;

const listEl = document.getElementById("list");
const updatedEl = document.getElementById("updated");
const refreshBtn = document.getElementById("refresh");
const autoToggle = document.getElementById("autoToggle");

let autoTimer = null;

/* ---------- 描画（行の骨組みを最初に作る） ---------- */
function rowId(symbol) {
  return "row-" + symbol.replace(/[^a-zA-Z0-9]/g, "_");
}

function buildSkeleton() {
  listEl.innerHTML = "";
  for (const item of WATCHLIST) {
    if (item.section) {
      const h = document.createElement("div");
      h.className = "section-head";
      h.textContent = item.section;
      listEl.appendChild(h);
      continue;
    }
    const row = document.createElement("div");
    row.className = "row loading";
    row.id = rowId(item.symbol);
    row.addEventListener("click", () => openChart(item.symbol, item.name || item.symbol));
    row.innerHTML = `
      <div class="name-cell">
        <div class="name">${escapeHtml(item.name || item.symbol)}</div>
        <div class="symbol">${escapeHtml(item.symbol)}</div>
      </div>
      <div class="value-cell">
        <div class="price">—</div>
        <div class="change"></div>
      </div>`;
    listEl.appendChild(row);
  }
}

/* ---------- 数値フォーマット ---------- */
function decimalsFor(abs) {
  if (abs >= 10000) return 0;
  if (abs >= 100) return 2;
  if (abs >= 1) return 3;
  return 4;
}

function fmtNumber(n, decimals) {
  return n.toLocaleString("ja-JP", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* ---------- 1件分のデータ取得 ---------- */
async function fetchQuote(symbol) {
  const url = `${ENDPOINT}?symbol=${encodeURIComponent(symbol)}&fields=${FIELDS}&no_404=true`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json(); // { close, change, change_abs } または null
}

function renderRow(symbol, data) {
  const row = document.getElementById(rowId(symbol));
  if (!row) return;
  row.classList.remove("loading");

  const priceEl = row.querySelector(".price");
  const changeEl = row.querySelector(".change");

  if (!data || data.close == null) {
    priceEl.innerHTML = '<span class="na">データなし</span>';
    changeEl.innerHTML = "";
    return;
  }

  const price = data.close;
  const chgAbs = data.change_abs;
  const chgPct = data.change;
  const dec = decimalsFor(Math.abs(price));

  priceEl.textContent = fmtNumber(price, dec);

  const dir = (chgPct > 0) ? "up" : (chgPct < 0) ? "down" : "flat";
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "—";
  const sign = chgAbs > 0 ? "+" : "";

  const absStr = (chgAbs == null) ? "—" : sign + fmtNumber(chgAbs, dec);
  const pctStr = (chgPct == null) ? "—"
    : (chgPct > 0 ? "+" : "") + chgPct.toFixed(2) + "%";

  changeEl.innerHTML =
    `<span class="${dir}">${arrow} ${absStr}</span>` +
    `<span class="chg-pct ${dir}">${pctStr}</span>`;
}

/* ---------- 全件更新 ---------- */
async function refreshAll() {
  refreshBtn.classList.add("spinning");
  const symbols = WATCHLIST.filter((i) => i.symbol).map((i) => i.symbol);

  await Promise.allSettled(
    symbols.map(async (sym) => {
      try {
        const data = await fetchQuote(sym);
        renderRow(sym, data);
      } catch (e) {
        renderRow(sym, null);
      }
    })
  );

  const now = new Date();
  updatedEl.textContent = "更新 " +
    now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  refreshBtn.classList.remove("spinning");
}

/* ---------- 自動更新 ---------- */
function setAuto(on) {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  if (on) autoTimer = setInterval(refreshAll, REFRESH_MS);
}

// アプリが裏に回っている間は更新を止め、復帰時に即更新（スマホの電池節約）
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  } else {
    refreshAll();
    setAuto(autoToggle.checked);
  }
});

/* ---------- 月足チャート モーダル ---------- */
const modal = document.getElementById("chartModal");
const chartFrame = document.getElementById("chartFrame");
const chartName = document.getElementById("chartName");
const chartSymbol = document.getElementById("chartSymbol");
const chartLoading = document.getElementById("chartLoading");
const chartClose = document.getElementById("chartClose");
const chartOpenTV = document.getElementById("chartOpenTV");

// 埋め込みウィジェットでは表示できない指数を、表示可能な近似シンボルへ変換
// （株価データ表は正確な元シンボルのまま。チャートのみ差し替える）
const CHART_SYMBOL_MAP = {
  "SP:SPX": "OANDA:SPX500USD",      // S&P 500
  "NASDAQ:NDX": "OANDA:NAS100USD",  // ナスダック100
  "TVC:DJI": "OANDA:US30USD",       // NYダウ
  "TVC:NI225": "OANDA:JP225USD"     // 日経平均
};

function openChart(symbol, name) {
  const chartSym = CHART_SYMBOL_MAP[symbol] || symbol;

  chartName.textContent = name;
  chartSymbol.textContent = symbol;
  chartLoading.style.display = "flex";

  // 「TradingViewで開く」は常に元シンボルでフルチャートを表示
  chartOpenTV.href = "https://www.tradingview.com/chart/?symbol=" +
    encodeURIComponent(symbol) + "&interval=1M";

  const params = new URLSearchParams({
    frameElementId: "tv_chart",
    symbol: chartSym,
    interval: "M",          // M = 月足
    theme: "dark",
    style: "1",             // ローソク足
    locale: "ja",
    timezone: "Asia/Tokyo",
    withdateranges: "1",
    hidesidetoolbar: "1",
    hidetoptoolbar: "0",
    allow_symbol_change: "0",
    hideideas: "1",
    saveimage: "0",
    toolbarbg: "161b22"
  });
  chartFrame.onload = () => { chartLoading.style.display = "none"; };
  chartFrame.src = "https://s.tradingview.com/widgetembed/?" + params.toString();

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeChart() {
  modal.hidden = true;
  chartFrame.src = "about:blank";
  document.body.style.overflow = "";
}

chartClose.addEventListener("click", closeChart);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) closeChart();
});

/* ---------- 初期化 ---------- */
refreshBtn.addEventListener("click", refreshAll);
autoToggle.addEventListener("change", () => setAuto(autoToggle.checked));

buildSkeleton();
refreshAll();
setAuto(autoToggle.checked);

/* ---------- PWA: Service Worker 登録（ホーム画面追加・オフライン対応） ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
