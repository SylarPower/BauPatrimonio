import { mockCloud, signIn } from "./cloud-helpers";
import { test, expect } from "@playwright/test";
for (const width of [320, 390, 1440])
  for (const theme of ["light", "amoled"])
    test(`insight interattivi tutti i formati ${width} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/");
      await page.evaluate((t) => localStorage.setItem("bau-theme", t), theme);
      await page.reload();
      await page
        .getByRole("button", { name: "Prova con dati di esempio" })
        .click();
      await page.locator(".demo-history").click();
      await expect(page.locator(".demo-history")).toHaveCount(0);
      await expect(page.locator(".net-amount")).toContainText("112.000,00");
      for (const f of ["line", "bars", "step"]) {
        await page.getByLabel("Formato andamento").selectOption(f);
        await expect(page.locator(".trend-card svg[role=img]")).toBeVisible();
      }
      await page
        .getByRole("button", { name: "Attività e debiti", exact: true })
        .click();
      await expect(page.locator(".chart-readout")).toContainText("172.000,00");
      await page
        .getByRole("button", { name: "Dati in tabella", exact: true })
        .click();
      await expect(page.locator(".trend-card tbody tr")).toHaveCount(7);
      for (const label of ["Barre", "Tabella", "Anello"])
        await page
          .getByRole("group", { name: "Formato composizione" })
          .getByRole("button", { name: label, exact: true })
          .click();
      for (const by of ["institution", "nature", "category"])
        await page.getByLabel("Ripartizione per").selectOption(by);
      await page
        .getByRole("button", { name: "Confronto e qualità dei dati" })
        .click();
      for (const f of ["Variazioni", "Tabella", "Cascata"])
        await page
          .getByRole("group", { name: "Formato confronto" })
          .getByRole("button", { name: f, exact: true })
          .click();
      await expect(page.locator(".comparison-summary")).not.toContainText(
        "parziale",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width === 320 && theme === "amoled")
        await page.screenshot({
          path: "test-results/insights-mobile-amoled.png",
          fullPage: true,
        });
      if (width === 1440 && theme === "light")
        await page.screenshot({
          path: "test-results/insights-desktop.png",
          fullPage: true,
        });
    });
test("grafici senza esportazioni e privacy preservata", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Prova con dati di esempio" }).click();
  await page.locator(".demo-history").click();
  await expect(
    page
      .locator(".insights")
      .getByRole("button", { name: /esporta|svg|png|csv/i }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Confronto e qualità dei dati" })
    .click();
  await expect(
    page
      .locator(".insights")
      .getByRole("button", { name: /esporta|svg|png|csv/i }),
  ).toHaveCount(0);
  await page
    .getByRole("group", { name: "Ambito dei grafici" })
    .getByRole("button", { name: "Investimenti", exact: true })
    .click();
  await expect(
    page
      .locator(".insights")
      .getByRole("button", { name: /esporta|svg|png|csv/i }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: "Serie del grafico" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Andamento degli investimenti",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Debito / attività note", { exact: true }),
  ).toHaveCount(0);
  const order = await page.locator(".insights").evaluate((el) => {
    const charts = el.querySelector(".insights-grid"),
      performance = el.querySelector(".performance-card");
    return !!(
      charts &&
      performance &&
      charts.compareDocumentPosition(performance) &
        Node.DOCUMENT_POSITION_FOLLOWING
    );
  });
  expect(order).toBe(true);
  await page
    .getByRole("button", { name: "Nascondi importi", exact: true })
    .click();
  await expect(page.locator(".insights")).not.toContainText("8.000,00");
  await expect(page.locator(".insights svg").first()).not.toContainText(
    "8.000",
  );
});
test("punti navigabili da tastiera e grafico parziale senza cascata", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Prova con dati di esempio" }).click();
  await page.locator(".demo-history").click();
  const points = page.locator(".trend-card svg [role=button]");
  await expect(points).toHaveCount(7);
  await points.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(points.nth(1)).toBeFocused();
  await page
    .getByRole("button", { name: "Confronto e qualità dei dati" })
    .click();
  await page.getByLabel("Da", { exact: true }).fill("2000-01-01");
  await expect(page.locator(".comparison-summary")).toContainText(
    "Confronto parziale",
  );
  await expect(page.locator(".comparison-insight .comparison-svg")).toHaveCount(
    0,
  );
});
test("valore non disponibile resta mancante, non zero", async ({ page }) => {
  await page.goto("/");
  await mockCloud(page);
  await page.getByRole("button", { name: "Accedi o crea account" }).click();
  await signIn(page);
  await page.getByRole("button", { name: "Aggiungi la prima voce" }).click();
  await page.getByRole("button", { name: "Immobili", exact: false }).click();
  await page.getByLabel("Nome della voce").fill("Stima da fare");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(page.locator(".net-card")).toContainText("Totale parziale");
  await expect(page.locator(".asset-row")).toContainText("Non disponibile");
});

test("nessun import CSV: strumenti manuali e prezzi separati dal patrimonio", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Prova con dati di esempio" }).click();
  await page
    .locator(".desktop-nav")
    .getByRole("button", { name: "Patrimonio", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Azioni ed ETF · prezzi" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Apri prezzi e storico/ }),
  ).toHaveCount(0);
  await page
    .getByText("Prezzi e grafici online · TradingView", { exact: true })
    .click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByLabel("Simbolo e borsa", { exact: true }).fill("NASDAQ:AAPL");
  await page.route("https://s3.tradingview.com/**", (r) =>
    r.fulfill({ contentType: "application/javascript", body: "" }),
  );
  await page.getByRole("button", { name: "Carica grafico online" }).click();
  await expect(
    page.getByTitle("Prezzi e storico di mercato TradingView"),
  ).toBeVisible();
  await expect(
    page.getByTitle("Prezzi e storico di mercato TradingView"),
  ).toHaveAttribute(
    "sandbox",
    "allow-scripts allow-popups allow-popups-to-escape-sandbox",
  );
  await page.getByRole("button", { name: "Chiudi grafico online" }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page
    .locator(".desktop-nav")
    .getByRole("button", { name: "Movimenti", exact: true })
    .click();
  await page.getByRole("button", { name: "Importa Excel Fideuram" }).click();
  await expect(page.locator("input[type=file]")).toHaveAttribute(
    "accept",
    /xlsx/,
  );
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "vecchio.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("data;importo"),
    });
  await expect(page.getByRole("alert")).toContainText("Scegli un file .xlsx");
});

test("rimborso con interessi registra solo la perdita per interessi", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Prova con dati di esempio" }).click();
  await page
    .locator(".desktop-nav")
    .getByRole("button", { name: "Patrimonio", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Registra operazione", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Operazione", exact: true })
    .selectOption("repay");
  await page
    .getByLabel("Capitale di mia competenza (EUR)", { exact: true })
    .fill("1000");
  await page
    .getByLabel("Interessi pagati di mia competenza (EUR)", { exact: true })
    .fill("100");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Registra operazione", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .locator(".desktop-nav")
    .getByRole("button", { name: "Panoramica", exact: true })
    .click();
  await expect(page.locator(".net-amount")).toContainText("111.900,00");
});
