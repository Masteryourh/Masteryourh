import { devices, expect, test, type Browser } from "@playwright/test";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import pg from "pg";

/**
 * Gospodar: „De făcut azi” în capul panoului + navigarea de telefon ca într-o aplicație (bara de jos cu toate cele 5
 * secțiuni, fără „Meniu”). Contul de test se pune direct în baza de test (ca în expiry.spec.ts).
 */
const url = process.env.DATABASE_URL;
test.skip(!url, "necesită DATABASE_URL (PostgreSQL)");

const PASSWORD = "Parola-Gospodar-Azi1";
const EMAIL = `gospodar.azi.${Date.now()}@test.ro`;

test.beforeAll(async ({ browser }) => {
  await (await (await browser.newContext()).newPage()).goto("/precomanda");
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  const salt = randomBytes(16);
  const hash = `scrypt$${salt.toString("base64url")}$${scryptSync(PASSWORD, salt, 64).toString("base64url")}`;
  const id = randomUUID();
  await db.query(`insert into documents (collection, id, data) values ('users', $1, $2)`, [
    id,
    JSON.stringify({ id, email: EMAIL, name: "Gospodar Azi", phone: "0722 333 445", role: "gospodar", farmSlug: "gospodaria-cojocaru", status: "activ", sessionVersion: 1, passwordHash: hash, createdAt: new Date().toISOString() }),
  ]);
  await db.end();
});

async function login(browser: Browser, options: Parameters<Browser["newContext"]>[0] = {}) {
  const page = await (await browser.newContext(options)).newPage();
  await page.goto("/cont/autentificare?inapoi=/cont/gospodar");
  await page.fill("input[name=email]", EMAIL);
  await page.fill("input[name=password]", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === "/cont/gospodar");
  return page;
}

test("desktop: „De făcut azi” e în capul panoului și fiecare element duce în spațiul gospodarului", async ({ browser }) => {
  const page = await login(browser);
  await expect(page.getByRole("heading", { name: "De făcut azi" })).toBeVisible();
  const hrefs = await page.locator("[data-today='coada'] a").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  for (const h of hrefs) expect(h.startsWith("/cont/gospodar"), `legătură în afara spațiului gospodarului: ${h}`).toBe(true);
  // Bara laterală cu iconițe (cu nume accesibile), fără bara de jos.
  await expect(page.locator("aside").getByRole("link", { name: "Jurnal de creștere" })).toBeVisible();
  await expect(page.locator("nav.fixed.bottom-0")).toBeHidden();
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { defaultBrowserType, ...iphone } = devices["iPhone 13"];

test("telefon: toate cele 5 secțiuni în bara de jos, fără „Meniu”; taburile sunt ecrane rădăcină", async ({ browser }) => {
  const page = await login(browser, iphone);
  const bar = page.locator("nav.fixed.bottom-0");
  await expect(bar).toBeVisible();
  for (const t of ["Azi", "Jurnal", "Documente", "Reguli", "Securitate"]) await expect(bar.getByRole("link", { name: new RegExp(t) })).toBeVisible();
  await expect(page.getByRole("button", { name: "Meniu" })).toHaveCount(0);
  await expect(bar.getByRole("link", { name: /Azi/ })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("aside")).toBeHidden();

  await bar.getByRole("link", { name: /Jurnal/ }).click();
  await page.waitForURL((u) => u.pathname === "/cont/gospodar/jurnal");
  await expect(bar.getByRole("link", { name: /Jurnal/ })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText(/Înapoi la/)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await bar.getByRole("link", { name: /Azi/ }).click();
  await page.waitForURL((u) => u.pathname === "/cont/gospodar");
  await expect(page.getByRole("heading", { name: "De făcut azi" })).toBeVisible();
});
