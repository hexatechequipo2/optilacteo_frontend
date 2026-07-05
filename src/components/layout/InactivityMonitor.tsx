import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useInactivityTimer } from "../../hooks/useInactivityTimer";
import { systemConfigService } from "../../services/systemConfig.service";
import { InactivityWarningModal } from "./InactivityWarningModal";

const DEFAULT_TIMEOUT_MINUTES = 30; // fallback si falla la carga de configuración

/**
 * Componente sin UI propia (además del modal) que orquesta el cierre
 * de sesión automático por inactividad (HU-04).
 * Debe montarse una sola vez dentro del AuthProvider.
 */
export function InactivityMonitor() {
  const { isAuthenticated, logout } = useAuth();
  const [timeoutMinutes, setTimeoutMinutes] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  // Cargar la configuración de inactividad al iniciar sesión
  useEffect(() => {
    if (!isAuthenticated) {
      setTimeoutMinutes(null);
      return;
    }

    let isMounted = true;

    systemConfigService
      .getInactivityTimeout()
      .then((config) => {
        if (isMounted) setTimeoutMinutes(config.inactivityTimeout);
      })
      .catch(() => {
        // Si falla la carga, usamos un valor por defecto para no dejar
        // la sesión sin protección de cierre por inactividad.
        if (isMounted) setTimeoutMinutes(DEFAULT_TIMEOUT_MINUTES);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleTimeout = () => {
    setShowWarning(false);
    void logout();
  };

  const { resetTimers } = useInactivityTimer({
    timeoutMinutes: timeoutMinutes ?? DEFAULT_TIMEOUT_MINUTES,
    onWarning: () => setShowWarning(true),
    onTimeout: handleTimeout,
    enabled: isAuthenticated && timeoutMinutes !== null,
  });

  const handleStayLoggedIn = () => {
    setShowWarning(false);
    resetTimers();
  };

  return (
    <InactivityWarningModal
      isOpen={showWarning}
      onStayLoggedIn={handleStayLoggedIn}
    />
  );
}