// Espeja ConfiguracionAlertaDesconexion (optilacteo-backend, HU-31 —
// src/module/notificaciones/entities/configuracion-alerta-desconexion.entity.ts).
// Fila única por empresa (constraint Unique(['empresaId']) en el backend):
// el umbral en minutos que dispara la alerta crítica de "sensor
// desconectado" cuando ningún sensor tiene un umbral propio seteado
// (Sensor.umbralDesconexionMinutos, ver sensor.types.ts).
export interface ConfiguracionAlertaDesconexion {
  id: number;
  empresaId: number;
  umbralMinutos: number;
  createdAt: string;
  updatedAt: string;
}
