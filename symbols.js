// ウォッチリスト定義
// Excel「ウォッチリスト.xlsx」の内容をもとに作成。
// "###" で始まる行はセクション（画面上の区分）として扱われる。
// symbol は TradingView 形式（取引所:ティッカー）。
// name は画面表示用の名称（任意。未設定ならティッカーを表示）。

const WATCHLIST = [
  { section: "米国株式" },
  { symbol: "NASDAQ:NDX", name: "ナスダック100" },
  { symbol: "SP:SPX", name: "S&P 500" },
  { symbol: "TVC:VIX", name: "VIX 恐怖指数" },
  { symbol: "NASDAQ:SOX", name: "SOX 半導体指数" },
  { symbol: "TVC:RUT", name: "ラッセル2000" },
  { symbol: "TVC:DJI", name: "NY ダウ" },

  { section: "日本株式" },
  { symbol: "TSE:TOPIX", name: "TOPIX" },
  { symbol: "TVC:NI225", name: "日経平均株価" },
  { symbol: "TSE:7974", name: "任天堂" },
  { symbol: "TSE:200A", name: "半導体 200A" },

  { section: "先物" },
  { symbol: "OSE:NK2251!", name: "日経225先物（大阪）" },
  { symbol: "CME:NKD1!", name: "CME 日経先物（ドル）" },
  { symbol: "CME_MINI:NQ1!", name: "ナスダック100先物（E-mini）" },

  { section: "アジア株式" },
  { symbol: "NSE:NIFTY", name: "NIFTY 50（インド）" },
  { symbol: "BSE:SENSEX", name: "SENSEX（インド）" },
  { symbol: "HOSE:VNINDEX", name: "VN指数（ベトナム）" },

  { section: "商品" },
  { symbol: "TVC:GOLD", name: "金（ゴールド）" },
  { symbol: "TVC:SILVER", name: "銀（シルバー）" },
  { symbol: "AMEX:COPX", name: "銅鉱株 ETF（COPX）" },
  { symbol: "TSE:1694", name: "ニッケル 1694" },
  { symbol: "AMEX:PPLT", name: "プラチナ ETF（PPLT）" },
  { symbol: "TSE:1543", name: "純パラジウム上場信託" },
  { symbol: "TSE:1692", name: "アルミ 1692" },
  { symbol: "TSE:224A", name: "ウラン 224A" },
  { symbol: "FX:USOIL", name: "WTI 原油" },

  { section: "債券" },
  { symbol: "TVC:US02Y", name: "米2年債 利回り" },
  { symbol: "TVC:US10Y", name: "米10年債 利回り" },
  { symbol: "TVC:JP02Y", name: "日本2年債 利回り" },
  { symbol: "TVC:JP10Y", name: "日本10年債 利回り" },

  { section: "為替" },
  { symbol: "FX:USDJPY", name: "米ドル / 円" },
  { symbol: "FX:EURJPY", name: "ユーロ / 円" },
  { symbol: "FX_IDC:INRJPY", name: "インドルピー / 円" },
  { symbol: "FX:NZDJPY", name: "NZドル / 円" },
  { symbol: "FX:AUDJPY", name: "豪ドル / 円" },
  { symbol: "OANDA:ZARJPY", name: "南アランド / 円" },

  { section: "仮想通貨" },
  { symbol: "BITFLYER:XRPJPY", name: "リップル / 円" },
  { symbol: "KRAKEN:ETHJPY", name: "イーサリアム / 円" },
  { symbol: "BITFLYER:BTCJPY", name: "ビットコイン / 円" }
];
