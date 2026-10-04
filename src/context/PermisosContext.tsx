import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { getMisPermisos } from "../services/permisos.service";
import { subscribePermisoDenegado } from "../services/permisoDenegado";
import { subscribeAccessToken } from "../services/tokenStore";
import {
  FLAG_POR_ACCION,
  type AccionPermiso,
  type MisPermisos,
  type ModuloPermiso,
} from "../types/permisos.types";

interface PermisosContextType {
  permisos: MisPermisos | null;
  esSistema: boolean;
  isLoading: boolean;
  error: string | null;
  // Varios módulos = OR, igual que PermissionsGuard en el back.
  puede: (modulo: ModuloPermiso | ModuloPermiso[], accion: AccionPermiso) => boolean;
  recargar: () => Promise<MisPermisos | null>;
}

export const PermisosContext = createContext<PermisosContextType | undefined>(undefined);

// El back es la fuente de verdad: se leen de la BD (GET /auth/me/permisos),
// no del JWT ni de rolNombre. Se cargan al login/restaurar sesión y se
// refrescan en silencio al rotar el access_token, al volver el foco a la
// pestaña y ante cualquier 403, así el menú sigue a la matriz sin F5.
export function PermisosProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const [permisos, setPermisos] = useState<MisPermisos | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Descarta respuestas viejas si cambia el usuario o se pisan dos recargas.
  const ultimaPeticion = useRef(0);
  const enCurso = useRef(false);
  const ultimaSilenciosa = useRef(0);
  const autenticado = useRef(false);
  autenticado.current = isAuthenticated && !isInitializing;

  // Si falla, no toca `permisos`: en la carga inicial ya vienen en null (los
  // limpia el efecto de abajo) y en una recarga silenciosa se conservan los
  // anteriores, así un error transitorio no deja al usuario sin pantallas.
  const recargar = useCallback(async () => {
    const id = ++ultimaPeticion.current;
    enCurso.current = true;
    try {
      const data = await getMisPermisos();
      if (id !== ultimaPeticion.current) return null;
      // Misma matriz → misma referencia: así `puede` no cambia de identidad y
      // los efectos que dependen de él no vuelven a pedir (403 → recarga →
      // refetch → 403 sería un bucle).
      setPermisos((prev) => (mismosPermisos(prev, data) ? prev : data));
      setError(null);
      return data;
    } catch {
      if (id !== ultimaPeticion.current) return null;
      setError("No se pudieron cargar tus permisos.");
      return null;
    } finally {
      if (id === ultimaPeticion.current) {
        enCurso.current = false;
        setIsLoading(false);
      }
    }
  }, []);

  // Disparadores silenciosos (rotación del token, foco de pestaña, 403):
  // máximo uno cada 5 s y nunca en paralelo, porque una pantalla puede
  // tirar varios 403 a la vez.
  const recargarEnSilencio = useCallback(() => {
    if (!autenticado.current || enCurso.current) return;
    const ahora = Date.now();
    if (ahora - ultimaSilenciosa.current < 5000) return;
    ultimaSilenciosa.current = ahora;
    void recargar();
  }, [recargar]);

  useEffect(() => {
    if (isInitializing) return;
    // Logout o cambio de usuario: limpiar antes que nada, para no arrastrar
    // ni por un instante los permisos de la cuenta anterior.
    setPermisos(null);
    setError(null);
    if (!isAuthenticated) {
      ultimaPeticion.current++;
      enCurso.current = false;
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    recargar();
    // user?.id: otro login en la misma SPA sin recarga de página.
  }, [isAuthenticated, isInitializing, user?.id, recargar]);

  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === "visible") recargarEnSilencio();
    };
    document.addEventListener("visibilitychange", alVolver);
    const bajaToken = subscribeAccessToken((token) => {
      if (token) recargarEnSilencio();
    });
    const baja403 = subscribePermisoDenegado(recargarEnSilencio);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      bajaToken();
      baja403();
    };
  }, [recargarEnSilencio]);

  const puede = useCallback(
    (modulo: ModuloPermiso | ModuloPermiso[], accion: AccionPermiso) => {
      if (!permisos) return false;
      if (permisos.esSistema) return true;
      const flag = FLAG_POR_ACCION[accion];
      const modulos = Array.isArray(modulo) ? modulo : [modulo];
      return modulos.some((m) =>
        permisos.permisos.some((p) => p.modulo === m && p[flag]),
      );
    },
    [permisos],
  );

  // Recién logueado, el efecto de carga todavía no corrió: sin esto hay un
  // render con isLoading=false y permisos=null, y la landing o ProtectedRoute
  // decidirían "sin acceso".
  const cargando =
    isInitializing || isLoading || (isAuthenticated && !permisos && !error);

  return (
    <PermisosContext.Provider
      value={{
        permisos,
        esSistema: permisos?.esSistema ?? false,
        isLoading: cargando,
        error,
        puede,
        recargar,
      }}
    >
      {children}
    </PermisosContext.Provider>
  );
}

function mismosPermisos(a: MisPermisos | null, b: MisPermisos): boolean {
  if (!a) return false;
  const clave = (p: MisPermisos) =>
    JSON.stringify({
      ...p,
      permisos: [...p.permisos].sort((x, y) => x.modulo.localeCompare(y.modulo)),
    });
  return clave(a) === clave(b);
}
