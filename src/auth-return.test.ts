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
        href: "https://example.test/#access_token=test-only&refresh_token=discard&type=recovery",
      },
      replace,
    ),
  ).toBe("recovery");
  expect(replace).toHaveBeenCalledWith("/");
  expect(takeRecoveryToken()).toBe("test-only");
  expect(takeRecoveryToken()).toBeNull();
});
