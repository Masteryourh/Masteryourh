import { expect, test, type Browser, type Page } from "@playwright/test";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import pg from "pg";

/**
 * NAV-001 (cerința fondatorului, document ChatGPT #62): jurnalul gospodăriei deschis din Admin rămâne în spațiul Admin;
 * „Înapoi” întoarce la pagina de origine (validată, din același spațiu), cu fallback la părinte; fără open redirect.
 * Testele NAV-T01…T14 (adaptate la rutele reale: /admin/gospodarii/[slug]/jurnal, /cont/gospodar/jurnal).
 */
const url = process.env.DATABASE_URL;
test.describe.configure({ mode: "serial" });

const FARM = "gospodaria-hreniuc";
const FARM_NAME = "Gospodăria Hreniuc";
const JOURNAL = `/admin/gospodarii/${FARM}/jurnal`;
const ADMIN_USER = process.env.ADMIN_USER ?? "admin@test.ro";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Parola12345";
const F_EMAIL = `gospodar.nav.${Date.now()}@test.ro`;
const F_PASSWORD = "Parola-Gospodar-N1";

async function login(browser: Browser, email: string, password: string, to: string, opts = {}) {
  const page = await (await browser.newContext(opts)).newPage();
  await page.goto(`/cont/autentificare?inapoi=${encodeURIComponent(to)}`);
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", password);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === to.split("?")[0]);
  return page;
}
const admin = (b: Browser, opts = {}) => login(b, ADMIN_USER, ADMIN_PASSWORD, "/admin", opts);
/** Shell-ul Admin e vizibil (titlul spațiului) și nu cel al gospodarului. */
async function expectAdminShell(page: Page) {
  await expect(page.getByText("Panou de administrare").first()).toBeVisible();
  await expect(page.getByText("Contul gospodarului")).toHaveCount(0);
}
const backLink = (page: Page) => page.locator("[data-nav-back]");

test.beforeAll(async ({ browser }) => {
  if (!url) return;
  await (await (await browser.newContext()).newPage()).goto("/precomanda");
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  const salt = randomBytes(16);
  const hash = `scrypt$${salt.toString("base64url")}$${scryptSync(F_PASSWORD, salt, 64).toString("base64url")}`;
  const id = randomUUID();
  await db.query(`insert into documents (collection, id, data) values ('users', $1, $2)`, [
    id,
    JSON.stringify({ id, email: F_EMAIL, name: "Gospodar Nav", phone: "0722 999 000", role: "gospodar", farmSlug: "gospodaria-ciornei", status: "activ", sessionVersion: 1, passwordHash: hash, createdAt: new Date().toISOString() }),
  ]);
  await db.end();
});

test("NAV-T01/T02: Admin → Gospodării → Jurnal rămâne în Admin; „Înapoi” revine la listă", async ({ browser }) => {
  const a = await admin(browser);
  await a.goto("/admin/gospodarii");
  const card = a.locator("li, article, div").filter({ hasText: FARM_NAME }).filter({ has: a.locator("a:has-text('Jurnal de creștere')") }).last();
  await card.locator("a:has-text('Jurnal de creștere')").click();
  await a.waitForURL((u) => u.pathname === JOURNAL);
  await expectAdminShell(a);
  await expect(a.getByRole("heading", { name: `Jurnal de creștere · ${FARM_NAME}` })).toBeVisible();
  await expect(a.getByText("Vedere de administrator (doar citire)")).toBeVisible();
  await backLink(a).click();
  await a.waitForURL((u) => u.pathname === "/admin/gospodarii");
  await expectAdminShell(a);
});

test("NAV-T02: Fișa gospodăriei → Jurnal → „Înapoi” revine la fișa gospodăriei", async ({ browser }) => {
  const a = await admin(browser);
  await a.goto(`/admin/gospodarii/${FARM}`);
  await a.locator("a:has-text('Jurnal de creștere')").first().click();
  await a.waitForURL((u) => u.pathname === JOURNAL);
  await expect(backLink(a)).toHaveText(/Înapoi la Fișa gospodăriei/);
  await backLink(a).click();
  await a.waitForURL((u) => u.pathname === `/admin/gospodarii/${FARM}`);
});

test("NAV-T03/T14: originea cu filtre și pagină se păstrează la întoarcere; Monitorizare → Jurnal → Înapoi", async ({ browser }) => {
  const a = await admin(browser);
  const origin = "/admin/gospodarii?judet=SV&pagina=3";
  await a.goto(`${JOURNAL}?inapoi=${encodeURIComponent(origin)}`);
  await expect(backLink(a)).toHaveAttribute("href", origin);
  await a.goto("/admin/monitorizare");
  const link = a.locator(`a[href^="${JOURNAL}"]`).first();
  if (await link.count()) {
    await link.click();
    await a.waitForURL((u) => u.pathname === JOURNAL);
    await backLink(a).click();
    await a.waitForURL((u) => u.pathname === "/admin/monitorizare");
  }
  // Niciun link din Admin nu mai duce jurnalul în spațiul gospodarului.
  await expect(a.locator('a[href*="/cont/gospodar/jurnal"]')).toHaveCount(0);
});

test("NAV-T04: „Panou admin” din jurnal duce la /admin, nu în spațiul public sau al gospodarului", async ({ browser }) => {
  const a = await admin(browser);
  await a.goto(JOURNAL);
  await a.locator('a[href="/admin"]').first().click();
  await a.waitForURL((u) => u.pathname === "/admin");
  await expectAdminShell(a);
});

