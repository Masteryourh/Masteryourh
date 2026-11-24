import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * C2 (review #62, ARCH-T03): mesajele externe (e-mail / SMS) se scriu în outbox în aceeași tranzacție cu modificarea
 * și pleacă abia după commit. Dacă tranzacția se anulează, nu rămâne niciun mesaj. În testare e-mailul nu e configurat,
 * deci mesajele confirmate ajung „skipped” (evidență fără conținut), nu se pierd și nu se reîncearcă la nesfârșit.
 */
const url = process.env.DATABASE_URL;
test.describe.configure({ mode: "serial" });
test.skip(!url, "necesită DATABASE_URL (PostgreSQL)");

let db: pg.Client;
test.beforeAll(async ({ browser }) => {
  await (await (await browser.newContext()).newPage()).goto("/precomanda");
  db = new pg.Client({ connectionString: url });
  await db.connect();
});
test.afterAll(async () => db?.end());

const outboxSince = async (since: Date) =>
  (await db.query<{ data: { status: string; payload: unknown; summary: string } }>(`select data from documents where collection = 'outbox' and created_at >= $1`, [since])).rows.map((r) => r.data);

async function submit(page: Page, name: string) {
  await page.goto("/precomanda?pui=4");
  await page.selectOption("#zoneId", "ridicare-personala");
  await page.fill("#name", name);
  await page.fill("#phone", "0722 555 111");
  await page.fill("#email", "outbox@test.ro");
  await page.check("#termsConsent");
  await page.locator("input[type=number]").first().fill("4");
  await page.click("button[type=submit]");
}

test("comanda confirmată: mesajele sunt în outbox după commit, fără conținut păstrat", async ({ page }) => {
  const since = new Date((await db.query<{ now: Date }>("select now()")).rows[0].now);
  await submit(page, "Client Outbox Ok");
  await expect(page.getByText("Mulțumim").first()).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => (await outboxSince(since)).length, { timeout: 15_000 }).toBeGreaterThanOrEqual(2); // client + admin
  const msgs = await outboxSince(since);
  expect(msgs.some((m) => m.summary.startsWith("email: Precomanda PM"))).toBe(true);
  // Trimiterea a rulat după commit: niciun mesaj rămas „pending”; e-mailul neconfigurat → „skipped”, conținut șters.
  await expect.poll(async () => (await outboxSince(since)).every((m) => m.status === "skipped" && m.payload === null), { timeout: 15_000 }).toBe(true);
});

test("tranzacție anulată (auditul nu se poate scrie): nici comanda, nici mesajele nu rămân", async ({ page }) => {
  test.setTimeout(60_000);
  const since = new Date((await db.query<{ now: Date }>("select now()")).rows[0].now);
  // Blocăm lanțul de audit dintr-o altă conexiune: scrierea auditului expiră (lock_timeout 3 s) → rollback (fail closed).
  const holder = new pg.Client({ connectionString: url });
  await holder.connect();
  await holder.query("select pg_advisory_lock(424242)");
  try {
    await submit(page, "Client Outbox Anulat");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5_000);
  } finally {
    await holder.query("select pg_advisory_unlock(424242)");
    await holder.end();
  }
  const orders = await db.query(`select 1 from documents where collection = 'preorders' and data->'customer'->>'name' = 'Client Outbox Anulat'`);
  expect(orders.rowCount).toBe(0);
  expect(await outboxSince(since)).toEqual([]);
});
