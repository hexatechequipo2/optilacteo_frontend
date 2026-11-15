import axios from "axios";

const MENSAJE_UN_MINUTO = "Demasiados intentos. Esperá un minuto y volvé a intentar.";

// 429 del ThrottlerGuard (login, request-password-reset, reset-password). El body
// es un string ("ThrottlerException: Too Many Requests"), así que no se usa.
// Retry-After viene en segundos, pero el navegador solo lo deja leer si el back lo
// expone por CORS. TODO(backend): exposedHeaders: ['Retry-After'] en main.ts.
// Sin el header se asume un minuto, que es el ttl de los tres endpoints.
export function mensajeDemasiadosIntentos(retryAfter: unknown): string {
  const segundos = Math.ceil(Number(retryAfter));
  if (!Number.isFinite(segundos) || segundos <= 0 || segundos === 60) return MENSAJE_UN_MINUTO;
  const espera =
    segundos < 60
      ? `${segundos} ${segundos === 1 ? "segundo" : "segundos"}`
      : `${Math.ceil(segundos / 60)} minutos`;
  return `Demasiados intentos. Esperá ${espera} y volvé a intentar.`;
}

// Mensaje a mostrar ante un error de la API. Con error de red (sin response) o
// 5xx va el fallback de la pantalla: el message de esos casos es técnico
// ("Internal server error"). Los 4xx traen un mensaje pensado para el usuario
// (validación, 404 de otra empresa, protecciones de rol) y se muestran tal cual.
export function mensajeErrorApi(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) return fallback;
  const status = err.response?.status;
  if (status === 429) return mensajeDemasiadosIntentos(err.response?.headers?.["retry-after"]);
  if (status === undefined || status < 400 || status >= 500) return fallback;
  const message: unknown = err.response?.data?.message;
  if (Array.isArray(message)) {
    const partes = message.filter((m): m is string => typeof m === "string" && m.trim() !== "");
    return partes.length > 0 ? partes.join(" ") : fallback;
  }
  return typeof message === "string" && message.trim() !== "" ? message : fallback;
}
