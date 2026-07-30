// HU-23: espeja GET/PATCH /config-parametros/comparacion-historica en
// optilacteo-backend. Configuración singleton por empresa usada por la HU-24
// (ver comparacionHistorica.types.ts) para marcar desvíos.
export interface ConfigComparacionHistorica {
  desvioSignificativoPorcentaje: number;
  cantidadRegistrosHistoricos: number;
}

export interface UpdateConfigComparacionHistoricaDto {
  desvioSignificativoPorcentaje?: number;
  cantidadRegistrosHistoricos?: number;
}
