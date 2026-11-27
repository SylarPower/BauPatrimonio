import { test, expect } from "@playwright/test";
for (const width of [320, 390, 768, 1440])
  for (const theme of ["light", "amoled"])
    test(`allineamenti pagine e registro ${width} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/");
      await page.evaluate((t) => localStorage.setItem("bau-theme", t), theme);
      await page.reload();
      await page
        .getByRole("button", { name: "Prova con dati di esempio" })
        .click();
      const nav = page.locator(width < 700 ? ".mobile-nav" : ".desktop-nav");
      await nav
        .getByRole("button", { name: "Patrimonio", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Trasferisci", exact: true })
        .click();
      await page.getByLabel("Importo in EUR").fill("1234.56");
      await page
        .getByRole("button", { name: "Registra trasferimento" })
        .click();
      for (const name of ["Panoramica", "Patrimonio", "Storico", "Movimenti"]) {
        await nav.getByRole("button", { name, exact: true }).click();
        if (name === "Patrimonio")
          await page
            .getByText("Prezzi e grafici online · TradingView", { exact: true })
            .click();
        if (
          ["Patrimonio", "Movimenti"].includes(name) &&
          [390, 1440].includes(width) &&
          theme === "light"
        ) {
          await expect(page.locator(".toast")).toHaveCount(0, {
            timeout: 8000,
          });
          await page.screenshot({
            path: `test-results/after-${name}-${width}.png`,
            fullPage: true,
          });
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (name === "Movimenti" || name === "Patrimonio") {
          const boxes = await page
            .locator(".content-card")
            .evaluateAll((cards) =>
              cards.map((el) => {
                const b = el.getBoundingClientRect();
                const children = [...el.children]
                  .filter((c) => getComputedStyle(c).display !== "none")
                  .map((c) => c.getBoundingClientRect());
                return {
                  padding: parseFloat(getComputedStyle(el).paddingLeft),
                  inside: children.every(
                    (c) => c.left >= b.left + 15 && c.right <= b.right - 15,
                  ),
                  touch: [...el.querySelectorAll("input,select,button")]
                    .filter((c) => c.getBoundingClientRect().height > 0)
                    .every((c) => c.getBoundingClientRect().height >= 44),
                };
              }),
            );
          expect(boxes.length).toBeGreaterThan(0);
          if (name === "Movimenti") {
            const gaps = await page
              .locator(".content-card")
              .evaluateAll((cards) =>
                cards
                  .slice(1)
                  .map(
                    (c, i) =>
                      c.getBoundingClientRect().top -
                      cards[i].getBoundingClientRect().bottom,
                  ),
              );
            for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(16);
          }
          for (const b of boxes) {
            expect(b.padding).toBeGreaterThanOrEqual(16);
            expect(b.inside).toBe(true);
            expect(b.touch).toBe(true);
          }
        }
        if (name === "Movimenti") {
          const rows = await page.locator(".movement-row").evaluateAll((rows) =>
            rows.map((row) => {
              const b = row.getBoundingClientRect(),
                items = [...row.children].map((c) => c.getBoundingClientRect());
              const overlaps = items.some((a, i) =>
                items.some(
                  (b, j) =>
                    j > i &&
                    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
                    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1,
                ),
              );
              return {
                inside: items.every(
                  (i) => i.left >= b.left - 1 && i.right <= b.right + 1,
                ),
                overlaps,
              };
            }),
          );
          expect(rows).toHaveLength(2);
          for (const r of rows) {
            expect(r.inside).toBe(true);
            expect(r.overlaps).toBe(false);
          }
        }
      }
    });
