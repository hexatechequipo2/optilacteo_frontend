import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { useNotificaciones } from "../../hooks/useNotificaciones";
import { Bell, Moon, Sun, Menu } from "lucide-react";
import { FloatingDictadoVozButton } from "../FloatingDictadoVozButton";

const SIDEBAR_COLAPSADO_KEY = "sidebar-colapsado";

// Si el storage no está disponible (modo privado, bloqueado), el menú
// arranca expandido y el estado vive solo en memoria.
function leerSidebarColapsado(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLAPSADO_KEY) === "true";
  } catch {
    return false;
  }
}

function guardarSidebarColapsado(colapsado: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLAPSADO_KEY, String(colapsado));
  } catch {
    // Sin persistencia: se pierde al recargar, pero el toggle sigue andando.
  }
}

interface LayoutProps {
  breadcrumb: string;
  children: ReactNode;
}

export function Layout({ breadcrumb, children }: LayoutProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    notificaciones,
    noLeidasCount,
    isLoading,
    error,
    refetch,
    marcarLeida,
    marcarTodasLeidas,
    marcandoTodas,
    errorMarcarTodas,
    limpiarErrorMarcarTodas,
  } = useNotificaciones();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarColapsado, setIsSidebarColapsado] = useState(leerSidebarColapsado);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  // El conteo puede superar la página cargada (o ser null si falló); la lista cubre ese caso.
  const hayNoLeidas = (noLeidasCount ?? 0) > 0 || notificaciones.some((n) => !n.leida);

  // El error de "marcar todas" no sobrevive a cerrar el desplegable.
  const cerrarNotif = () => {
    setIsNotifOpen(false);
    limpiarErrorMarcarTodas();
  };

  const breadcrumbs = breadcrumb.split(" > ");

  const toggleSidebarColapsado = () => {
    const next = !isSidebarColapsado;
    setIsSidebarColapsado(next);
    guardarSidebarColapsado(next);
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarColapsado}
      />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col overflow-y-auto print:overflow-visible">
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 print:hidden dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-4 lg:px-8">
          {/* Breadcrumb y menú */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            {/* Mismo ícono, dos acciones según el breakpoint (sin JS): en
                mobile abre el drawer, en escritorio colapsa o expande. */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Abrir menú lateral"
              aria-expanded={isSidebarOpen}
              className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              onClick={toggleSidebarColapsado}
              aria-label={isSidebarColapsado ? "Expandir menú lateral" : "Colapsar menú lateral"}
              aria-expanded={!isSidebarColapsado}
              aria-controls="sidebar-principal"
              title={isSidebarColapsado ? "Expandir menú lateral" : "Colapsar menú lateral"}
              className="hidden rounded-md p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:flex"
            >
              <Menu className="h-5 w-5" />
            </button>

            <nav className="flex min-w-0 items-center gap-2 text-sm">
              {breadcrumbs.map((item, index) => (
                <div
                  key={item}
                  className={`items-center gap-2 ${
                    index === breadcrumbs.length - 1 ? "flex" : "hidden sm:flex"
                  }`}
                >
                  {index > 0 && (
                    <span className="text-slate-300 dark:text-slate-600">
                      ›
                    </span>
                  )}

                  <span
                    className={
                      index === breadcrumbs.length - 1
                        ? "truncate font-semibold text-slate-900 dark:text-white"
                        : "text-slate-500 dark:text-slate-400"
                    }
                  >
                    {item}
                  </span>
                </div>
              ))}
            </nav>
          </div>

          {/* Acciones */}
          <div className="relative flex items-center gap-2 sm:gap-4">
            <span className="hidden rounded-full bg-blue-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 sm:inline-block">
              Plataforma
            </span>

            <button
              onClick={toggleTheme}
              className="rounded-full border border-slate-200 p-2 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              title="Cambiar tema"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-slate-400" />
              ) : (
                <Moon className="h-5 w-5 text-slate-500" />
              )}
            </button>

            <div>
              <button
                onClick={() => (isNotifOpen ? cerrarNotif() : setIsNotifOpen(true))}
                className="relative rounded-full border border-slate-200 p-2 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                title="Notificaciones"
                aria-label={noLeidasCount ? `Notificaciones, ${noLeidasCount} sin leer` : "Notificaciones"}
              >
                <Bell className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                {noLeidasCount !== null && noLeidasCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {noLeidasCount > 9 ? "9+" : noLeidasCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={cerrarNotif}
                  />
                  <div className="absolute right-0 top-full z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          Notificaciones
                        </p>
                        {(hayNoLeidas || marcandoTodas) && (
                          <button
                            type="button"
                            onClick={() => void marcarTodasLeidas()}
                            disabled={marcandoTodas}
                            className="shrink-0 text-xs font-medium text-blue-600 transition hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:no-underline dark:text-blue-400"
                          >
                            Marcar todas como leídas
                          </button>
                        )}
                      </div>
                      {errorMarcarTodas && (
                        <p role="alert" className="mt-1 text-xs text-red-700 dark:text-red-400">
                          {errorMarcarTodas}
                        </p>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {isLoading ? (
                        <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                          Cargando notificaciones...
                        </p>
                      ) : error ? (
                        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center text-sm text-red-700 dark:text-red-400">
                          <span>{error}</span>
                          <button
                            type="button"
                            onClick={() => void refetch()}
                            className="rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
                          >
                            Reintentar
                          </button>
                        </div>
                      ) : notificaciones.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                          No tenés notificaciones.
                        </p>
                      ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                          {notificaciones.map((n) => (
                            <li
                              key={n.id}
                              className={`flex flex-col gap-1.5 px-4 py-3 ${
                                n.leida
                                  ? ""
                                  : "bg-blue-50/60 dark:bg-blue-500/10"
                              }`}
                            >
                              <span className="text-sm text-slate-700 dark:text-slate-300">
                                {n.mensaje}
                              </span>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-slate-400 dark:text-slate-500">
                                  {new Date(n.createdAt).toLocaleString(
                                    "es-AR",
                                  )}
                                </span>
                                {!n.leida && (
                                  <button
                                    type="button"
                                    onClick={() => void marcarLeida(n.id)}
                                    className="shrink-0 text-xs font-medium text-blue-600 transition hover:underline dark:text-blue-400"
                                  >
                                    Marcar como leído
                                  </button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="hidden h-8 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold uppercase text-white">
                {(user?.email ?? "U").slice(0, 2).toUpperCase()}
              </div>

              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {user?.email ?? "Usuario"}
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user?.rolNombre ?? "Sin rol"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* HU-55: botón flotante de dictado por voz, gateado por rol adentro
          del propio componente (mismo criterio que Sidebar.tsx). Vive acá,
          fuera de <main>, para quedar fijo en pantalla sin importar el
          scroll del contenido de cada página. */}
      <FloatingDictadoVozButton />
    </div>
  );
}
