// V12: contractul AllocateOrderLine (cap. 03 §6) aplicat atomic: 10 alocări simultane de 8 pe un lot de 40.
// Rulare: node scripts/verify/pr60-allocate-concurrency.mjs postgres://…/ddl60 (după pr60-ddl-validate.sql). Doar bază de test.
import pg from "pg";
const url = process.argv[2];
const admin = new pg.Client({ connectionString: url }); await admin.connect();
await admin.query("update production.lots set reserved_units = 0 where code = 'L-A'");
await admin.query("delete from commerce.allocations");
await admin.query("delete from commerce.order_lines where id::text like '02%'");
const lines = [];
for (let i = 0; i < 10; i++) {
  const id = `02000000-0000-0000-0000-${String(i).padStart(12, "0")}`;
  await admin.query(`insert into commerce.order_lines(id,order_id,product_id,quantity,unit_price,currency,household_id) values ($1,'0d000000-0000-0000-0000-00000000000a','9d000000-0000-0000-0000-000000000001',8,0,'RON','aaaaaaaa-0000-0000-0000-000000000001')`, [id]);
  lines.push(id);
}
const results = await Promise.all(lines.map(async (line) => {
  const c = new pg.Client({ connectionString: url }); await c.connect();
  try {
    await c.query("begin");
    await c.query("set local role app_rt");
    await c.query("set local app.household_id = 'aaaaaaaa-0000-0000-0000-000000000001'");
    const r = await c.query(`update production.lots set reserved_units = reserved_units + 8, version = version + 1
      where code = 'L-A' and reserved_units + 8 <= capacity_units returning reserved_units`);
    if (!r.rowCount) { await c.query("rollback"); return "refuzat (plin)"; }
    await c.query(`insert into commerce.allocations(id,household_id,lot_id,order_line_id,units,status,created_at)
      values (gen_random_uuid(),'aaaaaaaa-0000-0000-0000-000000000001','10000000-0000-0000-0000-00000000000a',$1,8,'active',now())`, [line]);
    await c.query("commit"); return "alocat";
  } catch (e) { await c.query("rollback").catch(() => {}); return "eroare: " + e.message; } finally { await c.end(); }
}));
const sum = (await admin.query("select coalesce(sum(units),0) s from commerce.allocations where status='active'")).rows[0].s;
const res = (await admin.query("select reserved_units from production.lots where code='L-A'")).rows[0].reserved_units;
console.log(JSON.stringify(results.reduce((m, r) => ((m[r] = (m[r] ?? 0) + 1), m), {})), "| alocat activ:", sum, "| reserved_units:", res);
await admin.end();
