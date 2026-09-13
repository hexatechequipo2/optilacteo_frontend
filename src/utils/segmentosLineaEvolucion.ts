import type {
  IndicadorEvolucionConfig,
  PuntoSerieEvolucion,
} from "../types/indicadorEvolucion.types";

export interface PuntoSegmentoLinea {
  indice: number;
  valor: number;
}

// HU-39 (fix post-conexión con backend real): el backend rellena con
// valor:null los períodos sin mediciones a propósito — "para que el
// frontend pueda distinguir el estado vacío" (ver PuntoIndicadorEvolucion,
// evolucion-indicadores-response.dto.ts). Con el mock viejo esto nunca se
// ejercitaba porque el generador sintético jamás producía null, así que la
// línea se armaba filtrando los puntos null y conectando directo el punto
// válido anterior con el siguiente. Con datos reales eso dibuja una recta
// "puente" sobre un hueco de mediciones, indistinguible de una tendencia
// real — se pierde justo la señal que el backend mandó a propósito.
//
// Acá se parte la serie en corridas contiguas de puntos válidos (se corta
// en cada null) para que cada corrida se dibuje como su propio trazo, sin
// conectar entre sí. Vive en un util compartido (no duplicado en
// EvolucionIndicadoresChart.tsx y exportarGraficoEvolucionPng.ts) por el
// mismo motivo que calcularRangoIndicador (indicadorEvolucionRango.ts):
// pantalla y PNG no pueden mostrar el hueco distinto, o el PNG exportado
// termina mintiendo algo que la pantalla no dice.
export function armarSegmentosLinea(
  puntos: PuntoSerieEvolucion[],
  indicador: IndicadorEvolucionConfig,
): PuntoSegmentoLinea[][] {
  const segmentos: PuntoSegmentoLinea[][] = [];
  let actual: PuntoSegmentoLinea[] = [];

  puntos.forEach((punto, indice) => {
    const valor = punto.valores[indicador.id];
    if (valor == null) {
      if (actual.length > 0) segmentos.push(actual);
      actual = [];
      return;
    }
    actual.push({ indice, valor });
  });

  if (actual.length > 0) segmentos.push(actual);
  return segmentos;
}
