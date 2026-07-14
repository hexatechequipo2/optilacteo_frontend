import {
  createContext,
  useState,
  useEffect,
  type ReactNode,
  useContext,
} from "react";
import { authService } from "../services/auth.service";
import type { LoginResponse } from "../types/usuario.types";

type AuthUser = LoginResponse["user"];

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

const TOKEN_KEY = "token";
const USER_KEY = "usuario";
const REFRESH_TOKEN_KEY = "refreshToken";

function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

type RefreshTokenStorage = "local" | "session";

// El backend rota el refresh_token en cada uso (el anterior queda invalidado),
// así que hay que recordar en qué storage vive para reescribirlo ahí mismo.
function getStoredRefreshToken(): {
  token: string;
  storage: RefreshTokenStorage;
} | null {
  const local = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (local) return { token: local, storage: "local" };

  const session = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  if (session) return { token: session, storage: "session" };

  return null;
}

// rememberMe: true -> localStorage (sobrevive al cierre del navegador)
// rememberMe: false -> sessionStorage (se pierde al cerrar el navegador)
function storeRefreshToken(refreshToken: string, storage: RefreshTokenStorage) {
  if (storage === "local") {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  } else {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

function clearRefreshToken() {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(false);
  // Si no hay access_token pero sí un refresh token persistido, hay que
  // intentar restaurar la sesión antes de dejar que las rutas protegidas decidan.
  const [isInitializing, setIsInitializing] = useState(
    () => !sessionStorage.getItem(TOKEN_KEY) && !!getStoredRefreshToken(),
  );

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
        sessionStorage.setItem(TOKEN_KEY, data.access_token);
        storeRefreshToken(data.refresh_token, stored.storage);
        setToken(data.access_token);
      } catch (error) {
        console.error("No se pudo restaurar la sesión:", error);
        sessionStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        clearRefreshToken();
        setToken(null);
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
      sessionStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      storeRefreshToken(data.refresh_token, rememberMe ? "local" : "session");
      setToken(data.access_token);
      setUser(data.user);
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
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      clearRefreshToken();
      setToken(null);
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