import {
  createContext,
  useState,
  useEffect,
  type ReactNode,
  useContext,
} from "react";
import { authService } from "../services/auth.service";
import { getAccessToken, setAccessToken, subscribeAccessToken } from "../services/tokenStore";
import {
  clearRefreshToken,
  getStoredRefreshToken,
  storeRefreshToken,
} from "../services/refreshTokenStorage";
import type { LoginResponse } from "../types/usuario.types";

type AuthUser = LoginResponse["user"];

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

const USER_KEY = "usuario";

function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // El access_token vive en memoria (tokenStore), no en sessionStorage: al
  // recargar la página se pierde acá y en el módulo por igual, y se
  // restaura solo a través del flujo de isInitializing de más abajo.
  const [token, setToken] = useState<string | null>(() => getAccessToken());
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(false);
  // Si no hay access_token pero sí un refresh token persistido, hay que
  // intentar restaurar la sesión antes de dejar que las rutas protegidas decidan.
  const [isInitializing, setIsInitializing] = useState(
    () => !getAccessToken() && !!getStoredRefreshToken(),
  );

  // Mantiene el estado de React sincronizado si el token en memoria cambia
  // "por su cuenta" (p. ej. el interceptor de axios lo refresca en segundo
  // plano ante un 401 de cualquier request, no solo por login/logout acá).
  useEffect(() => {
    return subscribeAccessToken(setToken);
  }, []);

  useEffect(() => {
    if (!isInitializing) return;

    const stored = getStoredRefreshToken();
    if (!stored) {
      setIsInitializing(false);
      return;
    }

    (async () => {
      try {
        const data = await authService.refresh(stored.token);
        setAccessToken(data.access_token);
        storeRefreshToken(data.refresh_token, stored.storage);
      } catch (error) {
        console.error("No se pudo restaurar la sesión:", error);
        setAccessToken(null);
        localStorage.removeItem(USER_KEY);
        clearRefreshToken();
        setUser(null);
      } finally {
        setIsInitializing(false);
      }
    })();
  }, [isInitializing]);

  const login = async (
    email: string,
    password: string,
    rememberMe: boolean,
  ) => {
    setIsLoading(true);
    try {
      const data = await authService.login({ email, password, rememberMe });
      setAccessToken(data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      storeRefreshToken(data.refresh_token, rememberMe ? "local" : "session");
      setUser(data.user);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Intentamos revocar el token en el servidor primero
      await authService.logout();
    } catch (error) {
      console.error("Error al revocar sesión en el servidor:", error);
    } finally {
      // Limpieza local independientemente del resultado del servidor
      setAccessToken(null);
      localStorage.removeItem(USER_KEY);
      clearRefreshToken();
      setUser(null);
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!token,
        isLoading,
        isInitializing,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para facilitar el uso del contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};