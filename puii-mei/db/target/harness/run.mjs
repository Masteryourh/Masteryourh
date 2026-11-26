/**
 * Harness izolat pentru schema-țintă (PR60 + patch-urile din db/target/patches): reproduce defectele R01–R07 (#75) și
 * verifică remedierile, cu rolul runtime real (non-owner, NOBYPASSRLS). Doar pe un server PostgreSQL 16 de TEST:
 * creează și șterge baze `puii_target_*`. Nu atinge producția și nu face migrări.
 *
 *   HARNESS_ADMIN_URL=postgres://postgres@localhost:5433/postgres node db/target/harness/run.mjs
 *
 * Rulează două variante pe baze noi: „upstream” (doar SQL-ul PR60) și „patched” (+ patch-uri). Pentru fiecare test:
 * PROTEJAT = invarianta e respectată; DEFECT = defectul se reproduce. Ieșire cu cod 1 dacă varianta „patched” are
 * vreun DEFECT (sau dacă „upstream” nu reproduce un defect așteptat: harness-ul ar fi greșit).
 */
import pg from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const adminUrl = process.env.HARNESS_ADMIN_URL;
if (!adminUrl) throw new Error("Setează HARNESS_ADMIN_URL (server PostgreSQL de test, ex. postgres://postgres@localhost:5433/postgres).");

const UP = ["chatgpt-04-core-schema.draft.sql", "chatgpt-04-extensions.draft.sql", "chatgpt-04-tenant-hardening.draft.sql"].map((f) => join(root, "upstream", f));
const PATCHES = readdirSync(join(root, "patches")).filter((f) => f.endsWith(".sql")).sort().map((f) => join(root, "patches", f));

const A = "aaaaaaaa-0000-0000-0000-000000000001";
const B = "bbbbbbbb-0000-0000-0000-000000000002";
const UA = "11111111-0000-0000-0000-000000000001";
const UB = "22222222-0000-0000-0000-000000000002";
const LOT_A = "10000000-0000-0000-0000-00000000000a";
const LOT_B = "10000000-0000-0000-0000-00000000000b";
const DOC_B = "d0c00000-0000-0000-0000-00000000000b";
const BANK_B = "ba000000-0000-0000-0000-00000000000b";
const ORDER_A = "0d000000-0000-0000-0000-00000000000a";
const RUN_A = "a8000000-0000-0000-0000-00000000000a";
const RUN_B = "a8000000-0000-0000-0000-00000000000b";

const SEED = `
INSERT INTO household.households(id,slug,legal_name,status,created_at,updated_at) VALUES
 ('${A}','gosp-a','Gospodaria A','active',now(),now()), ('${B}','gosp-b','Gospodaria B','active',now(),now());
INSERT INTO identity.users(id,email,display_name) VALUES ('${UA}','a@t.ro','A'),('${UB}','b@t.ro','B');
INSERT INTO identity.memberships(id,user_id,household_id,role,status) VALUES (gen_random_uuid(),'${UA}','${A}','gospodar','active'),(gen_random_uuid(),'${UB}','${B}','gospodar','active');
INSERT INTO programs.definitions(id,code,name,category) VALUES ('d0000000-0000-0000-0000-000000000001','pui','Pui','pasari');
INSERT INTO programs.versions(id,program_id,version,rules,status) VALUES ('e0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',1,'{}','draft');
INSERT INTO programs.cycles(id,household_id,program_version_id,code,status) VALUES
 ('c0000000-0000-0000-0000-00000000000a','${A}','e0000000-0000-0000-0000-000000000001','C-A','active'),
 ('c0000000-0000-0000-0000-00000000000b','${B}','e0000000-0000-0000-0000-000000000001','C-B','active');
INSERT INTO production.lots(id,household_id,cycle_id,code,status,capacity_units,reserved_units,version) VALUES
 ('${LOT_A}','${A}','c0000000-0000-0000-0000-00000000000a','L-A','preorder',40,0,1),
 ('${LOT_B}','${B}','c0000000-0000-0000-0000-00000000000b','L-B','preorder',40,0,1);
INSERT INTO platform.documents(id,household_id,storage_key,sha256,mime_type,size_bytes,classification) VALUES
 ('${DOC_B}','${B}','files/b',repeat('0',64),'application/pdf',10,'private');
INSERT INTO finance.bank_accounts(id,household_id,iban_ciphertext,iban_fingerprint,holder,status,requested_by) VALUES
 ('${BANK_B}','${B}','\\x00',repeat('0',64),'Titular B','pending','${UB}');
INSERT INTO commerce.customers(id,name,email) VALUES ('cc000000-0000-0000-0000-000000000001','Client A','ca@t.ro'),('cc000000-0000-0000-0000-000000000002','Client B','cb@t.ro');
INSERT INTO commerce.orders(id,number,customer_id,household_id,status,currency,created_at,updated_at) VALUES
 ('${ORDER_A}','PM-A','cc000000-0000-0000-0000-000000000001','${A}','confirmed','RON',now(),now()),
 ('0d000000-0000-0000-0000-00000000000b','PM-B','cc000000-0000-0000-0000-000000000002','${B}','confirmed','RON',now(),now());
INSERT INTO commerce.products(id,program_id,sku,name,unit) VALUES ('9d000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','PUI','Pui','buc');
INSERT INTO commerce.order_lines(id,order_id,product_id,quantity,unit_price,currency,household_id)
 SELECT ('01000000-0000-0000-0000-0000000000' || lpad(g::text, 2, '0'))::uuid,'${ORDER_A}','9d000000-0000-0000-0000-000000000001',8,0,'RON','${A}' FROM generate_series(1, 12) g;
INSERT INTO ai.agents(id,code,description,status) VALUES ('a9000000-0000-0000-0000-000000000001','plan','planificare','enabled');
INSERT INTO ai.runs(id,agent_id,household_id,status,input_reference) VALUES
 ('${RUN_A}','a9000000-0000-0000-0000-000000000001','${A}','completed','x'),('${RUN_B}','a9000000-0000-0000-0000-000000000001','${B}','completed','x');
`;

