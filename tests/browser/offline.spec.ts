import { test, expect } from "@playwright/test";
test("build PWA offline dopo prima visita, cache solo statica", async ({
  page,
  context,
}) => {
  test.skip(
    process.env.BAU_TEST_PRODUCTION !== "1",
    "Richiede build e preview di produzione",
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Prova con dati di esempio" }).click();
  await expect(page.locator(".net-amount")).toContainText("112.000,00");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".net-amount")).toContainText("112.000,00");
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    return (
      await Promise.all(
        keys.map(async (k) =>
          (await (await caches.open(k)).keys()).map(
            (r) => new URL(r.url).pathname,
          ),
        ),
      )
    ).flat();
  });
  expect(cached).toContain(new URL("index.html", page.url()).pathname);
  await page.goto(new URL("GUIDA.html", page.url()).href);
  await expect(
    page.getByRole("heading", {
      name: "Il tuo patrimonio, senza abbonamenti.",
    }),
  ).toBeVisible();
  expect(cached.some((p) => p.includes("/assets/"))).toBe(true);
  expect(
    cached.some(
      (p) =>
        p.includes("supabase") || p.includes("/api/") || p.includes("/rest/"),
    ),
  ).toBe(false);
});
