// HU-38 (EP-7 Dashboard y visualización): pantalla de inicio del rol
// "Responsable de producción" (persona "jefe de producción" en el backlog).
// TODO(backend): contrato a confirmar con Hebee — módulo nuevo en
// optilacteo-backend (src/module/dashboard), todavía no mergeado a develop.
// Se asume GET /dashboard/produccion devolviendo esta forma.
export type TendenciaMetrica = "sube" | "baja" | "igual";

export interface MetricaTendencia {
  valor: number;
  // Diferencia respecto al día anterior (puede ser negativa).
  variacion: number;
  tendencia: TendenciaMetrica;
}

export interface PuntoHistoricoLotes {
  fecha: string; // ISO date (yyyy-MM-dd)
  valor: number;
}

export interface DashboardProduccionResponse {
  lotesProcesadosHoy: MetricaTendencia;
  alertasActivas: MetricaTendencia;
  parametrosCriticos: MetricaTendencia;
  lotesUltimos7Dias: PuntoHistoricoLotes[];
  actualizadoEn: string; // ISO datetime
}