// Varianta „upstream” nu are rol runtime: îl creăm cu aceleași drepturi DML (ipoteza din draftul PR60).
const UPSTREAM_ROLE = `
DO $$ DECLARE s text; BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='puii_runtime') THEN CREATE ROLE puii_runtime NOLOGIN NOBYPASSRLS; END IF;
  FOR s IN SELECT nspname FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname NOT IN ('information_schema','public') LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO puii_runtime', s);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA %I TO puii_runtime', s);
  END LOOP; END $$;`;

async function client(url) {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  return c;
}

/** Rulează `fn` ca rol runtime, cu scope (scriere + citire + tip), într-o tranzacție anulată la final. */
async function asRuntime(db, { write = null, read = [], kind = "tenant", principal = null }, fn) {
  await db.query("BEGIN");
  try {
    await db.query("SET LOCAL ROLE puii_runtime");
    const hasHelper = (await db.query(`SELECT to_regproc('app.set_scope') IS NOT NULL AS h`)).rows[0].h;
    if (hasHelper) await db.query("SELECT app.set_scope($1, $2, $3::uuid[], $4)", [principal, write, read, kind]);
    else {
      // Draftul PR60 citește doar app.household_id (o singură gospodărie).
      await db.query("SELECT set_config('app.household_id', $1, true)", [write ?? read[0] ?? ""]);
    }
    return await fn();
  } finally {
    await db.query("ROLLBACK");
  }
}
const err = async (p) => {
  try {
    await p;
    return null;
  } catch (e) {
    return e.code ?? "eroare";
  }
};
const count = async (db, sql, params) => Number((await db.query(sql, params)).rows[0].n);

