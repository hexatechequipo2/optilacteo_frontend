// Helpers para persistir el refresh_token. Extraídos de AuthContext para que
// también los use el interceptor de axios (api.ts) al refrescar ante un 401.
//
// El backend rota el refresh_token en cada uso (el anterior queda
// invalidado y su reuso dispara la revocación de toda la familia de
// tokens), así que hay que recordar en qué storage vive para reescribirlo
// ahí mismo.

const REFRESH_TOKEN_KEY = "refreshToken";

export type RefreshTokenStorage = "local" | "session";

export function getStoredRefreshToken(): {
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
export function storeRefreshToken(
  refreshToken: string,
  storage: RefreshTokenStorage,
): void {
  if (storage === "local") {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  } else {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}
