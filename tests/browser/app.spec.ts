import { test, expect } from "@playwright/test";
test("welcome, demo corretta, privacy e archivi separati", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Il tuo patrimonio. In chiaro." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Prova con dati di esempio" }).click();
  await expect(page.locator(".net-amount")).toContainText("112.000,00");
  await expect(page.locator(".net-bottom")).toContainText("172.000,00");
  await expect(page.locator(".net-bottom")).toContainText("60.000,00");
  await expect(page.locator(".chart-wrap polyline")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Nascondi importi", exact: true })
    .click();
  await expect(page.locator(".net-amount")).not.toContainText("112.000");
  await page
    .getByRole("button", { name: "Mostra importi", exact: true })
    .click();
  await page.getByRole("button", { name: "Passa al mio patrimonio" }).click();
  await expect(page.locator(".net-amount")).toContainText("0,00");
  await page.getByRole("button", { name: "Aggiungi la prima voce" }).click();
  await page
    .getByRole("button", { name: "Conto corrente e liquidità" })
    .click();
  await page.getByLabel("Nome della voce").fill("Primo conto");
  await page.getByLabel("Saldo contabile").fill("1234,56");
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(page.locator(".net-amount")).toContainText("1.234,56");
  await page.reload();
  await expect(page.locator(".net-amount")).toContainText("1.234,56");
});
for (const width of [320, 390, 1440])
  for (const theme of ["light", "amoled"])
    test(`navigazione e layout ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.evaluate((t) => localStorage.setItem("bau-theme", t), theme);
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page
        .getByRole("button", { name: "Prova con dati di esempio" })
        .click();
      const nav = page.locator(width < 700 ? ".mobile-nav" : ".desktop-nav");
      for (const name of ["Panoramica", "Patrimonio", "Storico", "Fonti"]) {
        await nav.getByRole("button", { name, exact: true }).click();
        await expect(page.locator(".page-heading h1")).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
      await (
        width < 700 ? page.locator(".mobile-add") : page.locator(".add-desktop")
      ).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });
test("importazione ripetuta non duplica e trasferimento non cambia netto", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Prova con dati di esempio" }).click();
  await page
    .locator(".desktop-nav")
    .getByRole("button", { name: "Patrimonio" })
    .click();
  await page.getByRole("button", { name: "Trasferisci", exact: true }).click();
  await page.getByLabel("Importo in EUR").fill("1000");
  await page.getByRole("button", { name: "Registra trasferimento" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".asset-group").first()).toContainText("11.000,00");
  await page
    .locator(".desktop-nav")
    .getByRole("button", { name: "Panoramica" })
    .click();
  await expect(page.locator(".net-amount")).toContainText("112.000,00");
  await page
    .locator(".desktop-nav")
    .getByRole("button", { name: "Fonti" })
    .click();
  const file = {
    name: "movimenti.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "data;importo;valuta;descrizione;id\n2026-11-01;-45,50;EUR;Spesa;op001\n2026-11-01;-45,50;EUR;Altra spesa;op002",
    ),
  };
  for (let i = 0; i < 2; i++) {
    await page.locator(".import-choices>button").nth(1).click();
    await page.locator("input[type=file]").setInputFiles(file);
    await page.getByRole("button", { name: "Verifica anteprima" }).click();
    if (i === 0) {
      await expect(page.locator(".import-stats")).toContainText("2 valide");
      await page.getByRole("button", { name: "Conferma 2 righe" }).click();
    } else
      await expect(page.getByRole("alert")).toContainText(
        "già stato importato",
      );
  }
});
test("screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await page.screenshot({ path: "test-results/welcome.png", fullPage: true });
  await page.getByRole("button", { name: "Prova con dati di esempio" }).click();
  await expect(page.locator(".net-amount")).toBeVisible();
  await page.screenshot({ path: "test-results/overview.png", fullPage: true });
});

test("dettaglio strumenti riconciliato senza doppio conteggio", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Prova con dati di esempio" }).click();
  await page
    .locator(".desktop-nav")
    .getByRole("button", { name: "Patrimonio", exact: true })
    .click();
  await page
    .locator(".asset-row")
    .filter({ hasText: "Portafoglio ETF" })
    .click();
  await page
    .getByRole("button", { name: "Dettaglio strumenti e riconciliazione" })
    .click();
  await page.getByLabel("Nome", { exact: true }).fill("ETF globale");
  await page.getByLabel("Quantità", { exact: true }).fill("80");
  await page.getByLabel("Prezzo unitario", { exact: true }).fill("100");
  await expect(page.locator(".reconciliation")).toContainText("8.000,00");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Salva dettaglio riconciliato" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .locator(".desktop-nav")
    .getByRole("button", { name: "Panoramica", exact: true })
    .click();
  await expect(page.locator(".net-amount")).toContainText("112.000,00");
  await page
    .locator(".desktop-nav")
    .getByRole("button", { name: "Patrimonio", exact: true })
    .click();
  await page
    .locator(".asset-row")
    .filter({ hasText: "Portafoglio ETF" })
    .click();
  await expect(page.locator(".position-summary")).toContainText("ETF globale");
});
