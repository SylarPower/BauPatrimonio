import { expect, type Page } from "@playwright/test";
import type { Store } from "../../src/model";
export async function mockCloud(page: Page) {
  let document: Store | undefined,
    revision = 0,
    reads = 0,
    writes = 0,
    fail = false;
  await page.route(
    /^https:\/\/(identitytoolkit|firestore|securetoken)\.googleapis\.com\//,
    async (route) => {
      const r = route.request(),
        path = new URL(r.url()).pathname;
      if (path.endsWith("accounts:signInWithPassword"))
        return route.fulfill({
          json: {
            idToken: "test-token",
            refreshToken: "test-refresh",
            localId: "test-uid",
            expiresIn: "3600",
          },
        });
      if (path.endsWith("accounts:lookup"))
        return route.fulfill({
          json: { users: [{ localId: "test-uid", emailVerified: true }] },
        });
      if (path.endsWith("/vaults/test-uid")) {
        reads++;
        return document
          ? route.fulfill({
              json: {
                fields: {
                  payload: { stringValue: JSON.stringify(document) },
                  revision: { integerValue: String(revision) },
                },
                updateTime: "revision-" + revision,
              },
            })
          : route.fulfill({
              status: 404,
              json: { error: { status: "NOT_FOUND" } },
            });
      }
      if (path.endsWith("documents:commit")) {
        writes++;
        const write = r.postDataJSON().writes[0];
        if (
          fail ||
          (document
            ? write.currentDocument.updateTime !== "revision-" + revision
            : write.currentDocument.exists !== false)
        )
          return route.fulfill({
            status: 409,
            json: { error: { status: "FAILED_PRECONDITION" } },
          });
        document = JSON.parse(write.update.fields.payload.stringValue);
        revision++;
        return route.fulfill({
          json: { writeResults: [{ updateTime: "revision-" + revision }] },
        });
      }
      return route.abort();
    },
  );
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
