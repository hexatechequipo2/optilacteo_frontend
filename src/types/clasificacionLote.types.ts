// Tipos para HU-21 (Clasificación automática de lotes).
// El backend todavía no expone un endpoint dedicado de clasificación
// (persistencia con fecha/hora + notificaciones a Responsable de Calidad):
// el equipo de backend lo está armando en paralelo. Mientras tanto, el
// resultado se calcula en el cliente a partir de los parámetros ya
// registrados en el lote (Lote.parametros) y los umbrales configurados
// (ConfigParametro, GET /config-parametros). Ver useClasificacionLote.ts.
import type { Parametro } from "./configParametro.types";
import { EstadoLectura } from "./historialMediciones.types";

export enum ResultadoClasificacion {
  APTO = "apto",
  NO_APTO = "no_apto",
  EN_REVISION = "en_revision",
}

export interface ParametroClasificacionDetalle {
  parametro: Parametro;
  valor: number;
  umbralMin: number | null;
  umbralMax: number | null;
  estado: EstadoLectura;
}

// Nombre distinto del enum ClasificacionLote de lote.types.ts (esa es la
// clasificación de calidad de producto — primera/segunda/tercera/rechazado
// — que se carga a mano en el alta del lote; esto es el resultado de HU-21).
export interface ClasificacionAutomaticaLote {
  resultado: ResultadoClasificacion;
  parametrosUtilizados: ParametroClasificacionDetalle[];
  // Placeholder hasta que el backend persista el cálculo: ver comentario
  // en useClasificacionLote.ts.
  fecha: string;
}
