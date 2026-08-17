import axios, { type InternalAxiosRequestConfig } from "axios";
import { authService } from "./auth.service";
import { getAccessToken, setAccessToken } from "./tokenStore";
import { clearRefreshToken, getStoredRefreshToken, storeRefreshToken } from "./refreshTokenStorage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
});

// Agrega el JWT automáticamente. El access_token vive en memoria (tokenStore),
// no en sessionStorage.
api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

function clearSession(): void {
  setAccessToken(null);
  localStorage.removeItem("usuario");
  clearRefreshToken();
}

function redirectToLogin(): void {
  // Evita un bucle si ya estamos en login
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Refresh concurrente: si varios requests fallan con 401 al mismo tiempo, se
// dispara un solo POST /refresh y todos esperan esa misma promesa compartida,
// que se resetea al terminar (haya salido bien o mal).
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const stored = getStoredRefreshToken();
      if (!stored) {
        throw new Error("No hay refresh token disponible");
      }

      const data = await authService.refresh(stored.token);
      setAccessToken(data.access_token);
      storeRefreshToken(data.refresh_token, stored.storage);

      return data.access_token;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

// Ante un 401: intenta refrescar el access_token una sola vez y reintenta el
// request original con el token nuevo. Si el propio refresh falla (o el que
// dio 401 ya era /refresh, o este request ya se había reintentado), recién
// ahí cierra la sesión y redirige a /login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes("/refresh") || originalRequest._retry) {
      clearSession();
      redirectToLogin();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newToken = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearSession();
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  },
);

export default api;
