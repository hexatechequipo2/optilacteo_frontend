import axios from "axios";

// Mensaje a mostrar ante un error de la API. Con error de red (sin response) o
// 5xx va el fallback de la pantalla: el message de esos casos es técnico
// ("Internal server error"). Los 4xx traen un mensaje pensado para el usuario
// (validación, 404 de otra empresa, protecciones de rol) y se muestran tal cual.
export function mensajeErrorApi(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) return fallback;
  const status = err.response?.status;
  if (status === undefined || status < 400 || status >= 500) return fallback;
  const message: unknown = err.response?.data?.message;
  if (Array.isArray(message)) {
    const partes = message.filter((m): m is string => typeof m === "string" && m.trim() !== "");
    return partes.length > 0 ? partes.join(" ") : fallback;
  }
  return typeof message === "string" && message.trim() !== "" ? message : fallback;
}
