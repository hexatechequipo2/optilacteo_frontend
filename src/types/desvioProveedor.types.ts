// HU-66: espeja GET /lotes/proveedor/:proveedorId/desvios en
// optilacteo-backend (feature/desvio-proveedor). El backend calcula el
// desvío al leer, no lo persiste: ((real - comprometido) / comprometido) *
// 100, redondeado a 2 decimales. Solo incluye lotes con
// cantidadComprometidaKg cargado (lotes sin remito no aparecen acá).
import { Parametro } from "./configParametro.types";

// HU-51: espeja UnidadCantidad del backend (src/module/lote/enums/unidad-cantidad.enum.ts).
export type UnidadCantidadDesvio = "litros" | "kilogramos";

export interface DesvioProveedorParametro {
  parametro: Parametro;
  valorComprometido: number;
  valorReal: number;
  desvioPorcentaje: number | null;
}

export interface DesvioProveedorLote {
  loteId: number;
  codigo: string;
  fechaIngreso: string;
  // Siempre en kilogramos (remito del proveedor).
  cantidadComprometidaKg: number | null;
  cantidadReal: number | null;
  unidadCantidadReal: UnidadCantidadDesvio | null;
  // Null si cantidadReal no está en kilogramos (HU-51), si falta alguna
  // cantidad o si el comprometido es 0.
  desvioCantidadPorcentaje: number | null;
  parametros: DesvioProveedorParametro[];
}
