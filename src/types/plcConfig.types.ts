// HU-61: espeja GET/PUT /plc-config y POST /plc-config/test-connection en
// optilacteo-backend (module/plc-config). Configuración singleton por
// empresa (multi-tenant resuelto server-side vía @CurrentEmpresa() / JWT,
// sin id explícito en las rutas).
//
// Gap menor (backend): la entity PlcConfig tiene updatedAt, pero
// PlcConfigResponseDto no lo expone — por eso esta pantalla no puede mostrar
// una fecha de "última modificación" persistida y auditable (quién/cuándo),
// como sí existe en Lotes/Proveedores/Sensores. Hoy "ultimoCambio" en
// PlcGatewayConfigTab.tsx es solo el timestamp local del guardado de esta
// sesión, no un dato leído del backend. Si se necesita esa auditoría más
// adelante, falta sumar el campo en PlcConfigResponseDto/PlcConfigMapper.
export interface PlcConfig {
  url: string | null;
  requierePlc: boolean;
}

export interface UpdatePlcConfigDto {
  url: string;
}

export interface TestConnectionDto {
  url: string;
}

export interface TestConnectionResult {
  ok: boolean;
  mensaje: string;
}
