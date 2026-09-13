import { useCallback, useEffect, useRef, useState } from "react";
import {
  evolucionIndicadoresService,
  extraerMensajeError,
} from "../services/evolucionIndicadores.service";
import type {
  EvolucionIndicadoresQuery,
  GranularidadEvolucion,
  IndicadorEvolucionId,
  PeriodoEvolucion,
  PuntoSerieEvolucion,
  SerieIndicadorEvolucion,
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
  granularidad: GranularidadEvolucion;
  agregado: boolean;
  isLoading: boolean;
  error: string | null;
  estaVacio: boolean;
  sinIndicadores: boolean;
  refetch: () => Promise<void>;
}

// El backend nombra cada punto distinto según granularidad
// (formatearPeriodoEvolucion en dashboard.service.ts): "YYYY-MM-DD" para
// día/semana, pero solo "YYYY-MM" (sin día) para mes. Se arma la fecha con
// Date.UTC a mano — pasar la clave cruda por `new Date(fecha)` +
// toLocaleDateString sin fijar timeZone corre la fecha un día para atrás en
// cualquier huso al oeste de UTC (Argentina incluida): mismo tipo de trampa
// que los timestamps del backend (ver memoria de bug conocido).
function parsearFechaPeriodo(fecha: string): Date {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia || 1));
}

function formatearEtiqueta(fecha: string, granularidad: GranularidadEvolucion): string {
  const d = parsearFechaPeriodo(fecha);
  if (granularidad === "mes") {
    return d.toLocaleDateString("es-AR", { month: "short", year: "2-digit", timeZone: "UTC" });
  }
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", timeZone: "UTC" });
}

// GET /dashboard/indicadores/evolucion devuelve la respuesta "long" (una
// serie por indicador). EvolucionIndicadoresChart y
// exportarGraficoEvolucionPng esperan "wide" (un punto por fecha con el
// valor de cada indicador) — se arma acá indexando por la fecha real de
// cada punto (no por posición de índice): aunque hoy el backend arma
// periodosEsperados una sola vez por consulta y lo reusa en las N series
// (así que en la práctica vienen alineadas), indexar por índice asumiría
// eso silenciosamente y desalinearía todo el gráfico si alguna vez dejara
// de cumplirse.
function normalizarAWide(
  series: SerieIndicadorEvolucion[],
  granularidad: GranularidadEvolucion,
): PuntoSerieEvolucion[] {
  const fechas = new Set<string>();
  const valoresPorIndicador = new Map<IndicadorEvolucionId, Map<string, number | null>>();

  for (const serie of series) {
    const porFecha = new Map<string, number | null>();
    for (const punto of serie.puntos) {
      fechas.add(punto.fecha);
      porFecha.set(punto.fecha, punto.valor);
    }
    valoresPorIndicador.set(serie.parametro, porFecha);
  }

  return Array.from(fechas)
    .sort()
    .map((fecha) => {
      const valores: PuntoSerieEvolucion["valores"] = {};
      for (const [indicadorId, porFecha] of valoresPorIndicador) {
        const valor = porFecha.get(fecha);
        if (valor != null) valores[indicadorId] = valor;
      }
      return {
        timestamp: fecha,
        etiqueta: formatearEtiqueta(fecha, granularidad),
        valores,
      };
    });
}

