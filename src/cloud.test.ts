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

it("nessun salvataggio personale silenzioso senza sessione", async () => {
  await expect(cloudSave(empty())).rejects.toThrow("Accesso richiesto");
});
it("apertura automatica di archivio esistente senza scritture", async () => {
  const { cloudOpen } = await import("./cloud");
  const s = empty();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "t", expires_in: 3600 })),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify([{ document: s, revision: 5 }])),
    );
  vi.stubGlobal("fetch", fetch);
  expect(await cloudOpen("a", "b")).toEqual(s);
  expect(cloudActive()).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("primo accesso crea solo un documento vuoto, mai dati della demo", async () => {
  const { cloudOpen } = await import("./cloud");
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "t", expires_in: 3600 })),
    )
    .mockResolvedValueOnce(new Response("[]"))
    .mockResolvedValueOnce(new Response("1"));
  vi.stubGlobal("fetch", fetch);
  expect((await cloudOpen("a", "b")).assets).toEqual([]);
  expect(JSON.parse(fetch.mock.calls[2][1].body).p_expected_revision).toBe(0);
});
it("logout ignora risposte tardive senza riaprire la sessione", async () => {
  let resolve!: (r: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>((r) => (resolve = r))),
  );
  const pending = cloudLogin(c, "a", "b");
  cloudLogout();
  resolve(
    new Response(JSON.stringify({ access_token: "late", expires_in: 3600 })),
  );
  await expect(pending).rejects.toThrow("annullato");
  expect(cloudActive()).toBe(false);
});
it("rinnova in memoria una sessione scaduta prima di leggere", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "t",
          refresh_token: "refresh",
          expires_in: 0,
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "new",
          refresh_token: "new-refresh",
          expires_in: 3600,
        }),
      ),
    )
    .mockResolvedValueOnce(new Response("[]"));
  vi.stubGlobal("fetch", fetch);
  await cloudLogin(c, "a", "b");
  await cloudRead();
  expect(fetch.mock.calls[1][0]).toContain("grant_type=refresh_token");
  expect(fetch.mock.calls[2][1].headers.Authorization).toBe("Bearer new");
});
it("un errore nel caricamento automatico non crea un archivio sostitutivo", async () => {
  const { cloudOpen } = await import("./cloud");
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "t", expires_in: 3600 })),
    )
    .mockRejectedValueOnce(new TypeError("offline"));
  vi.stubGlobal("fetch", fetch);
  await expect(cloudOpen("a", "b")).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(cloudActive()).toBe(false);
});

it("registrazione usa solo endpoint pubblico, redirect fisso e non inizializza archivi", async () => {
  const { cloudSignUp, authRedirectUrl } = await import("./cloud");
  const fetch = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetch);
  await cloudSignUp(" new@example.test ", "not-a-real-password");
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toContain(
    "/auth/v1/signup?redirect_to=" + encodeURIComponent(authRedirectUrl),
  );
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    email: "new@example.test",
    password: "not-a-real-password",
  });
  expect(fetch.mock.calls[0][1].cache).toBe("no-store");
  expect(cloudActive()).toBe(false);
});
it("password debole non viene inviata", async () => {
  const { cloudSignUp } = await import("./cloud");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(cloudSignUp("a@b.test", "short")).rejects.toThrow("10");
  expect(fetch).not.toHaveBeenCalled();
});
it("SMTP non autorizzato non viene mascherato come successo", async () => {
  const { cloudSignUp } = await import("./cloud");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ code: "email_address_not_authorized" }), {
          status: 400,
        }),
      ),
  );
  await expect(cloudSignUp("a@b.test", "not-a-real-password")).rejects.toThrow(
    "servizio email",
  );
  expect(cloudActive()).toBe(false);
});
it("limiti di invio email ricevono un messaggio comprensibile", async () => {
  const { cloudResendConfirmation } = await import("./cloud");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("{}", { status: 429 })),
  );
  await expect(cloudResendConfirmation("a@b.test")).rejects.toThrow("Attendi");
});
it("reinvia solo conferma signup, senza password o token privilegiati", async () => {
  const { cloudResendConfirmation } = await import("./cloud");
  const fetch = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetch);
  await cloudResendConfirmation("a@b.test");
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    type: "signup",
    email: "a@b.test",
  });
  expect(fetch.mock.calls[0][1].headers.apikey).toMatch(/^sb_publishable_/);
});
