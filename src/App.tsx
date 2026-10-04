import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
import { usePermisos } from "./hooks/usePermisos";
import { getLanding } from "./utils/accesoRutas";

import LoginPage from "./pages/Login/LoginPage";
import ForgotPasswordPage from "./pages/Login/ForgotPasswordPage";
import ResetPasswordPage from "./pages/Login/ResetPasswordPage";

import DashboardPage from "./pages/Dashboard/DashboardPage";
import DashboardProduccionPage from "./pages/DashboardProduccion/DashboardProduccionPage";
import UsuariosPage from "./pages/Usuarios/UsuariosPage";
import RolesPage from "./pages/Roles/RolesPage";
import EmpresasPage from "./pages/Empresas/EmpresasPage";
import ConfiguracionPage from "./pages/Configuracion/ConfiguracionPage";
import PlanesPage from "./pages/Planes/PlanesPage";
import ProveedoresPage from "./pages/Proveedores/ProveedoresPage";
import TambosPage from "./pages/Tambos/TambosPage";
import LotesPage from "./pages/Lotes/LotesPage";
import RevisionLotesPage from "./pages/Lotes/RevisionLotesPage";
import MedicionManualPage from "./pages/MedicionManual/MedicionManualPage";
import SensoresPage from "./pages/Sensores/SensoresPage";
import DestinatariosAlertasPage from "./pages/Alertas/DestinatariosAlertasPage";
import AlertasPage from "./pages/Alertas/AlertasPage";
import HistorialAlertasPage from "./pages/Alertas/HistorialAlertasPage";
import IngresoCamaraPage from "./pages/IngresoCamara/IngresoCamaraPage";
import AuditoriaPage from "./pages/Auditoria/AuditoriaPage";
import DispositivosPage from "./pages/Dispositivos/DispositivosPage";
import SinFuncionalidadesPage from "./pages/SinFuncionalidades/SinFuncionalidadesPage";

import { InactivityMonitor } from "./components/layout/InactivityMonitor";
import { EmpresaProvider } from "./context/EmpresaContext";
import { PermisosProvider } from "./context/PermisosContext";
import { LoteContextoProvider } from "./context/LoteContextoContext";

// La raíz "/" no puede asumir un destino fijo: la landing es la primera ruta
// a la que el usuario puede entrar según sus permisos (ver getLanding).
function RoleBasedRedirect() {
  const { isAuthenticated, isInitializing } = useAuth();
  const permisos = usePermisos();

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

  return <Navigate to={getLanding(permisos)} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PermisosProvider>
          <EmpresaProvider>
            {/* HU-55: contexto de "lote en pantalla" que consume el botón
                flotante de dictado por voz (FloatingDictadoVozButton, montado
                en Layout) para saber si puede arrancar directo o necesita
                mostrar su propio selector. Va por encima de <Routes> para que
                cualquier pantalla lo pueda registrar sin acoplarse entre sí. */}
            <LoteContextoProvider>
              <InactivityMonitor />
              <Routes>
                {/* AUTH */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route
                  path="/auth/reset-password"
                  element={<ResetPasswordPage />}
                />

                {/* Acceso por permisos de módulo (GET /auth/me/permisos), no por
                  nombre de rol: la regla de cada ruta vive en utils/accesoRutas.ts
                  y lo que cada usuario puede hacer adentro, en usePermisos. */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute ruta="/dashboard">
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard-produccion"
                  element={
                    <ProtectedRoute ruta="/dashboard-produccion">
                      <DashboardProduccionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/empresas"
                  element={
                    <ProtectedRoute ruta="/empresas">
                      <EmpresasPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/configuracion"
                  element={
                    <ProtectedRoute ruta="/configuracion">
                      <ConfiguracionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/usuarios"
                  element={
                    <ProtectedRoute ruta="/usuarios">
                      <UsuariosPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/roles"
                  element={
                    <ProtectedRoute ruta="/roles">
                      <RolesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/planes"
                  element={
                    <ProtectedRoute ruta="/planes">
                      <PlanesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/proveedores"
                  element={
                    <ProtectedRoute ruta="/proveedores">
                      <ProveedoresPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tambos"
                  element={
                    <ProtectedRoute ruta="/tambos">
                      <TambosPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lotes"
                  element={
                    <ProtectedRoute ruta="/lotes">
                      <LotesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lotes/revision"
                  element={
                    <ProtectedRoute ruta="/lotes/revision">
                      <RevisionLotesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mediciones-manuales"
                  element={
                    <ProtectedRoute ruta="/mediciones-manuales">
                      <MedicionManualPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sensores"
                  element={
                    <ProtectedRoute ruta="/sensores">
                      <SensoresPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ingreso-camara"
                  element={
                    <ProtectedRoute ruta="/ingreso-camara">
                      <IngresoCamaraPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/alertas/destinatarios"
                  element={
                    <ProtectedRoute ruta="/alertas/destinatarios">
                      <DestinatariosAlertasPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/alertas"
                  element={
                    <ProtectedRoute ruta="/alertas">
                      <AlertasPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/alertas/historial"
                  element={
                    <ProtectedRoute ruta="/alertas/historial">
                      <HistorialAlertasPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/auditoria"
                  element={
                    <ProtectedRoute ruta="/auditoria">
                      <AuditoriaPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dispositivos"
                  element={
                    <ProtectedRoute ruta="/dispositivos">
                      <DispositivosPage />
                    </ProtectedRoute>
                  }
                />

                {/* SIN FUNCIONALIDADES (roles sin implementación en este sprint) */}
                <Route
                  path="/sin-funcionalidades"
                  element={
                    <ProtectedRoute>
                      <SinFuncionalidadesPage />
                    </ProtectedRoute>
                  }
                />

                {/* DEFAULT */}
                <Route path="/" element={<RoleBasedRedirect />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </LoteContextoProvider>
          </EmpresaProvider>
        </PermisosProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
