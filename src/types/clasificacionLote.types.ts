// Tipos para HU-21 (Clasificación automática de lotes).
// El resultado (Apto/No Apto) viaja como Lote.clasificacion (GET /lotes,
// GET /lotes/:id) — ver ClasificacionLote en lote.types.ts. El detalle de
// qué parámetros la determinaron (valor vs umbral) no viene en esa
// respuesta, así que se arma en el cliente cruzando Lote.parametros con
// GET /config-parametros. Ver useClasificacionLote.ts.
import type { Parametro } from "./configParametro.types";
import { EstadoLectura } from "./historialMediciones.types";
import type { ClasificacionLote } from "./lote.types";

export interface ParametroClasificacionDetalle {
  parametro: Parametro;
  valor: number;
  umbralMin: number | null;
  umbralMax: number | null;
  estado: EstadoLectura;
}

export interface ClasificacionAutomaticaLote {
  resultado: ClasificacionLote;
  parametrosUtilizados: ParametroClasificacionDetalle[];
}
