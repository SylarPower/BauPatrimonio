import { test, expect } from "@playwright/test";
import { mockCloud, signIn } from "./cloud-helpers";
import { demo, latest, today } from "../../src/model";
for (const width of [320, 390, 1440])
  for (const theme of ["light", "amoled"])
    test(`insight movimenti, categorie e accesso ETF ${width} ${theme}`, async ({
      page,
    }) => {
      const s = demo(),
        cash = s.assets.find((a) => a.category === "cash")!,
        investment = s.assets.find((a) => a.category === "investment")!;
      s.movements = [
        {
          id: "expense",
          assetId: cash.id,
          date: "2025-01-01",
          amount: "-100",
          currency: "EUR",
          description: "Spesa sintetica casa",
          category: "Casa",
          movementKind: "expense",
        },
        {
          id: "refund",
          assetId: cash.id,
          date: "2025-02-01",
          amount: "20",
          currency: "EUR",
          description: "Rimborso sintetico",
          category: "Casa",
          movementKind: "expense",
        },
        {
          id: "transport",
          assetId: cash.id,
          date: "2025-02-01",
          amount: "-30",
          currency: "EUR",
          description: "Trasporto sintetico",
          category: "Trasporti",
          movementKind: "expense",
        },
        {
          id: "income",
          assetId: cash.id,
          date: "2025-01-02",
          amount: "300",
          currency: "EUR",
          description: "Stipendio sintetico",
          category: "Stipendio e pensione",
          movementKind: "income",
        },
        {
          id: "transfer",
          assetId: cash.id,
          date: "2025-01-03",
          amount: "-500",
          currency: "EUR",
          description: "Trasferimento sintetico",
          movementKind: "transfer",
        },
        {
          id: "review",
          assetId: cash.id,
          date: "2025-01-04",
          amount: "-50",
          currency: "EUR",
          description: "Operazione da verificare",
          movementKind: "review",
        },
        {
          id: "usd",
          assetId: cash.id,
          date: "2025-01-04",
          amount: "-999",
          currency: "USD",
          description: "Non sommare dollari",
          category: "Casa",
          movementKind: "expense",
        },
      ];
      latest(investment)!.positions = [
        {
          id: "position",
          name: "ETF test globale",
          isin: "IE00B4L5Y983",
          quantity: "80",
          price: "100",
          currency: "EUR",
          source: "Test sintetico",
          date: today(),
        },
      ];
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/");
      await page.evaluate((t) => localStorage.setItem("bau-theme", t), theme);
      await page.reload();
      const cloud = await mockCloud(page);
      cloud.remote = s;
      await page.getByRole("button", { name: "Accedi o crea account" }).click();
      await signIn(page);
      const nav = page.locator(width < 700 ? ".mobile-nav" : ".desktop-nav");
      await nav.getByRole("button", { name: "Movimenti", exact: true }).click();
      await expect(page.locator(".movement-metrics")).toContainText("110,00");
      await expect(page.locator(".movement-metrics")).toContainText("300,00");
      await page.getByRole("button", { name: "Anello", exact: true }).click();
      await expect(
        page.getByRole("img", {
          name: "Distribuzione delle categorie con spesa netta positiva",
        }),
      ).toBeVisible();
      await expect(page.locator(".monthly-chart-row")).toHaveCount(2);
      await page
        .getByText("Valori mensili accessibili", { exact: true })
        .click();
      await expect(page.locator(".movement-table-scroll")).toContainText(
        "10,00",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (theme === "light" && [390, 1440].includes(width))
        await page
          .locator(".movement-insights")
          .screenshot({ path: `test-results/movement-charts-${width}.png` });
      await page
        .locator(".category-chart-list")
        .getByRole("button", { name: /Casa/ })
        .click();
      await expect(page.locator(".movement-row")).toHaveCount(2);
      const expense = page
        .locator(".movement-row")
        .filter({ hasText: "Spesa sintetica casa" });
      await expense
        .getByRole("combobox", { name: "Categoria del movimento" })
        .selectOption("Alimentari");
      await expect
        .poll(
          () =>
            cloud.document?.movements.find((m) => m.id === "expense")?.category,
        )
        .toBe("Alimentari");
      await page.getByRole("button", { name: "Azzera filtri" }).click();
      await page
        .getByRole("button", { name: "Nascondi importi", exact: true })
        .click();
      await expect(page.locator(".movement-ring")).toHaveCount(0);
      await expect(page.locator(".monthly-chart")).toHaveCount(0);
      await nav.getByRole("button", { name: "Storico", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Rilevazioni del patrimonio" }),
      ).toBeVisible();
      await expect(page.locator(".timeline")).not.toContainText(
        "Spesa sintetica casa",
      );
      await nav
        .getByRole("button", { name: "Patrimonio", exact: true })
        .click();
      await page
        .getByRole("button", { name: "ETF e azioni", exact: true })
        .click();
      await expect(page.locator("#instruments")).toBeFocused();
      await page.getByRole("button", { name: /ETF test globale/ }).click();
      await expect(
        page.getByRole("combobox", {
          name: "Strumento registrato",
          exact: true,
        }),
      ).toHaveValue("IE00B4L5Y983");
      await page
        .getByRole("button", { name: "Gestisci strumenti · Portafoglio ETF" })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
    });
