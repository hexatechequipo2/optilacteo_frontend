// Espeja HU-68 en optilacteo-backend (src/module/lote:
// lote-consumo.service.ts, dto/create-lote-consumo(.parametro).dto.ts,
// dto/lote-consumo-response.dto.ts). No hay flag de "requiere nuevo
// análisis": el backend lo infiere contando consumos previos de ese lote de
// ingreso (cantidadConsumosPrevios === 0), así que el frontend replica el
// mismo criterio (ver useConsumosLote / TrazabilidadLoteModal).
import type { Parametro } from "./configParametro.types";

export interface LoteConsumoParametro {
  parametro: Parametro;
  valor: number;
}

// POST /lotes/:id/consumos. `parametros` es opcional en el payload porque el
// backend lo exige u optional según el historial (primer consumo del lote
// de ingreso vs. uso posterior del remanente), no según un campo fijo del DTO.
export interface CreateLoteConsumoDto {
  loteProduccionId?: number;
  cantidad: number;
  parametros?: LoteConsumoParametro[];
}

// Respuesta de POST y de cada item de GET /lotes/:id/consumos.
export interface LoteConsumo {
  id: number;
  loteIngresoId: number;
  loteProduccionId: number;
  loteProduccionCodigo: string;
  cantidad: number;
  usuarioId: number;
  parametros: LoteConsumoParametro[];
  createdAt: string;
}

// GET /lotes/producciones: selector de lote de producción destino existente.
export interface LoteProduccion {
  id: number;
  codigo: string;
  createdAt: string;
}
