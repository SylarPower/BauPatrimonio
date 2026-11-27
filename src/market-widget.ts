/** Official hosted widget: no API key, no market data stored in the vault.
 * Kept in an opaque-origin sandbox, never executed in the application document. */
export function marketDocument(symbol: string, dark: boolean) {
  if (!/^[A-Z0-9_]+:[A-Z0-9_.!/-]+$/i.test(symbol) || symbol.length > 80)
    throw Error("Inserisci BORSA:SIMBOLO, ad esempio NASDAQ:AAPL.");
  const config = JSON.stringify({
    autosize: true,
    symbol,
    interval: "D",
    timezone: "Europe/Rome",
    theme: dark ? "dark" : "light",
    style: "3",
    locale: "it",
    allow_symbol_change: true,
    save_image: false,
    calendar: false,
    hide_side_toolbar: true,
    range: "12M",
    support_host: "https://www.tradingview.com",
  }).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="it"><head><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,.tradingview-widget-container{margin:0;width:100%;height:100%}.tradingview-widget-container__widget{height:calc(100% - 32px);width:100%}a{color:${dark ? "#b8d6bf" : "#345b43"}}</style></head><body><div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div><div><a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">Track all markets on TradingView</a></div><script src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>${config}</script></div></body></html>`;
}
