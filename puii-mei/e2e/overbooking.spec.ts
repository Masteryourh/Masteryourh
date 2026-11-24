import { expect, test, type Browser, type Page } from "@playwright/test";
import pg from "pg";

/**
 * CG-04: locurile unui lot nu pot fi depășite, pe nicio cale (alocare automată simultană, alocare manuală, reactivare,
 * cădere între rezervare și scrierea comenzii, date istorice, încărcare). Loturile de test se pun direct în baza de
 * test; restul se face prin aplicație. Rulează doar cu PostgreSQL (DATABASE_URL), ca în CI.
 */
const url = process.env.DATABASE_URL;
test.describe.configure({ mode: "serial" });
test.skip(!url, "necesită DATABASE_URL (PostgreSQL)");

let db: pg.Client;
let seq = 0;
const HOUR = 3600_000;

test.beforeAll(async ({ browser }) => {
  // O primă cerere către server creează tabelul `documents` (dacă baza e nouă).
  await (await (await browser.newContext()).newPage()).goto("/precomanda");
  db = new pg.Client({ connectionString: url });
  await db.connect();
});
test.afterAll(async () => db?.end());

/** Un lot nou cu `capacity` locuri, singurul deschis pentru precomenzi; opțional, un registru de locuri pregătit. */
async function newLot(capacity: number, ledger?: { allocations: Record<string, number>; reservedAt: Record<string, string> }) {
  const code = `XT-2099-${String(Date.now()).slice(-5)}${++seq}`;
  const start = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  const lot = {
    id: code, code, farmSlug: "gospodaria-hreniuc", breed: "test", startDate: start, growthDays: 60,
    totalBirds: capacity, reservedBirds: 0, feed: "test", processor: "test", pens: Math.ceil(capacity / 40), createdAt: new Date().toISOString(),
  };
  await db.query(`update documents set data = data || '{"closed": true}' where collection = 'lots'`);
  await db.query(`insert into documents (collection, id, data) values ('lots', $1, $2)`, [code, JSON.stringify(lot)]);
  if (ledger) {
    await db.query(`insert into documents (collection, id, data) values ('lot-seats', $1, $2)`, [
      code,
      JSON.stringify({ id: code, capacity, ...ledger, updatedAt: new Date().toISOString() }),
    ]);
  }
  return code;
}

const onLot = async (code: string) =>
  (
    await db.query<{ id: string; birds: string; number: string }>(
      `select id, data->>'birds' as birds, data->>'number' as number from documents
       where collection = 'preorders' and data->>'lotCode' = $1 and data->>'status' <> 'anulata'`,
      [code],
    )
  ).rows;
const sum = (rows: { birds: string }[]) => rows.reduce((s, r) => s + Number(r.birds), 0);
const ledgerOf = async (code: string) =>
  (await db.query<{ data: { allocations: Record<string, number> } }>(`select data from documents where collection = 'lot-seats' and id = $1`, [code]))
    .rows[0]?.data.allocations ?? {};

async function fill(page: Page, birds: number) {
  const i = ++seq;
  await page.goto(`/precomanda?pui=${birds}`);
  await page.selectOption("#zoneId", "ridicare-personala");
  await page.fill("#name", `Client Locuri ${i}`);
  await page.fill("#phone", `0722 ${String(100000 + i).slice(-6)}`);
  await page.fill("#email", `locuri${i}@test.ro`);
  await page.check("#termsConsent");
  await page.locator("input[type=number]").first().fill(String(birds));
}

/** Trimite `n` precomenzi de câte `birds` pui exact în același timp. */
async function simultaneous(browser: Browser, n: number, birds: number) {
  const pages: Page[] = [];
  for (let i = 0; i < n; i++) {
    const p = await (await browser.newContext()).newPage();
    await fill(p, birds);
    pages.push(p);
  }
  await Promise.all(pages.map((p) => p.click("button[type=submit]")));
  await Promise.all(pages.map((p) => expect(p.getByText("Mulțumim").first()).toBeVisible({ timeout: 90_000 })));
  return Promise.all(pages.map(async (p) => (await p.locator("body").innerText()).match(/PM\d{4}-[A-Z0-9]{5}/)?.[0] ?? ""));
}

async function admin(browser: Browser) {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/cont/autentificare?inapoi=/admin");
  await page.fill("input[name=email]", process.env.ADMIN_USER ?? "admin@test.ro");
  await page.fill("input[name=password]", process.env.ADMIN_PASSWORD ?? "Parola12345");
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === "/admin");
  return page;
}

