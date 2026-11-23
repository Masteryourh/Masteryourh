// Dovezi pentru INV-01 (ultimul loc din țarc, cereri simultane) și pentru izolarea pe gospodărie cu RLS.
// Rulează pe baza creată de verify-ddl.sh. Utilizare: DBURL=postgresql://postgres@localhost:5432/puii_ddl_verify node concurrency-and-rls.mjs
import pg from "pg";
const url = process.env.DBURL ?? "postgresql://postgres@localhost:5432/puii_ddl_verify";
const admin = new pg.Client({ connectionString: url });
await admin.connect();
const q = (sql, p) => admin.query(sql, p);
let failed = 0;
const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) failed++; };

// Date: o gospodărie, un lot, un țarc de 40 cu 35 de locuri deja ocupate.
await q(`truncate identity.users, household.households, program.programs, commerce.customers, logistics.zones cascade`);
await q(`insert into identity.users (id, full_name, status) values ('00000000-0000-0000-0000-000000000001','Admin','activ')`);
for (const [id, pref] of [["a1", "MS"], ["a2", "FM"]])
  await q(`insert into household.households (id, legal_form, legal_name, address, county, locality, lot_code_prefix) values ($1,'PF','G','x','SV','x',$2)`, [`00000000-0000-0000-0000-0000000000${id}`, pref]);
await q(`insert into program.programs (id, code, vertical, name, status) values ('00000000-0000-0000-0000-0000000000b1','P','pui','P','activ')`);
await q(`insert into program.program_versions (id, program_id, version, params, params_schema_version, effective_from) values ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000b1',1,'{}',1,'2026-11-01')`);
for (const [lot, hh, code] of [["c1", "a1", "MS-2026-01"], ["c9", "a2", "FM-2026-01"]])
  await q(`insert into production.lots (id, code, household_id, program_version_id, planned_start, breed, feed_description, processing_description, pens_planned, status) values ($1,$2,$3,'00000000-0000-0000-0000-0000000000b2','2026-12-01','h','c','p',1,'deschis_precomenzi')`, [`00000000-0000-0000-0000-0000000000${lot}`, code, `00000000-0000-0000-0000-0000000000${hh}`]);
await q(`insert into production.pens (id, lot_id, number, capacity, status) values ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000c1',1,40,'se_umple')`);
await q(`insert into commerce.customers (id, full_name, phone) values ('00000000-0000-0000-0000-0000000000d1','C','07')`);
await q(`insert into commerce.products (id, program_id, code, name, unit) values ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000b1','PUI','Pui','kg')`);
await q(`insert into commerce.price_lists (id, product_id, market_price_bani, markup_pct, effective_from) values ('00000000-0000-0000-0000-0000000000d3','00000000-0000-0000-0000-0000000000d2',3000,20,now())`);
await q(`insert into logistics.zones (id, code, name, localities, delivery_day, fee_bani, kind) values ('00000000-0000-0000-0000-0000000000e1','z','z','-','s',0,'ridicare')`);

let seq = 0;
async function newOrderLine(client) {
  const n = ++seq, oid = crypto.randomUUID(), lid = crypto.randomUUID();
  await client.query(`insert into commerce.orders (id, number, customer_id, zone_id, status, price_list_id, est_total_bani, terms_version, terms_accepted_at) values ($1,$2,'00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000e1','noua','00000000-0000-0000-0000-0000000000d3',1,'v1',now())`, [oid, `PM-T${n}`]);
  await client.query(`insert into commerce.order_lines (id, order_id, product_id, quantity, unit_price_bani, est_weight_kg) values ($1,$2,'00000000-0000-0000-0000-0000000000d2',5,3600,24)`, [lid, oid]);
  return lid;
}
const PEN = "00000000-0000-0000-0000-0000000000c2", HH = "00000000-0000-0000-0000-0000000000a1";
// 35 de locuri deja rezervate
{ const c = admin; const lid = await newOrderLine(c); await c.query(`insert into commerce.allocations (id, order_line_id, pen_id, household_id, quantity, status) values (gen_random_uuid(),$1,$2,$3,35,'rezervat')`, [lid, PEN, HH]); }

// Rezervarea, exact ca în CLAUDE-02 §10 INV-01 (cu sau fără SELECT … FOR UPDATE)
async function reserve(withLock) {
  const c = new pg.Client({ connectionString: url }); await c.connect();
  try {
    await c.query("begin");
    const lid = await newOrderLine(c);
    await c.query(`select id from production.pens where id = $1 ${withLock ? "for update" : ""}`, [PEN]);
    const { rows } = await c.query(`select p.capacity - coalesce(sum(a.quantity),0) as free from production.pens p left join commerce.allocations a on a.pen_id = p.id and a.status <> 'eliberat' where p.id = $1 group by p.capacity`, [PEN]);
    await new Promise((r) => setTimeout(r, 50)); // fereastra de concurență, exagerată intenționat
    if (Number(rows[0].free) < 5) { await c.query("rollback"); return "fara_loc"; }
    await c.query(`insert into commerce.allocations (id, order_line_id, pen_id, household_id, quantity, status) values (gen_random_uuid(),$1,$2,$3,5,'rezervat')`, [lid, PEN, HH]);
    await c.query("commit"); return "rezervat";
  } finally { await c.end(); }
}
async function round(withLock) {
  await q(`delete from commerce.allocations where quantity = 5`);
  const r = await Promise.all(Array.from({ length: 10 }, () => reserve(withLock)));
  const { rows } = await q(`select sum(quantity)::int as s from commerce.allocations where pen_id = $1 and status <> 'eliberat'`, [PEN]);
  return { reserved: r.filter((x) => x === "rezervat").length, total: rows[0].s };
}
const without = await round(false);
ok(without.total > 40, `fără FOR UPDATE: 10 cereri simultane pentru ultimele 5 locuri → ${without.reserved} rezervate, total ${without.total}/40 (supra-vânzare reprodusă: testul e relevant)`);
const withL = await round(true);
ok(withL.reserved === 1 && withL.total === 40, `cu FOR UPDATE (INV-01): 10 cereri simultane → ${withL.reserved} rezervată, total ${withL.total}/40`);

// RLS: izolare pe gospodărie pentru un rol fără privilegii de administrator
await q(`do $$ begin if not exists (select 1 from pg_roles where rolname='app_user') then create role app_user login; end if; end $$`);
await q(`grant usage on schema production to app_user; grant select on production.lots to app_user`);
await q(`alter table production.lots enable row level security`);
await q(`drop policy if exists tenant on production.lots`);
await q(`create policy tenant on production.lots using (household_id = any (string_to_array(current_setting('app.household_ids', true), ',')::uuid[]))`);
const u = new pg.Client({ connectionString: url.replace("postgres@", "app_user@") }); await u.connect();
await u.query("begin"); await u.query(`set local app.household_ids = '00000000-0000-0000-0000-0000000000a1'`);
const own = await u.query(`select code from production.lots`); await u.query("commit");
ok(own.rows.length === 1 && own.rows[0].code === "MS-2026-01", `RLS: gospodăria MS vede doar loturile ei (${own.rows.map((r) => r.code).join(", ")})`);
await u.query("begin");
const none = await u.query(`select code from production.lots`); await u.query("commit");
ok(none.rows.length === 0, "RLS: fără context de gospodărie nu se vede niciun lot (interzis implicit)");
await u.end(); await admin.end();
console.log(failed ? `\n${failed} eșecuri` : "\nToate verificările au trecut");
process.exit(failed ? 1 : 0);
