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

## データについて
- 取得元: TradingView（`scanner.tradingview.com`）
- 表示が遅延する場合や、取引所がデータを配信していない銘柄は「データなし」と表示されます。
