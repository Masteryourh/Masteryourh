import { expect, test, type Browser, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

/**
 * CG-02 / V-02: accesul curierului la tură (fără cont): PIN de ridicare de la gospodar (o singură folosire),
 * apoi PIN personal. Limita de 5 PIN-uri greșite pe tură trebuie să reziste la cereri simultane, PIN-ul de ridicare
 * să dea acces unui singur curier chiar și la cereri simultane corecte, iar sesiunea unei ture să nu deschidă alta.
 * Turele de test se pun direct în baza de test. Rulează doar cu PostgreSQL (DATABASE_URL), ca în CI.
 */
const url = process.env.DATABASE_URL;
test.describe.configure({ mode: "serial" });
test.skip(!url, "necesită DATABASE_URL (PostgreSQL)");

let db: pg.Client;
const PICKUP = "4821";

test.beforeAll(async ({ browser }) => {
  // O primă cerere către server creează tabelul `documents` (dacă baza e nouă).
  await (await (await browser.newContext()).newPage()).goto("/precomanda");
  db = new pg.Client({ connectionString: url });
  await db.connect();
});
test.afterAll(async () => db?.end());

async function newTour() {
  const id = randomUUID();
  const token = randomBytes(24).toString("base64url");
  const tour = {
    id, code: `T-${id.slice(0, 6)}`, farmSlug: "gospodaria-hreniuc", date: new Date().toISOString().slice(0, 10),
    createdBy: "test", createdAt: new Date().toISOString(), status: "planificata", parcelIds: [], durationHours: 8,
    token, pickupPin: PICKUP, failedPins: 0, locked: false, extensions: [],
  };
  await db.query(`insert into documents (collection, id, data) values ('tours', $1, $2)`, [id, JSON.stringify(tour)]);
  return { id, token };
}
/** Câte PIN-uri greșite au fost evaluate efectiv (fiecare lasă o intrare „pin-gresit” în jurnalul turei). */
const wrongPinEvents = async (id: string) =>
  Number((await db.query(`select count(*) from documents where collection = 'tour-events' and data->>'tourId' = $1 and data->>'type' = 'pin-gresit'`, [id])).rows[0].count);
const tourRow = async (id: string) => (await db.query(`select data from documents where collection = 'tours' and id = $1`, [id])).rows[0].data;

async function pairPage(browser: Browser, token: string, pin: string, i = 0) {
  const p = await (await browser.newContext()).newPage();
  await p.goto(`/livrare/${token}`);
  await p.waitForLoadState("networkidle"); // formularul e trimis din browser: așteptăm încărcarea completă
  await p.fill("input[name=name]", `Sofer Test ${i}`);
  await p.fill("input[name=phone]", "0722000999");
  await p.fill("input[name=plate]", "SV 12 ABC");
  await p.selectOption("#vehicleType", "Frigorifică");
  await p.fill("input[name=atp]", "ATP-123");
  await p.fill("input[name=pin]", pin);
  return p;
}
const alertText = async (p: Page) => {
  const a = p.getByRole("alert").filter({ hasText: /PIN|blocat|curier/ }).first();
  await a.waitFor({ timeout: 30_000 });
  return a.innerText();
};
/** Pagina turei arată formularul curierului autorizat (alegerea PIN-ului personal), nu formularul de ridicare. */
const authorized = async (p: Page, token: string) => {
  await p.goto(`/livrare/${token}`);
  return (await p.getByText("Alege PIN-ul tău").count()) > 0;
};

test("20 de PIN-uri de ridicare greșite simultan → cel mult 5 evaluate, tura se blochează", async ({ browser }) => {
  test.setTimeout(150_000);
  const { id, token } = await newTour();
  const pages: Page[] = [];
  for (let i = 0; i < 20; i++) pages.push(await pairPage(browser, token, String(1000 + i), i));
  await Promise.all(pages.map((p) => p.click("button:has-text('Confirm ridicarea')")));
  const messages = await Promise.all(pages.map(alertText));
  expect(messages.every((m) => /PIN greșit|blocat/.test(m))).toBe(true);
  expect(await wrongPinEvents(id)).toBe(5); // exact 5 evaluate; restul refuzate fără evaluare (tura blocată)
  const t = await tourRow(id);
  expect(t.failedPins).toBe(5);
  expect(t.locked).toBe(true);
  // Blocată: nici PIN-ul corect nu mai intră.
  const late = await (await browser.newContext()).newPage();
  await late.goto(`/livrare/${token}`);
  await expect(late.getByText("Accesul a fost blocat")).toBeVisible();
});

test("PIN-ul de ridicare corect, trimis simultan de 10 persoane → un singur curier primește acces", async ({ browser }) => {
  test.setTimeout(150_000);
  const { id, token } = await newTour();
  const pages: Page[] = [];
  for (let i = 0; i < 10; i++) pages.push(await pairPage(browser, token, PICKUP, i));
  await Promise.all(pages.map((p) => p.click("button:has-text('Confirm ridicarea')")));
  await Promise.all(pages.map((p) => p.waitForLoadState("networkidle")));
  const access = await Promise.all(pages.map((p) => authorized(p, token)));
  expect(access.filter(Boolean)).toHaveLength(1);
  const t = await tourRow(id);
  expect(t.pickupPinUsed).toBe(true);
  expect(t.courier.sessionVersion).toBe(1);

  // Celelalte 9 încercări cu PIN-ul deja folosit contează ca greșite (replay) → tura s-a blocat pentru alții;
  // curierul împerecheat rămâne singurul cu acces, iar datele lui nu au fost suprascrise.
  expect(t.failedPins).toBe(5);
  expect(t.locked).toBe(true);
  const winner = pages[access.indexOf(true)];
  expect(await authorized(winner, token)).toBe(true);
  const replay = await (await browser.newContext()).newPage();
  expect(await authorized(replay, token)).toBe(false);
  expect((await tourRow(id)).courier.name).toBe(t.courier.name);
});

test("sesiunea unei ture nu deschide altă tură; resetarea accesului închide sesiunea veche", async ({ browser }) => {
  test.setTimeout(120_000);
  const a = await newTour();
  const b = await newTour();
  const courier = await pairPage(browser, a.token, PICKUP, 1);
  await courier.click("button:has-text('Confirm ridicarea')");
  await expect(courier.getByText("Alege PIN-ul tău")).toBeVisible({ timeout: 15_000 }); // răspunsul (cu sesiunea) a sosit
  expect(await authorized(courier, a.token)).toBe(true);
  expect(await authorized(courier, b.token)).toBe(false); // tură străină

  // Adminul resetează accesul curierului pe tura A: PIN de ridicare nou, sesiunea veche nu mai e valabilă.
  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/cont/autentificare?inapoi=/admin");
  await admin.fill("input[name=email]", process.env.ADMIN_USER ?? "admin@test.ro");
  await admin.fill("input[name=password]", process.env.ADMIN_PASSWORD ?? "Parola12345");
  await admin.click("button[type=submit]");
  await admin.waitForURL((u) => u.pathname === "/admin");
  await admin.goto(`/cont/gospodar/ture/${a.id}?gospodarie=gospodaria-hreniuc`);
  await admin.locator("button:has-text('Resetează accesul')").click();
  await expect.poll(async () => (await tourRow(a.id)).courier.sessionVersion, { timeout: 15_000 }).toBe(2);
  const t = await tourRow(a.id);
  expect(t.pickupPin).not.toBe(PICKUP);
  expect(t.pickupPinUsed).toBe(false);
  expect(await authorized(courier, a.token)).toBe(false);
});

test("PIN personal: 20 de încercări greșite simultan → cel mult 5 evaluate; contorul e în baza de date", async ({ browser }) => {
  test.setTimeout(150_000);
  const { id, token } = await newTour();
  const courier = await pairPage(browser, token, PICKUP, 1);
  await courier.click("button:has-text('Confirm ridicarea')");
  await expect(courier.getByText("Alege PIN-ul tău")).toBeVisible({ timeout: 15_000 });
  await courier.fill("input[name=pin]", "1357");
  await courier.fill("input[name=confirm]", "1357");
  await courier.click("button:has-text('Salvează PIN-ul')");
  await expect.poll(async () => Boolean((await tourRow(id)).courier.personalPinHash), { timeout: 15_000 }).toBe(true);

  const pages: Page[] = [];
  for (let i = 0; i < 20; i++) {
    const p = await (await browser.newContext()).newPage();
    await p.goto(`/livrare/${token}`);
    await p.waitForLoadState("networkidle");
    await p.fill("input[name=pin]", String(2000 + i));
    pages.push(p);
  }
  await Promise.all(pages.map((p) => p.click("button:has-text('Intră în tură')")));
  const messages = await Promise.all(pages.map(alertText));
  expect(messages.every((m) => /PIN greșit|blocat/.test(m))).toBe(true);
  expect(await wrongPinEvents(id)).toBe(5);
  const t = await tourRow(id);
  expect(t.failedPins).toBe(5);
  expect(t.locked).toBe(true);
});
