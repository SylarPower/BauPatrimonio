import { it, expect, vi } from "vitest";
import { consumeAuthReturn } from "./auth-return";
it("rimuove token e dati di conferma dalla cronologia, senza salvarli", () => {
  const replace = vi.fn();
  expect(
    consumeAuthReturn(
      {
        href: "https://example.test/BauPatrimonio/?view=home#access_token=private&refresh_token=secret&type=signup",
      },
      replace,
    ),
  ).toBe("signin");
  expect(replace).toHaveBeenCalledWith("/BauPatrimonio/?view=home");
});
it("un link scaduto non viene trattato come accesso riuscito", () => {
  const replace = vi.fn();
  expect(
    consumeAuthReturn(
      {
        href: "https://example.test/BauPatrimonio/#error=access_denied&error_description=untrusted",
      },
      replace,
    ),
  ).toBe("expired");
  expect(replace).toHaveBeenCalledWith("/BauPatrimonio/");
});
it("rimuove gli errori di callback anche dalla query", () => {
  const replace = vi.fn();
  expect(
    consumeAuthReturn(
      { href: "https://example.test/?error=expired&error_code=x" },
      replace,
    ),
  ).toBe("expired");
  expect(replace).toHaveBeenCalledWith("/");
});
it("non modifica una normale apertura del sito", () => {
  const replace = vi.fn();
  expect(
    consumeAuthReturn(
      { href: "https://example.test/BauPatrimonio/#intro" },
      replace,
    ),
  ).toBeNull();
  expect(replace).not.toHaveBeenCalled();
});

it("un link recovery apre cambio password, non login o archivio", async () => {
  const { takeRecoveryToken } = await import("./auth-return");
  const replace = vi.fn();
  expect(
    consumeAuthReturn(
      {
        href: "https://example.test/?mode=resetPassword&oobCode=test-only",
      },
      replace,
    ),
  ).toBe("recovery");
  expect(replace).toHaveBeenCalledWith("/");
  expect(takeRecoveryToken()).toBe("test-only");
  expect(takeRecoveryToken()).toBeNull();
});

it("conferma Firebase mantiene solo il codice azione e pulisce query", async () => {
  const { takeRecoveryToken } = await import("./auth-return");
  const replace = vi.fn();
  expect(
    consumeAuthReturn(
      {
        href: "https://example.test/BauPatrimonio/?mode=verifyEmail&oobCode=test-code&apiKey=public&continueUrl=https%3A%2F%2Fevil.test",
      },
      replace,
    ),
  ).toBe("verify");
  expect(replace).toHaveBeenCalledWith("/BauPatrimonio/");
  expect(takeRecoveryToken()).toBe("test-code");
});
it("vecchi token recovery Supabase non diventano codici Firebase", async () => {
  const { takeRecoveryToken } = await import("./auth-return");
  expect(
    consumeAuthReturn(
      { href: "https://example.test/#access_token=old&type=recovery" },
      vi.fn(),
    ),
  ).toBe("signin");
  expect(takeRecoveryToken()).toBeNull();
});
