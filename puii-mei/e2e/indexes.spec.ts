import { expect, test } from "@playwright/test";
import pg from "pg";

/**
 * Pasul 1 din review-ul de scalare (#62): căutările directe folosesc indexuri, nu citesc toată colecția.
 * Verifică pe baza reală (PostgreSQL) că indexurile există și că planul interogării le poate folosi.
 */
const url = process.env.DATABASE_URL;
test.skip(!url, "necesită DATABASE_URL (PostgreSQL)");

test("indexurile pentru căutările directe există și sunt folosite", async ({ page }) => {
  await page.goto("/precomanda"); // prima cerere creează tabelele și indexurile
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  try {
    const names = (await db.query<{ indexname: string }>(`select indexname from pg_indexes where tablename = 'documents'`)).rows.map((r) => r.indexname);
    for (const n of ["docs_preorders_number", "docs_preorders_lotcode", "docs_users_email", "docs_parcels_clienttoken", "docs_growth_log_lotcode"]) {
      expect(names).toContain(n);
    }
    // Planul depinde de volum: pe un tabel aproape gol orice index „merge”. Simulăm volumul (în tranzacție, anulat la final).
    await db.query("begin");
    await db.query(`insert into documents (collection, id, data) select 'preorders', 'idx-test-' || g, jsonb_build_object('number', 'PM9999-' || g) from generate_series(1, 20000) g`);
    await db.query("analyze documents");
    const plan = (
      await db.query<{ "QUERY PLAN": string }>(
        `explain select data from documents where collection = 'preorders' and (data->>'number') = any($1::text[]) order by created_at`,
        [["PM0000-XXXXX"]],
      )
    ).rows.map((r) => r["QUERY PLAN"]).join("\n");
    await db.query("rollback");
    expect(plan).toContain("docs_preorders_number");
  } finally {
    await db.end();
  }
});

test("Admin › Diagnostic tehnic: măsoară latența reală la baza de date", async ({ page }) => {
  await page.goto("/cont/autentificare?inapoi=/admin/diagnostic");
  await page.fill("input[name=email]", process.env.ADMIN_USER ?? "admin@test.ro");
  await page.fill("input[name=password]", process.env.ADMIN_PASSWORD ?? "Parola12345");
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === "/admin/diagnostic");
  const p50 = Number(await page.locator("[data-rtt-p50]").getAttribute("data-rtt-p50"));
  expect(p50).toBeGreaterThan(0);
  expect(p50).toBeLessThan(1000);
  await expect(page.getByText("Rândul relevant din benchmark-ul de scriere")).toBeVisible();
  await expect(page.getByText("Comandă după număr (index)")).toBeVisible();
});
