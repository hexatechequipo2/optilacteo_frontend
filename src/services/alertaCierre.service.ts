import api from "./api";
import type { CierreAlerta } from "../types/alertaCierre.types";

// HU-27: forma cruda que devuelve el backend para
// PATCH /notificaciones/:id/resolver (NotificacionResponseDto —
// optilacteo-backend, module/notificaciones). Restringido a Responsable de
// producción en el backend (NotificacionesController.resolverAlerta);
// AlertaDetallePanel.tsx ya gatea el botón con `puedeCerrar` para el resto
// de roles.
interface ResolverAlertaResponse {
  estado: CierreAlerta["estado"];
  accionCorrectiva: string | null;
  fechaResolucion: string | null;
}

export const alertaCierreService = {
  // Mismo patrón que notificacionService.marcarLeida (notificacion.service.ts):
  // interceptor de Axios agrega el JWT (api.ts), errores se propagan tal
  // cual para que useAlertas.ts decida el rollback.
  cerrarAlerta: async (id: number, accionCorrectiva: string): Promise<CierreAlerta> => {
    const { data } = await api.patch<ResolverAlertaResponse>(`/notificaciones/${id}/resolver`, {
      accionCorrectiva,
    });

    return {
      estado: data.estado,
      accionCorrectiva: data.accionCorrectiva,
      cerradaEn: data.fechaResolucion,
    };
  },
};
