// Espeja el módulo real de Ingreso a cámara del backend (src/module/lote:
// ingreso-camara.entity.ts, dto/create-ingreso-camara.dto.ts,
// dto/ingreso-camara-response.dto.ts, dto/ingreso-camara-filter-query.dto.ts),
// mergeado en develop vía feature/ampliacion-carga-SKU (HU-67).
export interface IngresoCamara {
  id: number;
  empresaId: number;
  skuId: number;
  skuNombre?: string;
  cantidad: number;
  loteId?: number | null;
  loteCodigo?: string | null;
  fechaIngreso: string; // ISO datetime
  createdAt: string;
}

// POST /ingresos-camara (CreateIngresoCamaraDto). No lleva `unidad`: se
// infiere del SKU seleccionado (Sku.unidadMedida) del lado del backend.
export interface CreateIngresoCamaraDto {
  skuId: number;
  cantidad: number;
  loteId?: number;
  fechaIngreso: string; // ISO datetime
}

// GET /ingresos-camara (IngresoCamaraFilterQueryDto): skuId es el filtro
// que pide el AC de "historial filtrado por SKU".
export interface IngresoCamaraFilterQuery {
  skuId?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedIngresosCamara {
  data: IngresoCamara[];
  total: number;
  page: number;
  limit: number;
}
