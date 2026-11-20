let recoveryToken: string | null = null;
export function takeRecoveryToken() {
  const token = recoveryToken;
  recoveryToken = null;
  return token;
}
/** Conferma: elimina token e chiede login. Recupero: token solo in memoria,
 * verificato da Auth prima del cambio password, mai sessione dell'archivio. */
export function consumeAuthReturn(
  location: Pick<Location, "href">,
  replace: (url: string) => void,
): "signin" | "expired" | "recovery" | null {
  const url = new URL(location.href),
    hash = new URLSearchParams(url.hash.slice(1));
  const keys = [
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
    !expired && hash.get("type") === "recovery" && !!hash.get("access_token");
  if (recovery) recoveryToken = hash.get("access_token");
  url.hash = "";
  for (const key of keys) url.searchParams.delete(key);
  replace(url.pathname + url.search);
  return expired ? "expired" : recovery ? "recovery" : "signin";
}
