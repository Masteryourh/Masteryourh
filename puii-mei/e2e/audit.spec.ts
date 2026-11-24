import { expect, test, type Browser, type Page } from "@playwright/test";
import { createHash, randomBytes, randomUUID, scryptSync } from "node:crypto";
import pg from "pg";

/**
 * AUD-001 (document ChatGPT #63): jurnalul de audit, pe codul actual. Testele AUD-T01…T16 aplicabile azi; cele care
 * depind de module inexistente (AI, export, outbox) sunt marcate SKIP în PR. Rulează doar cu PostgreSQL.
 */
const url = process.env.DATABASE_URL;
test.describe.configure({ mode: "serial" });
test.skip(!url, "necesită DATABASE_URL (PostgreSQL)");

const FARM = "gospodaria-cojocaru";
const EMAIL = `gospodar.audit.${Date.now()}@test.ro`;
const PASSWORD = "Parola-Gospodar-A9";
let db: pg.Client;
let farmerId = "";
let farmer: Page;

function iban(bban: string) {
  const digits = (bban + "RO00").replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let r = 0;
  for (const d of digits) r = (r * 10 + Number(d)) % 97;
  return `RO${String(98 - r).padStart(2, "0")}${bban}`;
}
const IBAN = iban("BTRL0000000000000077");

type Ev = { seq: number; action: string; result: string; data: Record<string, unknown>; prev_hash: string | null; event_hash: string };
const events = async (where: string, params: unknown[] = []) =>
  (await db.query<Ev>(`select seq::int, action, result, data, prev_hash, event_hash from audit_events where ${where} order by seq`, params)).rows;

async function login(browser: Browser, email: string, password: string, to: string) {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`/cont/autentificare?inapoi=${encodeURIComponent(to)}`);
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", password);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === to);
  return page;
}
const admin = (b: Browser) => login(b, process.env.ADMIN_USER ?? "admin@test.ro", process.env.ADMIN_PASSWORD ?? "Parola12345", "/admin");

async function addExpense(page: Page, supplier: string, farmSlug?: string) {
  await page.goto("/cont/gospodar/documente");
  await page.waitForLoadState("networkidle");
  await page.locator("details", { has: page.locator("summary:has-text('Adaugă o cheltuială')") }).evaluate((d) => ((d as HTMLDetailsElement).open = true));
  const form = page.locator("form", { has: page.locator("input[name=supplier]") }).first();
  await form.locator("input[name=supplier]").fill(supplier);
  await form.locator("input[name=amount]").fill("75");
  await form.locator("select[name=category]").selectOption("furaj");
  await form.evaluate(
    (f, slug) => {
      if (slug) (f.querySelector("input[name=farmSlug]") as HTMLInputElement).value = slug;
      (f as HTMLFormElement).requestSubmit([...f.querySelectorAll("button")].find((b) => b.textContent?.includes("Salvează ca ciornă")));
    },
    farmSlug ?? "",
  );
}
const expenseExists = async (supplier: string) => (await db.query(`select 1 from documents where collection = 'expenses' and data->>'supplier' = $1`, [supplier])).rowCount === 1;

test.beforeAll(async ({ browser }) => {
  await (await (await browser.newContext()).newPage()).goto("/precomanda");
  db = new pg.Client({ connectionString: url });
  await db.connect();
  const salt = randomBytes(16);
  const hash = `scrypt$${salt.toString("base64url")}$${scryptSync(PASSWORD, salt, 64).toString("base64url")}`;
  farmerId = randomUUID();
  await db.query(`insert into documents (collection, id, data) values ('users', $1, $2)`, [
    farmerId,
    JSON.stringify({ id: farmerId, email: EMAIL, name: "Gospodar Audit", phone: "0722 121 212", role: "gospodar", farmSlug: FARM, status: "activ", sessionVersion: 1, passwordHash: hash, createdAt: new Date().toISOString() }),
  ]);
  farmer = await login(browser, EMAIL, PASSWORD, "/cont/gospodar");
});
test.afterAll(async () => db?.end());

test("AUD-T02: acțiunea gospodarului — actor gospodar, spațiu household, gospodăria corectă", async () => {
  await addExpense(farmer, "Furnizor audit T02");
  await expect.poll(() => expenseExists("Furnizor audit T02"), { timeout: 15_000 }).toBe(true);
  const [e] = await events(`action = 'household.documente.addExpense' and data->>'actorId' = $1 and result = 'ok'`, [farmerId]);
  expect(e.data).toMatchObject({ actorType: "human", actorRole: "gospodar", workspace: "household", householdId: FARM, onBehalfOfHouseholdId: null });
  expect(e.data.changes).toMatchObject({ amount: "75", category: "furaj" });
});

test("AUD-T03: încercare fără drept — refuzată și jurnalizată, fără efect", async () => {
  await addExpense(farmer, "Furnizor strecurat T03", "gospodaria-bodnar");
  await expect.poll(async () => (await events(`action = 'household.documente.addExpense' and result = 'refuzat' and data->>'actorId' = $1`, [farmerId])).length, { timeout: 15_000 }).toBe(1);
  expect(await expenseExists("Furnizor strecurat T03")).toBe(false);
  const [e] = await events(`action = 'household.documente.addExpense' and result = 'refuzat' and data->>'actorId' = $1`, [farmerId]);
  expect(e.data.reason).toBe("Neautorizat");
});

