import { devices, expect, test, type Page } from "@playwright/test";

/**
 * Bara „sticlă” (direcția de design aleasă de fondator): restrânsă / extinsă, căutare de pagini, tastatură, preferința
 * păstrată, contrast WCAG AA (axe-core) în modul luminos și întunecat, fără animații la „mișcare redusă”,
 * foaia „Meniu” de pe telefon cu aceleași secțiuni.
 */
const AXE = require.resolve("axe-core/axe.min.js");

async function login(page: Page) {
  await page.goto("/cont/autentificare?inapoi=/admin/azi");
  await page.fill("input[name=email]", process.env.ADMIN_USER ?? "admin@test.ro");
  await page.fill("input[name=password]", process.env.ADMIN_PASSWORD ?? "Parola12345");
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === "/admin/azi");
}

async function contrastViolations(page: Page) {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(async () => {
    // @ts-expect-error axe e injectat în pagină
    const r = await window.axe.run("aside", { runOnly: { type: "rule", values: ["color-contrast"] } });
    return r.violations.flatMap((v: { nodes: { target: string[]; failureSummary: string }[] }) => v.nodes.map((n) => `${n.target.join(" ")}: ${n.failureSummary}`));
  });
}

test("desktop: restrânsă implicit, se extinde, caută, navighează din tastatură și își păstrează starea", async ({ page }) => {
  await login(page);
  const rail = page.locator("aside");
  await expect(rail).toHaveAttribute("data-rail", "restransa");
  // Restrânsă: iconițe cu nume accesibile, fără titluri de grup.
  await expect(rail.getByRole("link", { name: "Livrări live" })).toBeVisible();
  await expect(rail.getByText("Principal", { exact: true })).toHaveCount(0);

  await rail.getByRole("button", { name: "Extinde bara" }).click();
  await expect(rail).toHaveAttribute("data-rail", "extinsa");
  await expect(rail.getByText("Principal", { exact: true })).toBeVisible();
  await expect(rail.getByRole("link", { name: "Astăzi" })).toHaveAttribute("aria-current", "page");

  // Căutarea ignoră diacriticele; Enter deschide primul rezultat.
  const search = rail.getByPlaceholder("Caută pagini");
  await search.fill("livrari");
  await expect(rail.locator("nav a")).toHaveCount(1);
  await search.press("Enter");
  await page.waitForURL((u) => u.pathname === "/admin/livrari");

  // Preferința rămâne după navigare și reîncărcare.
  await page.reload();
  await expect(page.locator("aside")).toHaveAttribute("data-rail", "extinsa");

  // Esc restrânge și întoarce focusul la buton; ⌘K / Ctrl+K o deschide cu cursorul în căutare.
  await page.locator("aside nav a").first().focus();
  await page.keyboard.press("Escape");
  await expect(page.locator("aside")).toHaveAttribute("data-rail", "restransa");
  await expect(page.getByRole("button", { name: "Extinde bara" })).toBeFocused();
  await page.keyboard.press("Control+k");
  await expect(page.locator("aside")).toHaveAttribute("data-rail", "extinsa");
  await expect(page.getByPlaceholder("Caută pagini")).toBeFocused();
});

test("contrast WCAG AA în bara extinsă și restrânsă, mod luminos și întunecat", async ({ page }) => {
  await login(page);
  for (const theme of ["light", "dark"] as const) {
    for (const state of ["restransa", "extinsa"] as const) {
      await page.evaluate(([t, s]) => {
        localStorage.setItem("tema", t);
        localStorage.setItem("panou-bara", s);
      }, [theme, state]);
      await page.reload();
      await expect(page.locator("aside")).toHaveAttribute("data-rail", state);
      expect(await contrastViolations(page), `${theme} / ${state}`).toEqual([]);
    }
  }
});

test("mișcare redusă: bara nu se animă", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
  // Fără tranziție (CSS-ul global pune 0.01 ms la „mișcare redusă”, practic instant).
  expect(parseFloat(await page.locator("aside").evaluate((el) => getComputedStyle(el).transitionDuration))).toBeLessThan(0.001);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { defaultBrowserType, ...iphone } = devices["iPhone 13"];

test.describe("telefon", () => {
  test.use(iphone);
  test("foaia „Meniu”: sticlă, grupuri, căutare; Esc o închide și întoarce focusul", async ({ page }) => {
    await login(page);
    await expect(page.locator("aside")).toBeHidden();
    const menu = page.getByRole("button", { name: "Meniu" });
    await menu.click();
    const sheet = page.getByRole("dialog", { name: "Toate secțiunile" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("Sistem", { exact: true })).toBeVisible();
    // Deschiderea nu pune cursorul în căutare (fără tastatură care acoperă lista).
    await expect(sheet.getByPlaceholder("Caută pagini")).not.toBeFocused();
    await sheet.getByPlaceholder("Caută pagini").fill("mesaje");
    await expect(sheet.locator("a")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(menu).toBeFocused();
  });
});
