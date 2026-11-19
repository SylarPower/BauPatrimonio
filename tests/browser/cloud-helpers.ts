import { expect, type Page } from "@playwright/test";
import type { Store } from "../../src/model";
export async function mockCloud(page: Page) {
  let document: Store | undefined,
    revision = 0,
    reads = 0,
    writes = 0,
    fail = false;
  await page.route(/^https:\/\/[^/]+\.supabase\.co\//, async (route) => {
    const r = route.request(),
      path = new URL(r.url()).pathname;
    if (path === "/auth/v1/token")
      return route.fulfill({
        json: {
          access_token: "test-token",
          refresh_token: "test-refresh",
          expires_in: 3600,
        },
      });
    if (path === "/rest/v1/vaults") {
      reads++;
      return route.fulfill({ json: document ? [{ document, revision }] : [] });
    }
    if (path === "/rest/v1/rpc/save_vault") {
      writes++;
      if (fail)
        return route.fulfill({ status: 400, json: { message: "conflict" } });
      const b = r.postDataJSON();
      if (b.p_expected_revision !== revision)
        return route.fulfill({ status: 400, json: { message: "conflict" } });
      document = b.p_document;
      revision++;
      return route.fulfill({ json: revision });
    }
    return route.abort();
  });
  return {
    get document() {
      return document;
    },
    get writes() {
      return writes;
    },
    get reads() {
      return reads;
    },
    set fail(v: boolean) {
      fail = v;
    },
    set remote(s: Store) {
      document = s;
      revision++;
    },
  };
}
export async function signIn(page: Page) {
  await page.getByLabel("Email", { exact: true }).fill("test@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("not-a-real-password");
  await page
    .locator(".auth-card form")
    .getByRole("button", { name: "Accedi", exact: true })
    .click();
  await expect(page.locator(".net-amount")).toBeVisible();
  await expect(page.getByText("Salvato online", { exact: true })).toBeVisible();
}
