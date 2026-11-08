import { test, expect } from "@playwright/test";
import {
  interpretarComandoVoz,
  normalizarTextoComando,
} from "../src/utils/comandoVoz.ts";

/**
 * HU-56: tests de la regla pura, sin navegador. El uso en la confirmación
 * verbal está en medicion-manual.spec.ts.
 */
test.describe("normalizarTextoComando", () => {
  test("pasa a minúsculas, saca acentos y puntuación", () => {
    expect(normalizarTextoComando("  ¡Confirmó, CORRECTO!  ")).toBe(
      "confirmo correcto",
    );
  });
});

test.describe("interpretarComandoVoz", () => {
  const casos: [string, ReturnType<typeof interpretarComandoVoz>][] = [
    ["confirmar", "confirmar"],
    ["Confirmo.", "confirmar"],
    ["¡Correcto!", "confirmar"],
    ["eh, confirmar", "confirmar"],
    ["CANCELAR", "cancelar"],
    ["cancelo", "cancelar"],
    // Sinónimos descartados a propósito.
    ["sí", null],
    ["ok", null],
    ["dale", null],
    ["no", null],
    // Ambiguos.
    ["confirmar cancelar", null],
    ["no confirmo", null],
    ["no es correcto", null],
    // Sin comando o palabra parecida.
    ["", null],
    ["ph seis coma ocho", null],
    ["confirmarlo", null],
  ];
  for (const [texto, esperado] of casos) {
    test(`"${texto}" → ${esperado}`, () => {
      expect(interpretarComandoVoz(texto)).toBe(esperado);
    });
  }
});