test("AUD-T04: dacă auditul nu se poate scrie, modificarea se anulează (fail closed)", async () => {
  const blocker = new pg.Client({ connectionString: url });
  await blocker.connect();
  await blocker.query("begin");
  await blocker.query("lock table audit_events in access exclusive mode");
  try {
    await addExpense(farmer, "Furnizor fara audit T04");
    await farmer.waitForTimeout(5000); // > lock_timeout (3 s) al scrierii în audit
  } finally {
    await blocker.query("rollback");
    await blocker.end();
  }
  await farmer.waitForTimeout(1000);
  expect(await expenseExists("Furnizor fara audit T04")).toBe(false); // nicio mutație orfană
});

test("AUD-T05: jurnalul e doar-adăugare (UPDATE / DELETE / TRUNCATE refuzate de baza de date)", async () => {
  for (const sql of ["update audit_events set result = 'ok'", "delete from audit_events", "truncate audit_events"]) {
    await expect(db.query(sql), sql).rejects.toThrow(/append-only|doar-adaugare/);
  }
});

test("AUD-T01 / AUD-T06: schimbarea IBAN — cerere (gospodar), verificare (admin, în numele gospodăriei), activare (sistem); fără IBAN în clar", async ({ browser }) => {
  await farmer.goto("/cont/gospodar");
  const form = farmer.locator("form", { has: farmer.locator("input[name=iban]") });
  await form.locator("input[name=holder]").fill("Titular Audit");
  await form.locator("input[name=iban]").fill(IBAN);
  await form.locator("button:has-text('Salvează datele de plată')").click();
  await farmer.waitForURL(/ibanVerificare|eroarePlata/);
  const a = await admin(browser);
  await a.goto("/admin");
  await a.locator(`[data-iban-cerere="${FARM}"] button:has-text('Am sunat')`).click();
  await a.waitForURL(/ibanConfirmat/);

  const req = (await events(`action = 'household.plati.saveFarmPayment' and data->>'householdId' = $1 and result = 'ok'`, [FARM])).at(-1)!;
  const ver = (await events(`action = 'admin.comenzi.confirmIban' and data->>'householdId' = $1`, [FARM])).at(-1)!;
  expect(req.data).toMatchObject({ actorRole: "gospodar", workspace: "household" });
  expect(ver.data).toMatchObject({ actorRole: "admin", workspace: "admin", onBehalfOfHouseholdId: FARM, resourceId: req.data.resourceId });
  expect((req.data.changes as { contBancar: string }).contBancar).toMatch(/^RO\d{2} •••• 0077$/);

  // Activarea după 24 h (aici: schimbare deja confirmată, cu termenul trecut) e un eveniment al sistemului.
  const changeId = randomUUID();
  await db.query(`update documents set data = data || $2::jsonb where collection = 'farm-payments' and id = $1`, [
    FARM,
    JSON.stringify({ ibanChange: { id: changeId, holder: "Titular Audit", iban: iban("RNCB0000000000000078"), bank: "", status: "confirmat", requestedAt: new Date().toISOString(), requestedBy: "x", requestedById: farmerId, activatesAfter: new Date(Date.now() - 1000).toISOString(), knownPhones: [] } }),
  ]);
  await a.goto("/admin");
  await expect.poll(async () => (await events(`action = 'bank.change.activated' and data->>'resourceId' = $1`, [changeId])).length, { timeout: 15_000 }).toBe(1);
  const [act] = await events(`action = 'bank.change.activated' and data->>'resourceId' = $1`, [changeId]);
  expect(act.data).toMatchObject({ actorType: "system", workspace: "system", householdId: FARM });
});

test("AUD-T14: nicio parolă, PIN, cheie sau IBAN în clar în tot jurnalul", async () => {
  const leaks = await db.query(`select seq from audit_events where data::text ~* $1`, ["RO[0-9]{2}[A-Z]{4}[A-Z0-9]{16}|scrypt\\$|\"(pin|password|token|mfaCode|code)\": \"[^\\[]"]);
  expect(leaks.rows).toEqual([]);
});

test("AUD-T13 / AUD-T16: ordinea e deterministă, iar lanțul de amprente se verifică pe tot jurnalul", async () => {
  const all = await events("true");
  expect(all.length).toBeGreaterThan(5);
  const canonical = (v: unknown): string =>
    v === null || typeof v !== "object"
      ? JSON.stringify(v ?? null)
      : Array.isArray(v)
        ? `[${v.map(canonical).join(",")}]`
        : `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(",")}}`;
  let prev: string | null = null;
  for (const e of all) {
    expect(e.prev_hash, `seq ${e.seq}`).toBe(prev);
    expect(createHash("sha256").update(`${prev ?? ""}|${canonical(e.data)}`).digest("hex"), `seq ${e.seq}`).toBe(e.event_hash);
    prev = e.event_hash;
  }
});
