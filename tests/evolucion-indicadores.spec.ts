import { expect, test } from "./fixtures/coverageFixtures.js";
import type { Page } from "@playwright/test";
import { loginAsResponsableCalidad } from "./fixtures/mockAuth.js";

// HU-39 · "Historial de mediciones" en Lotes — gráfico de evolución de
// indicadores de calidad. Mismo patrón de mocks que lotes.spec.ts: LotesPage
// necesita /proveedores, /tambos, /sensores y /lotes resueltos para no
// crashear antes de llegar al tab nuevo.
async function mockLotesDeps(page: Page) {
  await page.route("**/*", async (route) => {
    const rt = route.request().resourceType();
    if (rt === "xhr" || rt === "fetch") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    return route.continue();
  });

  await page.route("**/notificacion*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    });
  });

  await page.route("**/config-param*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.route("**/sensores*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.route("**/proveedores*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 1 } }),
    });
  });

  await page.route("**/tambos*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.route("**/lotes*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0, page: 1, limit: 100 }),
    });
  });
}

test.describe("EvolucionIndicadoresTab (HU-39)", () => {
  test("muestra el gráfico por defecto con 2 indicadores comparados", async ({ page }) => {
    await mockLotesDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await page.getByRole("button", { name: "Historial de mediciones" }).click();

    await expect(page.getByText("Evolución de indicadores")).toBeVisible();
    await expect(page.getByText("2 indicadores comparados")).toBeVisible();
    await expect(page.locator("svg polyline")).toHaveCount(2);
  });

  test("cambia a barras y a período semana sin recargar la página", async ({ page }) => {
    await mockLotesDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");
    await page.getByRole("button", { name: "Historial de mediciones" }).click();

    await page.getByRole("button", { name: "Barras" }).click();
    await page.getByRole("button", { name: "Semana", exact: true }).click();

    await expect(page.locator("svg polyline")).toHaveCount(0);
    await expect(page.locator("svg rect").first()).toBeVisible();
  });

  test("rango personalizado con fecha fin anterior a inicio muestra error", async ({ page }) => {
    await mockLotesDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");
    await page.getByRole("button", { name: "Historial de mediciones" }).click();

    await page.getByRole("button", { name: "Rango personalizado" }).click();
    const fechas = page.locator('input[type="date"]');
    await fechas.nth(0).fill("2026-06-10");
    await fechas.nth(1).fill("2026-06-01");

    await expect(
      page.getByText("La fecha hasta no puede ser anterior a la fecha desde."),
    ).toBeVisible();
  });

  test("deseleccionar todos los indicadores muestra el estado vacío correspondiente", async ({
    page,
  }) => {
    await mockLotesDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");
    await page.getByRole("button", { name: "Historial de mediciones" }).click();

    await page.getByRole("button", { name: "Materia grasa %" }).click();
    await page.getByRole("button", { name: "Proteína %" }).click();

    await expect(page.getByText("Seleccioná al menos un indicador")).toBeVisible();
  });

  test("exportar PNG descarga un archivo", async ({ page }) => {
    await mockLotesDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");
    await page.getByRole("button", { name: "Historial de mediciones" }).click();

    const descargaPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar PNG" }).click();
    const descarga = await descargaPromise;

    expect(descarga.suggestedFilename()).toMatch(/^evolucion-indicadores-\d{4}-\d{2}-\d{2}\.png$/);
  });
});
