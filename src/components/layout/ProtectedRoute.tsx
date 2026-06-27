import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Role } from "../../types/usuario.types";

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Roles permitidos para acceder a esta ruta.
   * Si no se especifica, alcanza con estar autenticado (comportamiento anterior).
   */
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const tieneRolPermitido =
    !allowedRoles || allowedRoles.includes(user?.role as Role);

  if (!tieneRolPermitido) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-slate-50 px-4 text-center">
        <h1 className="text-xl font-bold text-slate-900">Acceso no autorizado</h1>
        <p className="max-w-md text-sm text-slate-500">
          No tenés el rol permitido para ingresar a la Administración de
          OptiLácteo.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}