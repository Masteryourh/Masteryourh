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

test("Admin › Mesaje netrimise: vede mesajele care nu au plecat și retrimite unul eșuat definitiv", async ({ page }) => {
  // Un mesaj eșuat definitiv (ex. furnizorul a refuzat de 6 ori), cu conținut păstrat pentru retrimitere.
  const id = crypto.randomUUID();
  const dead = {
    id, kind: "email", payload: { to: "x@test.ro", subject: "Test retrimitere", html: "<p>x</p>", text: "x" }, summary: "email: Test retrimitere",
    status: "dead", attempts: 6, nextAttemptAt: new Date().toISOString(), lastError: "503 indisponibil", createdAt: new Date().toISOString(),
  };
  await db.query(`insert into documents (collection, id, data) values ('outbox', $1, $2)`, [id, JSON.stringify(dead)]);

  await page.goto("/cont/autentificare?inapoi=/admin/mesaje");
  await page.fill("input[name=email]", process.env.ADMIN_USER ?? "admin@test.ro");
  await page.fill("input[name=password]", process.env.ADMIN_PASSWORD ?? "Parola12345");
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === "/admin/mesaje");
  await expect(page.getByRole("heading", { name: "Mesaje netrimise" })).toBeVisible();
  const row = page.locator(`#mesaj-${id}`);
  await expect(row).toContainText("Eșuat definitiv");
  await expect(row).toContainText("503 indisponibil");
  await expect(page.locator("body")).not.toContainText("x@test.ro"); // destinatarul nu se afișează
  await expect(page.locator("tr[data-status=skipped]").first()).toBeVisible(); // din testele de mai sus

  await row.getByRole("button", { name: "Retrimite" }).click();
  // Retrimis după commit; în testare e-mailul nu e configurat → „skipped”, conținut șters.
  await expect
    .poll(async () => (await db.query(`select data->>'status' as s, data->'payload' as p from documents where collection = 'outbox' and id = $1`, [id])).rows[0], { timeout: 15_000 })
    .toEqual({ s: "skipped", p: null });
  const audit = await db.query(`select 1 from audit_events where action = 'admin.mesaje.retrimite' and resource_id = $1`, [id]);
  expect(audit.rowCount).toBe(1);
});
