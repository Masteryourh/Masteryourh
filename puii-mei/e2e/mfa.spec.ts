import { expect, test, type Page } from "@playwright/test";
import { createHmac, randomBytes, randomUUID, scryptSync } from "node:crypto";
import pg from "pg";

/**
 * MFA (cod din aplicația de autentificare) pentru schimbarea contului bancar — ADR-009, varianta (b), etapa 2.
 * Testul calculează codurile ca aplicația de pe telefon (TOTP, RFC 6238). Contul de gospodar și contul bancar activ
 * se pun direct în baza de test. Rulează doar cu PostgreSQL (DATABASE_URL), ca în CI.
 */
const url = process.env.DATABASE_URL;
test.describe.configure({ mode: "serial" });
test.skip(!url, "necesită DATABASE_URL (PostgreSQL)");

const FARM = "gospodaria-ungureanu";
const PASSWORD = "Parola-Gospodar-M1";
const EMAIL = `gospodar.mfa.${Date.now()}@test.ro`;
let db: pg.Client;
let farmer: Page;
let userId = "";
let secret = "";

function iban(bban: string) {
  const digits = (bban + "RO00").replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let r = 0;
  for (const d of digits) r = (r * 10 + Number(d)) % 97;
  return `RO${String(98 - r).padStart(2, "0")}${bban}`;
}
const OLD = iban("BTRL0000000000000011");
const NEW = iban("RNCB0000000000000022");