const TESTS = [
  ["R01", "owner fără FORCE nu ocolește RLS (context A ⇒ 1 lot)", async (db) => {
    await db.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='puii_owner_t') THEN CREATE ROLE puii_owner_t NOLOGIN NOBYPASSRLS; END IF; END $$");
    await db.query("GRANT USAGE ON SCHEMA production, app TO puii_owner_t").catch(() => db.query("GRANT USAGE ON SCHEMA production TO puii_owner_t"));
    await db.query("ALTER TABLE production.lots OWNER TO puii_owner_t");
    try {
      await db.query("BEGIN");
      await db.query("SET LOCAL ROLE puii_owner_t");
      await db.query("SELECT set_config('app.household_id', $1, true)", [A]);
      const n = await count(db, "SELECT count(*) n FROM production.lots");
      await db.query("ROLLBACK");
      return { protected: n === 1, detail: `loturi vizibile: ${n}` };
    } finally {
      await db.query("ALTER TABLE production.lots OWNER TO postgres");
    }
  }],
  ["R02", "contextul setat de helper dispare după COMMIT (fără scurgere în pool)", async (db) => {
    const has = (await db.query(`SELECT to_regproc('app.set_scope') IS NOT NULL AS h`)).rows[0].h;
    if (!has) return { protected: false, detail: "draftul nu are o cale unică, locală, de setare a contextului" };
    await db.query("BEGIN");
    await db.query("SELECT app.set_scope(NULL, $1, '{}'::uuid[], 'tenant')", [B]);
    await db.query("COMMIT");
    const v = (await db.query("SELECT coalesce(current_setting('app.household_id', true), '') AS v")).rows[0].v;
    return { protected: v === "", detail: `după COMMIT: app.household_id='${v}'` };
  }],
  ["R03a", "A nu vede documentele lui B", (db) => asRuntime(db, { write: A }, async () => {
    const n = await count(db, "SELECT count(*) n FROM platform.documents");
    return { protected: n === 0, detail: `documente vizibile: ${n}` };
  })],
  ["R03b", "A vede doar clienții comenzilor lui (date personale)", (db) => asRuntime(db, { write: A }, async () => {
    const n = await count(db, "SELECT count(*) n FROM commerce.customers");
    return { protected: n === 1, detail: `clienți vizibili: ${n}` };
  })],
  ["R03c", "A nu vede rulările AI ale lui B", (db) => asRuntime(db, { write: A }, async () => {
    const n = await count(db, "SELECT count(*) n FROM ai.runs WHERE id = $1", [RUN_B]);
    return { protected: n === 0, detail: `rulări B vizibile: ${n}` };
  })],
  ["R03d", "utilizatorii: doar propriul cont și membrii gospodăriei din scope", (db) => asRuntime(db, { write: A, principal: UA }, async () => {
    const n = await count(db, "SELECT count(*) n FROM identity.users");
    return { protected: n === 1, detail: `utilizatori vizibili: ${n}` };
  })],
  ["R03e", "runtime nu poate citi auditul (doar adăuga)", (db) => asRuntime(db, { write: A }, async () => {
    const e = await err(db.query("SELECT count(*) FROM platform.audit_events"));
    return { protected: e === "42501", detail: e ? `eroare ${e}` : "citire permisă" };
  })],
  ["R03f", "runtime nu poate modifica cataloagele globale", (db) => asRuntime(db, { write: A }, async () => {
    const e = await err(db.query("UPDATE commerce.products SET name = 'x'"));
    return { protected: e === "42501", detail: e ? `eroare ${e}` : "modificare permisă" };
  })],
  ["R04a", "mandatul lui A nu poate referi documentul lui B", (db) => asRuntime(db, { write: A }, async () => {
    const e = await err(db.query(`INSERT INTO household.mandates(id,household_id,version,status,document_id) VALUES (gen_random_uuid(),$1,1,'draft',$2)`, [A, DOC_B]));
    return { protected: e !== null, detail: e ? `refuzat (${e})` : "ACCEPTAT" };
  })],
  ["R04b", "plata lui A nu poate referi contul bancar al lui B", (db) => asRuntime(db, { write: A }, async () => {
    const e = await err(db.query(`INSERT INTO finance.payment_evidence(id,household_id,order_id,bank_account_id,amount,currency,status) VALUES (gen_random_uuid(),$1,$2,$3,100,'RON','declared')`, [A, ORDER_A, BANK_B]));
    return { protected: e !== null, detail: e ? `refuzat (${e})` : "ACCEPTAT" };
  })],
  ["R04c", "fără oracol de existență: contul lui B și unul inexistent dau același răspuns", (db) => asRuntime(db, { write: A }, async () => {
    const ins = (id) => db.query(`SAVEPOINT s; INSERT INTO finance.payment_evidence(id,household_id,order_id,bank_account_id,amount,currency,status) VALUES (gen_random_uuid(),'${A}','${ORDER_A}','${id}',100,'RON','declared')`);
    const e1 = await err(ins(BANK_B));
    await db.query("ROLLBACK TO SAVEPOINT s").catch(() => {});
    const e2 = await err(ins("ba000000-0000-0000-0000-0000000000ff"));
    return { protected: e1 === e2, detail: `cont B: ${e1 ?? "acceptat"}; inexistent: ${e2 ?? "acceptat"}` };
  })],
  ["R05a", "propunere AI fără gospodărie pe rularea lui B: refuzată", (db) => asRuntime(db, { write: A }, async () => {
    const e = await err(db.query(`INSERT INTO ai.proposals(id,run_id,action_type,target_type,payload,risk_level,status) VALUES (gen_random_uuid(),$1,'x','lot','{}','low','proposed')`, [RUN_B]));
    return { protected: e !== null, detail: e ? `refuzat (${e})` : "ACCEPTAT" };
  })],
  ["R05b", "(pozitiv) propunere AI pe rularea proprie, cu gospodăria proprie: acceptată", (db) => asRuntime(db, { write: A }, async () => {
    const e = await err(db.query(`INSERT INTO ai.proposals(id,run_id,action_type,target_type,payload,risk_level,status,household_id) VALUES (gen_random_uuid(),$1,'x','lot','{}','low','proposed',$2)`, [RUN_A, A]));
    return { protected: e === null, detail: e ? `refuzat (${e})` : "acceptat" };
  })],
  ["R06a", "două alocări de 30 pe lotul de 40: a doua refuzată", (db) => asRuntime(db, { write: A }, async () => {
    const alloc = (line) => db.query(`INSERT INTO commerce.allocations(id,household_id,lot_id,order_line_id,units,status,created_at) VALUES (gen_random_uuid(),$1,$2,$3,30,'active',now())`, [A, LOT_A, line]);
    await db.query("SAVEPOINT s0");
    const e1 = await err(alloc("01000000-0000-0000-0000-000000000001"));
    await db.query("SAVEPOINT s1");
    const e2 = await err(alloc("01000000-0000-0000-0000-000000000002"));
    if (e2) await db.query("ROLLBACK TO SAVEPOINT s1");
    const used = await count(db, "SELECT coalesce(sum(units),0) n FROM commerce.allocations WHERE status='active' AND lot_id=$1", [LOT_A]);
    return { protected: e1 === null && e2 !== null && used <= 40, detail: `prima: ${e1 ?? "ok"}, a doua: ${e2 ?? "ACCEPTATĂ"}, alocat: ${used}/40` };
  })],
  ["R06b", "10 alocări simultane de 8 pe 40 de locuri: maximum 40 (fără retry în aplicație)", async (db, url) => {
    const results = await Promise.all(Array.from({ length: 10 }, async (_, i) => {
      const c = await client(url);
      try {
        await c.query("BEGIN");
        await c.query("SET LOCAL ROLE puii_runtime");
        const has = (await c.query(`SELECT to_regproc('app.set_scope') IS NOT NULL AS h`)).rows[0].h;
        if (has) await c.query("SELECT app.set_scope(NULL, $1, '{}'::uuid[], 'tenant')", [A]);
        else await c.query("SELECT set_config('app.household_id', $1, true)", [A]);
        await c.query(`INSERT INTO commerce.allocations(id,household_id,lot_id,order_line_id,units,status,created_at) VALUES (gen_random_uuid(),$1,$2,$3,8,'active',now())`,
          [A, LOT_A, `01000000-0000-0000-0000-0000000000${String(i + 3).padStart(2, "0")}`]);
        await c.query("COMMIT");
        return true;
      } catch {
        await c.query("ROLLBACK").catch(() => {});
        return false;
      } finally {
        await c.end();
      }
    }));
    const used = await count(db, "SELECT coalesce(sum(units),0) n FROM commerce.allocations WHERE status='active' AND lot_id=$1", [LOT_A]);
    const reserved = await count(db, "SELECT reserved_units n FROM production.lots WHERE id=$1", [LOT_A]);
    await db.query("DELETE FROM commerce.allocations WHERE lot_id = $1", [LOT_A]);
    await db.query("UPDATE production.lots SET reserved_units = 0 WHERE id = $1", [LOT_A]);
    return { protected: used <= 40 && reserved === used, detail: `reușite: ${results.filter(Boolean).length}, alocat: ${used}/40, reserved_units: ${reserved}` };
  }],
  ["R06c", "eliberarea alocării dă locurile înapoi", (db) => asRuntime(db, { write: A }, async () => {
    const id = (await db.query(`INSERT INTO commerce.allocations(id,household_id,lot_id,order_line_id,units,status,created_at) VALUES (gen_random_uuid(),$1,$2,'01000000-0000-0000-0000-000000000001',8,'active',now()) RETURNING id`, [A, LOT_A])).rows[0].id;
    const r1 = await count(db, "SELECT reserved_units n FROM production.lots WHERE id=$1", [LOT_A]);
    await db.query("UPDATE commerce.allocations SET status='released', released_at=now() WHERE id=$1", [id]);
    const r2 = await count(db, "SELECT reserved_units n FROM production.lots WHERE id=$1", [LOT_A]);
    return { protected: r1 === 8 && r2 === 0, detail: `după alocare: ${r1}, după eliberare: ${r2}` };
  })],
  ["R07a", "manager cu scope [A, B]: citește ambele loturi", (db) => asRuntime(db, { write: null, read: [A, B] }, async () => {
    const n = await count(db, "SELECT count(*) n FROM production.lots");
    return { protected: n === 2, detail: `loturi vizibile: ${n}` };
  })],
  ["R07b", "manager cu scope [A, B] și scriere pe A: nu poate scrie pe B", (db) => asRuntime(db, { write: A, read: [A, B] }, async () => {
    const e = await err(db.query(`INSERT INTO production.lots(id,household_id,cycle_id,code,status,capacity_units,reserved_units,version) VALUES (gen_random_uuid(),$1,'c0000000-0000-0000-0000-00000000000b','X','planned',1,0,1)`, [B]));
    return { protected: e !== null, detail: e ? `refuzat (${e})` : "ACCEPTAT" };
  })],
  ["R07c", "admin național: citește tot, nu poate scrie fără gospodărie de scriere", (db) => asRuntime(db, { kind: "national" }, async () => {
    const n = await count(db, "SELECT count(*) n FROM production.lots");
    const e = await err(db.query(`INSERT INTO production.lots(id,household_id,cycle_id,code,status,capacity_units,reserved_units,version) VALUES (gen_random_uuid(),$1,'c0000000-0000-0000-0000-00000000000a','Y','planned',1,0,1)`, [A]));
    return { protected: n === 2 && e !== null, detail: `loturi vizibile: ${n}; scriere: ${e ? `refuzată (${e})` : "ACCEPTATĂ"}` };
  })],
  ["R07d", "fără context: nimic vizibil (fail closed)", (db) => asRuntime(db, {}, async () => {
    const n = await count(db, "SELECT count(*) n FROM production.lots");
    return { protected: n === 0, detail: `loturi vizibile: ${n}` };
  })],
  ["POZ", "(pozitiv) A își creează un lot propriu", (db) => asRuntime(db, { write: A }, async () => {
    const e = await err(db.query(`INSERT INTO production.lots(id,household_id,cycle_id,code,status,capacity_units,reserved_units,version) VALUES (gen_random_uuid(),$1,'c0000000-0000-0000-0000-00000000000a','Z','planned',1,0,1)`, [A]));
    return { protected: e === null, detail: e ? `refuzat (${e})` : "acceptat" };
  })],
];

