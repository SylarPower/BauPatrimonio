let recoveryToken: string | null = null;
export function takeRecoveryToken() {
  const token = recoveryToken;
  recoveryToken = null;
  return token;
}
/** Codici azione Firebase solo in memoria e mai sessioni del patrimonio.
 * Gli eventuali token dei vecchi link Supabase sono rimossi e non importati. */
export function consumeAuthReturn(
  location: Pick<Location, "href">,
  replace: (url: string) => void,
): "signin" | "expired" | "recovery" | "verify" | null {
  recoveryToken = null;
  const url = new URL(location.href),
    hash = new URLSearchParams(url.hash.slice(1));
  const firebaseCode = url.searchParams.get("oobCode");
  const firebaseMode = url.searchParams.get("mode");
  const keys = [
    "oobCode",
    "mode",
    "apiKey",
    "continueUrl",
    "lang",
    "access_token",
    "refresh_token",
    "expires_in",
    "expires_at",
    "token_type",
    "type",
    "error",
    "error_code",
    "error_description",
  ];
  if (
    !keys.some((key) => hash.has(key)) &&
    !keys.some((key) => url.searchParams.has(key))
  )
    return null;
  const expired =
    hash.has("error") ||
    hash.has("error_code") ||
    url.searchParams.has("error") ||
    url.searchParams.has("error_code");
  const recovery =
    !expired && firebaseMode === "resetPassword" && !!firebaseCode;
  const verify = !expired && firebaseMode === "verifyEmail" && !!firebaseCode;
  if (recovery || verify) recoveryToken = firebaseCode;
  url.hash = "";
  for (const key of keys) url.searchParams.delete(key);
  replace(url.pathname + url.search);
  return expired
    ? "expired"
    : recovery
      ? "recovery"
      : verify
        ? "verify"
        : "signin";
}
