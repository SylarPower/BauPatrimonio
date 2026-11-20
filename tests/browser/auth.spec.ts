import { test, expect } from "@playwright/test";
import { mockCloud, signIn } from "./cloud-helpers";
async function openSignup(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Accedi o crea account" }).click();
  await page
    .getByRole("group", { name: "Accesso o registrazione" })
    .getByRole("button", { name: "Crea account", exact: true })
    .click();
}
async function fillSignup(page: import("@playwright/test").Page) {
  await page.getByLabel("Email", { exact: true }).fill("new@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("not-a-real-password");
  await page
    .getByLabel("Conferma password", { exact: true })
    .fill("not-a-real-password");
}
test("creazione account richiede conferma, non apre archivi e consente reinvio", async ({
  page,
}) => {
  let signup = 0,
    resend = 0,
    reads = 0;
  await page.route(/^https:\/\/[^/]+\.supabase\.co\//, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/signup")) {
      signup++;
      return route.fulfill({ json: { user: { id: "test-only" } } });
    }
    if (path.endsWith("/resend")) {
      resend++;
      return route.fulfill({ json: {} });
    }
    reads++;
    return route.abort();
  });
  await openSignup(page);
  await fillSignup(page);
  await page
    .locator(".auth-card form")
    .getByRole("button", { name: "Crea account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Controlla la posta");
  expect(signup).toBe(1);
  expect(reads).toBe(0);
  await expect(page.locator(".net-amount")).toHaveCount(0);
  await page.clock.install();
  await expect(
    page.getByRole("button", { name: "Invia di nuovo la conferma" }),
  ).toBeDisabled();
  await page.clock.fastForward(61000);
  await page
    .getByRole("button", { name: "Invia di nuovo la conferma" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "riceverai una nuova email",
  );
  expect(resend).toBe(1);
  await page.getByRole("button", { name: "Vai ad Accedi" }).click();
  await expect(
    page
      .locator(".auth-card form")
      .getByRole("button", { name: "Accedi", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "not-a-real-password",
  );
});
test("password diverse bloccano la richiesta", async ({ page }) => {
  let requests = 0;
  await page.route(/^https:\/\/[^/]+\.supabase\.co\//, (r) => {
    requests++;
    return r.abort();
  });
  await openSignup(page);
  await fillSignup(page);
  await page.getByLabel("Conferma password").fill("different-password");
  await page
    .locator(".auth-card form")
    .getByRole("button", { name: "Crea account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("non coincidono");
  expect(requests).toBe(0);
});
test("un blocco email mostra errore, non una registrazione riuscita", async ({
  page,
}) => {
  await page.route(/^https:\/\/[^/]+\.supabase\.co\//, (r) =>
    r.fulfill({ status: 400, json: { code: "email_address_not_authorized" } }),
  );
  await openSignup(page);
  await fillSignup(page);
  await page
    .locator(".auth-card form")
    .getByRole("button", { name: "Crea account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("servizio email");
  await expect(page.getByRole("button", { name: "Vai ad Accedi" })).toHaveCount(
    0,
  );
});
test("link di conferma pulisce URL e chiede login, anche dopo una demo", async ({
  page,
}) => {
  const cloud = await mockCloud(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Prova con dati di esempio" }).click();
  await page.goto(
    "/#access_token=test-only&refresh_token=not-real&type=signup",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Accedi al tuo patrimonio" }),
  ).toBeVisible();
  expect(page.url()).not.toContain("access_token");
  expect(cloud.writes).toBe(0);
  await signIn(page);
  expect(cloud.document?.assets).toHaveLength(0);
});
for (const width of [320, 390, 1440])
  test(`registrazione leggibile ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openSignup(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const input of await page.locator(".auth-card input").all()) {
      const b = await input.boundingBox();
      expect(b?.height).toBeGreaterThanOrEqual(44);
    }
    await expect(
      page.getByRole("heading", { name: "Crea il tuo account" }),
    ).toBeVisible();
  });

test("recupero dal link email cambia password senza leggere patrimonio e pulisce URL", async ({
  page,
}) => {
  const paths: string[] = [];
  await page.route(/^https:\/\/[^/]+\.supabase\.co\//, async (r) => {
    const path = new URL(r.request().url()).pathname;
    paths.push(path);
    expect(path).toMatch(/^\/auth\/v1\/(user|logout)$/);
    return r.fulfill({ json: {} });
  });
  await page.goto(
    "/#access_token=test-only&refresh_token=discard&type=recovery",
  );
  await expect(
    page.getByRole("heading", { name: "Nuova password" }),
  ).toBeVisible();
  expect(page.url()).not.toContain("access_token");
  await page
    .getByLabel("Nuova password", { exact: true })
    .fill("new-test-password");
  await page
    .getByLabel("Conferma password", { exact: true })
    .fill("new-test-password");
  await page.getByRole("button", { name: "Salva nuova password" }).click();
  await expect(page.getByRole("status")).toContainText("Password aggiornata");
  expect(paths).toEqual(["/auth/v1/user", "/auth/v1/user", "/auth/v1/logout"]);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "test-only",
  );
  await expect(page.getByRole("link", { name: "Vai ad Accedi" })).toBeVisible();
});
test("errore login mostra causa comprensibile e non apre archivio", async ({
  page,
}) => {
  await page.route(/^https:\/\/[^/]+\.supabase\.co\//, (r) =>
    r.fulfill({ status: 400, json: { code: "invalid_credentials" } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Accedi o crea account" }).click();
  await page.getByLabel("Email", { exact: true }).fill("test@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("wrong-test-password");
  await page
    .locator(".auth-card form")
    .getByRole("button", { name: "Accedi", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Email o password non corrette",
  );
  await expect(page.locator(".net-amount")).toHaveCount(0);
});
