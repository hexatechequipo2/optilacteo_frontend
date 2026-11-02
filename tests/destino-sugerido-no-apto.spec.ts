import { test, expect } from "./fixtures/coverageFixtures.ts";
import { loginAsResponsableCalidad } from "./fixtures/mockAuth.ts";

// D-08 (HU-78): los lotes No Apto no reciben sugerencia de destino por IA;
// el destino lo define la revisión de calidad. HU-78 es mock (ver
// constants/lotes.ts), así que no se mockea ningún endpoint. Se entra por el
// ítem del Sidebar: el detalle de HU-77 ya es de lotes de producción y no
// tiene el botón.

test.describe("D-08 — Sin sugerencia de destino para lotes No Apto", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsResponsableCalidad(page);
  });

  test("por URL directa, un lote No Apto muestra el estado informativo sin Aceptar destino", async ({
    page,
  }) => {
    await page.goto("/lotes/L-2026-0411/destino-sugerido");
    await expect(
      page.getByText(
        "Este lote está clasificado como No Apto. Su destino se define en la revisión de calidad, no mediante sugerencias de IA.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Aceptar destino" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Recalcular" })).toHaveCount(0);
  });

  test("el ítem del Sidebar abre el primer lote apto con Aceptar destino", async ({ page }) => {
    await page.goto("/lotes/consulta");
    await page.getByRole("complementary").getByRole("button", { name: "Destino sugerido (IA)" }).click();
    await expect(page).toHaveURL(/\/lotes\/L-2026-0412\/destino-sugerido$/);
    await expect(page.getByLabel("Lote")).toHaveValue("L-2026-0412");
    await expect(page.getByText("Producción — Línea de quesos")).toBeVisible();
    await expect(page.getByRole("button", { name: "Aceptar destino" })).toBeVisible();
  });
});
