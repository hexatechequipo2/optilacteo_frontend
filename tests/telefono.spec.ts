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

test.describe("HU-73 · validarTelefono · bordes", () => {
  const validos = [
    "123456789012345", // 15 dígitos, el máximo
    "1234 5678", // 8 dígitos con separador
    "  3534123456  ", // se valida recortado
    "+54 353 412 34 56 78", // 20 caracteres justos
    "   ", // solo espacios = vacío
  ];
  for (const valido of validos) {
    test(`HU-73 · "${valido}" es válido`, () => {
      expect(validarTelefono(valido)).toBeNull();
    });
  }

  const invalidos: [string, string][] = [
    ["+54 353 412 34 56 789", ERROR_LARGO], // 21 caracteres (el largo se valida antes que los dígitos)
    ["++543534123456", ERROR_CARACTERES], // + repetido
    ["+", ERROR_CARACTERES], // solo el +
    ["(353) 4123456", ERROR_CARACTERES], // paréntesis
    ["353.412.3456", ERROR_CARACTERES], // puntos
  ];
  for (const [invalido, mensaje] of invalidos) {
    test(`HU-73 · "${invalido}" es inválido`, () => {
      expect(validarTelefono(invalido)).toBe(mensaje);
    });
  }
});
