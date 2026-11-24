/**
 * Benchmark reproductibil pentru pasul 1 (#62): căutarea unei comenzi după număr — citirea întregii colecții (vechi)
 * vs. căutarea prin index (nou). Rulează DOAR pe o bază de test goală (scrie N comenzi sintetice):
 *
 *   BENCH_DATABASE_URL=postgres://… BENCH_N=200000 node scripts/bench/lookup.mjs
 *
 * Rezultatele sunt măsurători pe mașina care rulează (latență internă DB + transfer), nu estimări.
 */
import pg from "pg";

const url = process.env.BENCH_DATABASE_URL;
const N = Number(process.env.BENCH_N ?? 50000);
const RUNS = Number(process.env.BENCH_RUNS ?? 20);
if (!url) throw new Error("Setează BENCH_DATABASE_URL (o bază de test, NU producția).");

const db = new pg.Client({ connectionString: url });
await db.connect();
await db.query(`CREATE TABLE IF NOT EXISTS documents (collection text NOT NULL, id text NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (collection, id))`);
const existing = Number((await db.query(`select count(*) from documents where collection = 'preorders' and id not like 'bench-%'`)).rows[0].count);
if (existing > 0) throw new Error("Baza conține comenzi reale: folosește o bază de test goală.");

await db.query(`delete from documents where collection = 'preorders' and id like 'bench-%'`);
const batch = 5000;
for (let i = 0; i < N; i += batch) {
  const ids = [], datas = [];
  for (let j = i; j < Math.min(N, i + batch); j++) {
    const number = `PM2611-${j.toString(36).toUpperCase().padStart(5, "0")}`;
    ids.push(`bench-${j}`);
    datas.push(JSON.stringify({ id: `bench-${j}`, number, lotCode: `LOT-${j % 500}`, birds: 8, status: "noua", customer: { name: "Client test", phone: "0700000000", email: "t@test.ro", address: "Strada Test 1, Comuna Test, Județul Test" }, createdAt: new Date().toISOString() }));
  }
  await db.query(`insert into documents (collection, id, data) select 'preorders', unnest($1::text[]), unnest($2::jsonb[])`, [ids, datas]);
}
await db.query(`CREATE INDEX IF NOT EXISTS docs_preorders_number ON documents ((data->>'number'), created_at) WHERE collection = 'preorders'`);
await db.query("analyze documents");

const target = `PM2611-${Math.floor(N / 2).toString(36).toUpperCase().padStart(5, "0")}`;
async function time(fn) {
  const ms = [];
  for (let i = 0; i < RUNS; i++) {
    const t = process.hrtime.bigint();
    await fn();
    ms.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  ms.sort((a, b) => a - b);
  const p = (q) => ms[Math.min(ms.length - 1, Math.floor(q * ms.length))].toFixed(1);
  return `p50 ${p(0.5)} ms, p95 ${p(0.95)} ms, max ${ms.at(-1).toFixed(1)} ms`;
}
const old = await time(async () => {
  const rows = (await db.query(`select data from documents where collection = 'preorders' order by created_at`)).rows;
  if (!rows.find((r) => r.data.number === target)) throw new Error("negăsit");
});
const neu = await time(async () => {
  const rows = (await db.query(`select data from documents where collection = 'preorders' and (data->>'number') = any($1::text[]) order by created_at`, [[target]])).rows;
  if (rows.length !== 1) throw new Error("negăsit");
});
console.log(`N = ${N} comenzi, ${RUNS} rulări`);
console.log(`vechi (toată colecția + căutare în JS): ${old}`);
console.log(`nou   (index pe număr):                 ${neu}`);
await db.query(`delete from documents where collection = 'preorders' and id like 'bench-%'`);
await db.end();
