import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * CG-04: precomenzile trimise simultan nu pot ocupa mai multe locuri decât are lotul.
 * Pregătire: un lot cu un singur țarc (40 de locuri), pus direct în baza de test; apoi 10 precomenzi
 * simultane de câte 8 pui (80 > 40). Rulează doar cu PostgreSQL (DATABASE_URL), ca în CI.
 */
const url = process.env.DATABASE_URL;

async function submit(page: Page, i: number) {
  await page.goto("/precomanda?pui=8");
  await page.selectOption("#zoneId", "ridicare-personala");
  await page.fill("#name", `Client Locuri ${i}`);
  await page.fill("#phone", `0722 100 ${String(100 + i)}`);
  await page.fill("#email", `locuri${i}@test.ro`);
  await page.check("#termsConsent");
  await page.locator("input[type=number]").first().fill("8");
}

test("10 precomenzi simultane pe ultimele locuri → lotul nu e supra-rezervat", async ({ browser }) => {
  test.skip(!url, "necesită DATABASE_URL (PostgreSQL)");
  test.setTimeout(120_000);
  // O primă cerere către server creează tabelul `documents` (dacă baza e nouă).
  await (await (await browser.newContext()).newPage()).goto("/precomanda");
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  const code = `XT-2099-${String(Date.now()).slice(-6)}`;
  const start = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  const lot = {
    id: code, code, farmSlug: "gospodaria-hreniuc", breed: "test", startDate: start, growthDays: 60,
    totalBirds: 40, reservedBirds: 0, feed: "test", processor: "test", pens: 1, createdAt: new Date().toISOString(),
  };
  // Celelalte loturi (din alte rulări) se închid, ca toate precomenzile să țintească același lot.
  await db.query(`update documents set data = data || '{"closed": true}' where collection = 'lots' and id <> $1`, [code]);
  await db.query(`insert into documents (collection, id, data) values ('lots', $1, $2)`, [code, JSON.stringify(lot)]);

  const pages: Page[] = [];
  for (let i = 0; i < 10; i++) {
    const p = await (await browser.newContext()).newPage();
    await submit(p, i);
    pages.push(p);
  }
  await Promise.all(pages.map((p) => p.click("button[type=submit]")));
  await Promise.all(pages.map((p) => expect(p.getByText("Mulțumim").first()).toBeVisible({ timeout: 60_000 })));

  const onLot = async () =>
    (
      await db.query<{ id: string; birds: string }>(
        `select id, data->>'birds' as birds from documents where collection = 'preorders' and data->>'lotCode' = $1 and data->>'status' <> 'anulata'`,
        [code],
      )
    ).rows;
  const ledger = async () =>
    (await db.query<{ data: { allocations: Record<string, number> } }>(`select data from documents where collection = 'lot-seats' and id = $1`, [code]))
      .rows[0]?.data.allocations ?? {};
  const sum = (rows: { birds: string }[]) => rows.reduce((s, r) => s + Number(r.birds), 0);

  const before = await onLot();
  expect(sum(before)).toBe(40); // 5 comenzi × 8 pui: lotul e plin, nu supra-rezervat
  expect(Object.keys(await ledger()).sort()).toEqual(before.map((r) => r.id).sort());

  // Adminul anulează o comandă de pe lot: locurile se eliberează, iar o comandă din așteptare le ia.
  const victim = before[0].id;
  const number = (await db.query<{ n: string }>(`select data->>'number' as n from documents where collection = 'preorders' and id = $1`, [victim])).rows[0].n;
  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/cont/autentificare?inapoi=/admin");
  await admin.fill("input[name=email]", process.env.ADMIN_USER ?? "admin@test.ro");
  await admin.fill("input[name=password]", process.env.ADMIN_PASSWORD ?? "Parola12345");
  await admin.click("button[type=submit]");
  await admin.waitForURL((u) => u.pathname === "/admin");
  const row = admin.locator("tr", { hasText: number });
  await row.locator("select[name=status]").selectOption("anulata");
  await row.locator("button:has-text('Salvează')").click();
  await expect.poll(async () => (await onLot()).some((r) => r.id === victim), { timeout: 15_000 }).toBe(false);
  const after = await onLot();
  expect(sum(after)).toBe(40);
  expect(after.map((r) => r.id).sort()).not.toEqual(before.map((r) => r.id).sort());
  expect(Object.keys(await ledger()).sort()).toEqual(after.map((r) => r.id).sort());
  await db.end();
});
