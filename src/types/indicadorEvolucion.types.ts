// HU-39 (EP-7): tipos de "Evolución de indicadores" — dashboard de
// producción. Espeja EvolucionIndicadoresQueryDto /
// EvolucionIndicadoresResponseDto (optilacteo-backend,
// src/module/dashboard/dto/evolucion-indicadores-{query,response}.dto.ts,
// PR #134 mergeado a develop). GET /dashboard/indicadores/evolucion.
import type { Parametro } from "./configParametro.types";

// Mismo enum que devuelve/acepta el backend (Parametro, en
// config-parametro/enums/parametro.enum.ts) — ya está espejado en
// configParametro.types.ts, así que no se redefine acá. OJO: a diferencia
// del prototipo original de esta HU, NO existe "células somáticas" como
// indicador — el backend solo agrega sobre estos 7.
export type IndicadorEvolucionId = Parametro;

// PeriodoEvolucion (query param "periodo"). "rango" requiere "desde"/"hasta".
export type PeriodoEvolucion = "dia" | "semana" | "mes" | "rango";

// GranularidadAgregacion que el backend efectivamente aplicó
// (evolucion-indicadores-response.dto.ts, campo "granularidadAplicada").
// No hay "hora": periodo="dia" no es una ventana de últimas 24hs sino los
// últimos 30 días con un punto por día (ver resolverRangoEvolucion en
// dashboard.service.ts) — el selector de período que se ve en pantalla no
// es una ventana temporal fija de esa duración, es la granularidad de
// agregación sobre una ventana que decide el backend.
export type GranularidadEvolucion = "dia" | "semana" | "mes";

export type TipoGraficoEvolucion = "linea" | "barras";

// Query params de GET /dashboard/indicadores/evolucion
// (EvolucionIndicadoresQueryDto). "indicadores" viaja como CSV
// (?indicadores=grasa,proteina) — lo arma el service, acá va tipado como
// array. "desde"/"hasta" (YYYY-MM-DD) solo aplican con periodo="rango"; el
// backend responde 400 si periodo="rango" y falta alguno, o si hasta < desde.
export interface EvolucionIndicadoresQuery {
  periodo: PeriodoEvolucion;
  indicadores: IndicadorEvolucionId[];
  desde?: string;
  hasta?: string;
}

// PuntoIndicadorDto. "valor" es null cuando el backend no tuvo mediciones en
// ese período puntual — el punto se manda igual (no se omite), así se puede
// distinguir "sin datos en este punto" de "no hay ningún dato en la serie".
export interface PuntoIndicadorEvolucion {
  fecha: string; // ISO, ya truncada según granularidad
  valor: number | null;
}

// SerieIndicadorDto
export interface SerieIndicadorEvolucion {
  parametro: IndicadorEvolucionId;
  puntos: PuntoIndicadorEvolucion[];
}

// EvolucionIndicadoresResponseDto
export interface EvolucionIndicadoresResponse {
  granularidadAplicada: GranularidadEvolucion;
  desde: string; // ISO datetime
  hasta: string; // ISO datetime
  series: SerieIndicadorEvolucion[];
}

// Metadata de presentación por indicador (label/unidad/color) para el
// selector, la leyenda y el PNG exportado. El backend no manda nada de
// esto — label/unidad deberían coincidir con PARAMETROS_META
// (pages/Configuracion/constants/parametrosCalidad.ts), la fuente de verdad
// ya usada en el resto de la app para estos mismos 7 parámetros; acá solo
// se agrega "color" (no existe en PARAMETROS_META, hace falta para
// distinguir series en el gráfico).
export interface IndicadorEvolucionConfig {
  id: IndicadorEvolucionId;
  label: string;
  unidad: string;
  color: string;
}

// Formato "wide" que consumen EvolucionIndicadoresChart y
// exportarGraficoEvolucionPng: un punto por fecha con el valor de cada
// indicador seleccionado. La respuesta real del backend viene "long" (una
// serie por indicador, con las mismas fechas repetidas entre series porque
// todas comparten el mismo periodosEsperados armado una sola vez por
// consulta) — normalizar de long a wide es responsabilidad del hook, no de
// este tipo, para no tener que tocar chart/export al conectar el back.
export interface PuntoSerieEvolucion {
  timestamp: string;
  etiqueta: string;
  valores: Partial<Record<IndicadorEvolucionId, number>>;
}
