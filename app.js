"use strict";

const FIELDS = "close,change,change_abs";
const SYMBOL_ENDPOINT = "https://scanner.tradingview.com/symbol";
const SCAN_ENDPOINT = "https://scanner.tradingview.com/global/scan";
const REFRESH_MS = 5000;             // 自動更新の通常間隔（5秒）
const MAX_BACKOFF_MS = 10 * 60000;   // 取得制限時のバックオフ上限（10分）
const CONCURRENCY = 5;               // 個別取得フォールバック時の同時実行数

const listEl = document.getElementById("list");
const updatedEl = document.getElementById("updated");
const refreshBtn = document.getElementById("refresh");
const autoToggle = document.getElementById("autoToggle");

let autoTimer = null;
let isRefreshing = false;
let backoffMs = 0;        // 現在のバックオフ時間
let nextAllowedAt = 0;    // この時刻まで自動更新を控える
let batchEnabled = true;  // まとめ取得を使うか（構造的に失敗し続けたら自動でoff）
let batchFailStreak = 0;  // まとめ取得の連続失敗回数（CORS/404等の判定用）
const lastGood = {};      // symbol -> 直近の正常データ（取得失敗時に保持表示）

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

/* ---------- データ取得 ---------- */
// まとめて取得（1リクエストで全銘柄）。これが本命でリクエスト数を最小化する。
async function fetchBatch(symbols) {
  let res;
  try {
    // Content-Type を付けない＝単純リクエストにして CORS プリフライトを回避する
    res = await fetch(SCAN_ENDPOINT, {
      method: "POST",
      cache: "no-store",
      body: JSON.stringify({ symbols: { tickers: symbols }, columns: FIELDS.split(",") })
    });
  } catch (e) {
    return { ok: false, rateLimited: false };
  }
  if (res.status === 429) return { ok: false, rateLimited: true };
  if (!res.ok) return { ok: false, rateLimited: false };

  let json;
  try { json = await res.json(); } catch (e) { return { ok: false, rateLimited: false }; }
  if (!json || !Array.isArray(json.data)) return { ok: false, rateLimited: false };

  const map = {};
  for (const row of json.data) {
    const d = row.d || [];
    map[row.s] = { close: d[0], change: d[1], change_abs: d[2] };
  }
  return { ok: true, map };
}

// 個別取得（バッチが使えないときのフォールバック）。同時実行数を絞る。
async function fetchPerSymbol(symbols) {
  const map = {};
  let rateLimited = false;
  let i = 0;
  async function worker() {
    while (i < symbols.length) {
      const sym = symbols[i++];
      try {
        const res = await fetch(
          `${SYMBOL_ENDPOINT}?symbol=${encodeURIComponent(sym)}&fields=${FIELDS}&no_404=true`,
          { cache: "no-store" }
        );
        if (res.status === 429) { rateLimited = true; continue; }
        if (!res.ok) continue;
        map[sym] = await res.json(); // {close,change,change_abs} または null
      } catch (e) { /* ネットワークエラーは無視（保持表示にまかせる） */ }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, symbols.length) }, worker)
  );
  return { map, rateLimited };
}

