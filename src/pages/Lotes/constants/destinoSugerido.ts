// HU-78: mock frontend-only de la vista de sugerencia de destino
// productivo por IA. No llama a ningún servicio — simula los 5 resultados
// posibles que describe la HU (éxito con coincidencia exacta, éxito con
// estrategia alternativa, falta de datos, sin histórico suficiente y error
// del servicio) para poder recorrerlos con el botón "Recalcular".

export interface LoteDestinoSugeridoRef {
  codigo: string;
  proveedorNombre: string;
}

export const LOTES_DESTINO_SUGERIDO_MOCK: LoteDestinoSugeridoRef[] = [
  { codigo: "L-2026-0412", proveedorNombre: "Tambo San José" },
  { codigo: "L-2026-0405", proveedorNombre: "Cooperativa Unión Popular" },
  { codigo: "L-2026-0398", proveedorNombre: "Establecimiento La Victoria" },
];

export type EstadoSugerenciaDestino =
  | "exito_exacta"
  | "exito_alternativa"
  | "falta_datos"
  | "sin_historico"
  | "error_servicio";

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
