// HU-66: espeja GET /lotes/proveedor/:proveedorId/desvios en
// optilacteo-backend (feature/desvio-proveedor). El backend calcula el
// desvío al leer, no lo persiste: ((real - comprometido) / comprometido) *
// 100, redondeado a 2 decimales. Solo incluye lotes con
// cantidadComprometidaKg cargado (lotes sin remito no aparecen acá).
import { Parametro } from "./configParametro.types";

export interface DesvioProveedorParametro {
  parametro: Parametro;
  valorComprometido: number;
  valorReal: number;
  desvioPorcentaje: number;
}

export interface DesvioProveedorLote {
  loteId: number;
  codigo: string;
  fechaIngreso: string;
  cantidadComprometidaKg: number;
  cantidadReal: number;
  desvioCantidadPorcentaje: number;
  parametros: DesvioProveedorParametro[];
}
