import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { crossingAllowed, extractDestinations, spaceOfFile, spaceOfRoute } from "./nav-policy.ts";

test("spațiul rutelor", () => {
  assert.equal(spaceOfRoute("/admin/comenzi/PM1"), "admin");
  assert.equal(spaceOfRoute("/admin#comanda-PM1"), "admin");
  assert.equal(spaceOfRoute("/administratie"), "public");
  assert.equal(spaceOfRoute("/cont/gospodar/jurnal"), "household");
  assert.equal(spaceOfRoute("/comanda/abc"), "customer");
  assert.equal(spaceOfRoute("/fisiere/x"), "resource");
  assert.equal(spaceOfRoute("/cont/autentificare"), "auth");
});

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mts)$/.test(n) && !n.includes(".test.") ? [p] : [];
  });

/**
 * Verificarea automată a traversărilor nepermise (decizia fondatorului, 24.11.2026): din codul spațiului Admin,
 * niciun link / redirect nu duce în alt spațiu (gospodar, client, curier, investitor, public), decât în tab nou sau
 * marcat explicit `nav-permis` (ex. „Schimbă spațiul”). Resursele (/fisiere, /foto) și autentificarea sunt permise.
 */
test("Admin: nicio trecere nepermisă în alt spațiu (scanare a codului)", () => {
  const root = path.join(process.cwd(), "src");
  const bad: string[] = [];
  for (const file of walk(root)) {
    if (spaceOfFile(file) !== "admin") continue;
    const src = readFileSync(file, "utf8");
    const lines = src.split("\n");
    for (const d of extractDestinations(src)) {
      const to = spaceOfRoute(d.path);
      if (to === "admin" || to === "resource" || to === "auth") continue;
      if (!crossingAllowed(lines, d.line)) bad.push(`${path.relative(process.cwd(), file)}:${d.line} → ${d.path} (${to})`);
    }
  }
  assert.deepEqual(bad, [], `Linkuri din Admin în alt spațiu:\n${bad.join("\n")}`);
});