/** Codul TOTP (6 cifre, 30 s) pentru cheia base32 dată, ca în aplicația de autentificare. */
function totp(b32: string, offsetSteps = 0) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const ch of b32.replace(/\s/g, "")) {
    value = (value << 5) | alphabet.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offsetSteps));
  const h = createHmac("sha1", Buffer.from(bytes)).update(msg).digest();
  const off = h[h.length - 1] & 15;
  return String((h.readUInt32BE(off) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

const user = async () => (await db.query(`select data from documents where collection = 'users' and id = $1`, [userId])).rows[0].data;
const payment = async () => (await db.query(`select data from documents where collection = 'farm-payments' and id = $1`, [FARM])).rows[0]?.data;

test.beforeAll(async ({ browser }) => {
  // O primă cerere către server creează tabelul `documents` (dacă baza e nouă).
  await (await (await browser.newContext()).newPage()).goto("/precomanda");
  db = new pg.Client({ connectionString: url });
  await db.connect();
  const salt = randomBytes(16);
  const hash = `scrypt$${salt.toString("base64url")}$${scryptSync(PASSWORD, salt, 64).toString("base64url")}`;
  userId = randomUUID();
  await db.query(`insert into documents (collection, id, data) values ('users', $1, $2)`, [
    userId,
    JSON.stringify({ id: userId, email: EMAIL, name: "Gospodar MFA", phone: "0722 777 888", role: "gospodar", farmSlug: FARM, status: "activ", sessionVersion: 1, passwordHash: hash, createdAt: new Date().toISOString() }),
  ]);
  // Gospodăria are deja un cont bancar activ (schimbarea lui cere MFA).
  await db.query(`insert into documents (collection, id, data) values ('farm-payments', $1, $2)`, [
    FARM,
    JSON.stringify({ id: FARM, holder: "Ungureanu", iban: OLD, bank: "BT", feedPricePerKg: 2, chickPricePerBird: 5, updatedAt: new Date().toISOString(), updatedBy: "test" }),
  ]);
  farmer = await (await browser.newContext()).newPage();
  await farmer.goto("/cont/autentificare?inapoi=/cont/gospodar");
  await farmer.fill("input[name=email]", EMAIL);
  await farmer.fill("input[name=password]", PASSWORD);
  await farmer.click("button[type=submit]");
  await farmer.waitForURL((u) => u.pathname === "/cont/gospodar");
});
test.afterAll(async () => db?.end());

async function changeAccount(code?: string) {
  await farmer.goto("/cont/gospodar");
  const form = farmer.locator("form", { has: farmer.locator("input[name=iban]") });
  await form.locator("input[name=iban]").fill(NEW);
  if (code !== undefined) await form.locator("input[name=mfaCode]").fill(code);
  await form.locator("button:has-text('Salvează datele de plată')").click();
  await farmer.waitForURL(/eroarePlata|ibanVerificare|salvatPlata/, { timeout: 15_000 });
}

test("fără cod de confirmare activ, schimbarea contului bancar e refuzată (cu îndrumare)", async () => {
  await changeAccount("123456");
  await expect(farmer.getByRole("alert").filter({ hasText: "activează întâi codul de confirmare" })).toBeVisible();
  expect((await payment()).ibanChange).toBeUndefined();
});

test("activarea: cheia se păstrează criptată, iar MFA devine activ doar după primul cod corect", async () => {
  await farmer.goto("/cont/gospodar/securitate");
  await farmer.locator("button:has-text('Activează codul de confirmare')").click();
  await farmer.waitForURL(/pas=scanare/);
  secret = (await farmer.locator("[data-mfa-secret]").innerText()).replace(/\s/g, "");
  expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  const stored = (await user()).mfa;
  expect(stored.pending).toBe(true);
  expect(JSON.stringify(stored)).not.toContain(secret); // criptată în baza de date

  await farmer.fill("input[name=code]", "000000");
  await farmer.locator("button:has-text('Confirmă și activează')").click();
  await expect(farmer.getByRole("alert").filter({ hasText: "Cod greșit" })).toBeVisible();
  expect((await user()).mfa.pending).toBe(true);

  await farmer.fill("input[name=code]", totp(secret));
  await farmer.locator("button:has-text('Confirmă și activează')").click();
  await farmer.waitForURL(/activat=1/);
  expect((await user()).mfa.enabledAt).toBeTruthy();
});

test("schimbarea contului: cod greșit → refuz; cod corect → cerere în verificare; același cod nu se refolosește", async () => {
  await changeAccount("000000");
  await expect(farmer.getByRole("alert").filter({ hasText: "Cod greșit" })).toBeVisible();
  expect((await payment()).ibanChange).toBeUndefined();

  // Codul pasului următor: cel curent a fost folosit la activare și nu se mai acceptă.
  const code = totp(secret, 1);
  await changeAccount(code);
  await expect.poll(async () => (await payment()).ibanChange?.status, { timeout: 15_000 }).toBe("in-verificare");
  expect((await payment()).iban).toBe(OLD); // contul activ rămâne până la apel + 24 h

  // Același cod, a doua oară (replay) → refuzat.
  await changeAccount(code);
  await expect(farmer.getByRole("alert").filter({ hasText: "Cod greșit" })).toBeVisible();
});

test("prea multe coduri greșite → blocare temporară", async () => {
  for (let i = 0; i < 5; i++) await changeAccount(String(100000 + i));
  await changeAccount(totp(secret, 1));
  await expect(farmer.getByRole("alert").filter({ hasText: "Prea multe coduri greșite" })).toBeVisible();
});

test("telefon pierdut: adminul resetează codul de confirmare și sesiunile gospodarului se închid", async ({ browser }) => {
  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/cont/autentificare?inapoi=/admin");
  await admin.fill("input[name=email]", process.env.ADMIN_USER ?? "admin@test.ro");
  await admin.fill("input[name=password]", process.env.ADMIN_PASSWORD ?? "Parola12345");
  await admin.click("button[type=submit]");
  await admin.waitForURL((u) => u.pathname === "/admin");
  await admin.goto("/admin/utilizatori");
  const row = admin.locator("li, tr, div").filter({ hasText: EMAIL }).filter({ has: admin.locator("button:has-text('Resetează codul de confirmare')") }).last();
  await row.locator("button:has-text('Resetează codul de confirmare')").click();
  await expect.poll(async () => (await user()).mfa ?? null, { timeout: 15_000 }).toBeNull();
  await farmer.goto("/cont/gospodar");
  await expect(farmer).toHaveURL(/autentificare/);
});
