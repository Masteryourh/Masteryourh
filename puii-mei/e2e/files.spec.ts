import { expect, test, type Browser } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";

/**
 * Fișierele (documente și poze) în stocarea externă S3 compatibilă (în teste: e2e/fake-s3.mjs, care verifică
 * semnătura AWS SigV4). Rulează doar când serverul are FILES_S3_* și o bază PostgreSQL, ca în CI.
 */
const url = process.env.DATABASE_URL;
const S3 = process.env.FILES_S3_ENDPOINT;
const BUCKET = process.env.FILES_S3_BUCKET;
test.describe.configure({ mode: "serial" });
test.skip(!url || !S3 || !BUCKET, "necesită DATABASE_URL și FILES_S3_* (stocare externă de test)");

let db: pg.Client;
const PDF = Buffer.from("%PDF-1.4\n% document de test Puii mei\n1 0 obj <<>> endobj\ntrailer <<>>\n%%EOF\n");

test.beforeAll(async ({ browser }) => {
  // O primă cerere către server creează tabelul `documents` (dacă baza e nouă).
  await (await (await browser.newContext()).newPage()).goto("/precomanda");
  db = new pg.Client({ connectionString: url });
  await db.connect();
});
test.afterAll(async () => db?.end());

const objects = async (): Promise<string[]> => (await fetch(`${S3}/__debug/list`)).json();
const row = async (collection: string, id: string) =>
  (await db.query(`select data from documents where collection = $1 and id = $2`, [collection, id])).rows[0]?.data;

async function admin(browser: Browser) {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/cont/autentificare?inapoi=/admin");
  await page.fill("input[name=email]", process.env.ADMIN_USER ?? "admin@test.ro");
  await page.fill("input[name=password]", process.env.ADMIN_PASSWORD ?? "Parola12345");
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === "/admin");
  return page;
}

test("documentul încărcat ajunge în stocarea externă, nu în baza de date, și se descarcă identic", async ({ browser }) => {
  const a = await admin(browser);
  await a.goto("/cont/gospodar?gospodarie=gospodaria-bodnar");
  const form = a.locator("form", { has: a.locator("input[name=declaredM2]") });
  await form.locator("input[name=declaredM2]").fill("900");
  await form.locator("input[name=file]").setInputFiles({ name: "act-teren.pdf", mimeType: "application/pdf", buffer: PDF });
  await form.locator("button:has-text('Trimite spre confirmare')").click();
  await a.waitForLoadState("networkidle");

  const doc = (await db.query(`select data from documents where collection = 'documents' and data->>'farmSlug' = 'gospodaria-bodnar' order by created_at desc limit 1`)).rows[0].data;
  const file = await row("files", doc.fileId);
  expect(file.data ?? null).toBeNull(); // conținutul NU e în baza de date
  expect(file.blobKey).toBe(`files/${file.id}`);
  expect(await objects()).toContain(`${BUCKET}/files/${file.id}`);

  const res = await a.request.get(`/fisiere/${doc.id}`);
  expect(res.status()).toBe(200);
  expect(Buffer.from(await res.body()).equals(PDF)).toBe(true);
  expect(res.headers()["x-document-sha256"]).toBe(file.sha256);

  // Fără sesiune: refuzat (fișierul nu are adresă publică).
  const anon = await (await browser.newContext()).request.get(`/fisiere/${doc.id}`);
  expect(anon.status()).toBe(401);

  // Fișier modificat în stocare: nu se mai servește (amprenta SHA-256 nu corespunde).
  await fetch(`${S3}/__debug/obj/${BUCKET}/files/${file.id}`, { method: "PUT", body: "continut schimbat" });
  expect((await a.request.get(`/fisiere/${doc.id}`)).status()).toBe(502);
});

test("fișierele vechi din baza de date se mută în stocarea externă și rămân identice", async ({ browser }) => {
  // Un document și o poză „vechi”, salvate ca base64 în baza de date (cum erau înainte).
  const fileId = randomUUID();
  const docId = randomUUID();
  const photoId = randomUUID();
  const sha = (await import("node:crypto")).createHash("sha256").update(PDF).digest("hex");
  await db.query(`insert into documents (collection, id, data) values ('files', $1, $2)`, [
    fileId,
    JSON.stringify({ id: fileId, name: "vechi.pdf", mime: "application/pdf", size: PDF.length, sha256: sha, data: PDF.toString("base64"), uploadedAt: new Date().toISOString(), uploadedBy: "test" }),
  ]);
  await db.query(`insert into documents (collection, id, data) values ('documents', $1, $2)`, [
    docId,
    JSON.stringify({ id: docId, farmSlug: "gospodaria-bodnar", category: "altele", title: "Document vechi", date: "2026-11-01", fileId, fileName: "vechi.pdf", mime: "application/pdf", size: PDF.length, sha256: sha, uploadedBy: "test", uploadedAt: new Date().toISOString() }),
  ]);
  await db.query(`insert into documents (collection, id, data) values ('photos', $1, $2)`, [
    photoId,
    JSON.stringify({ id: photoId, mime: "image/png", data: Buffer.from("png-de-test").toString("base64"), at: new Date().toISOString(), owner: "tour:test" }),
  ]);

  const a = await admin(browser);
  await a.goto("/admin/documente");
  await expect(a.getByText("Încă în baza de date")).toBeVisible();
  await a.locator("button:has-text('Mută următoarele 25 de fișiere')").click();
  await a.waitForURL(/mutate=/);

  const f = await row("files", fileId);
  const p = await row("photos", photoId);
  expect(f.data ?? null).toBeNull();
  expect(f.blobKey).toBe(`files/${fileId}`);
  expect(p.data ?? null).toBeNull();
  expect(p.blobKey).toBe(`photos/${photoId}`);
  expect(p.sha256).toMatch(/^[0-9a-f]{64}$/); // amprenta adăugată la mutare
  const res = await a.request.get(`/fisiere/${docId}`);
  expect(res.status()).toBe(200);
  expect(Buffer.from(await res.body()).equals(PDF)).toBe(true);

  // A doua rulare nu mai mută nimic (idempotent).
  await a.goto("/admin/documente");
  await expect(a.getByText("Încă în baza de date: 0")).toBeVisible();
});
