import { Activity, Droplet, Dna, Grid2x2, Target, Thermometer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Parametro, TipoMateriaPrima } from "../../../types/configParametro.types";

interface ParametroMeta {
  label: string;
  unidad: string;
  icon: LucideIcon;
  rangoFisico: { min: number; max: number };
}

// Conductividad existe en el enum del backend pero todavía no se configura desde esta pantalla.
export type ParametroVisible = Exclude<Parametro, Parametro.CONDUCTIVIDAD>;

// Rango físico espeja RANGOS_FISICOS en
// optilacteo-backend/src/module/config-parametro/validators/rangos-fisicos.constant.ts
// Si el backend cambia esos valores, hay que actualizar esta tabla a mano.
export const PARAMETROS_META: Record<ParametroVisible, ParametroMeta> = {
  [Parametro.PH]: {
    label: "pH",
    unidad: "sin unidad",
    icon: Target,
    rangoFisico: { min: 0, max: 14 },
  },
  [Parametro.TEMPERATURA]: {
    label: "Temperatura",
    unidad: "°C",
    icon: Thermometer,
    rangoFisico: { min: -20, max: 100 },
  },
  [Parametro.GRASA]: {
    label: "Materia grasa",
    unidad: "%",
    icon: Droplet,
    rangoFisico: { min: 0, max: 100 },
  },
  [Parametro.PROTEINA]: {
    label: "Proteínas",
    unidad: "%",
    icon: Dna,
    rangoFisico: { min: 0, max: 100 },
  },
  [Parametro.ACIDEZ]: {
    label: "Acidez titulable",
    unidad: "°D",
    icon: Activity,
    rangoFisico: { min: 0, max: 50 },
  },
  [Parametro.DENSIDAD]: {
    label: "Densidad",
    unidad: "g/mL",
    icon: Grid2x2,
    rangoFisico: { min: 0, max: 2 },
  },
};

// Orden de las tarjetas en el grid, igual al mockup.
export const ORDEN_PARAMETROS: ParametroVisible[] = [
  Parametro.PH,
  Parametro.TEMPERATURA,
  Parametro.GRASA,
  Parametro.PROTEINA,
  Parametro.ACIDEZ,
  Parametro.DENSIDAD,
];

export const TIPO_MATERIA_PRIMA_TABS: { value: TipoMateriaPrima; label: string }[] = [
  { value: TipoMateriaPrima.LECHE_CRUDA, label: "Leche cruda" },
  { value: TipoMateriaPrima.CREMA_DE_LECHE, label: "Crema de leche" },
  { value: TipoMateriaPrima.MASA_HILADA, label: "Masa hilada" },
];
