/**
 * C4 (#62): verificarea unei copii de siguranță prin RESTAURARE IZOLATĂ — un backup netestat nu e un backup.
 *
 *   pg_dump (format custom) din SURSĂ → pg_restore într-o bază NOUĂ → comparație completă → ștergerea bazei de probă.
 * Verifică: numărul și conținutul documentelor pe fiecare colecție (amprentă md5 pe id + date), jurnalul de audit
 * (număr, ultima amprentă și lanțul recalculat integral cu aceeași funcție ca aplicația), timpii de backup / restore.
 *
 *   RESTORE_SOURCE_URL=postgres://postgres@localhost:5433/puii_e2e \
 *   RESTORE_ADMIN_URL=postgres://postgres@localhost:5433/postgres node scripts/backup/restore-check.mjs
 *
 * Doar pe servere locale / de test (fără date reale, fără furnizor nou). Restaurarea NU se face niciodată peste sursă.
 * Necesită pg_dump / pg_restore de aceeași versiune majoră cu serverul.
 *
 * RESTORE_SELFTEST=1: după restaurare modifică intenționat un document și un eveniment de audit în baza de PROBĂ și
 * verifică că ambele sunt detectate (dovada că verificarea nu trece orbește). Sursa nu e atinsă.
 */
import pg from "pg";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

const source = process.env.RESTORE_SOURCE_URL;
const admin = process.env.RESTORE_ADMIN_URL;
if (!source || !admin) throw new Error("Setează RESTORE_SOURCE_URL și RESTORE_ADMIN_URL (servere de test).");
for (const u of [source, admin]) {
  const host = new URL(u).hostname;
  if (!["localhost", "127.0.0.1", "::1", ""].includes(host) && process.env.RESTORE_ALLOW_REMOTE !== "1") {
    throw new Error(`Gazda ${host} nu e locală: scriptul e pentru verificări de test (vezi docs/RUNBOOK-BACKUP-RESTORE.md).`);
  }
}

// Aceeași amprentă ca src/server/audit-core.ts (eventHash / canonical): JSON cu chei sortate.
const canonical = (v) => (Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : v && typeof v === "object"
  ? `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`
  : JSON.stringify(v));
const eventHash = (prev, e) => createHash("sha256").update(`${prev ?? ""}|${canonical(e)}`).digest("hex");

const target = `puii_restore_check_${Date.now()}`;
const targetUrl = admin.replace(/\/[^/?]+(\?|$)/, `/${target}$1`);
const dir = mkdtempSync(join(tmpdir(), "puii-backup-"));
const dump = join(dir, "backup.dump");
const ms = (t) => `${(Number(process.hrtime.bigint() - t) / 1e6).toFixed(0)} ms`;

async function snapshot(url) {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    const collections = (await c.query(
      `SELECT collection, count(*)::int AS n, md5(string_agg(id || ':' || data::text, '|' ORDER BY id)) AS h FROM documents GROUP BY collection ORDER BY collection`,
    )).rows;
    const hasAudit = (await c.query(`SELECT to_regclass('audit_events') IS NOT NULL AS a`)).rows[0].a;
    let audit = { n: 0, head: null, broken: null };
    if (hasAudit) {
      const rows = (await c.query(`SELECT seq, data, prev_hash, event_hash FROM audit_events ORDER BY seq`)).rows;
      let prev = null;
      let broken = null;
      for (const r of rows) {
        if (r.prev_hash !== prev || eventHash(prev, r.data) !== r.event_hash) {
          broken = Number(r.seq);
          break;
        }
        prev = r.event_hash;
      }
      audit = { n: rows.length, head: rows.at(-1)?.event_hash ?? null, broken };
    }
    return { collections, audit };
  } finally {
    await c.end();
  }
}

let failed = false;
try {
  const t0 = process.hrtime.bigint();
  execFileSync("pg_dump", ["--format=custom", "--no-owner", "--file", dump, source], { stdio: "inherit" });
  const dumpTime = ms(t0);
  const size = statSync(dump).size;
  const a = new pg.Client({ connectionString: admin });
  await a.connect();
  await a.query(`CREATE DATABASE ${target}`);
  await a.end();
  const t1 = process.hrtime.bigint();
  execFileSync("pg_restore", ["--no-owner", "--exit-on-error", "--dbname", targetUrl, dump], { stdio: "inherit" });
  const restoreTime = ms(t1);
  if (process.env.RESTORE_SELFTEST === "1") {
    const t = new pg.Client({ connectionString: targetUrl });
    await t.connect();
    await t.query(`UPDATE documents SET data = data || '{"modificat": true}' WHERE ctid = (SELECT ctid FROM documents WHERE collection = 'preorders' LIMIT 1)`);
    await t.query(`ALTER TABLE audit_events DISABLE TRIGGER USER`);
    await t.query(`UPDATE audit_events SET data = data || '{"action": "falsificat"}' WHERE seq = (SELECT min(seq) + 1 FROM audit_events)`);
    await t.end();
  }

  const [src, dst] = await Promise.all([snapshot(source), snapshot(targetUrl)]);
  const byName = new Map(dst.collections.map((r) => [r.collection, r]));
  console.log(`Backup: ${dumpTime}, ${(size / 1024).toFixed(0)} KiB · Restaurare izolată: ${restoreTime} (baza ${target})\n`);
  console.log("| Colecție | Sursă | Restaurat | Conținut identic |");
  console.log("|---|---|---|---|");
  for (const r of src.collections) {
    const d = byName.get(r.collection);
    const same = d && d.n === r.n && d.h === r.h;
    if (!same) failed = true;
    console.log(`| ${r.collection} | ${r.n} | ${d?.n ?? "LIPSĂ"} | ${same ? "da" : "**NU**"} |`);
  }
  if (dst.collections.length !== src.collections.length) failed = true;
  const auditOk = src.audit.n === dst.audit.n && src.audit.head === dst.audit.head && dst.audit.broken === null && src.audit.broken === null;
  if (!auditOk) failed = true;
  console.log(`\nAudit: sursă ${src.audit.n} evenimente, restaurat ${dst.audit.n}; ultima amprentă ${src.audit.head === dst.audit.head ? "identică" : "**DIFERITĂ**"}; lanț recalculat: ${dst.audit.broken === null ? "valid" : `**RUPT la seq ${dst.audit.broken}**`}`);
  console.log(failed ? "\nREZULTAT: copia NU e validă." : "\nREZULTAT: copia e validă (restaurare izolată verificată).");
  if (process.env.RESTORE_SELFTEST === "1") {
    // În autotest, „corect” înseamnă că AMBELE falsificări au fost prinse.
    const docCaught = src.collections.some((r) => byName.get(r.collection)?.h !== r.h);
    const auditCaught = dst.audit.broken !== null;
    console.log(`AUTOTEST: document modificat ${docCaught ? "detectat" : "**NEDETECTAT**"}; audit falsificat ${auditCaught ? `detectat (seq ${dst.audit.broken})` : "**NEDETECTAT**"}`);
    failed = !(docCaught && auditCaught);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
  const a = new pg.Client({ connectionString: admin });
  await a.connect();
  await a.query(`DROP DATABASE IF EXISTS ${target}`);
  await a.end();
}
process.exit(failed ? 1 : 0);
