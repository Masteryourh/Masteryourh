import { expect, test, type Browser } from "@playwright/test";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import pg from "pg";

/**
 * Rolurile noi (28.11.2026): autentificare cu nume de utilizator; managerul local vede doar comuna lui; clientul cu
 * cont vede doar comenzile proprii; rutele altor roluri sunt refuzate.
 */
const url = process.env.DATABASE_URL;
test.describe.configure({ mode: "serial" });
test.skip(!url, "necesită DATABASE_URL (PostgreSQL)");

const S = Date.now().toString(36);
const PW = "Parola-Roluri-1";
const hash = () => {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64url")}$${scryptSync(PW, salt, 64).toString("base64url")}`;
};
let db: pg.Client;
const put = (c: string, data: { id: string } & Record<string, unknown>) => db.query(`insert into documents (collection, id, data) values ($1, $2, $3)`, [c, data.id, JSON.stringify(data)]);
const farmA = `gosp-a-${S}`;
const farmB = `gosp-b-${S}`;
const ids = { client: randomUUID(), other: randomUUID() };

test.beforeAll(async ({ browser }) => {
  await (await (await browser.newContext()).newPage()).goto("/precomanda");
  db = new pg.Client({ connectionString: url });
  await db.connect();
  for (const [slug, commune] of [[farmA, `ComunaA${S}`], [farmB, `ComunaB${S}`]]) {
    await put("farms", { id: slug, slug, name: `Gospodăria ${slug}`, owner: "Test", village: commune, county: "Suceava", commune, since: 2026, capacityPerLot: 300, shortDescription: "", description: "", practices: [], photos: [], veterinaryRegistration: "x", active: true });
  }
  const user = (id: string, username: string, role: string, extra: Record<string, unknown> = {}) =>
    put("users", { id, email: `${username}@test.ro`, username, name: username, phone: "0700 000 111", role, status: "activ", sessionVersion: 1, passwordHash: hash(), createdAt: new Date().toISOString(), ...extra });
  await user(randomUUID(), `mgr${S}`, "manager-local", { communes: [`ComunaA${S}`] });
  await user(ids.client, `cli${S}`, "client");
  const order = (id: string, number: string, owner?: string) =>
    put("preorders", { id, number, createdAt: new Date().toISOString(), status: "confirmata", customer: { name: "Client test", phone: "0700 000 222", email: "" }, birds: 10, lotCode: null, zoneId: "suceava", address: "x", notes: "", estimate: { birds: 10, avgWeightKg: 4.8, pricePerKg: 36, estimatedKg: 48, productValue: 1728, deliveryFee: 0, total: 1728 }, marketingConsent: false, trackingToken: randomBytes(24).toString("base64url"), ...(owner ? { customerUserId: owner } : {}) });
  await order(randomUUID(), `PM-MINE-${S}`.toUpperCase(), ids.client);
  await order(ids.other, `PM-OTHER-${S}`.toUpperCase());
});
test.afterAll(async () => db?.end());

async function login(browser: Browser, username: string) {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/cont/autentificare");
  await page.fill("input[name=email]", username);
  await page.fill("input[name=password]", PW);
  await page.click("button[type=submit]");
  await page.waitForLoadState("networkidle");
  return page;
}

test("autentificare cu nume de utilizator: parola greșită e refuzată", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/cont/autentificare");
  await page.fill("input[name=email]", `mgr${S}`);
  await page.fill("input[name=password]", "gresit");
  await page.click("button[type=submit]");
  await expect(page.getByText("Date de autentificare greșite.")).toBeVisible();
});

test("managerul local vede doar gospodăriile comunei lui și nu intră în alte spații", async ({ browser }) => {
  const page = await login(browser, `mgr${S}`);
  expect(new URL(page.url()).pathname).toBe("/cont/manager");
  await expect(page.locator(`[data-gospodarie="${farmA}"]`)).toBeVisible();
  await expect(page.locator(`[data-gospodarie="${farmB}"]`)).toHaveCount(0);
  for (const path of ["/admin", "/cont/gospodar", "/cont/client"]) {
    await page.goto(path);
    expect(new URL(page.url()).pathname, path).not.toBe(path);
  }
});

test("clientul cu cont vede doar comenzile proprii, inclusiv pagina de urmărire", async ({ browser }) => {
  const page = await login(browser, `cli${S}`);
  expect(new URL(page.url()).pathname).toBe("/cont/client");
  await expect(page.locator(`[data-comanda="${`PM-MINE-${S}`.toUpperCase()}"]`)).toBeVisible();
  await expect(page.getByText(`PM-OTHER-${S}`.toUpperCase())).toHaveCount(0);
  await page.getByRole("link", { name: "Detalii și urmărire" }).click();
  await expect(page.getByText(`PM-MINE-${S}`.toUpperCase()).first()).toBeVisible();
  // Comanda altcuiva: fără PIN, nu se deschide.
  const other = (await db.query(`select data->>'trackingToken' t from documents where collection = 'preorders' and id = $1`, [ids.other])).rows[0].t;
  await page.goto(`/comanda/${other}`);
  expect(new URL(page.url()).pathname).toBe("/comanda");
});
