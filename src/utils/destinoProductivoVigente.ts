import type { DestinoManualState } from "../types/destinoProductivoManual.types";
import type { DestinoRecomendacionState } from "../types/destinoProductivoRecomendacion.types";

export interface DestinoVigente {
  destinoActualId: number;
  destinoActualNombre: string;
  origen: "manual" | "recomendacion_ml";
  timestamp: string;
}

function ultimoTimestamp(
  historial: { timestamp: string }[],
): string | null {
  return historial.length > 0
    ? historial[historial.length - 1].timestamp
    : null;
}

// HU-34/HU-37: el destino vigente de un lote es el de la fuente (asignación
// manual o resolución de una recomendación ML) cuyo último cambio sea más
// reciente. Antes de separar useDestinoProductivoLote en dos hooks esto
// salía gratis del orden de un único historial combinado; ahora que cada
// origen vive en su propio store, hay que compararlos acá — en el
// componente consumidor, no en los hooks — para no acoplar de nuevo los dos
// orígenes dentro de un hook.
export function calcularDestinoVigente(
  manual: DestinoManualState | null,
  recomendacion: DestinoRecomendacionState | null,
): DestinoVigente | null {
  const tsManual = manual ? ultimoTimestamp(manual.historial) : null;
  const tsRecomendacion = recomendacion
    ? ultimoTimestamp(recomendacion.historial)
    : null;

  if (!tsManual && !tsRecomendacion) return null;

  if (tsManual && (!tsRecomendacion || tsManual >= tsRecomendacion)) {
    return {
      destinoActualId: manual!.destinoActualId,
      destinoActualNombre: manual!.destinoActualNombre,
      origen: "manual",
      timestamp: tsManual,
    };
  }

  return {
    destinoActualId: recomendacion!.destinoActualId,
    destinoActualNombre: recomendacion!.destinoActualNombre,
    origen: "recomendacion_ml",
    timestamp: tsRecomendacion!,
  };
}

// HU-37: "divergencia vigente" es específicamente cuando el último cambio
// registrado en el store de recomendaciones vino de rechazar una
// recomendación ML con un destino distinto (no cualquier asignación manual
// de HU-34) Y esa recomendación rechazada quedó identificada
// (destinoRecomendadoId) Y ninguna asignación manual posterior reemplazó ese
// destino como vigente — si el usuario corrige el destino a mano después de
// una divergencia, la divergencia deja de estar vigente aunque siga en el
// historial de recomendaciones.
export function esDivergenciaVigente(
  manual: DestinoManualState | null,
  recomendacion: DestinoRecomendacionState | null,
): boolean {
  if (!recomendacion || recomendacion.historial.length === 0) return false;
  const ultimo = recomendacion.historial[recomendacion.historial.length - 1];
  if (!ultimo.esDivergencia || ultimo.destinoRecomendadoId == null) return false;

  const vigente = calcularDestinoVigente(manual, recomendacion);
  return vigente?.origen === "recomendacion_ml";
}
