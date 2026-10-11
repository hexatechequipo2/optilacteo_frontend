import { defineConfig, devices } from "@playwright/test";
import type { CoverageOptions } from "./tests/fixtures/coverageFixtures.ts";
import { TEST_API_URL } from "./tests/fixtures/backendDeTest.ts";

// Puerto propio, distinto del 5173 de dev/suite normal: así nunca se reusa
// un vite sin instrumentar, y --strictPort hace fallar la corrida si está
// ocupado en vez de mudarse a otro puerto.
const PORT = 5180;

/**
 * Config separado solo para corridas de cobertura: `npm run test:coverage`.
 *
 * Reusa los mismos specs que playwright.config.ts, pero:
 * 1. Buildea con VITE_COVERAGE=true (activa vite-plugin-istanbul) en
 *    dist-coverage/, sin pisar el dist/ de la suite normal
 * 2. Sirve ese build instrumentado con preview en el puerto PORT
 * 3. Con `collectCoverage: true`, coverageFixtures.ts escribe la cobertura
 *    de cada documento a .nyc_output/ y falla el test si una página de la
 *    app no está instrumentada
 */
export default defineConfig<CoverageOptions>({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2, // cobertura no necesita máxima velocidad, priorizamos estabilidad
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    collectCoverage: true,
  },

  webServer: {
    command: `cross-env VITE_COVERAGE=true vite build --outDir dist-coverage && vite preview --outDir dist-coverage --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    // Ver tests/fixtures/backendDeTest.ts. Pisa el VITE_API_URL del .env.
    env: { VITE_API_URL: TEST_API_URL },
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});