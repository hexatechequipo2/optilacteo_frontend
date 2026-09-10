import { useMemo } from "react";
import {
  MOCK_HISTORIAL_DIAS,
  generarSerieEvolucion,
} from "../utils/mockEvolucionIndicadores";
import type {
  Granularidad,
  IndicadorEvolucionId,
  PeriodoEvolucion,
  PuntoSerieEvolucion,
  TipoGraficoEvolucion,
} from "../types/indicadorEvolucion.types";

export interface RangoPersonalizado {
  desde: string;
  hasta: string;
}

interface UseEvolucionIndicadoresParams {
  periodo: PeriodoEvolucion;
  rangoPersonalizado: RangoPersonalizado;
  indicadoresSeleccionados: IndicadorEvolucionId[];
  tipoGrafico: TipoGraficoEvolucion;
}

interface ResultadoEvolucion {
  puntos: PuntoSerieEvolucion[];
  granularidad: Granularidad;
  agregado: boolean;
  estaVacio: boolean;
  rangoInvalido: boolean;
  sinIndicadores: boolean;
}

const DIA_MS = 86_400_000;

// HU-39 (punto 3 del pendiente post-QA, 2026-09): en Barras, cada indicador
// suma su propia fila de barras por punto — con ~30 puntos y 2 indicadores
// ya son 60 barras finas donde no se lee nada (reportado por Jimena tras
// probarlo en pantalla). El umbral es sobre el TOTAL de barras (puntos x
// indicadores), no solo sobre la cantidad de puntos, porque el problema
// escala con ambos: 6 indicadores lo empeora aunque los puntos sean pocos.
const UMBRAL_BARRAS = 24;

// Tope de escalado: con menos puntos que esto, la agregación deja de sumar
// legibilidad y empieza a romper cosas. En el caso límite de 1 solo punto,
// calcularRangoIndicador ve min=max de ese único valor y arma un rango
// degenerado (min, min+1) — la barra normalizada contra ese rango queda con
// altura 0 en vez de mostrar el dato (ver EvolucionIndicadoresChart.tsx).
// Con 5-6 indicadores en "Mes" el umbral de barras por sí solo escalaba
// hasta granularidad "mes", que en una ventana de ~30 días da 1 punto: el
// gráfico quedaba vacío en vez de más legible. Mejor aceptar un poco de
// amontonamiento que un gráfico roto.
const MINIMO_PUNTOS_BARRAS = 3;

const ORDEN_GRANULARIDAD: Granularidad[] = ["hora", "dia", "semana", "mes"];

function estimarCantidadPuntos(
  desde: Date,
  hasta: Date,
  granularidad: Granularidad,
): number {
  const spanMs = hasta.getTime() - desde.getTime();
  const pasoMs =
    granularidad === "hora"
      ? 60 * 60 * 1000
      : granularidad === "dia"
        ? DIA_MS
        : granularidad === "semana"
          ? DIA_MS * 7
          : DIA_MS * 30;
  return Math.floor(spanMs / pasoMs) + 1;
}

// Reutiliza el mismo mecanismo que ya agregaba por semana/mes en rangos
// personalizados extensos (para preservar rendimiento), generalizado acá
// para disparar también en Barras cuando hay demasiadas barras para leer —
// mismo remedio (granularidad más gruesa), causa distinta.
function escalarGranularidadParaBarras(
  desde: Date,
  hasta: Date,
  granularidadInicial: Granularidad,
  cantidadIndicadores: number,
): { granularidad: Granularidad; escalada: boolean } {
  let indice = ORDEN_GRANULARIDAD.indexOf(granularidadInicial);
  while (indice < ORDEN_GRANULARIDAD.length - 1) {
    const barrasActuales =
      estimarCantidadPuntos(desde, hasta, ORDEN_GRANULARIDAD[indice]) *
      Math.max(cantidadIndicadores, 1);
    if (barrasActuales <= UMBRAL_BARRAS) break;

    const puntosSiguiente = estimarCantidadPuntos(
      desde,
      hasta,
      ORDEN_GRANULARIDAD[indice + 1],
    );
    if (puntosSiguiente < MINIMO_PUNTOS_BARRAS) break;

    indice += 1;
  }
  const granularidad = ORDEN_GRANULARIDAD[indice];
  return { granularidad, escalada: granularidad !== granularidadInicial };
}

