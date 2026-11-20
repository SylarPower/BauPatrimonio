import { it, expect, vi, afterEach } from "vitest";
import {
  cloudLogin,
  cloudOpen,
  cloudRead,
  cloudSave,
  cloudLogout,
  cloudActive,
  cloudUseLoaded,
  cloudSignUp,
  cloudResendConfirmation,
  cloudResetPassword,
  cloudRequestRecovery,
  cloudConfirmEmail,
} from "./cloud";
import { empty } from "./model";
const login = {
  idToken: "test-token",
  refreshToken: "test-refresh",
  localId: "test-uid",
  expiresIn: "3600",
};
const user = { users: [{ emailVerified: true, localId: "test-uid" }] };
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
const saved = (revision = 1) => ({
  fields: {
    payload: { stringValue: JSON.stringify(empty()) },
    revision: { integerValue: String(revision) },
  },
  updateTime: "rev-" + revision,
});
const commit = (r = 1) => ({ writeResults: [{ updateTime: "rev-" + r }] });
function mock(...responses: Response[]) {
  const f = vi.fn();
  for (const r of responses) f.mockResolvedValueOnce(r);
  vi.stubGlobal("fetch", f);
  return f;
}
afterEach(() => {
  cloudLogout();
  vi.unstubAllGlobals();
});
it("accesso verificato legge solo documento UID e non scrive se esiste", async () => {
  const f = mock(json(login), json(user), json(saved()));
  expect(await cloudOpen(" a@b.test ", "test-password")).toEqual(empty());
  expect(cloudActive()).toBe(true);
  expect(f.mock.calls[2][0]).toContain("/vaults/test-uid");
  expect(JSON.parse(f.mock.calls[0][1].body).email).toBe("a@b.test");
  expect(f.mock.calls.every((x) => x[1].cache === "no-store")).toBe(true);
});
it("email non verificata non legge Firestore", async () => {
  const f = mock(
    json(login),
    json({ users: [{ localId: "test-uid", emailVerified: false }] }),
  );
  await expect(cloudOpen("a", "b")).rejects.toThrow("non ancora confermato");
  expect(f).toHaveBeenCalledTimes(2);
  expect(cloudActive()).toBe(false);
});
it("primo accesso crea vuoto con precondizione exists false", async () => {
  const f = mock(json(login), json(user), json({}, 404), json(commit()));
  expect((await cloudOpen("a", "b")).assets).toEqual([]);
  const write = JSON.parse(f.mock.calls[3][1].body).writes[0];
  expect(write.currentDocument).toEqual({ exists: false });
  expect(write.update.fields.revision.integerValue).toBe("1");
});
it("coda salva con updateTime atomico e revisioni crescenti", async () => {
  const f = mock(
    json(login),
    json(user),
    json(saved(5)),
    json(commit(6)),
    json(commit(7)),
  );
  await cloudOpen("a", "b");
  await Promise.all([cloudSave(empty()), cloudSave(empty())]);
  const a = JSON.parse(f.mock.calls[3][1].body).writes[0],
    b = JSON.parse(f.mock.calls[4][1].body).writes[0];
  expect(a.currentDocument).toEqual({ updateTime: "rev-5" });
  expect(b.currentDocument).toEqual({ updateTime: "rev-6" });
  expect(b.update.fields.revision.integerValue).toBe("7");
});
it("conflitto blocca scritture successive", async () => {
  const f = mock(
    json(login),
    json(user),
    json(saved()),
    json({ error: { status: "FAILED_PRECONDITION" } }, 409),
  );
  await cloudOpen("a", "b");
  await expect(cloudSave(empty())).rejects.toThrow("Conflitto");
  await expect(cloudSave(empty())).rejects.toThrow("interrotto");
  expect(f).toHaveBeenCalledTimes(4);
  expect(cloudActive()).toBe(false);
});
it("permission denied non crea archivio sostitutivo", async () => {
  const f = mock(
    json(login),
    json(user),
    json({ error: { status: "PERMISSION_DENIED" } }, 403),
  );
  await expect(cloudOpen("a", "b")).rejects.toThrow("regole");
  expect(f).toHaveBeenCalledTimes(3);
  expect(cloudActive()).toBe(false);
});
it("documento corrotto non apre sessione pronta", async () => {
  mock(
    json(login),
    json(user),
    json({ fields: { payload: { stringValue: "{}" } } }),
  );
  await expect(cloudOpen("a", "b")).rejects.toThrow("non valido");
  expect(cloudActive()).toBe(false);
});
it("logout durante login ignora risposta tardiva", async () => {
  let resolve!: (r: Response) => void;
  const f = vi
    .fn()
    .mockImplementationOnce(() => new Promise<Response>((r) => (resolve = r)))
    .mockResolvedValueOnce(json(user));
  vi.stubGlobal("fetch", f);
  const pending = cloudLogin("a", "b");
  cloudLogout();
  resolve(json(login));
  await expect(pending).rejects.toThrow("annullato");
  expect(cloudActive()).toBe(false);
});
it("nessun salvataggio senza accesso", async () => {
  await expect(cloudSave(empty())).rejects.toThrow("Accesso richiesto");
});
it("rinnovo token solo in memoria", async () => {
  const f = mock(
    json({ ...login, expiresIn: "0" }),
    json(user),
    json({
      id_token: "new-token",
      refresh_token: "new-refresh",
      expires_in: "3600",
    }),
    json(saved()),
  );
  await cloudLogin("a", "b");
  await cloudRead();
  cloudUseLoaded();
  expect(f.mock.calls[2][0]).toContain("securetoken.googleapis.com");
  expect(f.mock.calls[3][1].headers.Authorization).toBe("Bearer new-token");
});
it("signup invia conferma Firebase e non apre archivio", async () => {
  const f = mock(json(login), json({}));
  await cloudSignUp("new@test.it", "test-password");
  expect(f.mock.calls[0][0]).toContain("accounts:signUp");
  expect(JSON.parse(f.mock.calls[1][1].body)).toMatchObject({
    requestType: "VERIFY_EMAIL",
    idToken: "test-token",
  });
  expect(cloudActive()).toBe(false);
});
it("fallimento email dopo signup non dichiara inviata", async () => {
  mock(json(login), json({ error: { message: "QUOTA_EXCEEDED" } }, 429));
  await expect(cloudSignUp("a", "test-password")).rejects.toThrow(
    "Account creato, ma invio email",
  );
  expect(cloudActive()).toBe(false);
});
it("password debole non viene inviata", async () => {
  const f = mock();
  await expect(cloudSignUp("a", "short")).rejects.toThrow("10");
  expect(f).not.toHaveBeenCalled();
});
it("reinvio richiede credenziali ma non crea sessione vault", async () => {
  const f = mock(json(login), json({}));
  await cloudResendConfirmation("a", "test-password");
  expect(f.mock.calls[0][0]).toContain("signInWithPassword");
  expect(cloudActive()).toBe(false);
});
it("recupero invia reset Firebase senza password o accesso vault", async () => {
  const f = mock(json({}));
  await cloudRequestRecovery(" a@b.it ");
  expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({
    requestType: "PASSWORD_RESET",
    email: "a@b.it",
  });
});
it("cambio password usa codice monouso, mai bearer vault", async () => {
  const f = mock(json({}));
  await cloudResetPassword("test-code", "test-password");
  expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({
    oobCode: "test-code",
    newPassword: "test-password",
  });
  expect(f).toHaveBeenCalledTimes(1);
  expect(cloudActive()).toBe(false);
});
it("codice scaduto non è successo", async () => {
  mock(json({ error: { message: "EXPIRED_OOB_CODE" } }, 400));
  await expect(
    cloudResetPassword("test-code", "test-password"),
  ).rejects.toThrow("scaduto");
});
it("conferma email non apre vault", async () => {
  const f = mock(json({}));
  await cloudConfirmEmail("test-code");
  expect(f.mock.calls[0][0]).toContain("accounts:update");
  expect(cloudActive()).toBe(false);
});
it("credenziali errate e quota hanno messaggi distinti", async () => {
  for (const [message, status, expected] of [
    ["INVALID_LOGIN_CREDENTIALS", 400, "non corrette"],
    ["TOO_MANY_ATTEMPTS_TRY_LATER", 429, "Troppe richieste"],
  ] as const) {
    mock(json({ error: { message } }, status));
    await expect(cloudLogin("a", "b")).rejects.toThrow(expected);
  }
});

