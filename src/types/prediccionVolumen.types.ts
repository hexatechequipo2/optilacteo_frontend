import type { TipoMateriaPrima } from "./configParametro.types";

// HU-51: conectado al backend real — GET /prediccion-volumen (rama
// feature/prediccion-volumen-produccion en optilacteo-backend, módulo
// src/module/prediccion-volumen). Contrato confirmado leyendo el controller,
// service y DTOs reales (no la descripción del PR):
//
// - AC1/AC2: la predicción es un intervalo de confianza por día
//   (minimo/esperado/maximo) — el DTO NO trae ningún score de confianza en
//   %, no existe ese campo. No se deriva un valor equivalente acá.
// - AC4: el histórico reciente para comparar viene en la misma respuesta
//   (historicoReciente), no hace falta un segundo endpoint.
// - AC6 (actualización automática diaria): SÍ está cubierto — hay un cron
//   real (PrediccionVolumenTask, @Cron(EVERY_DAY_AT_3AM)) que regenera y
//   persiste la predicción todos los días por empresa+materia prima. El GET
//   nunca llama al modelo ML, solo lee la última predicción persistida
//   (fechaActualizacionModelo = cuándo corrió ese cron, no la fecha del GET).
// - "Datos insuficientes" se señaliza con status="insufficient_data" en el
//   body (siempre HTTP 200), nunca con un código de error HTTP.
export type StatusPrediccionVolumen = "ok" | "insufficient_data";

// Espeja UnidadCantidad del backend (src/module/lote/enums/unidad-cantidad.enum.ts).
// Sin relación con la feature de unidad_cantidad en Lote (fuera de alcance
// de HU-51) — acá es solo la unidad en la que viene esta predicción puntual.
export type UnidadPrediccionVolumen = "litros" | "kilogramos";

export interface DiaPrediccionVolumen {
  fecha: string; // ISO date (yyyy-MM-dd)
  minimo: number;
  esperado: number;
  maximo: number;
}

export interface DiaHistoricoVolumen {
  fecha: string; // ISO date (yyyy-MM-dd)
  valor: number;
}

export interface PrediccionVolumenResponse {
  status: StatusPrediccionVolumen;
  tipoMateriaPrima: TipoMateriaPrima;
  unidad: UnidadPrediccionVolumen | null;
  // Fecha en que el modelo generó esta predicción (última corrida del cron
  // diario) — no la fecha del GET. Ver comentario arriba.
  fechaActualizacionModelo: string | null; // ISO datetime
  modeloVersion: string | null;
  // Vacío si status = "insufficient_data".
  prediccion: DiaPrediccionVolumen[];
  historicoReciente: DiaHistoricoVolumen[];
  // Mensaje explicativo cuando status = "insufficient_data" (ej. cuántos
  // días de histórico faltan). Ausente cuando status = "ok".
  mensaje?: string | null;
}

export interface PrediccionVolumenQuery {
  tipoMateriaPrima: TipoMateriaPrima;
  // Ventana de histórico reciente a comparar junto a la predicción (7-90,
  // default 14 en el backend). La predicción en sí siempre es de 7 días
  // fijos — esto solo controla `historicoReciente`.
  diasHistorico?: number;
}

// Estado de la sección, derivado del ciclo real de fetch + el campo `status`
// de la respuesta. Ya no hay switcher manual de demo ni estado "baja
// precisión": dependía de un score de confianza que el contrato real no
// tiene (ver AC1/AC2 arriba), así que se elimina en vez de inventarlo.
export type EstadoSeccionPrediccion =
  | "cargando"
  | "normal"
  | "datos_insuficientes"
  | "error";
