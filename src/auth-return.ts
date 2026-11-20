/** I link email confermano l'indirizzo su Supabase. Qui non importiamo token
 * dall'URL: li eliminiamo dalla cronologia e chiediamo l'accesso con password. */
export function consumeAuthReturn(
  location: Pick<Location, "href">,
  replace: (url: string) => void,
): "signin" | "expired" | null {
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
  url.hash = "";
  for (const key of keys) url.searchParams.delete(key);
  replace(url.pathname + url.search);
  return expired ? "expired" : "signin";
}
