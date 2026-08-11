export type NivelAlerta = "critica" | "preventiva" | "informativa";

export interface DestinatarioAlerta {
  id: string;
  nombre: string;
  rol: string;
}

export interface ReglaAlerta {
  id: string;
  nombre: string;
  nivel: NivelAlerta;
  destinatarios: DestinatarioAlerta[];
}
