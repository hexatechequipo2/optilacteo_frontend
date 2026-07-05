import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const tieneRolPermitido =
    !allowedRoles || allowedRoles.includes(user?.rolNombre ?? "");

  if (!tieneRolPermitido) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-xl font-semibold text-red-700">
            Acceso no autorizado
          </h2>
          <p className="text-red-600">
            No tenés el rol permitido para ingresar a la Administración de
            OptiLácteo.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}