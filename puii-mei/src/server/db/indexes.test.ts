import { test } from "node:test";
import assert from "node:assert/strict";
import { allIndexDdl, assertContains, assertIndexed, containsDdl, CONTAINS_FIELDS, indexDdl, indexName, INDEXED_FIELDS } from "./indexes.ts";

test("doar perechile înregistrate pot fi căutate", () => {
  assert.doesNotThrow(() => assertIndexed("preorders", "number"));
  assert.throws(() => assertIndexed("preorders", "customerEmail"), /fără index/);
  assert.throws(() => assertIndexed("necunoscuta", "id"), /fără index/);
});

test("numele care ar putea injecta SQL sunt refuzate", () => {
  assert.throws(() => assertIndexed("preorders", "number' OR '1'='1"));
  assert.throws(() => assertIndexed("preorders'; drop table documents; --", "number"));
});

test("indexul e parțial pe colecție și folosește aceeași expresie ca interogarea", () => {
  assert.equal(
    indexDdl("growth-log", "lotCode"),
    "CREATE INDEX IF NOT EXISTS docs_growth_log_lotcode ON documents ((data->>'lotCode'), created_at) WHERE collection = 'growth-log'",
  );
});

test("căutarea prin conținere: index GIN parțial; câmpurile neînregistrate sunt refuzate", () => {
  assert.equal(
    containsDdl("parcels", "replacedTokens"),
    "CREATE INDEX IF NOT EXISTS docs_parcels_replacedtokens ON documents USING gin ((data->'replacedTokens') jsonb_path_ops) WHERE collection = 'parcels'",
  );
  assert.throws(() => assertContains("parcels", "loaded"));
});

test("un index pentru fiecare pereche; nume unice și sub limita PostgreSQL (63)", () => {
  const all = { ...INDEXED_FIELDS, ...CONTAINS_FIELDS } as Record<string, readonly string[]>;
  const n = Object.values(INDEXED_FIELDS).reduce((s, f) => s + f.length, 0) + Object.values(CONTAINS_FIELDS).reduce((s, f) => s + f.length, 0);
  assert.equal(allIndexDdl().length, n);
  const names = [...Object.entries(INDEXED_FIELDS), ...Object.entries(CONTAINS_FIELDS)].flatMap(([c, fs]) => fs.map((f) => indexName(c, f)));
  assert.ok(Object.keys(all).length > 0);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.every((x) => x.length <= 63));
});

test("repository-urile nu mai caută un singur obiect citind toată colecția", async () => {
  const { readdirSync, readFileSync } = await import("node:fs");
  const dir = new URL("../repositories/", import.meta.url);
  const bad = readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .flatMap((f) => (readFileSync(new URL(f, dir), "utf8").match(/store\.list<[^>]+>\([A-Z_]+\)\)\.find\(/g) ?? []).map((m) => `${f}: ${m}`));
  assert.deepEqual(bad, [], "folosește store.findBy (cu index) în loc de list().find()");
});