it("UID incoerente nella risposta Auth non apre sessione", async () => {
  const f = mock(
    json(login),
    json({ users: [{ localId: "other-user", emailVerified: true }] }),
  );
  await expect(cloudOpen("a", "b")).rejects.toThrow("non valida");
  expect(f).toHaveBeenCalledTimes(2);
  expect(cloudActive()).toBe(false);
});
it("archivio troppo grande rifiutato prima della scrittura", async () => {
  const f = mock(json(login), json(user), json(saved()));
  await cloudOpen("a", "b");
  const s = empty();
  s.imports = Array.from({ length: 4000 }, (_, i) => ({
    id: String(i),
    name: "x".repeat(250),
    date: "2026-11-19",
    rows: 1,
    kind: "csv",
  }));
  await expect(cloudSave(s)).rejects.toThrow("troppo grande");
  expect(f).toHaveBeenCalledTimes(3);
});
it("logout durante lettura ignora risposta", async () => {
  await (async () => {
    mock(json(login), json(user));
    await cloudLogin("a", "b");
  })();
  let resolve!: (r: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>((r) => (resolve = r))),
  );
  const work = cloudRead();
  await Promise.resolve();
  cloudLogout();
  resolve(json(saved()));
  await expect(work).rejects.toThrow("Sessione terminata");
  expect(cloudActive()).toBe(false);
});
