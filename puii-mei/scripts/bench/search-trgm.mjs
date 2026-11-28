/**
 * Căutarea din Admin › Precomenzi (#81) la volum mare: ILIKE fără index (actual) vs. index trigram (pg_trgm), cu
 * EXPLAIN ANALYZE. Reproduce interogarea din pg-store.search. Doar pe o bază de TEST goală; nu schimbă aplicația.
 *
 *   BENCH_DATABASE_URL=postgres://… BENCH_N=200000 node scripts/bench/search-trgm.mjs
 */
import pg from "pg";

const url = process.env.BENCH_DATABASE_URL;
if (!url) throw new Error("Setează BENCH_DATABASE_URL (o bază de test, NU producția).");
const N = Number(process.env.BENCH_N ?? 200000);
const RUNS = Number(process.env.BENCH_RUNS ?? 15);
const db = new pg.Client({ connectionString: url });
await db.connect();
await db.query(`CREATE TABLE IF NOT EXISTS documents (collection text NOT NULL, id text NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (collection, id))`);
if (Number((await db.query(`select count(*) from documents where id not like 'bench-%'`)).rows[0].count) > 0) throw new Error("Baza conține date reale.");
await db.query(`delete from documents where id like 'bench-%'`);
await db.query(`CREATE INDEX IF NOT EXISTS documents_collection_created ON documents (collection, created_at DESC, id DESC)`);
const names = ["Popescu", "Ionescu", "Popa", "Rusu", "Munteanu", "Moldovan", "Ciornei", "Hreniuc", "Bodnar", "Cojocaru"];
await db.query(`insert into documents (collection, id, data)
  select 'preorders', 'bench-' || g, jsonb_build_object('id', 'bench-' || g, 'number', 'PM2611-' || upper(substr(md5(g::text), 1, 5)),
    'customer', jsonb_build_object('name', (array[${names.map((n) => `'${n}'`).join(",")}])[1 + g % 10] || ' ' || 'Client' || g,
      'phone', '07' || lpad((g * 7919 % 100000000)::text, 8, '0'), 'email', 'client' || g || '@test.ro'))
  from generate_series(1, ${N}) g`);
await db.query(`insert into documents (collection, id, data) values ('preorders', 'bench-target', '{"id":"bench-target","number":"PM2611-ZZZZZ","customer":{"name":"Ionela Căutătoarea","phone":"0744 987 654","email":"ionela.cauta@test.ro"}}')`);
await db.query("analyze documents");

const fields = ["number", "customer.name", "customer.phone", "customer.email"];
const expr = (f) => { const [a, b] = f.split("."); return b ? `(data->'${a}'->>'${b}')` : `(data->>'${a}')`; };
const sql = `SELECT data FROM documents WHERE collection = 'preorders' AND (${fields.map((f) => `${expr(f)} ILIKE $1`).join(" OR ")}) ORDER BY created_at DESC, id DESC LIMIT 50`;

async function measure(label) {
  const out = [];
  for (const term of ["căutătoarea", "987 654", "PM2611-ZZZ", "popescu"]) {
    const ms = [];
    let rows = 0;
    for (let i = 0; i < RUNS; i++) {
      const t = process.hrtime.bigint();
      rows = (await db.query(sql, [`%${term}%`])).rowCount;
      ms.push(Number(process.hrtime.bigint() - t) / 1e6);
    }
    ms.sort((a, b) => a - b);
    const plan = (await db.query(`EXPLAIN (ANALYZE, COSTS OFF) ${sql}`, [`%${term}%`])).rows.map((r) => r["QUERY PLAN"]);
    const node = plan.find((l) => /Scan|Bitmap/.test(l))?.trim() ?? plan[0];
    out.push(`| ${label} | „${term}” | ${rows} | ${ms[Math.floor(ms.length / 2)].toFixed(1)} | ${ms[Math.min(ms.length - 1, Math.floor(0.95 * ms.length))].toFixed(1)} | ${node.replace(/\|/g, "/")} |`);
  }
  return out;
}

console.log(`N = ${N} precomenzi, ${RUNS} rulări / termen, PostgreSQL ${(await db.query("show server_version")).rows[0].server_version}\n`);
console.log("| Variantă | Termen | Rezultate | p50 ms | p95 ms | Plan (primul nod de acces) |");
console.log("|---|---|---|---|---|---|");
for (const l of await measure("fără index (actual)")) console.log(l);
await db.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
for (const f of fields) {
  await db.query(`CREATE INDEX IF NOT EXISTS bench_trgm_${f.replace(".", "_")} ON documents USING gin (${expr(f)} gin_trgm_ops) WHERE collection = 'preorders'`);
}
await db.query("analyze documents");
for (const l of await measure("index trigram")) console.log(l);
const size = (await db.query(`select pg_size_pretty(sum(pg_relation_size(indexrelid))) s from pg_index where indexrelid::regclass::text like 'bench_trgm_%'`)).rows[0].s;
console.log(`\nDimensiunea celor 4 indexuri trigram: ${size}.`);
for (const f of fields) await db.query(`DROP INDEX IF EXISTS bench_trgm_${f.replace(".", "_")}`);
await db.query(`delete from documents where id like 'bench-%'`);
await db.end();
