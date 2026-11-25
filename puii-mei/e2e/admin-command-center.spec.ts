import { expect, test, type Browser, type Page } from "@playwright/test";
import pg from "pg";

/**
 * Admin Central Command Center (decizia fondatorului, 24.11.2026; NAV-001 extins): fiecare entitate are reprezentare
 * în Admin, navigarea rămâne în Admin, „Înapoi” revine exact la locul de origine (ex. țarcul), iar trecerile în alt
 * spațiu sunt explicite. Defectul raportat: Admin → Loturi → țarc → comandă ieșea din Admin.
 */
const url = process.env.DATABASE_URL;
test.describe.configure({ mode: "serial" });
test.skip(!url, "necesită DATABASE_URL (PostgreSQL)");

let number = "";
let lotCode = "";
let token = "";
const tourId = crypto.randomUUID();
const farmSlug = "gospodaria-hreniuc";

async function admin(browser: Browser) {
  const p = await (await browser.newContext()).newPage();
  await p.goto("/cont/autentificare?inapoi=/admin");
  await p.fill("input[name=email]", process.env.ADMIN_USER ?? "admin@test.ro");
  await p.fill("input[name=password]", process.env.ADMIN_PASSWORD ?? "Parola12345");
  await p.click("button[type=submit]");
  await p.waitForURL((u) => u.pathname === "/admin");
  return p;
}
const expectAdminShell = (p: Page) => expect(p.getByText("Panou de administrare").first()).toBeVisible();

test.beforeAll(async ({ browser }) => {
  const client = await (await browser.newContext()).newPage();
  await client.goto("/precomanda");
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  lotCode = `XT-2099-${String(Date.now()).slice(-6)}`;
  const start = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  await db.query(`update documents set data = data || '{"closed": true}' where collection = 'lots'`);
  await db.query(`insert into documents (collection, id, data) values ('lots', $1, $2)`, [
    lotCode,
    JSON.stringify({ id: lotCode, code: lotCode, farmSlug, breed: "test", startDate: start, growthDays: 60, totalBirds: 80, reservedBirds: 0, feed: "t", processor: "t", pens: 2, createdAt: new Date().toISOString() }),
  ]);
  await client.goto("/precomanda?pui=6");
  await client.selectOption("#zoneId", "ridicare-personala");
  await client.fill("#name", "Client Centru Comanda");
  await client.fill("#phone", "0722 717 171");
  await client.fill("#email", "centru@test.ro");
  await client.check("#termsConsent");
  await client.locator("input[type=number]").first().fill("6");
  await client.click("button[type=submit]");
  await expect(client.getByText("Mulțumim").first()).toBeVisible();
  number = (await client.locator("body").innerText()).match(/PM\d{4}-[A-Z0-9]{5}/)![0];
  await expect.poll(async () => (await db.query(`select data->>'lotCode' as l from documents where collection = 'preorders' and data->>'number' = $1`, [number])).rows[0]?.l).toBe(lotCode);
  await db.query(`insert into documents (collection, id, data) values ('tours', $1, $2)`, [
    tourId,
    JSON.stringify({ id: tourId, code: "T-NAV", farmSlug, date: "2099-01-01", createdBy: "test", createdAt: new Date().toISOString(), status: "planificata", parcelIds: [], durationHours: 8, token: `tok-${tourId}`, pickupPin: "1234", failedPins: 0, locked: false, extensions: [] }),
  ]);
  token = (await db.query(`select data->>'trackingToken' as t from documents where collection = 'preorders' and data->>'number' = $1`, [number])).rows[0].t;
  await db.end();
});

test("defectul raportat: Loturi → țarc → comandă rămâne în Admin; „Înapoi” revine exact la țarc", async ({ browser }) => {
  const a = await admin(browser);
  await a.goto("/admin/loturi");
  const link = a.locator(`#tarc-${lotCode}-1 a:has-text("${number}")`);
  await a.locator(`#lot-${lotCode} > summary`).click();
  await link.click();
  await a.waitForURL((u) => u.pathname === `/admin/comenzi/${number}`);
  await expectAdminShell(a);
  expect(a.url()).not.toContain(token); // fără codul secret al clientului în adresă
  await expect(a.getByRole("heading", { name: number })).toBeVisible();
  await expect(a.getByText("Client Centru Comanda")).toBeVisible();
  await expect(a.locator("[data-pen-link]")).toHaveText(["Țarcul 1"]);
  await expect(a.getByText("Istoric (jurnal de audit)")).toBeVisible();

  await a.locator("[data-nav-back]").click();
  await a.waitForURL((u) => u.pathname === "/admin/loturi" && u.searchParams.get("deschis") === lotCode && u.hash === `#tarc-${lotCode}-1`);
  await expect(a.locator(`#lot-${lotCode}`)).toHaveAttribute("open", "");
  await expect(a.locator(`#tarc-${lotCode}-1`)).toBeInViewport();
});

