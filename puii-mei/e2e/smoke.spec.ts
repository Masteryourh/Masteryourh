import { expect, test, type Page } from "@playwright/test";

const ADMIN_USER = process.env.ADMIN_USER ?? "admin@test.ro";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Parola12345";

async function loginAdmin(page: Page) {
  await page.goto("/cont/autentificare?inapoi=/admin");
  await page.fill("input[name=email]", ADMIN_USER);
  await page.fill("input[name=password]", ADMIN_PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === "/admin");
}

async function preorder(page: Page, name: string, phone: string, birds = 4) {
  await page.goto(`/precomanda?pui=${birds}`);
  await page.selectOption("#zoneId", "ridicare-personala");
  await page.fill("#name", name);
  await page.fill("#phone", phone);
  await page.fill("#email", "e2e@test.ro");
  await page.check("#termsConsent");
  await page.locator("input[type=number]").first().fill(String(birds));
  await page.click("button[type=submit]");
  await expect(page.getByText("Mulțumim").first()).toBeVisible();
  const number = (await page.locator("body").innerText()).match(/PM\d{4}-[A-Z0-9]{5}/)?.[0];
  expect(number).toBeTruthy();
  return number!;
}

test.describe("site public", () => {
  for (const path of ["/", "/cum-functioneaza", "/gospodarii", "/trasabilitate", "/precomanda", "/cifre", "/legislatie", "/comanda", "/in-curand"]) {
    test(`pagina ${path} se încarcă`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("main")).toBeVisible();
    });
  }
});

test.describe("acces", () => {
  test("panoul admin cere autentificare", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/cont\/autentificare/);
  });

  test("parola greșită e respinsă", async ({ page }) => {
    await page.goto("/cont/autentificare");
    await page.fill("input[name=email]", ADMIN_USER);
    await page.fill("input[name=password]", "parola-gresita-123");
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/cont\/autentificare/);
  });

  test("adminul intră în panou", async ({ page }) => {
    await loginAdmin(page);
    await expect(page.getByText("Panou de administrare").first()).toBeVisible();
  });
});

test.describe("comanda clientului", () => {
  test("precomandă → PIN → panoul comenzii, fără linkuri spre site în afară de „Înapoi la site”", async ({ browser }) => {
    const client = await (await browser.newContext()).newPage();
    const number = await preorder(client, "Client E2E", "0722 000 111");

    // Alt dispozitiv: cere PIN, iar adminul îl vede (SMS neconfigurat în CI).
    const other = await (await browser.newContext()).newPage();
    await other.goto("/comanda");
    await other.fill("#number", number);
    await other.click("button:has-text('Trimite-mi PIN-ul')");
    await expect(other.getByText("••• 111")).toBeVisible();

    const admin = await (await browser.newContext()).newPage();
    await loginAdmin(admin);
    const row = await admin.locator("tr", { hasText: number }).innerText();
    const pin = row.match(/neconfigurat\): (\d{6})/)?.[1];
    expect(pin).toBeTruthy();

    await other.fill("#pin", "000000");
    await other.click("button:has-text('Deschide comanda')");
    await expect(other.getByText("PIN greșit")).toBeVisible();
    await other.fill("#pin", pin!);
    await other.click("button:has-text('Deschide comanda')");
    await other.waitForURL(/\/comanda\/[^/?]{16,}$/);
    await expect(other.getByText("Puii mei · Comanda mea").first()).toBeVisible();

    const hrefs = await other.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href") ?? ""));
    const toSite = hrefs.filter((h) => !(h.startsWith("/comanda/") || h.startsWith("/foto/") || h.startsWith("#") || h.startsWith("/confirmare/")));
    expect(toSite).toEqual(["/"]);
  });

  test("linkul comenzii fără PIN trimite la „Comanda mea”", async ({ browser }) => {
    const client = await (await browser.newContext()).newPage();
    await preorder(client, "Client E2E 2", "0722 000 222");
    const link = await client.locator("a[href^='/comanda/']").first().getAttribute("href");
    const stranger = await (await browser.newContext()).newPage();
    await stranger.goto(link!.split("#")[0]);
    await expect(stranger).toHaveURL(/\/comanda\?nr=/);
  });
});
