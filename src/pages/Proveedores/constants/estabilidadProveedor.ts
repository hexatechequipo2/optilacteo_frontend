import type { Proveedor } from "../../../types/proveedor.types";

// HU-64 (Sprint 5, mock visual): "Clasificación de proveedores por
// estabilidad de características". A pedido explícito de la tarea, sin
// conexión a backend todavía (no está desarrollado para esta fecha): acá no
// hay ningún cálculo real de desvío de parámetros por lote, solo un valor
// determinístico por proveedor (mismo id -> mismo resultado siempre, para
// que la pantalla no "parpadee" entre renders) que imita la forma que
// tendría el dato real. Cuando el backend calcule el desvío real por
// proveedor (AC1, sobre el historial de lotes), esto se reemplaza por un
// hook conectado — mismo patrón ya aplicado en HU-40/HU-43/HU-45 de este
// proyecto.

export const MINIMO_LOTES_ESTABILIDAD = 5;

export type EstadoEstabilidad = "estable" | "variable" | "inestable" | "sin_datos" | "no_aplica";

export interface EstabilidadProveedor {
  estado: EstadoEstabilidad;
  // Solo tiene sentido para "estable" | "variable" | "inestable".
  desvioPorcentaje?: number;
  // Solo tiene sentido para "sin_datos".
  lotesFaltantes?: number;
  lotesHistoricos?: number;
}

export const ESTABILIDAD_META: Record<
  EstadoEstabilidad,
  { label: string; variant: "success" | "warning" | "danger" | "neutral" }
> = {
  estable: { label: "Estable", variant: "success" },
  variable: { label: "Variable", variant: "warning" },
  inestable: { label: "Inestable", variant: "danger" },
  sin_datos: { label: "Sin datos suficientes", variant: "neutral" },
  no_aplica: { label: "No aplica", variant: "neutral" },
};

// AC1/AC4: la estabilidad de "materia prima" solo tiene sentido para
// proveedores de tipo Tambo — Transporte/Insumos/Laboratorio no entregan
// materia prima con parámetros de calidad medibles (ver TipoProveedor).
function esProveedorConMateriaPrima(proveedor: Proveedor): boolean {
  return proveedor.tipo === "tambo";
}

// Hash liviano y determinístico sobre el id del proveedor — mismo criterio
// que otros mocks de este proyecto (ver generarReporteTrazabilidadPdf.ts en
// HU-45): no es un cálculo real, solo evita que el valor cambie en cada
// render/refetch mientras no haya backend.
function pseudoAleatorio(semilla: number): number {
  const x = Math.sin(semilla * 999.77) * 10000;
  return x - Math.floor(x);
}

export function calcularEstabilidadMock(proveedor: Proveedor): EstabilidadProveedor {
  if (!esProveedorConMateriaPrima(proveedor)) {
    return { estado: "no_aplica" };
  }

  const lotesHistoricos = Math.floor(pseudoAleatorio(proveedor.id) * 14);

  if (lotesHistoricos < MINIMO_LOTES_ESTABILIDAD) {
    return {
      estado: "sin_datos",
      lotesHistoricos,
      lotesFaltantes: MINIMO_LOTES_ESTABILIDAD - lotesHistoricos,
    };
  }

  const desvioPorcentaje = Math.round(pseudoAleatorio(proveedor.id + 0.5) * 200) / 10;
  const estado: EstadoEstabilidad =
    desvioPorcentaje < 3 ? "estable" : desvioPorcentaje <= 10 ? "variable" : "inestable";

  return { estado, desvioPorcentaje, lotesHistoricos };
}

// Orden de "confiabilidad" para el sort de la columna (AC de Pantalla 5:
// "permite ordenarlos y priorizar los más confiables") — de más a menos
// confiable. Sin datos / no aplica quedan siempre al final, sin importar la
// dirección del sort, porque no hay nada que priorizar ahí.
export const ORDEN_CONFIABILIDAD: Record<EstadoEstabilidad, number> = {
  estable: 0,
  variable: 1,
  inestable: 2,
  sin_datos: 3,
  no_aplica: 3,
};
