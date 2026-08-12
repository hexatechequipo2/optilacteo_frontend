// Espeja ConfiguracionNotificacionNivel (optilacteo-backend, HU-26 —
// src/module/notificaciones/entities/configuracion-notificacion-nivel.entity.ts).
// Define qué rol recibe notificaciones de qué nivel de alerta, por empresa.
// GET /notificaciones/configuracion trae la relación `rol` cargada
// (findByEmpresa hace relations: { rol: true }).
import type { NivelAlerta } from "./notificacion.types";

export interface ConfiguracionNotificacionNivel {
  id: number;
  nivelAlerta: NivelAlerta;
  rolId: number;
  rol: {
    id: number;
    nombre: string;
  };
  empresaId: number;
  createdAt: string;
}

export interface CrearConfiguracionNotificacionDto {
  nivelAlerta: NivelAlerta;
  rolId: number;
}
