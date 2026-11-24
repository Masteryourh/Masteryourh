import { expect, test, type Page } from "@playwright/test";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import pg from "pg";

/**
 * Izolarea între gospodării (CG-05 / VERIFICATION §2.1 punctul 4), pe codul actual: gospodarul A (Ciornei) nu poate
 * citi și nu poate modifica nimic din gospodăria B (Bodnar), nici schimbând adresa, nici modificând câmpurile ascunse
 * ale formularelor lui. Fiecare acțiune are întâi o probă pozitivă (pe gospodăria proprie funcționează), ca testul
 * negativ să nu treacă degeaba. Datele de test se pun direct în baza de test.
 */
const url = process.env.DATABASE_URL;
test.describe.configure({ mode: "serial" });
test.skip(!url, "necesită DATABASE_URL (PostgreSQL)");

const A = "gospodaria-ciornei";
const B = "gospodaria-bodnar";
const PASSWORD = "Parola-Gospodar-A1";
const EMAIL = `gospodar.a.${Date.now()}@test.ro`;
const PDF = Buffer.from("%PDF-1.4\n% test izolare\n%%EOF\n");
let db: pg.Client;
let page: Page;
const ids = { lotB: `BR-2099-${String(Date.now()).slice(-4)}`, docB: randomUUID(), fileB: randomUUID(), photoB: randomUUID(), tourB: randomUUID(), tourA: randomUUID(), tourA2: randomUUID(), expB: randomUUID(), expA: randomUUID() };

const insert = (collection: string, id: string, data: object) =>
  db.query(`insert into documents (collection, id, data) values ($1, $2, $3)`, [collection, id, JSON.stringify({ id, ...data })]);
const rows = async (collection: string, where = "true", params: unknown[] = []) =>
  (await db.query(`select data from documents where collection = '${collection}' and ${where}`, params)).rows.map((r) => r.data);
const one = async (collection: string, id: string) => (await rows(collection, "id = $1", [id]))[0];
const forFarm = (collection: string, farm: string) => rows(collection, "data->>'farmSlug' = $1", [farm]);

const tour = (farmSlug: string) => ({
  code: `T-${randomBytes(3).toString("hex")}`, farmSlug, date: "2099-01-01", createdBy: "test", createdAt: new Date().toISOString(),
  status: "planificata", parcelIds: [], durationHours: 8, token: randomBytes(24).toString("base64url"), pickupPin: "1234", failedPins: 0, locked: false, extensions: [],
});
const expense = (farmSlug: string) => ({
  kind: "cheltuiala", farmSlug, date: "2026-11-20", category: "furaj", supplier: "Furnizor test", description: "test", amount: 100,
  createdAt: new Date().toISOString(), createdBy: "test",
});

/**
 * Modifică un câmp ascuns al formularului (ce ar face un atacator cu instrumentele browserului) și trimite formularul
 * cu butonul indicat, într-un singur pas (după modificare, un selector după valoarea veche nu mai găsește formularul).
 */
async function tamperAndSubmit(form: ReturnType<Page["locator"]>, name: string, value: string, button: string) {
  await form.evaluate(
    (f, [n, v, b]) => {
      (f.querySelector(`input[name=${n}]`) as HTMLInputElement).value = v;
      const submitter = [...f.querySelectorAll("button")].find((x) => x.textContent?.includes(b));
      (f as HTMLFormElement).requestSubmit(submitter);
    },
    [name, value, button],
  );
}

