import { test } from "node:test";
import assert from "node:assert/strict";
import { safeInternalPath } from "./safe-return.ts";

test("rute interne valide trec, cu interogarea și ancora", () => {
  assert.equal(safeInternalPath("/admin/gospodarii/x?q=sv&pagina=3#lot"), "/admin/gospodarii/x?q=sv&pagina=3#lot");
  assert.equal(safeInternalPath("/cont/gospodar"), "/cont/gospodar");
});

test("NAV-T10: nicio redirecționare în afara site-ului", () => {
  for (const bad of [
    "https://evil.example", "//evil.example", "/\\evil.example", "\\\\evil.example", "/\\/evil.example",
    "javascript:alert(1)", "http:evil.example", " /admin", "/admin\n//evil", "", "admin", "/%2e%2e/secret", "/a/../b",
  ]) {
    assert.equal(safeInternalPath(bad), null, bad);
  }
  assert.equal(safeInternalPath(123), null);
});

test("limitarea la spațiul curent (Admin rămâne în Admin)", () => {
  assert.equal(safeInternalPath("/admin/monitorizare", "/admin"), "/admin/monitorizare");
  assert.equal(safeInternalPath("/admin", "/admin"), "/admin");
  assert.equal(safeInternalPath("/cont/gospodar/jurnal", "/admin"), null);
  assert.equal(safeInternalPath("/administratie", "/admin"), null, "prefix fals");
});
