// HU-78: mock frontend-only de la vista de sugerencia de destino
// productivo por IA. No llama a ningún servicio — simula los 5 resultados
// posibles que describe la HU (éxito con coincidencia exacta, éxito con
// estrategia alternativa, falta de datos, sin histórico suficiente y error
// del servicio) para poder recorrerlos con el botón "Recalcular".

import { ClasificacionLote } from "../../../types/lote.types";
import { construirLotesConsultaMock } from "./consultaLotes";

export type EstadoSugerenciaDestino =
  | "exito_exacta"
  | "exito_alternativa"
  | "falta_datos"
  | "sin_historico"
  | "error_servicio"
  // D-08: lote No Apto — no se genera sugerencia, el destino lo define la
  // revisión de calidad (HU-22). Es el estado que va a devolver el back.
  | "no_aplica";

export interface LoteDestinoSugeridoRef {
  codigo: string;
  proveedorNombre: string;
  // Resultado con el que arranca este lote al elegirlo en el selector —
  // distinto por lote para que el cambio se note (y de paso se puedan ver
  // varios de los 5 resultados posibles sin depender solo de "Recalcular").
  estadoInicial: EstadoSugerenciaDestino;
}

// Solo lotes aptos: 4 lotes para 5 resultados. "error_servicio" se alcanza
// con un "Recalcular" desde L-2026-0409 (sin_historico → error_servicio).
const ESTADO_INICIAL_APTOS: Record<string, EstadoSugerenciaDestino> = {
  "L-2026-0412": "exito_exacta",
  "L-2026-0410": "exito_alternativa",
  "L-2026-0409": "sin_historico",
  "L-2026-0408": "falta_datos",
};

// Clasificación y proveedor salen del mock de HU-77 (única fuente); los No
// Apto quedan en "no_aplica" por D-08.
export const LOTES_DESTINO_SUGERIDO_MOCK: LoteDestinoSugeridoRef[] = construirLotesConsultaMock().map(
  (l) => ({
    codigo: l.codigo,
    proveedorNombre: l.proveedor,
    estadoInicial:
      l.estado === ClasificacionLote.NO_APTO
        ? "no_aplica"
        : (ESTADO_INICIAL_APTOS[l.codigo] ?? "exito_exacta"),
  }),
);

export interface SugerenciaDestinoMock {
  estado: EstadoSugerenciaDestino;
  destinoNombre?: string;
  confianza?: number;
  baseComparacion?: string;
  calculadoEn?: Date;
  versionModelo?: string;
}

// Orden en el que "Recalcular" va mostrando cada resultado, para poder
// probar las 6 pruebas de usuario de la HU-78 con clics sucesivos.
const SECUENCIA_DEMO: EstadoSugerenciaDestino[] = [
  "exito_exacta",
  "exito_alternativa",
  "falta_datos",
  "sin_historico",
  "error_servicio",
];

export function siguienteEstadoDemo(
  actual: EstadoSugerenciaDestino | null,
): EstadoSugerenciaDestino {
  if (!actual) return SECUENCIA_DEMO[0];
  const indice = SECUENCIA_DEMO.indexOf(actual);
  return SECUENCIA_DEMO[(indice + 1) % SECUENCIA_DEMO.length];
}

export function construirSugerencia(
  estado: EstadoSugerenciaDestino,
  ahora: Date = new Date(),
): SugerenciaDestinoMock {
  switch (estado) {
    case "exito_exacta":
      return {
        estado,
        destinoNombre: "Producción — Línea de quesos",
        confianza: 87,
        baseComparacion:
          "Coincidencia exacta de proveedor y tambo. Se compararon 14 lotes históricos con esas mismas características.",
        calculadoEn: ahora,
        versionModelo: "v2.3.1",
      };
    case "exito_alternativa":
      return {
        estado,
        destinoNombre: "Almacenamiento refrigerado",
        confianza: 68,
        baseComparacion:
          "Sin coincidencia exacta de proveedor y tambo. Se aplicó la estrategia alternativa aprobada: lotes del mismo proveedor (6 lotes comparables).",
        calculadoEn: ahora,
        versionModelo: "v2.3.1",
      };
    default:
      return { estado };
  }
}
