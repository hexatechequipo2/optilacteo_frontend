// Espeja NotificacionResponseDto (optilacteo-backend, src/module/notificaciones).
// HU-21 (AC4): se crea una fila por cada Responsable de Calidad de la
// empresa cuando un lote se clasifica No Apto, y se emite en tiempo real
// por WS (namespace /notificaciones, evento "notificacion:nueva"). GET
// /notificaciones no tiene @Roles(): cada usuario ve solo las suyas.
export const TipoNotificacion = {
  LOTE_NO_APTO: "lote_no_apto",
} as const;

export type TipoNotificacion = (typeof TipoNotificacion)[keyof typeof TipoNotificacion];

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  mensaje: string;
  data?: Record<string, unknown> | null;
  leida: boolean;
  createdAt: string;
}
