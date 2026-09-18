import type {
  IndicadorEvolucionConfig,
  PuntoSerieEvolucion,
} from "../types/indicadorEvolucion.types";

export interface RangoIndicador {
  min: number;
  max: number;
}

// HU-39: rango real (min–max) de un indicador dentro de los puntos
// mostrados. Se usa para normalizar el eje Y del gráfico (0-100 por
// indicador, cada uno con unidades distintas) y para la leyenda con el rango
// real — antes vivía duplicado en EvolucionIndicadoresChart.tsx y en
// exportarGraficoEvolucionPng.ts, con riesgo de que el PNG y la pantalla
// mostraran rangos distintos si solo se actualizaba uno de los dos.
export function calcularRangoIndicador(
  puntos: PuntoSerieEvolucion[],
  indicador: IndicadorEvolucionConfig,
): RangoIndicador {
  const valores = puntos
    .map((p) => p.valores[indicador.id])
    .filter((v): v is number => v != null);
  const min = valores.length ? Math.min(...valores) : 0;
  const max = valores.length ? Math.max(...valores) : 1;
  return { min, max: max === min ? min + 1 : max };
}
