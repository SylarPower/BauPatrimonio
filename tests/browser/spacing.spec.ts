import { mockCloud, signIn } from "./cloud-helpers";
import { test, expect } from "@playwright/test";
for (const width of [320, 390, 768, 1440])
  for (const theme of ["light", "amoled"])
    test(`spazi rendimento e configurazione cloud ${width} ${theme}`, async ({
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
      await page
        .getByRole("group", { name: "Ambito dei grafici" })
        .getByRole("button", { name: "Investimenti", exact: true })
        .click();
      const card = page.locator(".performance-card");
      const geometry = await card.evaluate((el) => {
        const card = el.getBoundingClientRect(),
          controls = el.querySelector(".chart-controls")!,
          c = controls.getBoundingClientRect(),
          labels = [...controls.querySelectorAll("label")].map((e) =>
            e.getBoundingClientRect(),
          );
        const boxes = [...el.children]
          .filter((e) => getComputedStyle(e).display !== "none")
          .map((e) => e.getBoundingClientRect());
        return {
          padding: parseFloat(getComputedStyle(el).paddingLeft),
          gap: parseFloat(getComputedStyle(controls).gap),
          left: c.left - card.left,
          right: card.right - c.right,
          overlap:
            labels[0].bottom > labels[1].top + 1 &&
            labels[0].right > labels[1].left + 1,
          inside: boxes.every(
            (b) => b.left >= card.left + 15 && b.right <= card.right - 15,
          ),
          touch: [...controls.querySelectorAll("select")].every(
            (e) => e.getBoundingClientRect().height >= 44,
          ),
        };
      });
      expect(geometry.padding).toBeGreaterThanOrEqual(16);
      expect(geometry.gap).toBeGreaterThanOrEqual(14);
      expect(geometry.left).toBeGreaterThanOrEqual(16);
      expect(geometry.right).toBeGreaterThanOrEqual(16);
      expect(geometry.overlap).toBe(false);
      expect(geometry.inside).toBe(true);
      expect(geometry.touch).toBe(true);
      await card
        .getByText("Flussi e metodo di calcolo", { exact: true })
        .click();
      await expect(card.getByLabel("Importo EUR, tua quota")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await mockCloud(page);
      await page
        .getByRole("button", { name: "Passa al mio patrimonio" })
        .click();
      const auth = page.locator(".auth-card");
      const cloud = await auth.evaluate((el) => {
        const box = el.getBoundingClientRect(),
          inputs = [...el.querySelectorAll("input")].map((e) =>
            e.getBoundingClientRect(),
          );
        return {
          inside: inputs.every(
            (b) => b.left >= box.left + 15 && b.right <= box.right - 15,
          ),
          overlap: inputs.some((b, i) => i > 0 && b.top < inputs[i - 1].bottom),
          touch: inputs.every((b) => b.height >= 44),
        };
      });
      expect(cloud.inside).toBe(true);
      expect(cloud.overlap).toBe(false);
      expect(cloud.touch).toBe(true);
      await signIn(page);
      await page.getByLabel("Apri profilo e impostazioni").click();
      await expect(
        page.getByRole("link", { name: "Guida archivio online" }),
      ).toHaveAttribute("href", /GUIDA.html#cloud$/);
      await expect(page.getByLabel("Project URL")).toHaveCount(0);
      if (width === 390 && theme === "light")
        await page.screenshot({
          path: "test-results/cloud-spacing.png",
          fullPage: true,
        });
    });