test("comanda în Admin: contractul, eticheta, lotul și gospodăria se deschid în Admin, cu întoarcere la comandă", async ({ browser }) => {
  const a = await admin(browser);
  await a.goto(`/admin/comenzi/${number}`);
  await a.locator("a:has-text('Vezi contractul')").click();
  await a.waitForURL((u) => u.pathname === `/admin/comenzi/${number}/contract`);
  await expectAdminShell(a);
  await expect(a.getByText(/Contract/).first()).toBeVisible();
  await a.locator("[data-nav-back]").click();
  await a.waitForURL((u) => u.pathname === `/admin/comenzi/${number}`);
  await a.locator(`a:has-text("${lotCode}")`).first().click();
  await a.waitForURL((u) => u.pathname === "/admin/loturi");
  await expect(a.locator(`#lot-${lotCode}`)).toHaveAttribute("open", "");
  await a.goto(`/admin/comenzi/${number}`);
  await a.locator("a:has-text('Gospodăria Hreniuc')").first().click();
  await a.waitForURL((u) => u.pathname === `/admin/gospodarii/${farmSlug}`);
  await expect(a.locator("[data-nav-back]")).toHaveText(/Înapoi la Comanda/);
});

test("lista de comenzi din Admin deschide detaliile comenzii, cu întoarcere la rândul ei", async ({ browser }) => {
  const a = await admin(browser);
  await a.goto("/admin");
  await a.locator(`a:has-text("${number}")`).first().click();
  await a.waitForURL((u) => u.pathname === `/admin/comenzi/${number}`);
  await a.locator("[data-nav-back]").click();
  await a.waitForURL((u) => u.pathname === "/admin" && u.hash === `#comanda-${number}`);
});

test("verificare automată: niciun link din paginile Admin nu iese din Admin fără să fie explicit", async ({ browser }) => {
  test.setTimeout(180_000);
  const a = await admin(browser);
  const pages = [
    "/admin", "/admin/loturi", "/admin/livrari", "/admin/monitorizare", "/admin/calitate", "/admin/documente", "/admin/investitii",
    "/admin/parteneri", "/admin/gospodarii", `/admin/gospodarii/${farmSlug}`, `/admin/gospodarii/${farmSlug}/jurnal`,
    `/admin/gospodarii/${farmSlug}/documente`, `/admin/gospodarii/${farmSlug}/regim`, "/admin/preturi", "/admin/zone", "/admin/interes",
    "/admin/utilizatori", "/admin/legislatie", "/admin/mesaje", "/admin/diagnostic", `/admin/comenzi/${number}`, `/admin/comenzi/${number}/contract`, "/admin/livrari/etichete", `/admin/livrari/${tourId}`,
  ];
  const bad: string[] = [];
  for (const path of pages) {
    await a.goto(path);
    await expectAdminShell(a);
    const links = await a.$$eval("a[href]", (as) =>
      as.map((x) => ({ href: x.getAttribute("href") ?? "", blank: x.getAttribute("target") === "_blank", label: x.getAttribute("aria-label") ?? "" })),
    );
    for (const l of links) {
      if (l.blank || !l.href.startsWith("/") || l.href.startsWith("//")) continue; // tab nou / extern / tel: / mailto:
      if (/^\/(admin([/?#]|$)|fisiere\/|foto\/|cont\/(iesire|autentificare))/.test(l.href) || l.href.startsWith("#")) continue;
      if (/Schimbă spațiul/.test(l.label)) continue; // trecere explicită (NAV-06)
      bad.push(`${path} → ${l.href}`);
    }
  }
  expect(bad, bad.join("\n")).toEqual([]);
});
