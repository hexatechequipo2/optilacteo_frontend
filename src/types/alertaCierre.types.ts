// HU-27 (Registro y cierre de alertas): el backend real ya expone el ciclo
// de vida de una alerta directo en Notificacion — estado/accionCorrectiva/
// fechaResolucion (ver notificacion.types.ts, que espeja
// NotificacionResponseDto). Este archivo arma la vista que consume esta
// pantalla: mismo dato, con `cerradaEn` en vez de `fechaResolucion` —
// nombre que ya usan AlertaDetallePanel.tsx, AlertasFiltros.tsx,
// alertas.constants.ts y el mock de HU-28 (historialAlertas.service.ts, que
// reusa AlertaConCierre como fila y no debería tener que cambiar por esto).
import {
  EstadoAlerta as EstadoAlertaDeNotificacion,
  type AlertaNotificacion,
  type AlertaSensorDesconectadoNotificacion,
} from "./notificacion.types";

export const EstadoAlerta = EstadoAlertaDeNotificacion;
export type EstadoAlerta = EstadoAlertaDeNotificacion;

export interface CierreAlerta {
  estado: EstadoAlerta;
  accionCorrectiva: string | null;
  cerradaEn: string | null;
}

// AlertaNotificacion (HU-25) + el estado de cierre (HU-27). Superset de
// AlertaNotificacion a propósito: todo lo que ya consume AlertaNotificacion
// (AlertaCard, ReglasActivasPanel, etc.) sigue funcionando sin cambios.
export interface AlertaUmbralConCierre extends AlertaNotificacion, CierreAlerta {}

// HU-31: mismo criterio que AlertaUmbralConCierre, para alertas de sensor
// desconectado. A diferencia de las de umbral, su cierre es siempre
// automático (ver resolverAlertaSensorDesconectado en el backend) — no hay
// flujo de accionCorrectiva manual para este tipo, pero el campo queda en
// el shape igual (siempre null) para no romper el union con CierreAlerta.
export interface AlertaSensorDesconectadoConCierre
  extends AlertaSensorDesconectadoNotificacion,
    CierreAlerta {}

// Unión: AlertasPage (HU-25/31) maneja los dos tipos en un mismo listado.
// Discriminar por `tipo` (TipoNotificacion) para angostar a uno u otro.
export type AlertaConCierre = AlertaUmbralConCierre | AlertaSensorDesconectadoConCierre;
