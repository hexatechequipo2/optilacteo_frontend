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

// HU-40: los 4 umbrales que arman el semáforo. Cadena que exige el backend:
// umbralAlertaMin <= umbralMin < umbralMax <= umbralAlertaMax.
//   - entre min y max → verde (NORMAL)
//   - entre alerta y min/max → amarillo (EN_LIMITE)
//   - fuera de la banda de alerta → rojo (FUERA_DE_RANGO)
export interface UmbralesConfig {
  umbralAlertaMin: number;
  umbralMin: number;
  umbralMax: number;
  umbralAlertaMax: number;
}

export interface ConfigParametro extends UmbralesConfig {
  id: number;
  empresaId: number;
  parametro: Parametro;
  tipoMateriaPrima: TipoMateriaPrima;
  createdAt: string;
  updatedAt: string;
  // HU-63: quién creó esta configuración de umbral y, si aplica, quién la
  // modificó por última vez. El backend lo manda para cualquier rol que
  // pueda leer /config-parametros — la restricción a Gerente/Administrador
  // se aplica en el frontend (ver puedeVerAuditoria).
  auditoria?: TrazabilidadEntidad;
}

export interface CreateConfigParametroDto extends UmbralesConfig {
  parametro: Parametro;
  tipoMateriaPrima: TipoMateriaPrima;
}

// El backend acepta un PUT parcial, pero el front manda siempre los 4 valores
// para que lo validado en cliente sea exactamente lo que se guarda.
export type UpdateConfigParametroDto = UmbralesConfig;
