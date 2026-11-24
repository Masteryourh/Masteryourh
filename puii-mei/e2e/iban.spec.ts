import { expect, test, type Browser, type Page } from "@playwright/test";
import { createHmac, randomBytes, randomUUID, scryptSync } from "node:crypto";
import pg from "pg";

/**
 * CG-03: schimbarea contului bancar al gospodăriei (decizia PO: varianta b, etapa fără MFA).
 * Clienții văd doar contul activ; contul nou devine activ numai după confirmarea telefonică de către PUII MEI (altă
 * persoană decât cea care a cerut) și după 24 h. Contul de gospodar de test se pune direct în baza de test.
 */
const url = process.env.DATABASE_URL;
test.describe.configure({ mode: "serial" });
test.skip(!url, "necesită DATABASE_URL (PostgreSQL)");

const FARM = "gospodaria-ciornei";
const OTHER_FARM = "gospodaria-bodnar";
const PHONE = "0722 555 111";
const PASSWORD = "Parola-Gospodar-1";
const EMAIL = `gospodar.iban.${Date.now()}@test.ro`;
let db: pg.Client;
let farmerId = "";

/** IBAN românesc valid (cifra de control calculată, mod 97). */
function iban(bban: string) {
  const digits = (bban + "RO00").replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let r = 0;
  for (const d of digits) r = (r * 10 + Number(d)) % 97;
  return `RO${String(98 - r).padStart(2, "0")}${bban}`;
}
const A = iban("BTRL0000000000000001");
const B = iban("RNCB0000000000000002");
const C = iban("INGB0000000000000003");
const D = iban("BRDE0000000000000004");

const payment = async (slug = FARM) =>
  (await db.query(`select data from documents where collection = 'farm-payments' and id = $1`, [slug])).rows[0]?.data ?? null;

test.beforeAll(async ({ browser }) => {
  // O primă cerere către server creează tabelul `documents` (dacă baza e nouă).
  await (await (await browser.newContext()).newPage()).goto("/precomanda");
  db = new pg.Client({ connectionString: url });
  await db.connect();
  const salt = randomBytes(16);
  const hash = `scrypt$${salt.toString("base64url")}$${scryptSync(PASSWORD, salt, 64).toString("base64url")}`;
  farmerId = randomUUID();
  const user = { id: farmerId, email: EMAIL, name: "Gospodar IBAN", phone: PHONE, role: "gospodar", farmSlug: FARM, status: "activ", sessionVersion: 1, passwordHash: hash, createdAt: new Date().toISOString() };
  await db.query(`insert into documents (collection, id, data) values ('users', $1, $2)`, [farmerId, JSON.stringify(user)]);
});
test.afterAll(async () => db?.end());

async function login(browser: Browser, email: string, password: string, to: string) {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`/cont/autentificare?inapoi=${encodeURIComponent(to)}`);
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", password);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === to);
  return page;
}
const farmer = (b: Browser) => login(b, EMAIL, PASSWORD, "/cont/gospodar");
const admin = (b: Browser) => login(b, process.env.ADMIN_USER ?? "admin@test.ro", process.env.ADMIN_PASSWORD ?? "Parola12345", "/admin");

