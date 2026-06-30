export interface PlanModulo {
  nombre: string;
  icono?: string;
}

export interface Plan {
  id: number;
  nombre: string;
  precio: number;
  maxUsuarios: number;
  maxSensores: number;
  modulos: PlanModulo[];
  empresasAsignadas: number;
  mrr: number;
}

export interface CreatePlanDto {
  nombre: string;
  precio: number;
  maxUsuarios: number;
  maxSensores: number;
  moduloIds: number[];
}
