// Espeja los enums de src/module/config-parametro/enums en optilacteo-backend.
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
