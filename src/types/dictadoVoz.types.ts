import type { Parametro } from "./configParametro.types";

// HU-55: tipos del modo de dictado por voz para "Medición manual". Conecta
// dos piezas separadas:
// - Captura real con la Web Speech API del navegador (useSpeechRecognition),
//   que no tiene noción de "parámetros": solo produce texto.
// - El endpoint POST /lotes/:id/dictado/parsear del backend, que interpreta
//   ese texto y devuelve los parámetros reconocidos (sin persistir nada:
//   el registro real es POST /lotes/:id/mediciones-manuales, ver
//   medicionManual.types.ts).

export type EstadoReconocimientoVoz =
  | "inactivo"
  | "escuchando"
  | "pausado"
  | "permiso_denegado"
  | "no_soportado";

export type ConfianzaDictado = "alta" | "media" | "baja";

export interface ParsearDictadoDto {
  texto: string;
}

export interface ParametroReconocidoDictado {
  parametro: Parametro;
  valor: number;
  confianza: ConfianzaDictado;
  fueraDeRangoFisico: boolean;
  // null: la empresa no tiene umbral configurado para este parámetro. No
  // equivale a "dentro del rango" — hay que mostrarlo distinto de `false`.
  fueraDeUmbralEmpresa: boolean | null;
  textoOriginal: string;
}

export interface TextoNoReconocidoDictado {
  texto: string;
  // Valor conocido: "sin_valor_asociado" (parámetro nombrado sin un valor
  // detectable). El backend puede sumar otros motivos más adelante, por eso
  // se tipa como string y no como unión cerrada.
  motivo: string;
}

export interface ParsearDictadoResponse {
  parametros: ParametroReconocidoDictado[];
  noReconocido: TextoNoReconocidoDictado[];
  obligatoriosFaltantes: string[];
  textoOriginal: string;
}
