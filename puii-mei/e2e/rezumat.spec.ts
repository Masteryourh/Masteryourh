import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";

/**
 * Rezumatul de dimineață pentru gospodari (neactivat): ruta e protejată, implicit nu trimite nimic, rularea de probă
 * construiește mesajul fără să-l trimită, iar a doua rulare în aceeași zi e deduplicată. Nimic nu ajunge în outbox.
 */
const url = process.env.DATABASE_URL;
const secret = process.env.CRON_SECRET;
test.describe.configure({ mode: "serial" });
test.skip(!url || !secret, "necesită DATABASE_URL și CRON_SECRET");

const FARM = "gospodaria-bodnar";
const auth = () => ({ Authorization: `Bearer ${secret}` });
let db: pg.Client;
const outboxCount = async () => Number((await db.query(`select count(*) from documents where collection = 'outbox'`)).rows[0].count);

test.beforeAll(async ({ request }) => {
  await request.get("/precomanda"); // creează tabelul pe o bază nouă
  db = new pg.Client({ connectionString: url });
  await db.connect();
  const user = randomUUID();
  await db.query(`insert into documents (collection, id, data) values ('users', $1, $2)`, [
    user,
    JSON.stringify({ id: user, email: `rezumat.${Date.now()}@test.ro`, name: "Gospodar Rezumat", phone: "0722 111 999", role: "gospodar", farmSlug: FARM, status: "activ", sessionVersion: 1, createdAt: new Date().toISOString() }),
  ]);
  // Un document care expiră mâine ⇒ cel puțin un lucru „de făcut azi”.
  const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date(Date.now() + 86_400_000));
  const doc = randomUUID();
  await db.query(`insert into documents (collection, id, data) values ('documents', $1, $2)`, [
    doc,
    JSON.stringify({ id: doc, farmSlug: FARM, category: "dsv", title: "Autorizație DSV (rezumat)", date: "2026-01-01", fileId: "x", fileName: "a.pdf", mime: "application/pdf", size: 1, sha256: "0", uploadedAt: new Date().toISOString(), uploadedBy: "test", expiresOn: tomorrow }),
  ]);
});
test.afterAll(async () => db?.end());

test("fără secret: refuzat", async ({ request }) => {
  expect((await request.get("/api/cron/rezumat-gospodari")).status()).toBe(401);
  expect((await request.get("/api/cron/rezumat-gospodari", { headers: { Authorization: "Bearer gresit-gresit-gresit" } })).status()).toBe(401);
});

test("implicit dezactivat: nu pune nimic în outbox", async ({ request }) => {
  const before = await outboxCount();
  const r = await (await request.get("/api/cron/rezumat-gospodari", { headers: auth() })).json();
  expect(r.mod).toBe("dezactivat");
  expect(r.puse).toEqual([]);
  expect(r.sarite.every((s: { reason: string }) => s.reason === "dezactivat")).toBe(true);
  expect(await outboxCount()).toBe(before);
});

test("probă: mesajul se construiește (fără să plece), a doua rulare din aceeași zi e deduplicată", async ({ request }) => {
  const before = await outboxCount();
  const first = await (await request.get("/api/cron/rezumat-gospodari?proba=1", { headers: auth() })).json();
  expect(first.mod).toBe("proba");
  const mine = first.puse.find((m: { gospodarie: string }) => m.gospodarie === FARM);
  expect(mine, JSON.stringify(first)).toBeTruthy();
  expect(mine.catre).toBe("…999"); // contactul nu apare complet în răspuns
  expect(mine.text).toContain("Autorizatie DSV (rezumat)"); // SMS fără diacritice
  expect(mine.text).toContain("/cont/gospodar");

  const second = await (await request.get("/api/cron/rezumat-gospodari?proba=1", { headers: auth() })).json();
  expect(second.puse.find((m: { gospodarie: string }) => m.gospodarie === FARM)).toBeUndefined();
  expect(second.sarite).toContainEqual({ farmSlug: FARM, reason: "deja-trimis" });
  expect(await outboxCount()).toBe(before);
});

test("probă simultană: o singură revendicare pe gospodărie / zi", async ({ request }) => {
  // Cheile de probă din testul anterior există deja; 5 apeluri simultane nu au voie să producă niciun mesaj nou.
  const all = await Promise.all(Array.from({ length: 5 }, () => request.get("/api/cron/rezumat-gospodari?proba=1", { headers: auth() }).then((r) => r.json())));
  expect(all.flatMap((r) => r.puse).filter((m: { gospodarie: string }) => m.gospodarie === FARM)).toHaveLength(0);
  const keys = await db.query(`select count(*) from documents where collection = 'digest-log' and id like $1`, [`proba:digest:sms:${FARM}:%`]);
  expect(Number(keys.rows[0].count)).toBe(1);
});
