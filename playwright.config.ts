import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  // Con "dev" muchos workers saturaban el compilador de Vite. Con preview
  // (build estático) esto es menos necesario, pero lo dejamos moderado.
  workers: process.env.CI ? 1 : 4,
  reporter: "html",

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  // Levanta el server de Vite automáticamente antes de correr los tests.
  // Usamos build+preview en vez de "dev": sirve archivos ya compilados,
  // evitando que Vite compile módulos "on demand" bajo carga con varios
  // workers en paralelo (causa típica de timeouts esperando que cargue
  // la página con múltiples workers).
  webServer: {
    command: "npm run build && npm run preview -- --port 5173",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Descomentar cuando quieran correr en más navegadores:
    // { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});