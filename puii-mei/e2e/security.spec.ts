import { expect, test } from "@playwright/test";

/**
 * V-01 (CLAUDE-VERIFICATION-V1): limita de 5 încercări la PIN-ul clientului trebuie să reziste la cereri simultane.
 * Înainte de reparație: 20 de PIN-uri greșite trimise deodată erau toate evaluate.
 */
test("PIN client: 20 de încercări greșite simultane → cel mult 5 evaluate", async ({ browser }) => {
  test.setTimeout(120_000);
  const client = await (await browser.newContext()).newPage();
  await client.goto("/precomanda?pui=4");
  await client.selectOption("#zoneId", "ridicare-personala");
  await client.fill("#name", "Client Securitate");
  await client.fill("#phone", "0722 000 333");
  await client.fill("#email", "sec@test.ro");
  await client.check("#termsConsent");
  await client.locator("input[type=number]").first().fill("4");
  await client.click("button[type=submit]");
  await expect(client.getByText("Mulțumim").first()).toBeVisible();
  const number = (await client.locator("body").innerText()).match(/PM\d{4}-[A-Z0-9]{5}/)?.[0];
  expect(number).toBeTruthy();

  const N = 20;
  const pages = [];
  for (let i = 0; i < N; i++) {
    const p = await (await browser.newContext()).newPage();
    await p.goto("/comanda");
    await p.fill("#number", number!);
    await p.click("button:has-text('Trimite-mi PIN-ul')");
    await p.waitForSelector("#pin");
    await p.fill("#pin", String(100000 + i));
    pages.push(p);
  }
  await Promise.all(pages.map((p) => p.click("button:has-text('Deschide comanda')")));
  const messages = await Promise.all(
    pages.map(async (p) => {
      // Next.js are și el un element role=alert (gol) pentru anunțarea rutei; ne uităm doar la mesajul formularului.
      const alert = p.getByRole("alert").filter({ hasText: /PIN|Prea multe/ }).first();
      await alert.waitFor({ timeout: 30_000 });
      return alert.innerText();
    }),
  );
  const evaluated = messages.filter((m) => m.includes("PIN greșit")).length;
  const blocked = messages.filter((m) => m.includes("Prea multe")).length;
  expect(evaluated).toBeLessThanOrEqual(5);
  expect(evaluated + blocked).toBe(N);
});

/**
 * NAT (mulți clienți în spatele aceluiași IP, ca la operatorii mobili): pe IP se numără doar PIN-urile greșite,
 * deci 35 de intrări corecte de pe aceeași adresă trec toate (înainte, a 31-a era blocată).
 */
test("35 de verificări corecte de pe același IP nu blochează clienții legitimi", async ({ browser }) => {
  test.skip(!process.env.DATABASE_URL, "necesită DATABASE_URL (PostgreSQL)");
  test.setTimeout(180_000);
  const { default: pg } = await import("pg");
  const client = await (await browser.newContext()).newPage();
  await client.goto("/precomanda?pui=4");
  await client.selectOption("#zoneId", "ridicare-personala");
  await client.fill("#name", "Client NAT");
  await client.fill("#phone", "0722 000 444");
  await client.fill("#email", "nat@test.ro");
  await client.check("#termsConsent");
  await client.locator("input[type=number]").first().fill("4");
  await client.click("button[type=submit]");
  await expect(client.getByText("Mulțumim").first()).toBeVisible();
  const number = (await client.locator("body").innerText()).match(/PM\d{4}-[A-Z0-9]{5}/)?.[0];
  expect(number).toBeTruthy();

  const first = await (await browser.newContext()).newPage();
  await first.goto("/comanda");
  await first.fill("#number", number!);
  await first.click("button:has-text('Trimite-mi PIN-ul')");
  await first.waitForSelector("#pin");
  // Fără SMS configurat, PIN-ul stă la admin (trimitere manuală): îl citim din baza de test.
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const manualPin = async () =>
    (await db.query(`select data->'accessPin'->>'manual' as pin from documents where collection = 'preorders' and data->>'number' = $1`, [number])).rows[0].pin as string | null;
  let pin = (await manualPin())!;
  expect(pin).toMatch(/^\d{6}$/);

  for (let i = 0; i < 35; i++) {
    const p = await (await browser.newContext()).newPage();
    await p.goto("/comanda");
    await p.fill("#number", number!);
    await p.click("button:has-text('Trimite-mi PIN-ul')"); // în fereastra de retrimitere: nu se emite PIN nou
    await p.waitForSelector("#pin");
    pin = (await manualPin()) ?? pin; // după 60 s se emite un PIN nou: îl luăm pe cel curent
    await p.fill("#pin", pin);
    await p.click("button:has-text('Deschide comanda')");
    await p.waitForURL(/\/comanda\/[^/?]{16,}$/, { timeout: 15_000 });
    await p.context().close();
  }
  await db.end();
});
