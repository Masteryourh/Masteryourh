/**
 * Spațiile de lucru ale aplicației (decizia fondatorului, 24.11.2026 — Admin Central Command Center / NAV-001).
 * Navigarea rămâne în spațiul curent; trecerea în alt spațiu e explicită (marcată `nav-permis` în cod) sau se face
 * într-un tab nou (website-ul public). Funcții pure, folosite de verificarea automată și de matricea de navigare.
 */
export type Space = "admin" | "household" | "investor" | "customer" | "courier" | "auth" | "resource" | "public";

/** Spațiul unei rute (destinația unui link). */
export function spaceOfRoute(path: string): Space {
  if (path === "/admin" || path.startsWith("/admin/") || path.startsWith("/admin?") || path.startsWith("/admin#")) return "admin";
  if (path.startsWith("/cont/gospodar")) return "household";
  if (path.startsWith("/cont/investitor")) return "investor";
  if (/^\/(comanda|confirmare|evaluare)(\/|$|\?)/.test(path)) return "customer";
  if (path.startsWith("/livrare")) return "courier";
  if (path.startsWith("/cont")) return "auth";
  if (/^\/(fisiere|foto|api)\//.test(path)) return "resource";
  return "public";
}

/** Spațiul unui fișier sursă (de unde pleacă linkul); `shared` = componentă folosită în mai multe spații. */
export function spaceOfFile(file: string): Space | "shared" {
  const f = file.replace(/\\/g, "/");
  if (f.includes("/(panou)/admin/") || f.endsWith("/server/admin-alerts.ts") || f.includes("/components/admin/")) return "admin";
  if (f.includes("/(panou)/cont/gospodar/")) return "household";
  if (f.includes("/(panou)/cont/investitor/")) return "investor";
  if (f.includes("/(client)/") || f.includes("/(site)/comanda/")) return "customer";
  if (f.includes("/(site)/livrare/")) return "courier";
  if (f.includes("/(site)/")) return "public";
  return "shared";
}

/** Destinațiile literale dintr-un fișier: href, redirect, router.push / replace, obiecte `href:`. */
export function extractDestinations(source: string) {
  const re = /(?:href=\{?[`"']|href:\s*[`"']|redirect\(\s*[`"']|(?:push|replace)\(\s*[`"'])(\/[^`"'$\s]*)/g;
  const out: { line: number; path: string; text: string }[] = [];
  source.split("\n").forEach((text, i) => {
    for (const m of text.matchAll(re)) out.push({ line: i + 1, path: m[1], text });
  });
  return out;
}

/** O trecere în alt spațiu e permisă dacă se deschide în tab nou sau e marcată explicit `nav-permis` (linia sau cea de dinainte). */
export function crossingAllowed(lines: string[], line: number) {
  const here = lines[line - 1] ?? "";
  const prev = lines[line - 2] ?? "";
  return /target="_blank"/.test(here) || /nav-permis/.test(here) || /nav-permis/.test(prev);
}
