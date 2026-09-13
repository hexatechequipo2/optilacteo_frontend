// Espeja ConfiguracionSilencioAlerta (optilacteo-backend, HU-30 —
// src/module/notificaciones/entities/configuracion-silencio-alerta.entity.ts,
// PR #133 mergeado a develop). Horario en el que las alertas de nivel
// INFORMATIVA no se emiten por WebSocket (ADVERTENCIA y CRITICA nunca se
// silencian); la notificación siempre se persiste en BD, el silencio solo
// bloquea el push en tiempo real. Una empresa puede tener varios horarios
// activos a la vez (ej. turno nocturno + fin de semana) — a diferencia de
// ConfiguracionAlertaDesconexion (HU-31), acá no es una fila única.
export interface ConfiguracionSilencioAlerta {
  id: number;
  empresaId: number;
  nombre: string | null;
  // Formato "HH:mm". Si horaFin < horaInicio, el horario cruza la
  // medianoche (ej. "22:00" -> "06:00") — ver ConfiguracionSilencioMapper
  // en el backend, que nunca hace este cálculo del lado del cliente.
  horaInicio: string;
  horaFin: string;
  // 0=domingo .. 6=sábado (mismo criterio que Date.getDay() en JS).
  // null = todos los días.
  diasSemana: number[] | null;
  createdAt: string;
  updatedAt: string;
}

// POST /notificaciones/horarios-silencio (CrearConfiguracionSilencioDto en
// el backend). El backend valida horaInicio/horaFin con regex HH:mm,
// rechaza horaInicio === horaFin y valida que el horario no se solape
// (mismos días + rango horario superpuesto) con otro ya configurado de la
// misma empresa — ambos casos responden 400 con mensaje legible.
export interface CreateConfiguracionSilencioAlertaDto {
  nombre?: string;
  horaInicio: string;
  horaFin: string;
  // Vacío/ausente = todos los días.
  diasSemana?: number[];
}

// PATCH /notificaciones/horarios-silencio/:id (ActualizarConfiguracionSilencioDto
// = PartialType del dto de creación en el backend): mismas validaciones de
// formato/solapamiento que el alta, evaluadas contra el resultado final
// (un campo no enviado conserva su valor actual).
export interface UpdateConfiguracionSilencioAlertaDto {
  nombre?: string;
  horaInicio?: string;
  horaFin?: string;
  diasSemana?: number[];
}
