import { expect, test } from "@playwright/test";
import pg from "pg";

/**
 * /cifre citește read-model-ul (`read-models/cifre`): după afișare, instantaneul precalculat există în baza de date
 * (aceeași funcție `companyMetrics`), iar pagina arată când a fost calculat.
 */
const url = process.env.DATABASE_URL;
test.skip(!url, "necesită DATABASE_URL (PostgreSQL)");

test("pagina /cifre se încarcă din instantaneul precalculat", async ({ page }) => {
  await page.goto("/precomanda"); // o cerere dinamică creează tabelul pe o bază nouă
  await page.goto("/cifre");
  await expect(page.getByRole("heading", { name: "Cifrele noastre" })).toBeVisible();
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  try {
    // Prima afișare poate fi cea generată la build (ISR); instantaneul se scrie la prima regenerare cu baza de date.
    await expect
      .poll(async () => {
        await page.reload();
        return (await db.query(`select data from documents where collection = 'read-models' and id = 'cifre'`)).rows[0]?.data?.computedAt ?? null;
      }, { timeout: 20_000 })
      .not.toBeNull();
    const row = (await db.query(`select data from documents where collection = 'read-models' and id = 'cifre'`)).rows[0].data;
    expect(typeof row.metrics.birdsOrdered).toBe("number");
    expect(Array.isArray(row.metrics.byFarm)).toBe(true);
    await expect(page.getByText(/Calculat:/)).toBeVisible();
  } finally {
    await db.end();
  }
});
