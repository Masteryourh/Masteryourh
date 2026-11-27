import { devices, expect, test } from "@playwright/test";

/**
 * Admin › Astăzi (coada „Necesită atenția ta” + cifrele zilei) și navigarea de telefon ca într-o aplicație (bara de jos
 * + „Meniu”). Datele vin din rulările anterioare ale suitei; testul verifică structura și legăturile, nu cifre fixe.
 */
async function login(page: import("@playwright/test").Page) {
  await page.goto("/cont/autentificare?inapoi=/admin/azi");
  await page.fill("input[name=email]", process.env.ADMIN_USER ?? "admin@test.ro");
  await page.fill("input[name=password]", process.env.ADMIN_PASSWORD ?? "Parola12345");
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === "/admin/azi");
}

test("desktop: Astăzi arată cifrele zilei și coada; fiecare element duce în Admin", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Astăzi", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Necesită atenția ta" })).toBeVisible();
  const kpis = page.getByRole("region", { name: "Cifrele zilei" });
  for (const k of ["Precomenzi noi", "Precomenzi active", "Loturi în lucru", "Livrări azi"]) await expect(kpis.getByText(k, { exact: true })).toBeVisible();
  const hrefs = await page.locator("[data-today='coada'] a").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  for (const h of hrefs) expect(h.startsWith("/admin"), `legătură în afara Admin: ${h}`).toBe(true);
  // Pe desktop: bara laterală, fără bara de jos.
  await expect(page.getByRole("button", { name: "Meniu" })).toBeHidden();
});

// Telefonul fără `defaultBrowserType` (care ar cere alt worker): dimensiune, touch, user agent.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { defaultBrowserType, ...iphone } = devices["iPhone 13"];

test.describe("telefon", () => {
  test.use(iphone);
  test("bara de jos ca într-o aplicație: taburi + Meniu cu toate secțiunile; fără „Înapoi” pe ecranul principal", async ({ page }) => {
    await login(page);
    const bar = page.locator("nav").filter({ has: page.getByRole("button", { name: "Meniu" }) });
    await expect(bar).toBeVisible();
    for (const t of ["Astăzi", "Comenzi", "Loturi", "Livrări"]) await expect(bar.getByRole("link", { name: new RegExp(t) })).toBeVisible();
    await expect(bar.getByRole("link", { name: /Astăzi/ })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText(/Înapoi la/)).toHaveCount(0);
    // Bara laterală cu iconițe e ascunsă pe telefon.
    await expect(page.locator("aside")).toBeHidden();

    await bar.getByRole("button", { name: "Meniu" }).click();
    const sheet = page.getByRole("dialog", { name: "Toate secțiunile" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("link", { name: /Mesaje netrimise/ }).click();
    await page.waitForURL((u) => u.pathname === "/admin/mesaje");
    await expect(page.getByRole("dialog", { name: "Toate secțiunile" })).toHaveCount(0); // se închide la navigare
    // Un tabel lat nu lărgește pagina (altfel bara de jos iese din ecran).
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && window.innerWidth < 500)).toBe(true);

    await bar.getByRole("link", { name: /Loturi/ }).click();
    await page.waitForURL((u) => u.pathname === "/admin/loturi");
    await expect(bar.getByRole("link", { name: /Loturi/ })).toHaveAttribute("aria-current", "page");
  });
});