/* ---------- 描画 ---------- */
function paintRow(priceEl, changeEl, data) {
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

// status: 'ok'（取得成功）/ 'nodata'（応答あり・値なし）/ 'fail'（取得失敗=429等）
function renderRow(symbol, data, status) {
  const row = document.getElementById(rowId(symbol));
  if (!row) return;
  row.classList.remove("loading");
  const priceEl = row.querySelector(".price");
  const changeEl = row.querySelector(".change");

  if (status === "ok" && data && data.close != null) {
    lastGood[symbol] = data;
    row.classList.remove("stale");
    paintRow(priceEl, changeEl, data);
    return;
  }

  // 取得できなかった場合：直近の正常値があれば保持して薄く表示
  if (lastGood[symbol]) {
    row.classList.add("stale");
    paintRow(priceEl, changeEl, lastGood[symbol]);
    return;
  }

  // 一度も取得できていない
  row.classList.remove("stale");
  priceEl.innerHTML = (status === "nodata")
    ? '<span class="na">データなし</span>'
    : '<span class="na">—</span>';
  changeEl.innerHTML = "";
}

/* ---------- 全件更新 ---------- */
async function refreshAll(manual) {
  if (isRefreshing) return;
  if (!manual && Date.now() < nextAllowedAt) return; // バックオフ中は自動更新を控える

  isRefreshing = true;
  refreshBtn.classList.add("spinning");

  const symbols = WATCHLIST.filter((i) => i.symbol).map((i) => i.symbol);

  let map = null;
  let rateLimited = false;

  // 1) まとめ取得を優先（使える環境なら1リクエストで完了）
  if (batchEnabled) {
    const batch = await fetchBatch(symbols);
    if (batch.ok) {
      map = batch.map;
      batchFailStreak = 0;
    } else if (batch.rateLimited) {
      rateLimited = true; // バッチは存在するが制限中。無効化はしない。
    } else {
      // CORS非対応・404・ネットワーク等の構造的失敗 → 2回続いたらバッチを使わない
      if (++batchFailStreak >= 2) batchEnabled = false;
    }
  }

  // 2) まとめ取得で取れなければ個別取得にフォールバック
  if (!map) {
    const fb = await fetchPerSymbol(symbols);
    map = fb.map;
    rateLimited = rateLimited || fb.rateLimited;
  }

  // 描画
  let okCount = 0;
  for (const sym of symbols) {
    if (map && Object.prototype.hasOwnProperty.call(map, sym)) {
      const d = map[sym];
      if (d && d.close != null) { renderRow(sym, d, "ok"); okCount++; }
      else renderRow(sym, null, "nodata");
    } else {
      renderRow(sym, null, "fail");
    }
  }

  // 状態表示・バックオフ制御
  const now = new Date();
  if (okCount === 0) {
    // 全滅（多くは429）→ 次回まで間隔を空ける
    backoffMs = Math.min(backoffMs ? backoffMs * 2 : REFRESH_MS, MAX_BACKOFF_MS);
    nextAllowedAt = Date.now() + backoffMs;
    const sec = Math.round(backoffMs / 1000);
    updatedEl.textContent = rateLimited
      ? `⚠ 取得制限中 — ${sec}秒後に再取得`
      : `⚠ 取得失敗 — ${sec}秒後に再取得`;
  } else {
    backoffMs = 0;
    nextAllowedAt = 0;
    const t = now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    updatedEl.textContent = (okCount < symbols.length)
      ? `更新 ${t}（${okCount}/${symbols.length}）`
      : `更新 ${t}`;
  }

  refreshBtn.classList.remove("spinning");
  isRefreshing = false;
}

/* ---------- 自動更新 ---------- */
function setAuto(on) {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  if (on) autoTimer = setInterval(() => refreshAll(false), REFRESH_MS);
}

// アプリが裏に回っている間は更新を止め、復帰時に再取得（スマホの電池節約）
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  } else {
    refreshAll(false);
    setAuto(autoToggle.checked);
  }
});

/* ---------- 月足チャート モーダル ---------- */
const modal = document.getElementById("chartModal");
const chartFrame = document.getElementById("chartFrame");
const chartImgWrap = document.getElementById("chartImgWrap");
const chartImg = document.getElementById("chartImg");
const chartImgNote = document.getElementById("chartImgNote");
const chartImgError = document.getElementById("chartImgError");
const chartName = document.getElementById("chartName");
const chartSymbol = document.getElementById("chartSymbol");
const chartLoading = document.getElementById("chartLoading");
const chartClose = document.getElementById("chartClose");
const chartOpenExt = document.getElementById("chartOpenExt");
const srcToggle = document.getElementById("srcToggle");

// TradingView 埋め込みで表示できない指数を、表示可能な近似シンボルへ変換
const CHART_SYMBOL_MAP = {
  "CBOE:SPX": "OANDA:SPX500USD",    // S&P 500
  "NASDAQ:NDX": "OANDA:NAS100USD",  // ナスダック100
  "TVC:DJI": "OANDA:US30USD",       // NYダウ
  "TVC:NI225": "OANDA:JP225USD"     // 日経平均
};

