/**
 * Verificare C1 (#83): costul imaginii precomenzilor citite la fiecare rezervare de locuri (src/server/seats.ts),
 * înainte (toată colecția) și după (comenzile lotului prin indexul lotCode + id-urile din registru). Reproduce exact
 * interogările din pg-store (list / findBy / get). Doar pe o bază de TEST goală:
 *
 *   BENCH_DATABASE_URL=postgres://… BENCH_N=200000 BENCH_LOTS=500 node scripts/bench/seats-snapshot.mjs
 */
import pg from "pg";

const url = process.env.BENCH_DATABASE_URL;
if (!url) throw new Error("Setează BENCH_DATABASE_URL (o bază de test, NU producția).");
const N = Number(process.env.BENCH_N ?? 200000);
const LOTS = Number(process.env.BENCH_LOTS ?? 500);
const RUNS = Number(process.env.BENCH_RUNS ?? 20);

const db = new pg.Client({ connectionString: url });
await db.connect();
await db.query(`CREATE TABLE IF NOT EXISTS documents (collection text NOT NULL, id text NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (collection, id))`);
if (Number((await db.query(`select count(*) from documents where id not like 'bench-%'`)).rows[0].count) > 0) throw new Error("Baza conține date reale.");
await db.query(`delete from documents where id like 'bench-%'`);
// Aceleași indexuri ca aplicația (src/server/db/indexes.ts).
await db.query(`CREATE INDEX IF NOT EXISTS docs_preorders_lotcode ON documents ((data->>'lotCode'), created_at) WHERE collection = 'preorders'`);
await db.query(`insert into documents (collection, id, data)
  select 'preorders', 'bench-' || g, jsonb_build_object('id', 'bench-' || g, 'number', 'PM-' || g, 'lotCode', 'LOT-' || (g % ${LOTS}), 'birds', 8,
    'status', 'noua', 'customer', jsonb_build_object('name', 'Client test', 'phone', '0700000000', 'email', 't@test.ro'))
  from generate_series(1, ${N}) g`);
// Registrul unui lot: comenzile lotului + 3 rezervări în curs (fără lot scris încă).
const code = "LOT-7";
const ids = (await db.query(`select id from documents where collection = 'preorders' and data->>'lotCode' = $1`, [code])).rows.map((r) => r.id);
const ledger = { id: code, capacity: 1_000_000, allocations: Object.fromEntries([...ids, "bench-pending-1", "bench-pending-2", "bench-pending-3"].map((id) => [id, 8])) };
await db.query(`insert into documents (collection, id, data) values ('lot-seats', 'bench-ledger', $1)`, [JSON.stringify(ledger)]);
await db.query("analyze documents");

async function time(fn) {
  const ms = [];
  let rows = 0;
  for (let i = 0; i < RUNS; i++) {
    const t = process.hrtime.bigint();
    rows = await fn();
    ms.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  ms.sort((a, b) => a - b);
  const p = (q) => ms[Math.min(ms.length - 1, Math.floor(q * ms.length))].toFixed(1);
  return `p50 ${p(0.5)} ms, p95 ${p(0.95)} ms (${rows} comenzi în imagine)`;
}
const before = await time(async () => (await db.query(`SELECT data FROM documents WHERE collection = $1 ORDER BY created_at`, ["preorders"])).rows.length);
const after = await time(async () => {
  const cur = (await db.query(`SELECT data FROM documents WHERE collection = $1 AND id = $2`, ["lot-seats", "bench-ledger"])).rows[0].data;
  const onLot = (await db.query(`SELECT data FROM documents WHERE collection = 'preorders' AND (data->>'lotCode') = ANY($1::text[]) ORDER BY created_at`, [[code]])).rows;
  const seen = new Set(onLot.map((r) => r.data.id));
  const others = await Promise.all(Object.keys(cur.allocations).filter((id) => !seen.has(id)).map((id) => db.query(`SELECT data FROM documents WHERE collection = $1 AND id = $2`, ["preorders", id])));
  return onLot.length + others.filter((r) => r.rows.length).length;
});
console.log(`N = ${N} precomenzi pe ${LOTS} loturi (${N / LOTS} pe lot), ${RUNS} rulări, PostgreSQL ${(await db.query("show server_version")).rows[0].server_version}`);
console.log(`înainte (toată colecția):        ${before}`);
console.log(`după (lotul + id-urile registrului): ${after}`);
await db.query(`delete from documents where id like 'bench-%'`);
await db.end();
