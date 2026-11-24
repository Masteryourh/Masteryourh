import { expect, test, type Page } from "@playwright/test";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import pg from "pg";

/**
 * Alertele de expirare a documentelor (decizia PO: compania anunță gospodarul din timp; CLAUDE-04 F-02).
 * Contul de gospodar de test se pune direct în baza de test. Rulează doar cu PostgreSQL (DATABASE_URL), ca în CI.
 */
const url = process.env.DATABASE_URL;
test.describe.configure({ mode: "serial" });
test.skip(!url, "necesită DATABASE_URL (PostgreSQL)");

const FARM = "gospodaria-cojocaru";
const PASSWORD = "Parola-Gospodar-E1";
const EMAIL = `gospodar.exp.${Date.now()}@test.ro`;
const PDF = Buffer.from("%PDF-1.4\n% test expirare\n%%EOF\n");
let db: pg.Client;
let farmer: Page;

/** Data de azi + n zile, în calendarul din România (YYYY-MM-DD). */
const inDays = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date(Date.now() + n * 86_400_000));

test.beforeAll(async ({ browser }) => {
  // O primă cerere către server creează tabelul `documents` (dacă baza e nouă).
  await (await (await browser.newContext()).newPage()).goto("/precomanda");
  db = new pg.Client({ connectionString: url });
  await db.connect();
  const salt = randomBytes(16);
  const hash = `scrypt$${salt.toString("base64url")}$${scryptSync(PASSWORD, salt, 64).toString("base64url")}`;
  const id = randomUUID();
  await db.query(`insert into documents (collection, id, data) values ('users', $1, $2)`, [
    id,
    JSON.stringify({ id, email: EMAIL, name: "Gospodar Expirare", phone: "0722 333 444", role: "gospodar", farmSlug: FARM, status: "activ", sessionVersion: 1, passwordHash: hash, createdAt: new Date().toISOString() }),
  ]);
  farmer = await (await browser.newContext()).newPage();
  await farmer.goto("/cont/autentificare?inapoi=/cont/gospodar");
  await farmer.fill("input[name=email]", EMAIL);
  await farmer.fill("input[name=password]", PASSWORD);
  await farmer.click("button[type=submit]");
  await farmer.waitForURL((u) => u.pathname === "/cont/gospodar");
});
test.afterAll(async () => db?.end());

async function upload(title: string, expiresOn: string) {
  await farmer.goto("/cont/gospodar/documente");
  await farmer.locator("summary:has-text('Încarcă un document')").click();
  const form = farmer.locator("form", { has: farmer.locator("input[name=expiresOn]") });
  await form.locator("select[name=category]").selectOption("dsv");
  await form.locator("input[name=title]").fill(title);
  await form.locator("input[name=expiresOn]").fill(expiresOn);
  await form.locator("input[name=file]").setInputFiles({ name: "dsv.pdf", mimeType: "application/pdf", buffer: PDF });
  await form.locator("button:has-text('Încarcă')").click();
  await expect
    .poll(async () => (await db.query(`select 1 from documents where collection = 'documents' and data->>'title' = $1`, [title])).rowCount, { timeout: 15_000 })
    .toBe(1);
}

const reminders = async (docTitle: string) =>
  (
    await db.query(
      `select r.id from documents r join documents d on d.collection = 'documents' and r.data->>'docId' = d.id
       where r.collection = 'doc-reminders' and d.data->>'title' = $1 and r.data->>'sentAt' is not null`,
      [docTitle],
    )
  ).rows.map((r) => r.id as string);

test("documentul cu dată de expirare apare în panoul gospodarului, cu zilele rămase", async () => {
  await upload("Înregistrare DSV (test)", inDays(30));
  await farmer.goto("/cont/gospodar");
  const box = farmer.locator("#documente-expira");
  await expect(box).toContainText("Documente care expiră în curând");
  await expect(box).toContainText("Înregistrare DSV (test): expiră în 30 de zile");
});

test("alerta se trimite o singură dată pe prag, oricâte rulări", async ({ browser }) => {
  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/cont/autentificare?inapoi=/admin");
  await admin.fill("input[name=email]", process.env.ADMIN_USER ?? "admin@test.ro");
  await admin.fill("input[name=password]", process.env.ADMIN_PASSWORD ?? "Parola12345");
  await admin.click("button[type=submit]");
  await admin.waitForURL((u) => u.pathname === "/admin");
  await expect(admin.getByText("Document:").first()).toBeVisible(); // alerta din bara adminului

  await admin.goto("/admin/documente");
  await admin.locator("button:has-text('Trimite alertele acum')").click();
  await admin.waitForURL(/alerte=/);
  expect(await reminders("Înregistrare DSV (test)")).toEqual([expect.stringMatching(/:30$/)]);

  // A doua rulare (buton sau jobul zilnic): nimic nou.
  await admin.locator("button:has-text('Trimite alertele acum')").click();
  await admin.waitForURL(/alerte=0/);
  expect(await reminders("Înregistrare DSV (test)")).toHaveLength(1);
});

test("jobul zilnic: refuză fără cheie; cu cheia corectă rulează (fără duplicate)", async ({ request }) => {
  expect((await request.get("/api/cron/alerte-documente")).status()).toBe(401);
  expect((await request.get("/api/cron/alerte-documente", { headers: { Authorization: "Bearer gresit-gresit-gresit" } })).status()).toBe(401);
  const secret = process.env.CRON_SECRET;
  test.skip(!secret, "CRON_SECRET nu e setat pentru teste");
  const res = await request.get("/api/cron/alerte-documente", { headers: { Authorization: `Bearer ${secret}` } });
  expect(res.status()).toBe(200);
  expect((await res.json()).sent).toBe(0); // alerta de 30 de zile a fost deja trimisă
  expect(await reminders("Înregistrare DSV (test)")).toHaveLength(1);
});

test("documentul nou de același tip oprește alertele celui vechi", async () => {
  await upload("Înregistrare DSV reînnoită (test)", inDays(400));
  await farmer.goto("/cont/gospodar");
  await expect(farmer.locator("#documente-expira")).toHaveCount(0);
});
