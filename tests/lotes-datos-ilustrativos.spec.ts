import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsResponsableCalidad } from "./fixtures/mockAuth.ts";

// D-07: las pantallas de HU-77 (consulta y detalle de trazabilidad) y HU-78
// (destino sugerido por IA) usan datos mock (ver constants/lotes.ts) y
// tienen que mostrar el aviso de datos ilustrativos. No llaman al backend,
// así que acá no se mockea ningún endpoint.

const aviso = (page: Page) =>
  page.getByRole("status").filter({ hasText: "Datos ilustrativos — vista en desarrollo." });

test.describe("D-07 — Aviso de datos ilustrativos en lotes", () => {
  test("se ve en la consulta, el detalle y el destino sugerido", async ({ page }) => {
    await loginAsResponsableCalidad(page);

    await page.goto("/lotes/consulta");
    await expect(page.getByRole("heading", { name: "Lotes de producción" })).toBeVisible();
    await expect(aviso(page)).toBeVisible();

    await page.goto("/lotes/consulta/L-2026-0412");
    await expect(page.getByRole("heading", { name: "L-2026-0412" })).toBeVisible();
    await expect(aviso(page)).toBeVisible();

    await page.goto("/lotes/L-2026-0412/destino-sugerido");
    await expect(
      page.getByRole("heading", { name: "Sugerencia de destino productivo", level: 1 }),
    ).toBeVisible();
    await expect(aviso(page)).toBeVisible();

    await page.goto("/lotes/NO-EXISTE/destino-sugerido");
    await expect(page.getByText('Lote no encontrado: "NO-EXISTE"')).toBeVisible();
    await expect(aviso(page)).toBeVisible();
  });
});
