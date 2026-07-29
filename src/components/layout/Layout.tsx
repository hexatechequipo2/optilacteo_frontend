import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { useNotificaciones } from "../../hooks/useNotificaciones";
import { Bell, Moon, Sun, Menu } from "lucide-react";

interface LayoutProps {
  breadcrumb: string;
  children: ReactNode;
}

export function Layout({ breadcrumb, children }: LayoutProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notificaciones, noLeidasCount, marcarLeida } = useNotificaciones();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const breadcrumbs = breadcrumb.split(" > ");

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {isSidebarOpen && <Sidebar />}

      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4 dark:border-slate-800 dark:bg-slate-900">
          {/* Breadcrumb y menú */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>

            <nav className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((item, index) => (
                <div key={item} className="flex items-center gap-2">
                  {index > 0 && (
                    <span className="text-slate-300 dark:text-slate-600">
                      ›
                    </span>
                  )}

                  <span
                    className={
                      index === breadcrumbs.length - 1
                        ? "font-semibold text-slate-900 dark:text-white"
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
          <div className="flex items-center gap-4">
            <span className="rounded-full bg-blue-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
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

            <div className="relative">
              <button
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className="relative rounded-full border border-slate-200 p-2 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                title="Notificaciones"
              >
                <Bell className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                {noLeidasCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {noLeidasCount > 9 ? "9+" : noLeidasCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsNotifOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Notificaciones
                      </p>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notificaciones.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                          No tenés notificaciones.
                        </p>
                      ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                          {notificaciones.map((n) => (
                            <li
                              key={n.id}
                              className={`flex flex-col gap-1.5 px-4 py-3 ${
                                n.leida ? "" : "bg-blue-50/60 dark:bg-blue-500/10"
                              }`}
                            >
                              <span className="text-sm text-slate-700 dark:text-slate-300">
                                {n.mensaje}
                              </span>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-slate-400 dark:text-slate-500">
                                  {new Date(n.createdAt).toLocaleString("es-AR")}
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

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold uppercase text-white">
                {(user?.email ?? "U").slice(0, 2).toUpperCase()}
              </div>

              <div className="min-w-0">
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
    </div>
  );
}