import { test, expect } from "./fixtures/coverageFixtures.ts";
import { loginAsResponsableCalidad } from "./fixtures/mockAuth.ts";

// D-08 (HU-78): los lotes No Apto no reciben sugerencia de destino por IA;
// el destino lo define la revisión de calidad. Las pantallas de HU-77/78 son
// mock (ver constants/lotes.ts), así que no se mockea ningún endpoint.

const BOTON_DESTINO = "Ver destino sugerido (IA)";

test.describe("D-08 — Sin sugerencia de destino para lotes No Apto", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsResponsableCalidad(page);
  });

  test("el detalle de un lote No Apto no muestra el botón de destino sugerido", async ({ page }) => {
    await page.goto("/lotes/consulta/L-2026-0411");
    await expect(page.getByRole("heading", { name: "L-2026-0411" })).toBeVisible();
    await expect(page.getByRole("button", { name: BOTON_DESTINO })).toHaveCount(0);
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

  test("el detalle de un lote apto muestra el botón y abre su sugerencia", async ({ page }) => {
    await page.goto("/lotes/consulta/L-2026-0412");
    await page.getByRole("button", { name: BOTON_DESTINO }).click();

    await expect(page).toHaveURL(/\/lotes\/L-2026-0412\/destino-sugerido$/);
    await expect(page.getByLabel("Lote")).toHaveValue("L-2026-0412");
    await expect(page.getByText("Producción — Línea de quesos")).toBeVisible();
    await expect(page.getByRole("button", { name: "Aceptar destino" })).toBeVisible();
  });
});
