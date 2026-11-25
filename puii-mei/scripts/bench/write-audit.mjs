/**
 * C3 (#62): benchmark reproductibil de SCRIERE cu audit — baseline pentru lock-ul global al lanțului de audit.
 *
 * Reproduce exact SQL-ul aplicației (src/server/db/pg-store.ts: transact + auditAppend în aceeași tranzacție) și îl
 * compară cu o variantă cu lanț pe gospodărie (lock pe gospodărie în loc de lock global). Rulează DOAR pe o bază de
 * test goală:
 *
 *   BENCH_DATABASE_URL=postgres://… node scripts/bench/write-audit.mjs
 *   opțional: BENCH_CONCURRENCY=1,10,50,90 (sub max_connections)  BENCH_OPS=400  BENCH_RTT_MS=0,2,10  BENCH_HOUSEHOLDS=100
 *
 * BENCH_RTT_MS simulează latența de rețea aplicație ↔ bază pe fiecare interogare (Vercel ↔ Neon în aceeași regiune:
 * câteva ms; regiuni diferite: zeci de ms). E o simulare declarată, nu o măsurătoare a rețelei reale.
 */
import pg from "pg";
import { createHash, randomUUID } from "node:crypto";

const url = process.env.BENCH_DATABASE_URL;
if (!url) throw new Error("Setează BENCH_DATABASE_URL (o bază de test, NU producția).");
const LEVELS = (process.env.BENCH_CONCURRENCY ?? "1,10,50,90").split(",").map(Number);
const OPS = Number(process.env.BENCH_OPS ?? 400);
const RTTS = (process.env.BENCH_RTT_MS ?? "0,2,10").split(",").map(Number);
const HOUSEHOLDS = Number(process.env.BENCH_HOUSEHOLDS ?? 100);
const DOCS = 1000;

const setup = new pg.Client({ connectionString: url });
await setup.connect();
const real = Number((await setup.query(`select count(*) from pg_tables where tablename in ('documents','audit_events')`)).rows[0].count);
if (real) {
  const n = Number((await setup.query(`select count(*) from documents where id not like 'bench-%'`).catch(() => ({ rows: [{ count: 0 }] }))).rows[0].count);
  if (n > 0) throw new Error("Baza conține date reale: folosește o bază de test goală.");
}
await setup.query(`DROP TABLE IF EXISTS documents, audit_events`);
await setup.query(`CREATE TABLE documents (collection text NOT NULL, id text NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (collection, id))`);
await setup.query(`CREATE TABLE audit_events (seq bigserial PRIMARY KEY, id uuid NOT NULL UNIQUE, occurred_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  action text NOT NULL, actor_id text, household_id text, resource_type text, resource_id text, correlation_id text, result text NOT NULL, data jsonb NOT NULL, prev_hash text, event_hash text NOT NULL)`);
await setup.query(`CREATE INDEX audit_household_idx ON audit_events (household_id, occurred_at, seq)`);
await setup.query(`CREATE INDEX audit_household_seq ON audit_events (household_id, seq DESC)`);
await setup.query(`insert into documents (collection, id, data) select 'preorders', 'bench-' || g, jsonb_build_object('id', 'bench-' || g, 'farmSlug', 'hh-' || (g % ${HOUSEHOLDS}), 'n', 0) from generate_series(0, ${DOCS - 1}) g`);
await setup.end();

const sleep = (ms) => (ms ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());
const hash = (prev, e) => createHash("sha256").update(`${prev ?? ""}|${JSON.stringify(e)}`).digest("hex");