test.beforeAll(async ({ browser }) => {
  // O primă cerere către server creează tabelul `documents` (dacă baza e nouă).
  await (await (await browser.newContext()).newPage()).goto("/precomanda");
  db = new pg.Client({ connectionString: url });
  await db.connect();
  const salt = randomBytes(16);
  const hash = `scrypt$${salt.toString("base64url")}$${scryptSync(PASSWORD, salt, 64).toString("base64url")}`;
  const uid = randomUUID();
  await insert("users", uid, { email: EMAIL, name: "Gospodar A", phone: "0722 111 222", role: "gospodar", farmSlug: A, status: "activ", sessionVersion: 1, passwordHash: hash, createdAt: new Date().toISOString() });

  // Gospodăria B: lot, document cu fișier, poză din jurnal, tură, cheltuială.
  const start = new Date(Date.now() + 20 * 86400_000).toISOString().slice(0, 10);
  await insert("lots", ids.lotB, { code: ids.lotB, farmSlug: B, breed: "test", startDate: start, growthDays: 60, totalBirds: 40, reservedBirds: 0, feed: "test", processor: "test", pens: 1, createdAt: new Date().toISOString() });
  await insert("files", ids.fileB, { name: "secret-b.pdf", mime: "application/pdf", size: PDF.length, sha256: "", data: PDF.toString("base64"), uploadedAt: new Date().toISOString(), uploadedBy: "B" });
  await insert("documents", ids.docB, { farmSlug: B, category: "contract", title: "Contract confidential B", date: "2026-11-20", fileId: ids.fileB, fileName: "secret-b.pdf", mime: "application/pdf", size: PDF.length, sha256: "", uploadedBy: "B", uploadedAt: new Date().toISOString() });
  await insert("photos", ids.photoB, { mime: "image/png", data: Buffer.from("png-b").toString("base64"), at: new Date().toISOString(), owner: `lot:${ids.lotB}` });
  await insert("tours", ids.tourB, tour(B));
  await insert("expenses", ids.expB, expense(B));
  // Gospodăria A: tururi și o cheltuială proprii (ca formularele să existe pe paginile lui A).
  await insert("tours", ids.tourA, tour(A));
  await insert("tours", ids.tourA2, tour(A));
  await insert("expenses", ids.expA, expense(A));

  page = await (await browser.newContext()).newPage();
  await page.goto("/cont/autentificare?inapoi=/cont/gospodar");
  await page.fill("input[name=email]", EMAIL);
  await page.fill("input[name=password]", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === "/cont/gospodar");
});
test.afterAll(async () => db?.end());

test("citire: A nu vede nimic din B, nici schimbând adresa", async () => {
  for (const path of [`/cont/gospodar?gospodarie=${B}`, `/cont/gospodar/documente?gospodarie=${B}`, `/cont/gospodar/jurnal?gospodarie=${B}`]) {
    await page.goto(path);
    const body = await page.locator("body").innerText();
    expect(body, path).not.toContain(ids.lotB);
    expect(body, path).not.toContain("Contract confidential B");
  }
  expect((await page.request.get(`/cont/gospodar/ture/${ids.tourB}`)).status()).toBe(404);
  expect((await page.request.get(`/fisiere/${ids.docB}`)).status()).toBe(401);
  expect((await page.request.get(`/foto/${ids.photoB}`)).status()).toBe(401);
  // Probă pozitivă: tura proprie se deschide.
  expect((await page.request.get(`/cont/gospodar/ture/${ids.tourA}`)).status()).toBe(200);
});

test("documente: A nu poate încărca un document în numele lui B", async () => {
  const upload = async (farm: string, title: string) => {
    await page.goto("/cont/gospodar/documente");
    await page.locator("summary:has-text('Încarcă un document')").click();
    const form = page.locator("form", { has: page.locator("input[name=title]") });
    await form.locator("input[name=title]").fill(title);
    await form.locator("input[name=file]").setInputFiles({ name: "doc.pdf", mimeType: "application/pdf", buffer: PDF });
    await tamperAndSubmit(form, "farmSlug", farm, "Încarcă");
    await page.waitForLoadState("networkidle");
  };
  await upload(A, "Document propriu A");
  await expect.poll(async () => (await forFarm("documents", A)).some((d) => d.title === "Document propriu A"), { timeout: 15_000 }).toBe(true);
  const before = (await forFarm("documents", B)).length;
  await upload(B, "Document strecurat la B");
  expect((await forFarm("documents", B)).length).toBe(before);
  expect((await rows("documents")).some((d) => d.title === "Document strecurat la B")).toBe(false);
});

