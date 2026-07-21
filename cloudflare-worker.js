// ============================================================
// ウォッチリスト用 データ中継プロキシ（Cloudflare Workers）
// ------------------------------------------------------------
// Yahoo Finance の株価データを取得し、CORS ヘッダを付けて返す。
// ブラウザ（Web アプリ）から直接取得できない Yahoo のデータを、
// このプロキシ経由で取得できるようにする。
//
// 使い方（レスポンス例）:
//   GET https://<your-worker>.workers.dev/?symbols=^N225,^TPX
//   → {"data":{"^N225":{"price":64953.6,"change":1.27,"change_abs":812.5}, ...}}
//
// デプロイ手順は webapp/README.md を参照。
// ============================================================

export default {
  async fetch(request) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          ...cors,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    const url = new URL(request.url);
    const symbols = (url.searchParams.get("symbols") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20); // 上限20件（安全のため）

    if (symbols.length === 0) {
      return new Response(JSON.stringify({ error: "symbols required" }), {
        status: 400,
        headers: cors,
      });
    }

    const out = {};
    await Promise.all(
      symbols.map(async (sym) => {
        try {
          const y =
            "https://query1.finance.yahoo.com/v8/finance/chart/" +
            encodeURIComponent(sym) +
            "?interval=1d&range=1d";
          const r = await fetch(y, {
            headers: { "User-Agent": "Mozilla/5.0" },
            cf: { cacheTtl: 2, cacheEverything: true },
          });
          if (!r.ok) return;
          const j = await r.json();
          const m =
            j && j.chart && j.chart.result && j.chart.result[0]
              ? j.chart.result[0].meta
              : null;
          if (!m || m.regularMarketPrice == null) return;
          const price = m.regularMarketPrice;
          const prev = m.chartPreviousClose;
          const change_abs = prev != null ? price - prev : null;
          const change = prev ? (change_abs / prev) * 100 : null;
          out[sym] = { price, change, change_abs };
        } catch (e) {
          /* 個別失敗は無視 */
        }
      })
    );

    return new Response(JSON.stringify({ data: out }), { headers: cors });
  },
};
