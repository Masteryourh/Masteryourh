import { expect, test } from "@playwright/test";
import pg from "pg";

/**
 * Raportat de PO (24.11.2026): în Admin → Loturi, numărul unei comenzi din țarc deschidea panoul clientului, adică
 * ieșea din Admin. Acum duce la rândul comenzii din lista de comenzi a Admin, în spațiul Admin.
 */
const url = process.env.DATABASE_URL;
test.skip(!url, "necesită DATABASE_URL (PostgreSQL)");

test("comanda din țarc se deschide în lista de comenzi din Admin, nu în panoul clientului", async ({ browser }) => {
  test.setTimeout(90_000);
  const client = await (await browser.newContext()).newPage();
  await client.goto("/precomanda");
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  const code = `XT-2099-${String(Date.now()).slice(-6)}`;
  const start = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  await db.query(`update documents set data = data || '{"closed": true}' where collection = 'lots'`);
  await db.query(`insert into documents (collection, id, data) values ('lots', $1, $2)`, [
    code,
    JSON.stringify({ id: code, code, farmSlug: "gospodaria-hreniuc", breed: "test", startDate: start, growthDays: 60, totalBirds: 40, reservedBirds: 0, feed: "t", processor: "t", pens: 1, createdAt: new Date().toISOString() }),
  ]);

  await client.goto("/precomanda?pui=6");
  await client.selectOption("#zoneId", "ridicare-personala");
  await client.fill("#name", "Client Tarc");
  await client.fill("#phone", "0722 616 161");
  await client.fill("#email", "tarc@test.ro");
  await client.check("#termsConsent");
  await client.locator("input[type=number]").first().fill("6");
  await client.click("button[type=submit]");
  await expect(client.getByText("Mulțumim").first()).toBeVisible();
  const number = (await client.locator("body").innerText()).match(/PM\d{4}-[A-Z0-9]{5}/)![0];
  await expect.poll(async () => (await db.query(`select data->>'lotCode' as l from documents where collection = 'preorders' and data->>'number' = $1`, [number])).rows[0]?.l).toBe(code);
  await db.end();

  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/cont/autentificare?inapoi=/admin");
  await admin.fill("input[name=email]", process.env.ADMIN_USER ?? "admin@test.ro");
  await admin.fill("input[name=password]", process.env.ADMIN_PASSWORD ?? "Parola12345");
  await admin.click("button[type=submit]");
  await admin.waitForURL((u) => u.pathname === "/admin");
  await admin.goto("/admin/loturi");
  const link = admin.locator(`a:has-text("${number}")`).first();
  await expect(link).toHaveAttribute("href", `/admin#comanda-${number}`);
  await expect(admin.locator('a[href^="/comanda/"]')).toHaveCount(0); // niciun link spre panoul clientului
  await link.evaluate((a) => {
    for (let d = a.closest("details"); d; d = d.parentElement?.closest("details") ?? null) d.open = true; // secțiunea lotului e restrânsă
  });
  await link.click();
  await admin.waitForURL((u) => u.pathname === "/admin" && u.hash === `#comanda-${number}`);
  await expect(admin.getByText("Panou de administrare").first()).toBeVisible();
  await expect(admin.locator(`#comanda-${number}`)).toBeVisible();
});
