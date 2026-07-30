// HU-38 (EP-7 Dashboard y visualización): pantalla de inicio del rol
// "Responsable de producción" (persona "jefe de producción" en el backlog).
// Espeja DashboardResponseDto / DashboardHistoricoDto (optilacteo-backend,
// src/module/dashboard), mergeado en develop (PR #71).
export type TendenciaMetrica = "sube" | "baja" | "igual";

export interface MetricaTendencia {
  valor: number;
  valorAnterior: number;
  variacion: number;
  tendencia: TendenciaMetrica;
}

// Números planos — el backend no manda texto descriptivo por etapa, se arma
// en el componente (ver LineaCalidadPanel.tsx).
export interface LineaCalidadResumen {
  recepcion: number;
  clasificacion: number;
  noAptos: number;
  aptos: number;
  totalLotesSistema: number;
}

export interface DashboardResumenResponse {
  lotesProcesados: MetricaTendencia;
  alertasActivas: MetricaTendencia;
  parametrosCriticos: MetricaTendencia;
  lineaCalidad: LineaCalidadResumen;
  actualizadoEn: string; // ISO datetime
}

export interface PuntoHistoricoLotes {
  fecha: string; // ISO date (yyyy-MM-dd)
  lotesProcesados: number;
}

export interface DashboardHistoricoResponse {
  dias: number;
  puntos: PuntoHistoricoLotes[];
}
