// Espeja el catálogo de SKU del backend (src/module/lote: sku.entity.ts,
// dto/create-sku.dto.ts, dto/sku-response.dto.ts), mergeado en develop vía
// feature/ampliacion-carga-SKU (HU-67).
export const UnidadMedidaSku = {
  KG: "kg",
  UNIDADES: "unidades",
} as const;

export type UnidadMedidaSku = (typeof UnidadMedidaSku)[keyof typeof UnidadMedidaSku];

export interface Sku {
  id: number;
  empresaId: number;
  nombre: string;
  unidadMedida: UnidadMedidaSku;
  activo: boolean;
  createdAt: string;
}

export interface CreateSkuDto {
  nombre: string;
  unidadMedida: UnidadMedidaSku;
}
