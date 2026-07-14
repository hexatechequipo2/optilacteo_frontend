import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { Bell, Moon, Sun, Menu } from "lucide-react";

interface LayoutProps {
  breadcrumb: string;
  children: ReactNode;
}

export function Layout({ breadcrumb, children }: LayoutProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

            <button
              className="rounded-full border border-slate-200 p-2 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              title="Notificaciones"
            >
              <Bell className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </button>

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