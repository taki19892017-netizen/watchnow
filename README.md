# ウォッチリスト（スマホ対応 Web / PWA 版）

株価指数・為替・商品・債券・仮想通貨の現在値、前日比、前日比%を表示するスマホ対応Webアプリです。
ブラウザで開くだけで使え、「ホーム画面に追加」でアプリのように使えます（PWA）。

## ファイル構成
- `index.html` … 画面
- `styles.css` … ダークモード・レスポンシブデザイン
- `app.js` … データ取得・表示ロジック
- `symbols.js` … 銘柄リスト（ここを編集すれば銘柄を変更できます）
- `manifest.webmanifest` / `sw.js` … PWA（ホーム画面追加・オフライン対応）
- `icons/` … アプリアイコン

## 公開方法（おすすめ：GitHub Pages・無料）
1. GitHub で公開リポジトリを作成する
2. この `webapp` フォルダの中身をリポジトリにアップロードする
3. リポジトリの Settings → Pages → 「Deploy from a branch」→ branch: main / 対象フォルダを選択して保存
4. 数分後に `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開される

※ PWA（ホーム画面追加）は HTTPS が必要です。GitHub Pages は自動でHTTPS対応なのでそのまま使えます。
※ 他に Netlify / Cloudflare Pages へのドラッグ&ドロップでも公開できます。

## スマホでホーム画面に追加する
- **iPhone（Safari）**: 共有ボタン → 「ホーム画面に追加」
- **Android（Chrome）**: メニュー（⋮）→ 「アプリをインストール」または「ホーム画面に追加」

追加すると、アドレスバーのないフルスクリーンのアプリとして起動します。

## 銘柄の編集
`symbols.js` を編集します。
- `{ section: "セクション名" }` … 画面の区分（見出し）
- `{ symbol: "取引所:ティッカー", name: "表示名" }` … 銘柄（TradingView形式）

## 月足チャート
各銘柄の行をタップ（クリック）すると、月足ローソク足チャートが全画面で開きます。
- 為替・株式・ETF・商品・暗号資産などは、そのままアプリ内に表示されます（RSI・MACD付き）。
- 主要な米国指数・日経平均は、埋め込み表示できないため近いシンボル（CFD）に自動変換して表示します。
- **TradingViewで表示できない銘柄（TSE個別株・ETF・TOPIX・SENSEXなど）は、Stooqの月足チャート画像をアプリ内に表示します。**
- Stooq対応銘柄ではヘッダーの「**TV / Stooq**」で表示元を切り替えられます。
- どちらでも表示できない銘柄（VIX・Russell2000・SOX・Nifty・VNINDEXなど）は「**↗**」ボタンからTradingView／Stooqの正式チャートを開けます。

## データ中継プロキシ（Cloudflare Worker／任意）
一部の銘柄（例：日経225現物 `TVC:NI225`）は TradingView 側のデータが古い値のまま
固まることがあります。その場合、Yahoo Finance の値で補完できます。
Yahoo はブラウザから直接取得できない（CORS 非対応）ため、無料の Cloudflare Worker を
中継として使います。

### デプロイ手順
1. https://dash.cloudflare.com/ に無料登録・ログイン
2. 左メニュー「Workers & Pages」→「Create application」→「Create Worker」
3. 名前を付けて（例：`watchnow-proxy`）「Deploy」
4. 「Edit code」を開き、`cloudflare-worker.js` の内容を全て貼り付けて「Deploy」
5. 発行された URL（例：`https://watchnow-proxy.xxxx.workers.dev`）をコピー
6. 動作確認：ブラウザで `https://watchnow-proxy.xxxx.workers.dev/?symbols=^N225` を開き、
   `{"data":{"^N225":{"price":...}}}` のような JSON が返れば成功
7. `app.js`（Web）と `popup.js`（拡張機能）の `const YAHOO_PROXY = ""` に、コピーした URL を設定

`YAHOO_PROXY` が空文字の間は補完は行われず、TradingView の値のみを使います。
補完対象の銘柄は `YAHOO_MAP`（元シンボル → Yahooシンボル）で調整できます。

## データについて
- 取得元: TradingView（`scanner.tradingview.com`）
- 表示が遅延する場合や、取引所がデータを配信していない銘柄は「データなし」と表示されます。
