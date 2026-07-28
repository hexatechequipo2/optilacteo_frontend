// Espeja el módulo real de HU-20 en optilacteo-backend
// (src/module/medicion-manual: DTOs, entity), mergeado en develop (PR #66).
import type { Parametro, TipoMateriaPrima } from "./configParametro.types";
import { EstadoLectura } from "./historialMediciones.types";

export interface MedicionManualParametroItem {
  parametro: Parametro;
  valor: number;
}

export interface CreateMedicionManualDto {
  tipoMateriaPrima: TipoMateriaPrima;
  parametros: MedicionManualParametroItem[];
}

// MedicionManualItemResponseDto real: mismo enum de estado que HU-19
// (EstadoMedicion en el backend), reusamos EstadoLectura para no duplicar.
export interface MedicionManualItem {
  id: number;
  parametro: Parametro;
  valor: number;
  estado: EstadoLectura;
  createdAt: string;
}

export interface MedicionManualLoteResponse {
  loteId: number;
  tipoMateriaPrima: TipoMateriaPrima;
  usuarioId: number;
  mediciones: MedicionManualItem[];
}

export interface HistorialMedicionManualFilterQuery {
  fechaInicio?: string;
  fechaFin?: string;
  page?: number;
  limit?: number;
}

// Respuesta plana (sin meta anidada), mismo criterio que HU-19.
export interface HistorialMedicionManualResponse {
  data: MedicionManualItem[];
  total: number;
  page: number;
  limit: number;
}
