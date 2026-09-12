// HU-30 (Sprint 4, mock visual): horarios en los que se silencian las
// alertas informativas (AC1). El backend no tiene entidad, migración ni
// endpoints para esto todavía (verificado explícitamente antes de arrancar
// esta HU: no hay nada bajo /module/notificaciones ni en /migrations) — se
// guarda en localStorage hasta que exista, mismo criterio que
// remitoLote.types.ts / useCatalogoDestinosProductivos.ts.
//
// Cuando el backend exista se espera:
//   GET    /horarios-silencio          listar (por empresa, vía tenant_id)
//   POST   /horarios-silencio          crear
//   PATCH  /horarios-silencio/:id      editar (nombre, horaInicio, horaFin, dias)
//   PATCH  /horarios-silencio/:id/activo  toggle, { activo: boolean } — separado
//                                      del editar general para no pisar el
//                                      resto de los campos con un PATCH parcial
//   DELETE /horarios-silencio/:id      eliminar
//
// La evaluación de si una alerta cae dentro de la ventana (AC2/AC3: cruce de
// medianoche, bordes exactos de minuto) es responsabilidad exclusiva del
// backend al emitir la alerta — este mock NO la implementa a propósito, para
// no terminar con dos versiones de esa regla que puedan divergir. Acá el
// badge "CRUZA MEDIANOCHE" es pura presentación (horaFin < horaInicio), no
// una evaluación real de ventana.
export type DiaSemana = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";

export const DIAS_SEMANA: { value: DiaSemana; label: string }[] = [
  { value: "lun", label: "L" },
  { value: "mar", label: "M" },
  { value: "mie", label: "M" },
  { value: "jue", label: "J" },
  { value: "vie", label: "V" },
  { value: "sab", label: "S" },
  { value: "dom", label: "D" },
];

export interface HorarioSilencio {
  id: string;
  nombre: string;
  horaInicio: string; // "HH:mm", 24h
  horaFin: string; // "HH:mm", 24h
  dias: DiaSemana[];
  activo: boolean;
  creadoEn: string; // ISO
}

export type HorarioSilencioInput = Pick<
  HorarioSilencio,
  "nombre" | "horaInicio" | "horaFin" | "dias"
>;
