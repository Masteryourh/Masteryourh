import { expect, test } from "@playwright/test";
import pg from "pg";

/**
 * C5 (#62): lista de precomenzi din Admin e pe pagini (50, cele mai noi întâi), iar totalurile sunt calculate în baza
 * de date pentru TOATE comenzile neanulate. „Înapoi” din detaliile comenzii revine pe aceeași pagină a listei.
 */
const url = process.env.DATABASE_URL;
test.skip(!url, "necesită DATABASE_URL (PostgreSQL)");

test("Admin › Precomenzi: paginare, totaluri complete, întoarcere pe aceeași pagină", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/cont/autentificare?inapoi=/admin");
  await page.fill("input[name=email]", process.env.ADMIN_USER ?? "admin@test.ro");
  await page.fill("input[name=password]", process.env.ADMIN_PASSWORD ?? "Parola12345");
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === "/admin");

  const db = new pg.Client({ connectionString: url });
  await db.connect();
  try {
    // 60 de comenzi vechi (sintetice), create „acum o zi”, ca să fie pe paginile următoare.
    const template = (await db.query(`select data from documents where collection = 'preorders' limit 1`)).rows[0]?.data;
    test.skip(!template, "nicio comandă de pornire în baza de test");
    for (let i = 0; i < 60; i++) {
      const id = `pag-${Date.now()}-${i}`;
      const doc = { ...template, id, number: `PM9001-P${String(i).padStart(4, "0")}`, birds: 1, status: "noua", lotCode: null, parentNumber: undefined, trackingToken: undefined };
      await db.query(`insert into documents (collection, id, data, created_at) values ('preorders', $1, $2, now() - interval '1 day' - ($3 || ' seconds')::interval)`, [id, JSON.stringify(doc), i]);
    }
    const expected = (
      await db.query(`select count(*)::int as n, coalesce(sum((data->>'birds')::int), 0)::int as birds from documents where collection = 'preorders' and coalesce(data->>'status', '') <> 'anulata'`)
    ).rows[0];

    await page.goto("/admin");
    const rows = page.locator("tr[id^=comanda-]");
    await expect(rows).toHaveCount(50);
    // Totalurile acoperă toate comenzile, nu doar pagina afișată.
    await expect(page.getByText("Precomenzi active").locator("..")).toContainText(String(expected.n));
    await expect(page.getByText("Pui comandați").locator("..")).toContainText(String(expected.birds));

    // Parcurgem paginile până la cea mai veche comandă sintetică.
    const seen = new Set<string>();
    for (let guard = 0; guard < 20; guard++) {
      for (const id of await rows.evaluateAll((els) => els.map((e) => e.id))) {
        expect(seen.has(id), `comandă repetată pe pagini: ${id}`).toBe(false);
        seen.add(id);
      }
      if (seen.has("comanda-PM9001-P0059")) break;
      const before = page.url();
      await page.getByRole("link", { name: "Mai vechi →" }).click();
      await page.waitForURL((u) => u.href !== before && u.search.includes("dupa="));
      await page.waitForLoadState("domcontentloaded");
    }
    expect(seen.size).toBe(expected.n + (await db.query(`select count(*)::int as n from documents where collection = 'preorders' and data->>'status' = 'anulata'`)).rows[0].n);

    // Din detaliile unei comenzi de pe o pagină ulterioară, „Înapoi” revine pe aceeași pagină, la rând.
    const listUrl = page.url();
    await page.locator("#comanda-PM9001-P0059 a", { hasText: "PM9001-P0059" }).click();
    await page.waitForURL(/\/admin\/comenzi\/PM9001-P0059/);
    await page.getByRole("link", { name: /Înapoi/ }).first().click();
    await page.waitForURL((u) => u.pathname === "/admin" && u.search === new URL(listUrl).search && u.hash === "#comanda-PM9001-P0059");
    await expect(page.locator("#comanda-PM9001-P0059")).toBeVisible();
  } finally {
    await db.end();
  }
});
