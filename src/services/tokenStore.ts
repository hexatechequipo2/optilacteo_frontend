// El access_token vive solo en memoria (nunca en sessionStorage/localStorage)
// para reducir la superficie de robo por XSS: un script inyectado que lea
// storage ya no lo encuentra ahí. Este módulo es la única fuente de verdad,
// así que tanto AuthContext (React) como el interceptor de axios y el socket
// (que no son componentes/hooks y no tienen acceso al context) leen y
// escriben del mismo lugar.
//
// El refresh_token sigue en localStorage/sessionStorage como antes (ver
// refreshTokenStorage.ts) — es una limitación conocida, fuera de este alcance.

type Listener = (token: string | null) => void;

let accessToken: string | null = null;
const listeners = new Set<Listener>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  listeners.forEach((listener) => listener(token));
}

// Permite que AuthContext refleje en su estado de React un token que el
// interceptor de axios actualizó por su cuenta (refresh automático ante un
// 401 disparado por cualquier request, no solo por una acción del usuario).
export function subscribeAccessToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
