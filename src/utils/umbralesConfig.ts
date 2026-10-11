import type { UmbralesConfig } from "../types/configParametro.types";

export type CampoUmbral = keyof UmbralesConfig;

export type UmbralesInput = Record<CampoUmbral, string>;

export type ErroresUmbrales = Partial<Record<CampoUmbral, string>>;

// Orden visual de los inputs: igual a la cadena que valida el backend.
export const CAMPOS_UMBRAL: CampoUmbral[] = ["umbralAlertaMin", "umbralMin", "umbralMax", "umbralAlertaMax"];

export const LABEL_CAMPO_UMBRAL: Record<CampoUmbral, string> = {
  umbralAlertaMin: "Alerta mín",
  umbralMin: "Mín",
  umbralMax: "Máx",
  umbralAlertaMax: "Alerta máx",
};

export function umbralesAInput(config: UmbralesConfig | undefined): UmbralesInput {
  return {
    umbralAlertaMin: config?.umbralAlertaMin?.toString() ?? "",
    umbralMin: config?.umbralMin?.toString() ?? "",
    umbralMax: config?.umbralMax?.toString() ?? "",
    umbralAlertaMax: config?.umbralAlertaMax?.toString() ?? "",
  };
}

// Espeja la validación del backend (RangoFisicoValidator, UmbralCoherenteValidator,
// UmbralAlertaCoherenteValidator y ConfigParametroService.validarUmbrales):
// umbralAlertaMin <= umbralMin < umbralMax <= umbralAlertaMax, todo dentro del
// rango físico. Devuelve un error por campo; la cadena se marca en el campo
// que queda "del lado equivocado".
export function validarUmbrales(
  input: UmbralesInput,
  rangoFisico: { min: number; max: number },
): ErroresUmbrales {
  const errores: ErroresUmbrales = {};
  const valores: Partial<UmbralesConfig> = {};

  for (const campo of CAMPOS_UMBRAL) {
    const texto = input[campo].trim();
    if (texto === "") {
      errores[campo] = "Ingresá un valor";
      continue;
    }
    const valor = Number(texto);
    if (Number.isNaN(valor)) {
      errores[campo] = "Debe ser un número";
      continue;
    }
    if (valor < rangoFisico.min || valor > rangoFisico.max) {
      errores[campo] = `Debe estar entre ${rangoFisico.min} y ${rangoFisico.max}`;
      continue;
    }
    valores[campo] = valor;
  }

  const { umbralAlertaMin, umbralMin, umbralMax, umbralAlertaMax } = valores;

  if (umbralMin !== undefined && umbralMax !== undefined && umbralMax <= umbralMin) {
    errores.umbralMax = "Debe ser mayor al mínimo";
  }
  if (umbralAlertaMin !== undefined && umbralMin !== undefined && umbralAlertaMin > umbralMin) {
    errores.umbralAlertaMin = "Debe ser menor o igual al mínimo";
  }
  if (umbralAlertaMax !== undefined && umbralMax !== undefined && umbralAlertaMax < umbralMax) {
    errores.umbralAlertaMax = "Debe ser mayor o igual al máximo";
  }

  return errores;
}

export function inputAUmbrales(input: UmbralesInput): UmbralesConfig {
  return {
    umbralAlertaMin: Number(input.umbralAlertaMin),
    umbralMin: Number(input.umbralMin),
    umbralMax: Number(input.umbralMax),
    umbralAlertaMax: Number(input.umbralAlertaMax),
  };
}

export function umbralesIguales(a: UmbralesConfig, b: UmbralesConfig): boolean {
  return CAMPOS_UMBRAL.every((campo) => a[campo] === b[campo]);
}

export type ZonaSemaforo = "rojo" | "amarillo" | "verde";

export interface SegmentoZona {
  zona: ZonaSemaforo;
  // Porcentaje del ancho total de la barra.
  ancho: number;
}

// Solo para la referencia visual: el estado real de cada lectura lo calcula
// el backend (SemaforoService). La barra hace zoom alrededor de la banda de
// alerta (con margen a cada lado, sin salir del rango físico) para que en
// parámetros con rango físico amplio la zona verde no quede de 1px.
export function segmentosZonas(
  umbrales: UmbralesConfig,
  rangoFisico: { min: number; max: number },
): SegmentoZona[] {
  const { umbralAlertaMin, umbralMin, umbralMax, umbralAlertaMax } = umbrales;
  const margen = Math.max((umbralAlertaMax - umbralAlertaMin) * 0.25, (rangoFisico.max - rangoFisico.min) * 0.01);
  const desde = Math.max(rangoFisico.min, umbralAlertaMin - margen);
  const hasta = Math.min(rangoFisico.max, umbralAlertaMax + margen);
  const total = hasta - desde;

  const tramos: [ZonaSemaforo, number, number][] = [
    ["rojo", desde, umbralAlertaMin],
    ["amarillo", umbralAlertaMin, umbralMin],
    ["verde", umbralMin, umbralMax],
    ["amarillo", umbralMax, umbralAlertaMax],
    ["rojo", umbralAlertaMax, hasta],
  ];

  return tramos
    .map(([zona, inicio, fin]) => ({ zona, ancho: ((fin - inicio) / total) * 100 }))
    .filter((s) => s.ancho > 0);
}
