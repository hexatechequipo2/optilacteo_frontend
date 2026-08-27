// Espeja ConfiguracionNotificacionNivel (optilacteo-backend, HU-26/HU-29 —
// src/module/notificaciones/entities/configuracion-notificacion-nivel.entity.ts).
// Define quién recibe notificaciones de qué nivel de alerta, por empresa:
// cada fila es exactamente un rol completo (rolId) O un usuario puntual
// (usuarioId), nunca ambos ni ninguno (constraint XOR en la entidad y en
// la DB). GET /notificaciones/configuracion trae `rol` y `usuario` cargados.
import type { NivelAlerta } from "./notificacion.types";

// El backend embebe la entidad `User` completa (incluye el hash de
// password) porque este endpoint no tiene mapper de salida propio — bug de
// seguridad reportado al equipo de backend. El frontend nunca debe
// declarar/persistir ese campo: notificacion.service.ts lo descarta al
// parsear la respuesta, y este tipo intencionalmente no lo incluye.
export interface ConfiguracionNotificacionNivelUsuario {
  id: number;
  name: string;
  email: string;
}

export interface ConfiguracionNotificacionNivel {
  id: number;
  nivelAlerta: NivelAlerta;
  rolId: number | null;
  rol: { id: number; nombre: string } | null;
  usuarioId: number | null;
  usuario: ConfiguracionNotificacionNivelUsuario | null;
  empresaId: number;
  createdAt: string;
}

// Exactamente uno de rolId/usuarioId (el backend responde 400 si vienen
// ambos o ninguno — ver CrearConfiguracionNotificacionDto en el backend).
export interface CrearConfiguracionNotificacionDto {
  nivelAlerta: NivelAlerta;
  rolId?: number;
  usuarioId?: number;
}
