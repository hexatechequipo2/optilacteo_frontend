import { test, expect } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import { mensajeDemasiadosIntentos, mensajeErrorApi } from "../src/utils/mensajeErrorApi.ts";

/**
 * Tests de la regla pura, sin navegador: 5xx y red caída muestran el fallback
 * de la pantalla; los 4xx, el mensaje del backend.
 */
const FALLBACK = "No se pudo cargar. Intentá nuevamente.";

function errorHttp(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(`Request failed with status code ${status}`, undefined, config, null, {
    status,
    statusText: "",
    headers: {},
    config,
    data,
  });
}

test.describe("mensajeErrorApi", () => {
  test("red caída (sin response) devuelve el fallback", () => {
    const err = new AxiosError("Network Error", AxiosError.ERR_NETWORK);
    expect(mensajeErrorApi(err, FALLBACK)).toBe(FALLBACK);
  });

  test("500 no expone el mensaje técnico", () => {
    const err = errorHttp(500, { statusCode: 500, message: "Internal server error" });
    expect(mensajeErrorApi(err, FALLBACK)).toBe(FALLBACK);
  });

  test("503 devuelve el fallback", () => {
    const err = errorHttp(503, { message: "Service Unavailable" });
    expect(mensajeErrorApi(err, FALLBACK)).toBe(FALLBACK);
  });

  test("400 con message string devuelve el mensaje del backend", () => {
    const err = errorHttp(400, { message: "La fecha de ingreso no es válida" });
    expect(mensajeErrorApi(err, FALLBACK)).toBe("La fecha de ingreso no es válida");
  });

  test("400 con message array los une con un espacio", () => {
    const err = errorHttp(400, {
      message: ["nombre must be shorter than 60 characters", "permisos must be an array"],
    });
    expect(mensajeErrorApi(err, FALLBACK)).toBe(
      "nombre must be shorter than 60 characters permisos must be an array",
    );
  });

  test("404 devuelve el mensaje del backend", () => {
    const err = errorHttp(404, { statusCode: 404, message: "Proveedor 99 no encontrado" });
    expect(mensajeErrorApi(err, FALLBACK)).toBe("Proveedor 99 no encontrado");
  });
});

// ---------------------------------------------------------------------------
// Transversal · Mensajes de error 5xx (PR #161) y rate limit 429 (PR #167)
// ---------------------------------------------------------------------------

function error429(retryAfter?: string): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("Request failed with status code 429", undefined, config, null, {
    status: 429,
    statusText: "",
    headers: retryAfter === undefined ? {} : { "retry-after": retryAfter },
    config,
    data: "ThrottlerException: Too Many Requests",
  });
}

test.describe("Transversal · mensajeErrorApi: bordes", () => {
  test("Transversal · un error que no es de axios devuelve el fallback", () => {
    expect(mensajeErrorApi(new Error("boom"), FALLBACK)).toBe(FALLBACK);
    expect(mensajeErrorApi("texto", FALLBACK)).toBe(FALLBACK);
  });

  test("Transversal · un 4xx con message vacío o solo espacios devuelve el fallback", () => {
    expect(mensajeErrorApi(errorHttp(400, { message: "   " }), FALLBACK)).toBe(FALLBACK);
    expect(mensajeErrorApi(errorHttp(400, {}), FALLBACK)).toBe(FALLBACK);
  });

  test("Transversal · un array de mensajes ignora los vacíos y los que no son texto", () => {
    expect(mensajeErrorApi(errorHttp(400, { message: ["", "  ", 3, null] }), FALLBACK)).toBe(FALLBACK);
    expect(mensajeErrorApi(errorHttp(400, { message: ["a es obligatorio", 3, "b es inválido"] }), FALLBACK)).toBe(
      "a es obligatorio b es inválido",
    );
  });

  test("Transversal · un 401 y un 403 muestran el mensaje del backend", () => {
    expect(mensajeErrorApi(errorHttp(401, { message: "Credenciales inválidas" }), FALLBACK)).toBe("Credenciales inválidas");
    expect(mensajeErrorApi(errorHttp(403, { message: "Sin permiso" }), FALLBACK)).toBe("Sin permiso");
  });

  test("Transversal · un 502 con message igual devuelve el fallback", () => {
    expect(mensajeErrorApi(errorHttp(502, { message: "Bad Gateway" }), FALLBACK)).toBe(FALLBACK);
  });
});

test.describe("Transversal · rate limit 429", () => {
  test("Transversal · sin Retry-After pide esperar un minuto e ignora el body", () => {
    expect(mensajeErrorApi(error429(), FALLBACK)).toBe("Demasiados intentos. Esperá un minuto y volvé a intentar.");
  });

  const casos: [string, string][] = [
    ["1", "Demasiados intentos. Esperá 1 segundo y volvé a intentar."],
    ["30", "Demasiados intentos. Esperá 30 segundos y volvé a intentar."],
    ["59.2", "Demasiados intentos. Esperá un minuto y volvé a intentar."], // redondea a 60,
    ["60", "Demasiados intentos. Esperá un minuto y volvé a intentar."],
    ["61", "Demasiados intentos. Esperá 2 minutos y volvé a intentar."],
    ["300", "Demasiados intentos. Esperá 5 minutos y volvé a intentar."],
    ["0", "Demasiados intentos. Esperá un minuto y volvé a intentar."],
    ["-5", "Demasiados intentos. Esperá un minuto y volvé a intentar."],
    ["abc", "Demasiados intentos. Esperá un minuto y volvé a intentar."],
  ];
  for (const [retryAfter, esperado] of casos) {
    test(`Transversal · Retry-After "${retryAfter}" → ${esperado}`, () => {
      expect(mensajeErrorApi(error429(retryAfter), FALLBACK)).toBe(esperado);
      expect(mensajeDemasiadosIntentos(retryAfter)).toBe(esperado);
    });
  }
});
