interface InactivityWarningModalProps {
  isOpen: boolean;
  onStayLoggedIn: () => void;
}

/**
 * Aviso mostrado 2 minutos antes del cierre automático de sesión
 * por inactividad. Le da al usuario la opción de seguir conectado.
 */
export function InactivityWarningModal({
  isOpen,
  onStayLoggedIn,
}: InactivityWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">
          Tu sesión está por cerrarse
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Por inactividad, tu sesión se cerrará automáticamente en 2 minutos.
          ¿Querés continuar conectado?
        </p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onStayLoggedIn}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Continuar conectado
          </button>
        </div>
      </div>
    </div>
  );
}