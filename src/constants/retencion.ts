// HU-48 (AC4): mientras el backend no genere los avisos de "registro próximo
// a vencer" como notificaciones reales, useNotificaciones mergea avisos
// calculados localmente (useAvisosRetencionMock) en la campanita del header.
//
// TODO(backend): cuando el backend emita estas notificaciones (GET
// /notificaciones + WS /notificaciones, tipo "retencion_proximo_vencimiento",
// destinatario Gerente), poner este flag en false y borrar
// useAvisosRetencionMock.ts junto con las dos líneas que lo usan en
// useNotificaciones.ts.
export const RETENCION_AVISOS_MOCK = true;
