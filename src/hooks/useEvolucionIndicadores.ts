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
} from "../types/indicadorEvolucion.types";

export interface RangoPersonalizado {
  desde: string;
  hasta: string;
}

interface UseEvolucionIndicadoresParams {
  periodo: PeriodoEvolucion;
  rangoPersonalizado: RangoPersonalizado;
  indicadoresSeleccionados: IndicadorEvolucionId[];
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

// HU-39 (AC2 y prototipo, Pantalla 4): "Mes"/"Semana"/"Día" son ventanas
// relativas a hoy con granularidad fija; "Rango personalizado" agrega por
// semana o mes cuando el rango es extenso, para preservar el rendimiento
// (criterio de aceptación explícito) en vez de graficar un punto por día en
// un rango de un año.
export function useEvolucionIndicadores({
  periodo,
  rangoPersonalizado,
  indicadoresSeleccionados,
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
  }, [periodo, rangoPersonalizado, indicadoresSeleccionados]);
}