// HU-39 (EP-7): conecta con GET /dashboard/indicadores/evolucion (ver
// evolucionIndicadores.service.ts). Antes esto era un useMemo puro sobre
// datos mock generados client-side; ahora es fetch real, así que ya no hay
// nada que calcular del lado del front: el backend decide desde/hasta y
// granularidadAplicada — acá solo se dispara la consulta y se normaliza la
// respuesta. Por eso también desaparece toda la lógica de
// escalarGranularidadParaBarras/UMBRAL_BARRAS que tenía la versión mock
// (era un ajuste de legibilidad puramente client-side sobre datos
// sintéticos continuos; con datos reales y granularidad fija por el
// backend, "línea" vs "barras" es solo una forma de dibujar los mismos
// puntos, no cambia qué se pide).
export function useEvolucionIndicadores({
  periodo,
  rangoPersonalizado,
  indicadoresSeleccionados,
}: UseEvolucionIndicadoresParams): ResultadoEvolucion {
  const [puntos, setPuntos] = useState<PuntoSerieEvolucion[]>([]);
  const [granularidad, setGranularidad] = useState<GranularidadEvolucion>("mes");
  const [agregado, setAgregado] = useState(false);
  const [estaVacio, setEstaVacio] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sinIndicadores = indicadoresSeleccionados.length === 0;
  // "rango" necesita las dos fechas completas antes de disparar el
  // request — evita pegarle al backend mientras el usuario todavía está
  // eligiendo. Si están completas pero son inválidas (hasta < desde), NO se
  // frena acá: se manda igual y el 400 real del backend es el mensaje que
  // termina viendo el usuario (criterio de prueba de HU-39 — antes esto se
  // validaba client-side con un mensaje fijo, sin llegar a pegarle al back).
  const rangoIncompleto =
    periodo === "rango" && (!rangoPersonalizado.desde || !rangoPersonalizado.hasta);

  // Descarta respuestas que llegan tarde y fuera de orden (p.ej. el usuario
  // cambia de período dos veces seguido y la primera request, más lenta,
  // responde después que la segunda) — sin esto, AC2/AC3 ("cambiar de
  // período/indicador actualiza sin romper") podría mostrarle al usuario un
  // gráfico correspondiente a una selección anterior.
  const ultimaRequestIdRef = useRef(0);

  const cargar = useCallback(async () => {
    const requestId = ++ultimaRequestIdRef.current;

    if (sinIndicadores || rangoIncompleto) {
      setPuntos([]);
      setEstaVacio(false);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const query: EvolucionIndicadoresQuery = {
        periodo,
        indicadores: indicadoresSeleccionados,
        ...(periodo === "rango"
          ? { desde: rangoPersonalizado.desde, hasta: rangoPersonalizado.hasta }
          : {}),
      };
      const response = await evolucionIndicadoresService.getEvolucion(query);
      if (ultimaRequestIdRef.current !== requestId) return;

      // "Sin datos" = ningún indicador pedido tuvo un solo valor no-null en
      // todo el período (no se omiten los puntos sin mediciones, el backend
      // los manda igual con valor:null — ver PuntoIndicadorEvolucion). Los
      // huecos parciales dentro de una serie con al menos un dato real NO
      // caen acá: se pasan tal cual a normalizarAWide.
      const sinDatos = response.series.every((serie) =>
        serie.puntos.every((punto) => punto.valor === null),
      );

      setGranularidad(response.granularidadAplicada);
      // Solo tiene sentido avisar "se agregó para que se pueda leer" en
      // rango personalizado: con período fijo (día/semana/mes) la
      // granularidad aplicada siempre coincide con el período pedido (ver
      // resolverGranularidadAgregacion en dashboard.service.ts).
      setAgregado(periodo === "rango" && response.granularidadAplicada !== "dia");
      setEstaVacio(sinDatos);
      setPuntos(
        sinDatos ? [] : normalizarAWide(response.series, response.granularidadAplicada),
      );
    } catch (err) {
      if (ultimaRequestIdRef.current !== requestId) return;
      setPuntos([]);
      setEstaVacio(false);
      setError(extraerMensajeError(err, "No se pudo cargar la evolución de indicadores."));
    } finally {
      if (ultimaRequestIdRef.current === requestId) setIsLoading(false);
    }
  }, [periodo, indicadoresSeleccionados, rangoPersonalizado, sinIndicadores, rangoIncompleto]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return {
    puntos,
    granularidad,
    agregado,
    isLoading,
    error,
    estaVacio,
    sinIndicadores,
    refetch: cargar,
  };
}
