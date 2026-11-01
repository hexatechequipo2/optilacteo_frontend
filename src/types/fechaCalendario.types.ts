// HU-75: rango de días calendario ("YYYY-MM-DD"), ambos extremos inclusivos
// en hora de la empresa (AR). Ver utils/fechaCalendario.ts.
export interface RangoFechasCalendario {
  desde: string;
  hasta: string;
}
