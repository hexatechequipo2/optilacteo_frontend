import { defineConfig, devices } from "@playwright/test";

/**
 * Config separado solo para corridas de cobertura:
 *   npx playwright test --config=playwright.coverage.config.ts
 *   npx nyc report
 *
 * Reusa los mismos specs que playwright.config.ts, pero:
 * 1. Buildea con COVERAGE=true (activa vite-plugin-istanbul)
 * 2. Sirve ese build instrumentado con preview
 * 3. Cada test escribe su cobertura a .nyc_output/ vía coverageFixtures.ts
 *    (siempre que el spec importe test/expect desde ese archivo)
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // Reintentos solo en CI: empresas.spec.ts:664 ("no envía campos opcionales
  // vacíos") y usuarios.spec.ts:355 ("crea un usuario enviando el payload
  // correcto") son flakiness residual de timing en la capa de red de
  // Playwright bajo 2 workers en paralelo — investigado y confirmado que NO
  // es un bug de la UI ni del test (payload correcto cuando el mock
  // intercepta; se descartó colisión de rutas, catch-all y excepciones en el
  // handler). En local (sin CI) queda en 0 para no enmascarar fallas reales
  // mientras se desarrolla.
  retries: process.env.CI ? 2 : 0,
  workers: 2, // cobertura no necesita máxima velocidad, priorizamos estabilidad
  reporter: "html",

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },

  webServer: {
    command: "cross-env VITE_COVERAGE=true npm run build && npm run preview -- --port 5173",
    url: "http://localhost:5173",
    reuseExistingServer: false,
    timeout: 120_000,
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});