/* MFA (etapa 2, ADR-009): schimbarea unui cont existent cere codul din aplicația de autentificare. */
let mfaSecret = "";
function totpAt(b32: string, step: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const ch of b32) {
    value = (value << 5) | alphabet.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", Buffer.from(bytes)).update(msg).digest();
  return String((h.readUInt32BE(h[h.length - 1] & 15) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
/** Un cod încă nefolosit (codurile folosite nu se mai acceptă): așteaptă, dacă e nevoie, pasul următor de 30 s. */
async function freshCode() {
  const last = (await db.query(`select (data->'mfa'->>'lastStep')::bigint as s from documents where collection = 'users' and id = $1`, [farmerId])).rows[0]?.s;
  for (;;) {
    const now = Math.floor(Date.now() / 30000);
    const step = Math.max(now - 1, last === null || last === undefined ? now - 1 : Number(last) + 1);
    if (step <= now + 1) return totpAt(mfaSecret, step);
    await new Promise((r) => setTimeout(r, 1000));
  }
}
async function enableMfa(page: Page) {
  await page.goto("/cont/gospodar/securitate");
  await page.locator("button:has-text('Activează codul de confirmare')").click();
  await page.waitForURL(/pas=scanare/);
  mfaSecret = (await page.locator("[data-mfa-secret]").innerText()).replace(/\s/g, "");
  await page.fill("input[name=code]", await freshCode());
  await page.locator("button:has-text('Confirmă și activează')").click();
  await page.waitForURL(/activat=1/);
}

async function requestIban(page: Page, value: string, farmSlug?: string) {
  await page.goto("/cont/gospodar");
  const form = page.locator("form", { has: page.locator("input[name=iban]") });
  if (mfaSecret && (await form.locator("input[name=mfaCode]").count())) await form.locator("input[name=mfaCode]").fill(await freshCode());
  await form.locator("input[name=holder]").fill("Ana Ciornei");
  await form.locator("input[name=iban]").fill(value);
  await form.locator("input[name=bank]").fill("Banca Test");
  if (farmSlug) await form.locator("input[name=farmSlug]").evaluate((el, v) => ((el as HTMLInputElement).value = v), farmSlug);
  await form.locator("button:has-text('Salvează datele de plată')").click();
  await page.waitForURL(/ibanVerificare|salvatPlata|eroarePlata|eroare|error/i, { timeout: 15_000 }).catch(() => undefined);
}

async function confirmCall(page: Page) {
  await page.goto("/admin");
  const box = page.locator(`[data-iban-cerere="${FARM}"]`);
  await box.locator("button:has-text('Am sunat')").click();
  await page.waitForURL(/ibanConfirmat|eroareIban/);
}

test("primul cont: invizibil clienților până la apelul de confirmare, apoi activ", async ({ browser }) => {
  const f = await farmer(browser);
  await requestIban(f, A);
  await expect(f.getByText("Schimbare de cont în verificare")).toBeVisible();
  expect((await payment()).iban).toBe(""); // fail-closed: nimic de plătit
  expect((await payment()).ibanChange.status).toBe("in-verificare");
  expect((await payment()).ibanChange.knownPhones).toEqual([PHONE]);

  const a = await admin(browser);
  await confirmCall(a);
  expect((await payment()).iban).toBe(A); // primul cont: fără așteptare de 24 h
});

test("schimbarea contului: contul vechi rămâne activ până la confirmare + 24 h; jurnalul are IBAN-ul mascat", async ({ browser }) => {
  const f = await farmer(browser);
  await enableMfa(f); // schimbarea contului existent cere codul de confirmare
  await requestIban(f, B);
  expect((await payment()).iban).toBe(A);

  const a = await admin(browser);
  await confirmCall(a);
  const p = await payment();
  expect(p.ibanChange.status).toBe("confirmat");
  expect(p.iban).toBe(A); // activare prematură refuzată

  // Trec 24 h (simulat în baza de test): la următoarea citire contul nou devine activ.
  await db.query(
    `update documents set data = jsonb_set(data, '{ibanChange,activatesAfter}', to_jsonb($2::text)) where collection = 'farm-payments' and id = $1`,
    [FARM, new Date(Date.now() - 1000).toISOString()],
  );
  await a.goto("/admin");
  expect((await payment()).iban).toBe(B);
  expect((await payment()).ibanChange.status).toBe("activ");

  const audit = (await db.query(`select data from documents where collection = 'iban-audit' and data->>'farmSlug' = $1`, [FARM])).rows.map((r) => r.data);
  expect(audit.map((e) => e.action)).toEqual(expect.arrayContaining(["cerere", "confirmata", "activata"]));
  expect(JSON.stringify(audit)).not.toContain(B); // IBAN-ul complet nu apare în jurnal
});

test("adminul nu poate confirma o schimbare cerută tot de el", async ({ browser }) => {
  const a = await admin(browser);
  await a.goto(`/cont/gospodar?gospodarie=${FARM}`);
  const form = a.locator("form", { has: a.locator("input[name=iban]") });
  await form.locator("input[name=iban]").fill(C);
  await form.locator("button:has-text('Salvează datele de plată')").click();
  await expect.poll(async () => (await payment()).ibanChange?.iban, { timeout: 15_000 }).toBe(C);
  await confirmCall(a);
  await expect(a.getByRole("alert").filter({ hasText: "Confirmarea trebuie făcută de altă persoană" })).toBeVisible();
  expect((await payment()).ibanChange.status).toBe("in-verificare");
  expect((await payment()).iban).toBe(B);
});

test("IBAN cu cifră de control greșită → refuzat; gospodarul nu poate schimba contul altei gospodării", async ({ browser }) => {
  const f = await farmer(browser);
  await requestIban(f, "RO00BTRL0000000000000009");
  await expect(f.getByText("IBAN invalid")).toBeVisible();

  const before = await payment(OTHER_FARM);
  await requestIban(f, A, OTHER_FARM);
  expect(await payment(OTHER_FARM)).toEqual(before);
});

test("„Nu am cerut eu”: cererea se anulează, contul activ rămâne, contul care a cerut se blochează", async ({ browser }) => {
  const f = await farmer(browser);
  await requestIban(f, D); // înlocuiește cererea rămasă din testul anterior
  await expect.poll(async () => (await payment()).ibanChange.requestedById).toBe(farmerId);
  const changeId = (await payment()).ibanChange.id;
  await f.goto("/cont/gospodar");
  await f.locator("button:has-text('Nu am cerut eu')").click();
  await f.waitForLoadState("networkidle");
  const p = await payment();
  expect(p.ibanChange.id).toBe(changeId);
  expect(p.ibanChange.status).toBe("anulat");
  expect(p.iban).toBe(B);
  const u = (await db.query(`select data from documents where collection = 'users' and id = $1`, [farmerId])).rows[0].data;
  expect(u.status).toBe("dezactivat");
  // Sesiunea veche nu mai e valabilă.
  await f.goto("/cont/gospodar");
  await expect(f).toHaveURL(/autentificare/);
});