/** O scriere ca în aplicație: rândul blocat + modificat, apoi auditul în aceeași tranzacție. */
async function op(pool, rtt, variant) {
  const c = await pool.connect();
  const q = async (sql, params) => {
    await sleep(rtt);
    return c.query(sql, params);
  };
  const doc = `bench-${Math.floor(Math.random() * DOCS)}`;
  try {
    await q("begin");
    const cur = (await q("select data from documents where collection = 'preorders' and id = $1 for update", [doc])).rows[0].data;
    await q("update documents set data = data || $2::jsonb where collection = 'preorders' and id = $1", [doc, JSON.stringify({ n: cur.n + 1 })]);
    const e = { id: randomUUID(), occurredAt: new Date().toISOString(), action: "bench.write", householdId: cur.farmSlug, resourceId: doc, result: "ok" };
    await q("SET LOCAL lock_timeout = '3s'");
    if (variant === "global") {
      await q("SELECT pg_advisory_xact_lock(424242)");
      const prev = (await q("SELECT event_hash FROM audit_events ORDER BY seq DESC LIMIT 1")).rows[0]?.event_hash ?? null;
      await q(`INSERT INTO audit_events (id, occurred_at, action, household_id, resource_id, result, data, prev_hash, event_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [e.id, e.occurredAt, e.action, e.householdId, e.resourceId, e.result, JSON.stringify(e), prev, hash(prev, e)]);
    } else {
      // Lanț pe gospodărie: lock doar pe gospodăria respectivă; gospodăriile diferite scriu în paralel.
      await q("SELECT pg_advisory_xact_lock(424242, hashtext($1))", [e.householdId]);
      const prev = (await q("SELECT event_hash FROM audit_events WHERE household_id = $1 ORDER BY seq DESC LIMIT 1", [e.householdId])).rows[0]?.event_hash ?? null;
      await q(`INSERT INTO audit_events (id, occurred_at, action, household_id, resource_id, result, data, prev_hash, event_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [e.id, e.occurredAt, e.action, e.householdId, e.resourceId, e.result, JSON.stringify(e), prev, hash(prev, e)]);
    }
    await q("commit");
    return null;
  } catch (err) {
    await c.query("rollback").catch(() => {});
    return err.code === "55P03" ? "lock_timeout" : err.code ?? "eroare";
  } finally {
    c.release();
  }
}

const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
console.log(`Benchmark scriere + audit: ${OPS} operații / nivel, ${DOCS} documente, ${HOUSEHOLDS} gospodării. Node ${process.version}.`);
console.log("varianta | RTT simulat | concurență | ops/s | p50 ms | p95 ms | p99 ms | erori | integritate");
for (const rtt of RTTS) {
  for (const variant of ["global", "pe-gospodarie"]) {
    for (const conc of LEVELS) {
      const admin = new pg.Client({ connectionString: url });
      await admin.connect();
      await admin.query("truncate audit_events");
      const pool = new pg.Pool({ connectionString: url, max: conc });
      const lat = [];
      const errors = {};
      let next = 0;
      const t0 = performance.now();
      await Promise.all(
        Array.from({ length: conc }, async () => {
          while (next < OPS) {
            next++;
            const s = performance.now();
            const err = await op(pool, rtt, variant);
            if (err) errors[err] = (errors[err] ?? 0) + 1;
            else lat.push(performance.now() - s);
          }
        }),
      );
      const secs = (performance.now() - t0) / 1000;
      lat.sort((a, b) => a - b);
      const f = (x) => (x === undefined ? "—" : x.toFixed(1));
      await pool.end();
      // Integritatea lanțului: fiecare prev_hash = amprenta evenimentului anterior (global, respectiv pe gospodărie).
      const part = variant === "global" ? "" : "partition by household_id";
      const broken = (await admin.query(`select count(*) from (select prev_hash, lag(event_hash) over (${part} order by seq) as before from audit_events) x where prev_hash is distinct from before`)).rows[0].count;
      await admin.end();
      console.log(`${variant} | ${rtt} ms | ${conc} | ${(lat.length / secs).toFixed(0)} | ${f(pct(lat, 0.5))} | ${f(pct(lat, 0.95))} | ${f(pct(lat, 0.99))} | ${JSON.stringify(errors)} | lanț rupt: ${broken}`);
    }
  }
}
const v = new pg.Client({ connectionString: url });
await v.connect();
await v.query(`DROP TABLE IF EXISTS documents, audit_events`);
await v.end();
