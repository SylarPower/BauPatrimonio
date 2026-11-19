import { mockCloud, signIn } from "./cloud-helpers";
import { test, expect } from "@playwright/test";
for (const width of [320, 1440])
  test(`portafoglio aggregato, rendimento e layout ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await page
      .getByRole("button", { name: "Prova con dati di esempio" })
      .click();
    await page.locator(".demo-history").click();
    await page
      .getByRole("group", { name: "Ambito dei grafici" })
      .getByRole("button", { name: "Investimenti", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Rendimento degli investimenti" }),
    ).toBeVisible();
    await expect(page.locator(".net-amount")).toContainText("112.000,00");
    await expect(page.locator(".chart-readout")).toContainText("8.000,00");
    await expect(
      page.getByText("Conferma la completezza dei flussi", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("checkbox", { name: "Ho riconciliato", exact: false })
      .check();
    await expect(
      page.getByText("Rendimento stimato · Modified Dietz"),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    expect(overflow).toBe(false);
    await page
      .getByRole("group", { name: "Ambito dei grafici" })
      .getByRole("button", { name: "Tutto il patrimonio", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Rendimento degli investimenti" }),
    ).toHaveCount(0);
  });
test("online automatico, demo separata e nessuna configurazione", async ({
  page,
}) => {
  const cloud = await mockCloud(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Prova con dati di esempio" }).click();
  expect(cloud.writes).toBe(0);
  await page.getByRole("button", { name: "Passa al mio patrimonio" }).click();
  await expect(page.getByLabel("Project URL")).toHaveCount(0);
  await signIn(page);
  expect(cloud.writes).toBe(1);
  expect(cloud.document?.assets).toHaveLength(0);
  await page.getByLabel("Apri profilo e impostazioni").click();
  await expect(
    page.getByText("Archivio online privato", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Apri / rileggi archivio online" }),
  ).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.stringify(localStorage));
  expect(saved).not.toContain("test-token");
  expect(saved).not.toContain("not-a-real-password");
  await page
    .getByRole("button", { name: "Esci dall’account", exact: false })
    .click();
  await expect(page.locator(".net-amount")).toHaveCount(0);
});
test("conflitto conserva la pagina, blocca modifiche e non dichiara salvato", async ({
  page,
}) => {
  const cloud = await mockCloud(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Inizia il mio patrimonio" }).click();
  await signIn(page);
  cloud.fail = true;
  await page.getByRole("button", { name: "Aggiungi la prima voce" }).click();
  await page
    .getByRole("button", { name: "Conto corrente e liquidità" })
    .click();
  await page.getByLabel("Nome della voce").fill("Non salvato");
  await page.getByLabel("Saldo contabile").fill("123");
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("conflitto");
  await expect(page.locator(".net-amount")).toContainText("123,00");
  await expect(page.getByText("Salvato online", { exact: true })).toHaveCount(
    0,
  );
  expect(cloud.document?.assets).toHaveLength(0);
  await expect(page.locator(".online-workspace")).toHaveAttribute(
    "disabled",
    "",
  );
  await expect(
    page.getByRole("button", { name: "Scarica modifiche non salvate" }),
  ).toBeEnabled();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Aggiorna dati online" }).click();
  await expect(page.getByText("Salvato online", { exact: true })).toBeVisible();
  await expect(page.locator(".net-amount")).toContainText("0,00");
});
