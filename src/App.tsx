import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
import { getRoleLanding } from "./utils/roleLanding";

import LoginPage from "./pages/Login/LoginPage";
import ForgotPasswordPage from "./pages/Login/ForgotPasswordPage";
import ResetPasswordPage from "./pages/Login/ResetPasswordPage";

import DashboardPage from "./pages/Dashboard/DashboardPage";
import DashboardProduccionPage from "./pages/DashboardProduccion/DashboardProduccionPage";
import UsuariosPage from "./pages/Usuarios/UsuariosPage";
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
import SinFuncionalidadesPage from "./pages/SinFuncionalidades/SinFuncionalidadesPage";

import { InactivityMonitor } from "./components/layout/InactivityMonitor";
import { EmpresaProvider } from "./context/EmpresaContext";

// La raíz "/" no puede asumir un destino fijo: cada rol tiene su propia
// landing (ver getRoleLanding), y un usuario no-Administrador que entra por
// acá (bookmark, refresh) terminaba en /dashboard -> "Acceso no autorizado".
function RoleBasedRedirect() {
  const { isAuthenticated, isInitializing, user } = useAuth();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRoleLanding(user?.rolNombre)} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <EmpresaProvider>
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

            {/* DASHBOARD (solo ADMINISTRADOR) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["Administrador"]}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            {/* DASHBOARD PRODUCCIÓN (HU-38: pantalla de inicio del rol
                Responsable de producción — "jefe de producción" en el
                backlog). Distinto del /dashboard de arriba, que es el
                resumen de plataforma exclusivo de Administrador. Gerente
                también puede consultarlo (no es su landing de login, pero le
                queda accesible desde el Sidebar). */}
            <Route
              path="/dashboard-produccion"
              element={
                <ProtectedRoute allowedRoles={["Responsable de producción", "Gerente"]}>
                  <DashboardProduccionPage />
                </ProtectedRoute>
              }
            />

            {/* EMPRESAS (solo ADMINISTRADOR) */}
            <Route
              path="/empresas"
              element={
                <ProtectedRoute allowedRoles={["Administrador"]}>
                  <EmpresasPage />
                </ProtectedRoute>
              }
            />

            {/* CONFIGURACIÓN (HU-09 Umbrales + HU-12 Logo e identidad: solo
                GERENTE. HU-23 Comparación histórica: GERENTE edita,
                RESPONSABLE DE CALIDAD solo consulta. HU-61 Conexión
                PLC/Gateway: GERENTE y RESPONSABLE DE PRODUCCIÓN — el gating
                de qué pestaña ve cada rol vive en ConfiguracionPage.tsx) */}
            <Route
              path="/configuracion"
              element={
                <ProtectedRoute
                  allowedRoles={["Gerente", "Responsable de calidad", "Responsable de producción"]}
                >
                  <ConfiguracionPage />
                </ProtectedRoute>
              }
            />

            {/* USUARIOS (ADMIN + GERENTE) */}
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute allowedRoles={["Administrador", "Gerente"]}>
                  <UsuariosPage />
                </ProtectedRoute>
              }
            />

            {/* PLANES (solo ADMINISTRADOR) */}
            <Route
              path="/planes"
              element={
                <ProtectedRoute allowedRoles={["Administrador"]}>
                  <PlanesPage />
                </ProtectedRoute>
              }
            />

            {/* PROVEEDORES (ADMINISTRADOR Y GERENTE) */}
            <Route
              path="/proveedores"
              element={
                <ProtectedRoute allowedRoles={["Gerente", "Administrador"]}>
                  <ProveedoresPage />
                </ProtectedRoute>
              }
            />

            {/* TAMBOS (HU-36: tambo de origen del lote, entidad propia bajo un
                proveedor). GET /tambos en el backend (tambo.controller.ts)
                habilita los 5 roles; el gating fino de qué puede hacer cada
                uno (alta, edición, baja/reactivación) vive dentro de
                TambosPage.tsx, no acá: POST es exclusivo de Operario de
                línea/Gerente, PATCH/activar/baja son exclusivos de
                Gerente/Administrador — a propósito distinto del gate de
                /proveedores (solo Gerente/Administrador), porque acá
                Operario de línea sí necesita poder entrar a cargar un tambo
                nuevo sin tener acceso a la gestión de proveedores. */}
            <Route
              path="/tambos"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "Responsable de calidad",
                    "Gerente",
                    "Administrador",
                    "Operario de línea",
                    "Responsable de producción",
                  ]}
                >
                  <TambosPage />
                </ProtectedRoute>
              }
            />

            {/* LOTES (HU-60: Responsable de calidad + Gerente/Administrador como supervisión;
                HU-20 suma Operario de línea -carga manual- y Responsable de producción
                -historial-.
                TODO(backend): GET /lotes y GET /lotes/:id en lote.controller.ts todavía
                solo tienen @Roles(RESPONSABLE_CALIDAD, GERENTE, ADMINISTRADOR) — hasta que
                se sume OPERARIO_LINEA/RESPONSABLE_PRODUCCION ahí, a esos dos roles la
                pantalla les va a quedar vacía/con error 403 (probado con curl, no es bug
                de frontend). El allowedRoles de acá ya está listo para cuando se resuelva. */}
            <Route
              path="/lotes"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "Responsable de calidad",
                    "Gerente",
                    "Administrador",
                    "Operario de línea",
                    "Responsable de producción",
                  ]}
                >
                  <LotesPage />
                </ProtectedRoute>
              }
            />

            {/* REVISIÓN DE CALIDAD (HU-22: aprobación/rechazo manual de lotes No
                Apto). Solo Responsable de Calidad — mismo rol único que
                @Roles(RESPONSABLE_CALIDAD) en GET /lotes/no-aptos,
                POST /lotes/:id/revision en lote.controller.ts. */}
            <Route
              path="/lotes/revision"
              element={
                <ProtectedRoute allowedRoles={["Responsable de calidad"]}>
                  <RevisionLotesPage />
                </ProtectedRoute>
              }
            />

            {/* MEDICIÓN MANUAL (HU-20): vista standalone, exclusiva de Operario de
                línea. Distinta del modal de mediciones manuales dentro de /lotes
                (Responsable de calidad/Gerente/Administrador/Responsable de
                producción siguen usando ese, ver LotesPage.tsx) — Operario de
                línea no tiene acceso a la gestión de lotes en sí, solo a cargar/
                consultar mediciones manuales de los lotes activos sin sensor. */}
            <Route
              path="/mediciones-manuales"
              element={
                <ProtectedRoute allowedRoles={["Operario de línea"]}>
                  <MedicionManualPage />
                </ProtectedRoute>
              }
            />

            {/* SENSORES: alta/edición (HU-17) para Responsable de producción/calidad,
                asociación a lote (HU-33) para Operario de línea/Responsable de calidad,
                Gerente/Administrador acceden en modo lectura (ver sensor.controller.ts) */}
            <Route
              path="/sensores"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "Responsable de producción",
                    "Responsable de calidad",
                    "Operario de línea",
                    "Gerente",
                    "Administrador",
                  ]}
                >
                  <SensoresPage />
                </ProtectedRoute>
              }
            />

            {/* INGRESO A CÁMARA (HU-67: conectado a GET/POST /ingresos-camara
                y al catálogo real de SKU vía GET /skus) — Responsable de
                producción es quien registra el ingreso de producto
                terminado a cámara (único rol habilitado por el backend para
                POST /ingresos-camara). */}
            <Route
              path="/ingreso-camara"
              element={
                <ProtectedRoute allowedRoles={["Responsable de producción"]}>
                  <IngresoCamaraPage />
                </ProtectedRoute>
              }
            />

            {/* ALERTAS — Destinatarios (HU-29): conectado a
                GET/POST/DELETE /notificaciones/configuracion. Administrador
                y Gerente configuran quién recibe cada nivel de alerta, por
                rol o por usuario puntual (AC1/AC2/AC4 del backlog). */}
            <Route
              path="/alertas/destinatarios"
              element={
                <ProtectedRoute allowedRoles={["Administrador", "Gerente"]}>
                  <DestinatariosAlertasPage />
                </ProtectedRoute>
              }
            />

            {/* ALERTAS (HU-25): pantalla "Monitoreo y Alertas", exclusiva de
                Responsable de producción — es quien reacciona a los desvíos
                de calidad detectados sobre los parámetros de los lotes.
                Backend real: extiende el módulo de notificaciones (HU-21)
                con tipo "alerta_umbral" — GET/PATCH /notificaciones + WS
                /notificaciones, evento "notificacion:nueva" (ver
                hooks/useAlertas.ts). */}
            <Route
              path="/alertas"
              element={
                <ProtectedRoute allowedRoles={["Responsable de producción"]}>
                  <AlertasPage />
                </ProtectedRoute>
              }
            />

            {/* ALERTAS — Historial (HU-28): consulta retrospectiva por lote/
                nivel/período para análisis de patrones de desvío e informes
                regulatorios, exclusiva de Responsable de calidad. A
                diferencia de /alertas (HU-25, bandeja de trabajo en vivo de
                Responsable de producción) no depende del WS de
                notificaciones ni de un "no leída" — es de solo lectura sobre
                el histórico. Todavía sin conexión al backend, ver
                TODO(backend) en services/historialAlertas.service.ts. */}
            <Route
              path="/alertas/historial"
              element={
                <ProtectedRoute allowedRoles={["Responsable de calidad"]}>
                  <HistorialAlertasPage />
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
        </EmpresaProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
