import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

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
import LotesPage from "./pages/Lotes/LotesPage";
import RevisionLotesPage from "./pages/Lotes/RevisionLotesPage";
import MedicionManualPage from "./pages/MedicionManual/MedicionManualPage";
import SensoresPage from "./pages/Sensores/SensoresPage";
import SinFuncionalidadesPage from "./pages/SinFuncionalidades/SinFuncionalidadesPage";

import { InactivityMonitor } from "./components/layout/InactivityMonitor";
import { EmpresaProvider } from "./context/EmpresaContext";

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
                RESPONSABLE DE CALIDAD solo consulta — el gating de qué
                pestaña ve cada rol vive en ConfiguracionPage.tsx) */}
            <Route
              path="/configuracion"
              element={
                <ProtectedRoute allowedRoles={["Gerente", "Responsable de calidad"]}>
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
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </EmpresaProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
