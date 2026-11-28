/**
 * /cifre: costul citirii datelor la fiecare regenerare a paginii, înainte (toate comenzile, cheltuielile, investițiile,
 * loturile, gospodăriile — exact interogările `list` din pg-store + JSON) și după (read-model: un singur document).
 * „Înainte” e o limită INFERIOARĂ: nu include calculul `companyMetrics` în Node, doar citirea și parsarea.
 * Doar pe o bază de TEST goală:
 *
 *   BENCH_DATABASE_URL=postgres://… BENCH_N=200000 BENCH_EXPENSES=100000 node scripts/bench/cifre-read-model.mjs
 */
import pg from "pg";

const url = process.env.BENCH_DATABASE_URL;
if (!url) throw new Error("Setează BENCH_DATABASE_URL (o bază de test, NU producția).");
const N = Number(process.env.BENCH_N ?? 200000);
const E = Number(process.env.BENCH_EXPENSES ?? 100000);
const RUNS = Number(process.env.BENCH_RUNS ?? 15);

const db = new pg.Client({ connectionString: url });
await db.connect();
await db.query(`CREATE TABLE IF NOT EXISTS documents (collection text NOT NULL, id text NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (collection, id))`);
if (Number((await db.query(`select count(*) from documents where id not like 'bench-%'`)).rows[0].count) > 0) throw new Error("Baza conține date reale.");
await db.query(`delete from documents where id like 'bench-%'`);
await db.query(`insert into documents (collection, id, data)
  select 'preorders', 'bench-' || g, jsonb_build_object('id', 'bench-' || g, 'number', 'PM-' || g, 'lotCode', 'LOT-' || (g % 500), 'birds', 8,
    'status', (array['noua','confirmata','livrata','anulata'])[1 + g % 4], 'estimate', jsonb_build_object('total', 400, 'productValue', 360),
    'feedPayment', jsonb_build_object('amount', 120, 'status', 'primita', 'confirmedAt', now()),
    'customer', jsonb_build_object('name', 'Client test', 'phone', '0700000000', 'email', 't@test.ro', 'address', 'Strada Test 1, Suceava'))
  from generate_series(1, ${N}) g`);
await db.query(`insert into documents (collection, id, data)
  select 'expenses', 'bench-e' || g, jsonb_build_object('id', 'bench-e' || g, 'farmSlug', 'f' || (g % 50), 'kind', 'cheltuiala', 'category', 'furaj',
    'amount', 250, 'date', '2026-11-01', 'number', 'F-' || g, 'confirmedAt', now(), 'fileId', 'x')
  from generate_series(1, ${E}) g`);
await db.query(`insert into documents (collection, id, data) select 'lots', 'bench-l' || g, jsonb_build_object('id', 'bench-l' || g, 'code', 'LOT-' || g, 'farmSlug', 'f' || (g % 50), 'totalBirds', 400) from generate_series(1, 500) g`);
await db.query(`insert into documents (collection, id, data) select 'farms', 'bench-f' || g, jsonb_build_object('id', 'bench-f' || g, 'slug', 'f' || g) from generate_series(1, 50) g`);
await db.query(`insert into documents (collection, id, data) values ('read-models', 'bench-cifre', $1)`, [
  JSON.stringify({ id: "bench-cifre", computedAt: new Date().toISOString(), metrics: { farms: 50, byFarm: Array.from({ length: 50 }, (_, i) => ({ slug: `f${i}`, birds: 400, revenue: 1, expenses: 1, profit: 0 })), byYear: [{ year: "2026", revenue: 1, expenses: 1 }], expensesByCategory: [{ label: "Furaj", value: 1 }] } }),
]);
await db.query("analyze documents");

async function time(fn) {
  const ms = [];
  let out = 0;
  for (let i = 0; i < RUNS; i++) {
    const t = process.hrtime.bigint();
    out = await fn();
    ms.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  ms.sort((a, b) => a - b);
  const p = (q) => ms[Math.min(ms.length - 1, Math.floor(q * ms.length))].toFixed(1);
  return { p50: p(0.5), p95: p(0.95), out };
}
const list = (c) => db.query("SELECT data FROM documents WHERE collection = $1 ORDER BY created_at", [c]).then((r) => r.rows);
const heap = () => process.memoryUsage().heapUsed;
let peak = 0;
const before = await time(async () => {
  const h = heap();
  const all = await Promise.all(["farms", "lots", "preorders", "expenses", "investments"].map(list));
  peak = Math.max(peak, heap() - h);
  return all.reduce((s, r) => s + r.length, 0);
});
const after = await time(async () => (await db.query("SELECT data FROM documents WHERE collection = $1 AND id = $2", ["read-models", "bench-cifre"])).rows.length);
const size = (await db.query(`select pg_column_size(data) s from documents where collection = 'read-models' and id = 'bench-cifre'`)).rows[0].s;
console.log(`${N} precomenzi + ${E} cheltuieli, ${RUNS} rulări, PostgreSQL ${(await db.query("show server_version")).rows[0].server_version}`);
console.log(`înainte (5 colecții întregi): p50 ${before.p50} ms, p95 ${before.p95} ms, ${before.out} documente citite, ~${Math.round(peak / 1e6)} MB heap în plus`);
console.log(`după (read-model, 1 document de ${size} B): p50 ${after.p50} ms, p95 ${after.p95} ms`);
await db.query(`delete from documents where id like 'bench-%'`);
await db.end();
