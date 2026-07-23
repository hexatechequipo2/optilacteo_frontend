import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

import LoginPage from "./pages/Login/LoginPage";
import ForgotPasswordPage from "./pages/Login/ForgotPasswordPage";
import ResetPasswordPage from "./pages/Login/ResetPasswordPage";

import DashboardPage from "./pages/Dashboard/DashboardPage";
import UsuariosPage from "./pages/Usuarios/UsuariosPage";
import EmpresasPage from "./pages/Empresas/EmpresasPage";
import ConfiguracionPage from "./pages/Configuracion/ConfiguracionPage";
import PlanesPage from "./pages/Planes/PlanesPage";
import ProveedoresPage from "./pages/Proveedores/ProveedoresPage";
import LotesPage from "./pages/Lotes/LotesPage";
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

            {/* EMPRESAS (solo ADMINISTRADOR) */}
            <Route
              path="/empresas"
              element={
                <ProtectedRoute allowedRoles={["Administrador"]}>
                  <EmpresasPage />
                </ProtectedRoute>
              }
            />

            {/* CONFIGURACIÓN (HU-09 Umbrales + HU-12 Logo e identidad: solo GERENTE) */}
            <Route
              path="/configuracion"
              element={
                <ProtectedRoute allowedRoles={["Gerente"]}>
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

            {/* LOTES (HU-60: Responsable de calidad + Gerente/Administrador como supervisión) */}
            <Route
              path="/lotes"
              element={
                <ProtectedRoute allowedRoles={["Responsable de calidad", "Gerente", "Administrador"]}>
                  <LotesPage />
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
