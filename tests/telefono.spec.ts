import { test, expect } from "@playwright/test";
import { validarTelefono } from "../src/utils/telefono.ts";

/**
 * HU-73 / D-06: tests de la regla pura, sin navegador. El uso en el
 * formulario de proveedores está en proveedores.spec.ts.
 */
const ERROR_CARACTERES =
  "El teléfono solo puede tener números, espacios, guiones y un + al inicio";
const ERROR_DIGITOS = "El teléfono debe tener entre 8 y 15 dígitos";
const ERROR_LARGO = "El teléfono no puede tener más de 20 caracteres";

test.describe("validarTelefono", () => {
  for (const valido of ["+54 353 412-3456", "3534123456", "12345678", ""]) {
    test(`"${valido}" es válido`, () => {
      expect(validarTelefono(valido)).toBeNull();
    });
  }

  const invalidos: [string, string][] = [
    ["1234567", ERROR_DIGITOS],
    ["1234567890123456", ERROR_DIGITOS],
    ["353-abc-1234", ERROR_CARACTERES],
    ["54+3534123456", ERROR_CARACTERES],
    ["+54 9 3534 12-3456-78", ERROR_LARGO],
  ];
  for (const [invalido, mensaje] of invalidos) {
    test(`"${invalido}" es inválido`, () => {
      expect(validarTelefono(invalido)).toBe(mensaje);
    });
  }
});