test("10 precomenzi simultane pe ultimele locuri → lotul nu e supra-rezervat; anularea eliberează locurile", async ({ browser }) => {
  test.setTimeout(150_000);
  const code = await newLot(40);
  const numbers = await simultaneous(browser, 10, 8); // 80 de pui ceruți pe 40 de locuri
  const before = await onLot(code);
  expect(sum(before)).toBe(40); // 5 comenzi × 8 pui; înainte de reparație: 64
  // Cele rămase fără loc sunt „în așteptare” (primesc automat locurile eliberate), nu „la alegere”.
  const left = (
    await db.query(`select data->'allocation'->>'status' as s from documents where collection = 'preorders' and data->>'number' = any($1) and data->>'lotCode' is null`, [numbers])
  ).rows.map((r) => r.s);
  expect(left).toHaveLength(5);
  expect(new Set(left)).toEqual(new Set(["asteapta"]));
  expect(Object.keys(await ledgerOf(code)).sort()).toEqual(before.map((r) => r.id).sort());

  // Adminul anulează o comandă de pe lot: locurile se eliberează, iar o comandă din așteptare le ia.
  const page = await admin(browser);
  const victim = before[0];
  const row = page.locator("tr", { hasText: victim.number });
  await row.locator("select[name=status]").selectOption("anulata");
  await row.locator("button:has-text('Salvează')").click();
  await expect.poll(async () => (await onLot(code)).some((r) => r.id === victim.id), { timeout: 15_000 }).toBe(false);
  // Realocarea către comanda din așteptare se face după anulare, în aceeași cerere: așteptăm s-o vedem.
  await expect.poll(async () => sum(await onLot(code)), { timeout: 15_000 }).toBe(40);
  const after = await onLot(code);
  expect(sum(after)).toBe(40);
  expect(after.map((r) => r.id).sort()).not.toEqual(before.map((r) => r.id).sort());
  expect(Object.keys(await ledgerOf(code)).sort()).toEqual(after.map((r) => r.id).sort());

  // Lotul e plin: alocarea manuală a unei comenzi din așteptare și reactivarea comenzii anulate sunt refuzate.
  const waiting = numbers.find((n) => n && !after.some((r) => r.number === n) && n !== victim.number)!;
  await page.goto("/admin");
  const wrow = page.locator("tr", { hasText: waiting });
  await wrow.locator("select[name=lotCode]").selectOption(code);
  await wrow.locator("button:has-text('Alocă lotul')").click();
  await page.waitForLoadState("networkidle");
  await page.goto("/admin");
  const vrow = page.locator("tr", { hasText: victim.number });
  await vrow.locator("select[name=status]").selectOption("noua");
  await vrow.locator("button:has-text('Salvează')").click();
  await page.waitForLoadState("networkidle");
  const final = await onLot(code);
  expect(sum(final)).toBe(40);
  expect(final.some((r) => r.number === waiting)).toBe(false);
  const status = (await db.query(`select data->>'status' as s from documents where collection = 'preorders' and id = $1`, [victim.id])).rows[0].s;
  expect(status).toBe("anulata");
});

test("cădere între rezervare și scrierea comenzii: locul rămas fără comandă se recuperează după perioada de grație", async ({ browser }) => {
  test.setTimeout(90_000);
  // Rezervare rămasă de acum o oră (cererea a căzut): se eliberează și comanda nouă primește locurile.
  const stale = await newLot(40, { allocations: { "cazut-1": 40 }, reservedAt: { "cazut-1": new Date(Date.now() - HOUR).toISOString() } });
  await simultaneous(browser, 1, 8);
  expect(sum(await onLot(stale))).toBe(8);
  expect(await ledgerOf(stale)).not.toHaveProperty("cazut-1");

  // Rezervare de acum câteva secunde (cerere încă în curs): locurile rămân ocupate, comanda nouă așteaptă.
  const fresh = await newLot(40, { allocations: { "in-curs-1": 40 }, reservedAt: { "in-curs-1": new Date().toISOString() } });
  await simultaneous(browser, 1, 8);
  expect(sum(await onLot(fresh))).toBe(0);
  expect(await ledgerOf(fresh)).toHaveProperty("in-curs-1", 40);
});

test("date istorice peste capacitate: adminul vede avertismentul, iar lotul nu mai primește comenzi", async ({ browser }) => {
  test.setTimeout(90_000);
  const code = await newLot(40);
  // Două comenzi vechi scrise direct pe lot (ex. import), fără registru: 30 + 20 = 50 > 40.
  const template = (await db.query(`select data from documents where collection = 'preorders' limit 1`)).rows[0].data;
  for (const [i, birds] of [30, 20].entries()) {
    const id = `istoric-${code}-${i}`;
    const doc = { ...template, id, number: `PM9999-IS${i}${seq}`, birds, lotCode: code, status: "alocata-lot", parentNumber: undefined, allocation: undefined };
    await db.query(`insert into documents (collection, id, data) values ('preorders', $1, $2)`, [id, JSON.stringify(doc)]);
  }
  const page = await admin(browser);
  await expect(page.getByText(`${code} (50 / 40)`)).toBeVisible();
  await simultaneous(browser, 1, 4);
  expect(sum(await onLot(code))).toBe(50); // nicio comandă nouă peste
  // Adoptarea comenzilor vechi în registru (când lotul e folosit) e testată unitar în seats-core.test.ts.
});

test("încărcare: 30 de precomenzi simultane se termină toate (fără blocaj la pool-ul de 3 conexiuni)", async ({ browser }) => {
  test.setTimeout(180_000);
  const code = await newLot(40);
  const started = Date.now();
  const numbers = await simultaneous(browser, 30, 4); // 120 de pui pe 40 de locuri
  expect(numbers.filter(Boolean)).toHaveLength(30);
  expect(sum(await onLot(code))).toBe(40);
  expect(Date.now() - started).toBeLessThan(150_000);
});
