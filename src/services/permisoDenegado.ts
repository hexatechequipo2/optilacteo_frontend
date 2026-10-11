// Aviso de "el back respondió 403" para PermisosProvider: el interceptor de
// axios no es un componente y no tiene acceso al contexto (mismo patrón que
// tokenStore.ts).
type Listener = () => void;

const listeners = new Set<Listener>();

export function notificarPermisoDenegado(): void {
  listeners.forEach((listener) => listener());
}

export function subscribePermisoDenegado(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
