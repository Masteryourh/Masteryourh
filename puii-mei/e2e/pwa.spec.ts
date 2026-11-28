import { expect, test } from "@playwright/test";

/**
 * Instalarea ca aplicație: manifest valid, iconițe accesibile, Chrome nu raportează erori de instalabilitate,
 * și NU există service worker (nicio dată din cont păstrată pe telefon, nicio scriere offline).
 */
test("manifestul e valid și iconițele se încarcă", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m).toMatchObject({ name: "Puii mei", display: "standalone", scope: "/", lang: "ro" });
  expect(m.start_url.startsWith("/cont")).toBe(true);
  const sizes = m.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`);
  expect(sizes).toEqual(expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"]));
  for (const i of m.icons) {
    const icon = await request.get(i.src);
    expect(icon.ok(), i.src).toBe(true);
    expect(icon.headers()["content-type"]).toContain("image/png");
  }
  expect((await request.get("/pwa/apple-touch-icon.png")).ok()).toBe(true);
});

test("Chrome: pagina e instalabilă și nu are service worker", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "verificarea de instalabilitate e specifică Chrome");
  await page.goto("/cont/autentificare");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest\.webmanifest/);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  // „not-from-secure-origin” nu apare pe localhost; orice altă eroare înseamnă manifest / iconițe greșite.
  expect(installabilityErrors.map((e: { errorId: string }) => e.errorId)).toEqual([]);
  expect(await page.evaluate(async () => (navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0))).toBe(0);
});
