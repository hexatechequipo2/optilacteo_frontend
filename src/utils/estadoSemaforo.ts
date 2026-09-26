import { EstadoSemaforo } from "../types/monitoreoSemaforo.types";

const ESTADOS_VALIDOS = new Set<string>(Object.values(EstadoSemaforo));

// El estado lo calcula el backend (SemaforoService, fuente de verdad); acá
// solo se valida el string recibido. Un valor ausente o desconocido se
// muestra como "sin umbral" (gris) en vez de pintarlo verde por defecto.
export function normalizarEstadoSemaforo(estado: string | undefined): EstadoSemaforo {
  return estado && ESTADOS_VALIDOS.has(estado)
    ? (estado as EstadoSemaforo)
    : EstadoSemaforo.SIN_UMBRAL_CONFIGURADO;
}
