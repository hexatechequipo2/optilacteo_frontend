import type { EstadoFilaEstabilidad } from "../../../hooks/useEstabilidadProveedores";
import type {
  ClasificacionEstabilidad,
  EstabilidadProveedor,
  Proveedor,
} from "../../../types/proveedor.types";

// HU-64: funciones puras que traducen el bloque `estabilidad` de
// GET /proveedores/:id (ver useEstabilidadProveedores) a lo que muestra la
// columna Estabilidad. El cálculo real vive en el backend; acá no se
// calcula nada, solo se mapea.

// Default si el backend no manda minimoLotes (viene null en status "ok").
export const MINIMO_LOTES_ESTABILIDAD = 5;

export type EstadoEstabilidad =
  | ClasificacionEstabilidad
  | "sin_datos"
  | "no_aplica"
  | "cargando"
  | "no_disponible";

export interface EstabilidadVista {
  estado: EstadoEstabilidad;
  // Solo para "estable" | "moderada" | "inestable".
  desvioPorcentaje?: number;
  // Solo para "sin_datos" con status "insufficient_data".
  lotesFaltantes?: number;
}

export const ESTABILIDAD_META: Record<
  EstadoEstabilidad,
  { label: string; variant: "success" | "warning" | "danger" | "neutral" }
> = {
  estable: { label: "Estable", variant: "success" },
  moderada: { label: "Moderada", variant: "warning" },
  inestable: { label: "Inestable", variant: "danger" },
  sin_datos: { label: "Sin datos suficientes", variant: "neutral" },
  no_aplica: { label: "No aplica", variant: "neutral" },
  cargando: { label: "Cargando…", variant: "neutral" },
  // La request falló (403, 500, red): no se afirma nada sobre el proveedor.
  no_disponible: { label: "No disponible", variant: "neutral" },
};

const CLASIFICACIONES: ReadonlySet<string> = new Set<ClasificacionEstabilidad>([
  "estable",
  "moderada",
  "inestable",
]);

// Respuesta real -> vista. Sin bloque, clasificación null o desconocida ->
// "Sin datos suficientes".
export function mapearEstabilidad(
  estabilidad: EstabilidadProveedor | undefined,
): EstabilidadVista {
  if (!estabilidad) return { estado: "sin_datos" };

  if (estabilidad.status === "insufficient_data") {
    const minimo = estabilidad.minimoLotes ?? MINIMO_LOTES_ESTABILIDAD;
    const faltantes = minimo - estabilidad.cantidadLotes;
    return {
      estado: "sin_datos",
      ...(faltantes > 0 && { lotesFaltantes: faltantes }),
    };
  }

  const { clasificacion, score } = estabilidad;
  if (!clasificacion || !CLASIFICACIONES.has(clasificacion)) {
    return { estado: "sin_datos" };
  }
  return {
    estado: clasificacion,
    ...(score != null && { desvioPorcentaje: score * 100 }),
  };
}

// AC1/AC4: la estabilidad de "materia prima" solo aplica a Tambo — el resto
// de los tipos no entrega materia prima con parámetros medibles, y para
// ellos ni se llama al backend.
export function estabilidadVista(
  proveedor: Proveedor,
  fila: EstadoFilaEstabilidad | undefined,
): EstabilidadVista {
  if (proveedor.tipo !== "tambo") return { estado: "no_aplica" };
  // undefined = primer render, antes de que el hook arranque el fetch.
  if (!fila || fila.status === "loading") return { estado: "cargando" };
  if (fila.status === "error") return { estado: "no_disponible" };
  return mapearEstabilidad(fila.estabilidad);
}

// Orden de "confiabilidad" (Pantalla 5: "permite ordenarlos y priorizar los
// más confiables"). Solo las filas clasificadas se invierten con la
// dirección; el resto queda siempre al final en este orden: sin datos,
// cargando / no disponible, no aplica.
const RANGO: Record<EstadoEstabilidad, number> = {
  estable: 0,
  moderada: 1,
  inestable: 2,
  sin_datos: 3,
  cargando: 4,
  no_disponible: 4,
  no_aplica: 5,
};
const MAX_RANGO_CLASIFICADO = 2;

export function compararEstabilidad(
  a: EstabilidadVista,
  b: EstabilidadVista,
  direccion: "asc" | "desc",
): number {
  const ra = RANGO[a.estado];
  const rb = RANGO[b.estado];
  if (ra > MAX_RANGO_CLASIFICADO || rb > MAX_RANGO_CLASIFICADO) return ra - rb;
  // Misma clasificación: desempata por % de desvío (menor = más confiable).
  const diff = ra - rb || (a.desvioPorcentaje ?? 0) - (b.desvioPorcentaje ?? 0);
  return direccion === "asc" ? diff : -diff;
}
