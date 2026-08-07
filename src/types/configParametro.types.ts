// Espeja los enums de src/module/config-parametro/enums en optilacteo-backend.
import type { TrazabilidadEntidad } from "./auditoria.types";

export enum Parametro {
  PH = "ph",
  TEMPERATURA = "temperatura",
  DENSIDAD = "densidad",
  GRASA = "grasa",
  PROTEINA = "proteina",
  ACIDEZ = "acidez",
  CONDUCTIVIDAD = "conductividad",
}

export enum TipoMateriaPrima {
  LECHE_CRUDA = "leche_cruda",
  CREMA_DE_LECHE = "crema_de_leche",
  MASA_HILADA = "masa_hilada",
}

export interface ConfigParametro {
  id: number;
  empresaId: number;
  parametro: Parametro;
  tipoMateriaPrima: TipoMateriaPrima;
  umbralMin: number;
  umbralMax: number;
  createdAt: string;
  updatedAt: string;
  // HU-63: quién creó esta configuración de umbral y, si aplica, quién la
  // modificó por última vez. El backend lo manda para cualquier rol que
  // pueda leer /config-parametros — la restricción a Gerente/Administrador
  // se aplica en el frontend (ver puedeVerAuditoria).
  auditoria?: TrazabilidadEntidad;
}

export interface CreateConfigParametroDto {
  parametro: Parametro;
  tipoMateriaPrima: TipoMateriaPrima;
  umbralMin: number;
  umbralMax: number;
}

export interface UpdateConfigParametroDto {
  umbralMin?: number;
  umbralMax?: number;
}
