import { EstadoAlerta, type CierreAlerta } from "../types/alertaCierre.types";

// TODO(backend): HU-27 pide marcar una alerta como resuelta con una acción
// correctiva de texto libre, pero no existe endpoint para esto todavía —
// Notificacion (backend) no tiene estado ni accionCorrectiva. Cuando el
// backend lo exponga (probablemente PATCH /notificaciones/:id/cerrar con
// { accionCorrectiva } en el body), reemplazar el Map de acá por una llamada
// real a `api`, mismo patrón que notificacionService.marcarLeida en
// notificacion.service.ts. Mientras tanto guardamos el cierre en memoria, a
// nivel de módulo (sobrevive mientras la pestaña esté abierta, se pierde en
// un refresh real del navegador — igual que cualquier otro mock sin backend).
const cierresMock = new Map<number, CierreAlerta>();

export const alertaCierreService = {
  cerrarAlerta: async (id: number, accionCorrectiva: string): Promise<CierreAlerta> => {
    const cierre: CierreAlerta = {
      estado: EstadoAlerta.CERRADA,
      accionCorrectiva,
      cerradaEn: new Date().toISOString(),
    };
    cierresMock.set(id, cierre);
    return cierre;
  },

  getCierre: (id: number): CierreAlerta | undefined => cierresMock.get(id),
};
