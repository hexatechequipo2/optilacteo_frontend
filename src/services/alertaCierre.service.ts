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

// HU-50 criterio 4: forma cruda que devuelve el backend para
// PATCH /notificaciones/:id/falso-positivo — endpoint SEPARADO de
// /resolver (NotificacionesController.marcarFalsoPositivo), sin body: a
// diferencia de resolverAlerta, no pide accionCorrectiva — el estado
// resultante es en sí mismo la señal que consume el microservicio ML como
// feedback negativo en el próximo reentrenamiento. Restringido al mismo rol
// que /resolver; el backend además rechaza (400) cualquier notificación
// que no sea tipo alerta_anomalia o que no esté ABIERTA —
// AlertaAnomaliaDetallePanel.tsx ya gatea el botón para esos dos casos.
interface MarcarFalsoPositivoResponse {
  estado: CierreAlerta["estado"];
  marcadaFalsoPositivoPorId: number | null;
  fechaMarcadoFalsoPositivo: string | null;
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

  // HU-50 criterio 4.
  marcarFalsoPositivo: async (id: number): Promise<MarcarFalsoPositivoResponse> => {
    const { data } = await api.patch<MarcarFalsoPositivoResponse>(
      `/notificaciones/${id}/falso-positivo`,
    );
    return data;
  },
};