test("cheltuieli: A nu poate adăuga și nu poate anula înregistrări ale lui B", async () => {
  const add = async (farm: string, supplier: string) => {
    await page.goto("/cont/gospodar/documente");
    await page.locator("summary:has-text('Adaugă o cheltuială')").click();
    const form = page.locator("form", { has: page.locator("input[name=supplier]") }).first();
    await form.locator("input[name=supplier]").fill(supplier);
    await form.locator("input[name=amount]").fill("50");
    await form.locator("select[name=category]").selectOption("furaj");
    await tamperAndSubmit(form, "farmSlug", farm, "Salvează ca ciornă");
    await page.waitForLoadState("networkidle");
  };
  await add(A, "Furnizor propriu A");
  await expect.poll(async () => (await forFarm("expenses", A)).some((e) => e.supplier === "Furnizor propriu A"), { timeout: 15_000 }).toBe(true);
  const before = (await forFarm("expenses", B)).length;
  await add(B, "Furnizor strecurat la B");
  expect((await forFarm("expenses", B)).length).toBe(before);

  // Anulare: formularul cheltuielii proprii, cu id-ul cheltuielii lui B.
  await page.goto("/cont/gospodar/documente");
  const voidBox = page.locator("details", { has: page.locator(`input[name=id][value="${ids.expA}"]`) }).filter({ has: page.locator("input[name=reason]") });
  await voidBox.locator("summary").click();
  const voidForm = voidBox.locator("form");
  await voidForm.locator("input[name=reason]").fill("test izolare");
  await tamperAndSubmit(voidForm, "id", ids.expB, "OK");
  await page.waitForLoadState("networkidle");
  expect((await one("expenses", ids.expB)).voided ?? null).toBeNull();
  expect((await one("expenses", ids.expA)).voided ?? null).toBeNull(); // nici cea proprie (id-ul a fost înlocuit)

  // Probă pozitivă: același formular, fără modificare, anulează cheltuiala proprie.
  await page.goto("/cont/gospodar/documente");
  await voidBox.locator("summary").click();
  await voidForm.locator("input[name=reason]").fill("test izolare");
  await tamperAndSubmit(voidForm, "id", ids.expA, "OK");
  await expect.poll(async () => (await one("expenses", ids.expA)).voided?.reason, { timeout: 15_000 }).toBe("test izolare");
});

test("ture: A nu poate anula tura lui B", async () => {
  const cancel = async (formTour: string, target: string) => {
    await page.goto(`/cont/gospodar/ture/${formTour}`);
    const form = page.locator("form", { has: page.locator("input[name=tourId]") }).filter({ hasText: /Anulează/ }).first();
    page.once("dialog", (d) => d.accept());
    await tamperAndSubmit(form, "tourId", target, "Anulează");
    await page.waitForLoadState("networkidle");
  };
  await cancel(ids.tourA, ids.tourA);
  await expect.poll(async () => (await one("tours", ids.tourA)).status, { timeout: 15_000 }).toBe("anulata"); // probă pozitivă
  await cancel(ids.tourA2, ids.tourB);
  expect((await one("tours", ids.tourB)).status).toBe("planificata");
});

test("teren: A nu poate declara suprafața lui B", async () => {
  const declare = async (farm: string, m2: string) => {
    await page.goto("/cont/gospodar");
    const form = page.locator("form", { has: page.locator("input[name=declaredM2]") });
    await form.locator("input[name=declaredM2]").fill(m2);
    await form.locator("input[name=file]").setInputFiles({ name: "act.pdf", mimeType: "application/pdf", buffer: PDF });
    await tamperAndSubmit(form, "farmSlug", farm, "Trimite spre confirmare");
    await page.waitForLoadState("networkidle");
  };
  await declare(A, "800");
  await expect.poll(async () => (await one("farm-land", A))?.declaredM2, { timeout: 15_000 }).toBe(800);
  const before = await one("farm-land", B);
  await declare(B, "777");
  expect(await one("farm-land", B)).toEqual(before);
});
