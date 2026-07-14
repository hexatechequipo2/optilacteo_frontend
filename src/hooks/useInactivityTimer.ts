import { useCallback, useEffect, useRef } from "react";

const WARNING_BEFORE_MS = 2 * 60 * 1000; // aviso 2 minutos antes del cierre

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
] as const;

interface UseInactivityTimerParams {
  timeoutMinutes: number;
  onWarning: () => void;
  onTimeout: () => void;
  enabled: boolean;
}

/**
 * Hook que controla la inactividad del usuario.
 * Dispara onWarning 2 minutos antes del límite configurado,
 * y onTimeout cuando se cumple el tiempo total.
 */
export function useInactivityTimer({
  timeoutMinutes,
  onWarning,
  onTimeout,
  enabled,
}: UseInactivityTimerParams) {
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const logoutTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Guardamos las callbacks más recientes en refs para que el efecto
  // principal no se reinicie (y por lo tanto no resetee los timers)
  // cada vez que el componente padre se re-renderiza.
  const onWarningRef = useRef(onWarning);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onWarningRef.current = onWarning;
    onTimeoutRef.current = onTimeout;
  }, [onWarning, onTimeout]);

  const clearTimers = useCallback(() => {
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
  }, []);

  const resetTimers = useCallback(() => {
    clearTimers();

    if (!enabled) return;

    const totalMs = timeoutMinutes * 60 * 1000;
    const warningMs = Math.max(totalMs - WARNING_BEFORE_MS, 0);

    warningTimeoutRef.current = setTimeout(
      () => onWarningRef.current(),
      warningMs,
    );
    logoutTimeoutRef.current = setTimeout(
      () => onTimeoutRef.current(),
      totalMs,
    );
  }, [enabled, timeoutMinutes, clearTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    resetTimers();

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimers),
    );

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimers),
      );
    };
  }, [enabled, resetTimers, clearTimers]);

  return { resetTimers };
}