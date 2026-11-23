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
