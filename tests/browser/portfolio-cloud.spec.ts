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
test("cloud dal profilo: nessun upload demo, primo salvataggio solo dopo consenso", async ({
  page,
}) => {
  let writes = 0;
  await page.route("https://testproject.supabase.co/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes("/token"))
      return route.fulfill({
        json: { access_token: "test-token", expires_in: 3600 },
      });
    if (path.includes("/vaults")) return route.fulfill({ json: [] });
    if (path.includes("/save_vault")) {
      writes++;
      return route.fulfill({ json: 1 });
    }
    return route.abort();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Prova con dati di esempio" }).click();
  await page.getByLabel("Apri profilo e impostazioni").click();
  await expect(
    page.getByText("La demo non viene caricata.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Chiudi", exact: true }).click();
  await page.getByRole("button", { name: "Passa al mio patrimonio" }).click();
  await page.getByLabel("Apri profilo e impostazioni").click();
  await page.getByLabel("Project URL").fill("https://testproject.supabase.co");
  await page
    .getByLabel("Chiave pubblica publishable / anon")
    .fill("sb_publishable_test");
  await page.getByLabel("Email", { exact: true }).fill("test@example.test");
  await page.getByLabel("Password Supabase Auth").fill("not-a-real-password");
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Crea il primo salvataggio online" }),
  ).toBeDisabled();
  expect(writes).toBe(0);
  await page
    .getByRole("checkbox", {
      name: "Confermo l’apertura del cloud",
      exact: false,
    })
    .check();
  await page
    .getByRole("button", { name: "Crea il primo salvataggio online" })
    .click();
  await expect(
    page.getByText("Primo salvataggio online riuscito.", { exact: false }),
  ).toBeVisible();
  expect(writes).toBe(1);
  const saved = await page.evaluate(() => JSON.stringify(localStorage));
  expect(saved).not.toContain("test-token");
  expect(saved).not.toContain("not-a-real-password");
});