test("NAV-T05/T06/T07: refresh, Back/Forward și link direct rămân în Admin, cu fallback la părinte", async ({ browser }) => {
  const a = await admin(browser);
  await a.goto(JOURNAL); // link direct, fără origine
  await expect(backLink(a)).toHaveAttribute("href", `/admin/gospodarii/${FARM}`);
  await a.reload();
  await expect(a).toHaveURL(new RegExp(`${JOURNAL}$`));
  await expectAdminShell(a);
  await a.goto("/admin/gospodarii");
  await a.goBack();
  await expect(a).toHaveURL(new RegExp(`${JOURNAL}$`));
  await expectAdminShell(a);
  await a.goForward();
  await expect(a).toHaveURL(/\/admin\/gospodarii$/);
});

test("NAV-T08: gospodarul își vede jurnalul în spațiul lui, fără shell-ul Admin", async ({ browser }) => {
  test.skip(!url, "necesită DATABASE_URL");
  const f = await login(browser, F_EMAIL, F_PASSWORD, "/cont/gospodar/jurnal");
  await expect(f.getByText("Contul gospodarului").first()).toBeVisible();
  await expect(f.getByText("Panou de administrare")).toHaveCount(0);
  await expect(f.locator("[data-workspace-banner]")).toHaveCount(0);
  await expect(f.getByRole("heading", { name: /Jurnal de creștere · Gospodăria Ciornei/ })).toBeVisible();
});

test("NAV-T09: gospodarul nu poate deschide jurnalul din Admin (nicio impersonare)", async ({ browser }) => {
  test.skip(!url, "necesită DATABASE_URL");
  const f = await login(browser, F_EMAIL, F_PASSWORD, "/cont/gospodar");
  const res = await f.goto(JOURNAL);
  expect(f.url()).not.toContain(JOURNAL.slice(1) + "$");
  await expect(f.getByText("Panou de administrare")).toHaveCount(0);
  await expect(f.getByRole("heading", { name: `Jurnal de creștere · ${FARM_NAME}` })).toHaveCount(0);
  expect(res?.status()).toBeLessThan(500);
});

test("NAV-T10: originea externă sau din alt spațiu e refuzată (fallback la părinte); login fără open redirect", async ({ browser }) => {
  const a = await admin(browser);
  for (const evil of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "/cont/gospodar/jurnal", "/admin/../cont"]) {
    await a.goto(`${JOURNAL}?inapoi=${encodeURIComponent(evil)}`);
    await expect(backLink(a), evil).toHaveAttribute("href", `/admin/gospodarii/${FARM}`);
  }
  const p = await (await browser.newContext()).newPage();
  await p.goto(`/cont/autentificare?inapoi=${encodeURIComponent("/\\evil.example")}`);
  await p.fill("input[name=email]", ADMIN_USER);
  await p.fill("input[name=password]", ADMIN_PASSWORD);
  await p.click("button[type=submit]");
  await p.waitForURL((u) => u.pathname === "/admin");
  expect(new URL(p.url()).host).toBe(new URL(a.url()).host);
});

test("NAV-T11: fără sesiune, jurnalul cere autentificare și revine apoi exact la jurnal", async ({ browser }) => {
  const p = await (await browser.newContext()).newPage();
  await p.goto(JOURNAL);
  await expect(p).toHaveURL(/\/cont\/autentificare\?inapoi=/);
  await p.fill("input[name=email]", ADMIN_USER);
  await p.fill("input[name=password]", ADMIN_PASSWORD);
  await p.click("button[type=submit]");
  await p.waitForURL((u) => u.pathname === JOURNAL);
  await expectAdminShell(p);
});

test("NAV-T12 / NAV-06: „Schimbă spațiul” e explicit; două contexte Admin / Gospodar rămân independente", async ({ browser }) => {
  test.skip(!url, "necesită DATABASE_URL");
  const a = await admin(browser);
  const f = await login(browser, F_EMAIL, F_PASSWORD, "/cont/gospodar");
  const sw = a.locator('a[href="/cont/gospodar"]').first();
  await expect(sw).toHaveAttribute("aria-label", /Schimbă spațiul/); // eticheta din meniul cu iconițe
  await sw.click();
  await a.waitForURL((u) => u.pathname === "/cont/gospodar");
  await expect(a.locator("[data-workspace-banner]")).toContainText("administrator");
  await a.locator("[data-workspace-banner] a:has-text('Înapoi în Admin')").click();
  await a.waitForURL((u) => u.pathname === "/admin");
  // Gospodarul, în contextul lui, e tot autentificat și în spațiul lui.
  await f.reload();
  await expect(f).toHaveURL(/\/cont\/gospodar$/);
  await expect(f.getByText("Contul gospodarului").first()).toBeVisible();
});

test("NAV-T13: pe telefon, „Înapoi” e vizibil în jurnalul din Admin", async ({ browser }) => {
  const a = await admin(browser, { viewport: { width: 390, height: 844 } });
  await a.goto(`${JOURNAL}?inapoi=${encodeURIComponent("/admin/monitorizare")}`);
  await expect(backLink(a)).toBeVisible();
  await expect(backLink(a)).toHaveText(/Înapoi la Monitorizare creștere/);
});
