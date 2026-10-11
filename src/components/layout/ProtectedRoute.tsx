import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePermisos } from "../../hooks/usePermisos";
import { puedeEntrarA, type RutaApp } from "../../utils/accesoRutas";

interface ProtectedRouteProps {
  children: ReactNode;
  ruta?: RutaApp;
}

export function ProtectedRoute({ children, ruta }: ProtectedRouteProps) {
  const { isAuthenticated, isInitializing } = useAuth();
  const permisos = usePermisos();

  // Esperar los permisos además de la sesión: con F5 no hay rebote a
  // "no autorizado" mientras GET /auth/me/permisos está en vuelo.
  if (isInitializing || (isAuthenticated && permisos.isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (ruta && !permisos.permisos && permisos.error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-xl font-semibold text-red-700">{permisos.error}</h2>
          <button
            type="button"
            onClick={() => permisos.recargar()}
            className="mt-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (ruta && !puedeEntrarA(ruta, permisos)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-xl font-semibold text-red-700">
            Acceso no autorizado
          </h2>
          <p className="text-red-600">
            Tu rol no tiene permiso para ver esta sección.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
