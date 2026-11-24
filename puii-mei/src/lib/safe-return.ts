/**
 * Adresele de întoarcere (`inapoi`, `returnTo`) — NAV-09: doar rute interne, relative, eventual limitate la un spațiu
 * (ex. `/admin`). Refuză orice ar putea duce în afara site-ului: `//gazda`, `/\gazda` (browserele îl citesc ca `//`),
 * `https:`, `javascript:`, caractere de control, `..`. Funcție pură, testată unitar.
 */
export function safeInternalPath(raw: unknown, spacePrefix?: string): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return null;
  if (/\.\.|%2e|%2f|%5c/i.test(raw)) return null; // „..” sau separatori codificați: refuzate înainte de orice normalizare
  let url: URL;
  try {
    url = new URL(raw, "http://intern.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "http://intern.invalid") return null;
  const path = url.pathname;
  if (path.split("/").some((seg) => seg === ".." || seg === ".")) return null;
  if (decodeURIComponent(path).includes("..")) return null;
  if (spacePrefix && !(path === spacePrefix || path.startsWith(`${spacePrefix}/`))) return null;
  return `${path}${url.search}${url.hash}`;
}
