/**
 * Einheitlicher Browser-Client für POST/GET zu `/api/*`:
 * - `credentials: "same-origin"` (Session-Cookie)
 * - absolute URL via `window.location.origin` (iframe / Assistent)
 * - `cache: "no-store"` für dynamische API-Antworten
 */
export function fetchApi(path: string, init?: RequestInit): Promise<Response> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url =
    typeof window === "undefined"
      ? normalized
      : new URL(normalized, window.location.origin).href;
  return fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
  });
}