// HU-39 (AC2 y prototipo, Pantalla 4): "Mes"/"Semana"/"Día" son ventanas
// relativas a hoy con granularidad fija en Línea; "Rango personalizado"
// agrega por semana o mes cuando el rango es extenso, para preservar el
// rendimiento (criterio de aceptación explícito) en vez de graficar un
// punto por día en un rango de un año. En Barras, cualquier período puede
// además escalar a una granularidad más gruesa vía
// escalarGranularidadParaBarras — ahí el motivo no es rendimiento sino
// legibilidad (demasiadas barras finas por punto).
export function useEvolucionIndicadores({
  periodo,
  rangoPersonalizado,
  indicadoresSeleccionados,
  tipoGrafico,
}: UseEvolucionIndicadoresParams): ResultadoEvolucion {
  return useMemo(() => {
    const ahora = new Date();
    const sinIndicadores = indicadoresSeleccionados.length === 0;

    let desde: Date;
    let hasta: Date;
    let granularidad: Granularidad;
    let agregado = false;

    if (periodo === "rango") {
      if (!rangoPersonalizado.desde || !rangoPersonalizado.hasta) {
        return {
          puntos: [],
          granularidad: "dia",
          agregado: false,
          estaVacio: true,
          rangoInvalido: false,
          sinIndicadores,
        };
      }

      desde = new Date(`${rangoPersonalizado.desde}T00:00:00`);
      hasta = new Date(`${rangoPersonalizado.hasta}T23:59:59`);

      if (hasta < desde) {
        return {
          puntos: [],
          granularidad: "dia",
          agregado: false,
          estaVacio: false,
          rangoInvalido: true,
          sinIndicadores,
        };
      }

      const spanDias = (hasta.getTime() - desde.getTime()) / DIA_MS;
      if (spanDias <= 31) {
        granularidad = "dia";
      } else if (spanDias <= 210) {
        granularidad = "semana";
        agregado = true;
      } else {
        granularidad = "mes";
        agregado = true;
      }
    } else if (periodo === "dia") {
      hasta = ahora;
      desde = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
      granularidad = "hora";
    } else if (periodo === "semana") {
      hasta = ahora;
      desde = new Date(ahora);
      desde.setDate(desde.getDate() - 6);
      desde.setHours(0, 0, 0, 0);
      granularidad = "dia";
    } else {
      hasta = ahora;
      desde = new Date(ahora);
      desde.setDate(desde.getDate() - 29);
      desde.setHours(0, 0, 0, 0);
      granularidad = "dia";
    }

    if (tipoGrafico === "barras" && !sinIndicadores) {
      const escalada = escalarGranularidadParaBarras(
        desde,
        hasta,
        granularidad,
        indicadoresSeleccionados.length,
      );
      granularidad = escalada.granularidad;
      agregado = agregado || escalada.escalada;
    }

    const limiteHistorico = new Date(ahora.getTime() - MOCK_HISTORIAL_DIAS * DIA_MS);
    if (hasta < limiteHistorico || sinIndicadores) {
      return {
        puntos: [],
        granularidad,
        agregado,
        estaVacio: true,
        rangoInvalido: false,
        sinIndicadores,
      };
    }

    const puntos = generarSerieEvolucion(indicadoresSeleccionados, desde, hasta, granularidad);

    return {
      puntos,
      granularidad,
      agregado,
      estaVacio: puntos.length === 0,
      rangoInvalido: false,
      sinIndicadores,
    };
  }, [periodo, rangoPersonalizado, indicadoresSeleccionados, tipoGrafico]);
}