// Stooq で月足チャートを取得できる銘柄（元シンボル → Stooqシンボル）
const STOOQ_MAP = {
  "NASDAQ:NDX": "^ndq", "CBOE:SPX": "^spx", "TVC:DJI": "^dji",
  "TVC:NI225": "^nkx", "TSE:TOPIX": "^tpx", "BSE:SENSEX": "^snx",
  "TSE:7974": "7974.jp", "TSE:200A": "200a.jp", "TSE:1694": "1694.jp",
  "TSE:1543": "1543.jp", "TSE:1692": "1692.jp", "TSE:224A": "224a.jp",
  "TSE:1632": "1632.jp",
  "FX:USDJPY": "usdjpy", "TVC:GOLD": "xauusd"
};

// TradingView では表示できず Stooq なら表示できる銘柄 → 最初から Stooq を表示
const STOOQ_DEFAULT = new Set([
  "TSE:7974", "TSE:200A", "TSE:1694", "TSE:1543", "TSE:1692", "TSE:224A",
  "TSE:1632", "TSE:TOPIX", "BSE:SENSEX"
]);

let curSymbol = "";

function openChart(symbol, name) {
  curSymbol = symbol;
  chartName.textContent = name;
  chartSymbol.textContent = symbol;

  const hasStooq = !!STOOQ_MAP[symbol];
  srcToggle.hidden = !hasStooq; // Stooq対応銘柄のみ切替を表示

  modal.hidden = false;
  document.body.style.overflow = "hidden";

  // 既定ソースを決定（TVで表示できない銘柄はStooqを優先）
  showSource((hasStooq && STOOQ_DEFAULT.has(symbol)) ? "stooq" : "tv");
}

function showSource(src) {
  // トグルの選択状態を更新
  for (const b of srcToggle.querySelectorAll(".src-btn")) {
    b.classList.toggle("active", b.dataset.src === src);
  }
  chartLoading.style.display = "flex";

  if (src === "stooq") {
    // Stooqシンボルは ^ や . のみで安全。encodeURIComponent で ^→%5E にすると
    // Stooq側がチャートを返さない（TOPIX=^tpx 等が表示されない）ため、生で渡す。
    const t = STOOQ_MAP[curSymbol];
    chartFrame.hidden = true;
    chartFrame.src = "about:blank";
    chartImgWrap.hidden = false;
    chartImgError.hidden = true;
    chartImgNote.hidden = false;
    chartImg.style.display = "";
    chartImg.onload = () => {
      chartLoading.style.display = "none";
      chartImgError.hidden = true;
      chartImgNote.hidden = false;
      chartImg.style.display = "";
    };
    chartImg.onerror = () => {
      chartLoading.style.display = "none";
      chartImg.style.display = "none";
      chartImgNote.hidden = true;
      chartImgError.hidden = false;
    };
    chartImg.src = `https://stooq.com/c/?s=${t}&c=10y&t=c&a=lg&i=m`;
    chartOpenExt.textContent = "Stooq ↗";
    chartOpenExt.href = `https://stooq.com/q/?s=${t}`;
  } else {
    chartImgWrap.hidden = true;
    chartImg.src = "";
    chartFrame.hidden = false;
    const chartSym = CHART_SYMBOL_MAP[curSymbol] || curSymbol;
    chartFrame.onload = () => { chartLoading.style.display = "none"; };
    chartFrame.src = "chart.html?symbol=" + encodeURIComponent(chartSym) + "&interval=M";
    chartOpenExt.textContent = "TV ↗";
    chartOpenExt.href = "https://www.tradingview.com/chart/?symbol=" +
      encodeURIComponent(curSymbol) + "&interval=1M";
  }
}

function closeChart() {
  modal.hidden = true;
  chartFrame.src = "about:blank";
  chartImg.src = "";
  document.body.style.overflow = "";
}

srcToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".src-btn");
  if (btn) showSource(btn.dataset.src);
});
chartClose.addEventListener("click", closeChart);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) closeChart();
});

/* ---------- 初期化 ---------- */
refreshBtn.addEventListener("click", () => refreshAll(true)); // 手動更新はバックオフ無視
autoToggle.addEventListener("change", () => setAuto(autoToggle.checked));

buildSkeleton();
refreshAll(false);
setAuto(autoToggle.checked);

/* ---------- PWA: Service Worker 登録（ホーム画面追加・オフライン対応） ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