async function variant(name, files) {
  const dbName = `puii_target_${name}`;
  const admin = await client(adminUrl);
  await admin.query(`DROP DATABASE IF EXISTS ${dbName}`);
  await admin.query(`CREATE DATABASE ${dbName}`);
  await admin.end();
  const url = adminUrl.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`);
  const db = await client(url);
  for (const f of files) await db.query(readFileSync(f, "utf8"));
  if (name === "upstream") await db.query(UPSTREAM_ROLE);
  await db.query(SEED);
  const out = [];
  for (const [id, title, fn] of TESTS) {
    try {
      out.push({ id, title, ...(await fn(db, url)) });
    } catch (e) {
      await db.query("ROLLBACK").catch(() => {});
      out.push({ id, title, protected: false, detail: `eroare harness: ${e.message}` });
    }
  }
  await db.end();
  const cleanup = await client(adminUrl);
  await cleanup.query(`DROP DATABASE IF EXISTS ${dbName}`);
  await cleanup.end();
  return out;
}

const version = await (async () => {
  const c = await client(adminUrl);
  const v = (await c.query("SHOW server_version")).rows[0].server_version;
  await c.end();
  return v;
})();
const up = await variant("upstream", UP);
const patched = await variant("patched", [...UP, ...PATCHES]);
console.log(`PostgreSQL ${version} · patch-uri: ${PATCHES.map((p) => p.split("/").pop()).join(", ")}\n`);
console.log("| Test | Descriere | PR60 (upstream) | Cu patch |");
console.log("|---|---|---|---|");
let failed = 0;
for (let i = 0; i < TESTS.length; i++) {
  const u = up[i];
  const p = patched[i];
  if (!p.protected) failed++;
  const mark = (r) => `${r.protected ? "PROTEJAT" : "**DEFECT**"}: ${r.detail}`;
  console.log(`| ${u.id} | ${u.title} | ${mark(u)} | ${mark(p)} |`);
}
const reproduced = up.filter((r) => !r.protected && !["POZ", "R05b"].includes(r.id)).length;
console.log(`\nDefecte reproduse pe PR60: ${reproduced}. Defecte rămase după patch: ${failed}.`);
process.exit(failed ? 1 : 0);
