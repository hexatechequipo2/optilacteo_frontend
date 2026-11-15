import { test, expect } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import { mensajeErrorApi } from "../src/utils/mensajeErrorApi.ts";

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
