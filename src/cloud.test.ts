import { it, expect, vi, afterEach } from "vitest";
import {
  cloudLogin,
  cloudRead,
  cloudSave,
  cloudActive,
  cloudLogout,
  cloudUseLoaded,
  validateCloudConfig,
} from "./cloud";
import { empty } from "./model";
const c = {
  url: "https://testproject.supabase.co",
  key: "sb_publishable_test",
};
afterEach(() => {
  cloudLogout();
  vi.unstubAllGlobals();
});
it("rifiuta domini non Supabase, URL HTTP e chiavi privilegiate", () => {
  expect(() =>
    validateCloudConfig({ ...c, url: "http://testproject.supabase.co" }),
  ).toThrow();
  expect(() =>
    validateCloudConfig({ ...c, url: "https://supabase.co.evil.test" }),
  ).toThrow();
  expect(() => validateCloudConfig({ ...c, key: "sb_secret_no" })).toThrow();
  expect(() => validateCloudConfig(c)).not.toThrow();
});
it("login non invia dati; apertura e salvataggi usano revisioni e no-store", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "t", expires_in: 3600 })),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify([{ document: empty(), revision: 2 }])),
    )
    .mockResolvedValueOnce(new Response("3"))
    .mockResolvedValueOnce(new Response("4"));
  vi.stubGlobal("fetch", fetch);
  await cloudLogin(c, "user@example.test", "secret");
  expect(cloudActive()).toBe(false);
  await cloudRead();
  cloudUseLoaded();
  await Promise.all([cloudSave(empty()), cloudSave(empty())]);
  expect(JSON.parse(fetch.mock.calls[2][1].body).p_expected_revision).toBe(2);
  expect(JSON.parse(fetch.mock.calls[3][1].body).p_expected_revision).toBe(3);
  expect(fetch.mock.calls.every((x) => x[1].cache === "no-store")).toBe(true);
});
it("un conflitto blocca i salvataggi successivi senza sovrascrivere", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "t", expires_in: 3600 })),
    )
    .mockResolvedValueOnce(new Response("[]"))
    .mockResolvedValueOnce(new Response("{}", { status: 400 }));
  vi.stubGlobal("fetch", fetch);
  await cloudLogin(c, "a", "b");
  await cloudRead();
  await expect(cloudSave(empty(), true)).rejects.toThrow();
  expect(cloudActive()).toBe(false);
  await expect(cloudSave(empty())).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(3);
});
it("documento remoto non valido non viene aperto", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "t", expires_in: 3600 })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ document: {}, revision: 1 }])),
      ),
  );
  await cloudLogin(c, "a", "b");
  await expect(cloudRead()).rejects.toThrow();
  expect(cloudActive()).toBe(false);
});
