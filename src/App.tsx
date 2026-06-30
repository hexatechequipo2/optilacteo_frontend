import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { Role } from "./types/usuario.types";
import LoginPage from "./pages/Login/LoginPage";
import ForgotPasswordPage from "./pages/Login/ForgotPasswordPage";
import ResetPasswordPage from "./pages/Login/ResetPasswordPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import UsuariosPage from "./pages/Usuarios/UsuariosPage";
import EmpresasPage from "./pages/Empresas/EmpresasPage";
import PlanesPage from "./pages/Planes/PlanesPage";
import ProveedoresPage from "./pages/Proveedores/ProveedoresPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/empresas"
            element={
              <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                <EmpresasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute allowedRoles={[Role.ADMIN, Role.GERENTE]}>
                <UsuariosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/planes"
            element={
              <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                <PlanesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/proveedores"
            element={
              <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                <ProveedoresPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;