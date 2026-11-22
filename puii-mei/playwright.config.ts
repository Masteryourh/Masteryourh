import { defineConfig, devices } from "@playwright/test";

/**
 * Teste E2E de bază (smoke). Rulează pe un server deja pornit (`npm start`), cu baza de date de test.
 * BASE_URL (implicit http://localhost:3005), ADMIN_USER / ADMIN_PASSWORD ale serverului de test.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3005",
    trace: "off",
    ...devices["Desktop Chrome"],
  },
});
