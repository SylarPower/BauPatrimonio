import { expect, it } from "vitest";
import { marketDocument } from "./market-widget";
it("rejects markup and unqualified symbols", () => {
  for (const s of [
    "<script>alert(1)</script>",
    "AAPL",
    "NASDAQ:AAPL</script>",
    "",
    "x".repeat(81),
  ])
    expect(() => marketDocument(s, false)).toThrow();
});
it("embeds only an explicit symbol with official attribution, no personal data", () => {
  const doc = marketDocument("NASDAQ:AAPL", true);
  expect(doc).toContain('"symbol":"NASDAQ:AAPL"');
  expect(doc).toContain('"theme":"dark"');
  expect(doc).toContain('"save_image":false');
  expect(doc).toContain(
    "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js",
  );
  expect(doc).toContain("Track all markets on TradingView");
  expect(doc).not.toContain("localStorage");
});
