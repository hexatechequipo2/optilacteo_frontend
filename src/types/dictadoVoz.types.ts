import type { Parametro } from "./configParametro.types";

// HU-55: solo tipos de UI para el modo de dictado por voz. Todavía no hay
// endpoint asociado — cuando se conecte el reconocimiento real (Web Speech
// API) y/o el backend, estos mismos tipos deberían alcanzar para pasarle
// datos reales al modal sin tocar su interfaz.

export type EstadoDictadoVoz = "escuchando" | "pausado";

export type NivelReconocimiento = "alta" | "media" | "baja";

export interface ParametroCapturadoVoz {
  parametro: Parametro;
  escuchado: string;
  valor: number;
  nivelReconocimiento: NivelReconocimiento;
}
