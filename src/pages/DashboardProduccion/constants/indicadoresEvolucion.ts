import { PARAMETROS_META, ORDEN_PARAMETROS } from "../../Configuracion/constants/parametrosCalidad";
import type { IndicadorEvolucionConfig } from "../../../types/indicadorEvolucion.types";

// HU-39: colores por indicador para el selector, la leyenda y las
// líneas/barras del gráfico. No viven en PARAMETROS_META (esa tabla es
// label/unidad/ícono/rango físico, pensada para Configuración, no para
// distinguir series en un gráfico) — acá solo se agrega ese único dato que
// falta. Evitar tonos parecidos entre sí: #d97706 (ámbar) para Acidez se
// descartó en el prototipo original de esta HU por confundirse con el
// naranja de otro indicador (ver historial de EvolucionIndicadoresChart.tsx).
const COLOR_POR_PARAMETRO: Record<IndicadorEvolucionConfig["id"], string> = {
  ph: "#a855f7",
  temperatura: "#dc2626",
  densidad: "#06b6d4",
  grasa: "#2563eb",
  proteina: "#16a34a",
  acidez: "#f97316",
  conductividad: "#db2777",
};

// Catálogo de indicadores del gráfico de evolución — los mismos 7 que
// acepta GET /dashboard/indicadores/evolucion (Parametro, en
// configParametro.types.ts). Label y unidad salen de PARAMETROS_META
// (pages/Configuracion/constants/parametrosCalidad.ts), la fuente de verdad
// ya usada en el resto de la app para estos mismos parámetros — evita tener
// dos listas de labels/unidades por mantener sincronizadas a mano.
export const INDICADORES_EVOLUCION: IndicadorEvolucionConfig[] = ORDEN_PARAMETROS.map(
  (id) => ({
    id,
    label: PARAMETROS_META[id].label,
    unidad: PARAMETROS_META[id].unidad,
    color: COLOR_POR_PARAMETRO[id],
  }),
);

export const INDICADOR_POR_ID = new Map(
  INDICADORES_EVOLUCION.map((indicador) => [indicador.id, indicador]),
);
