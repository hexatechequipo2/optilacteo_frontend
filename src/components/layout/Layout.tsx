import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../hooks/useAuth";
import { Bell, Moon, Menu } from "lucide-react";
import { getRoleLabel } from "../../types/usuario.types";

interface LayoutProps {
  breadcrumb: string;
  children: ReactNode;
}

export function Layout({ breadcrumb, children }: LayoutProps) {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const breadcrumbs = breadcrumb.split(" > ");

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {isSidebarOpen && <Sidebar />}

      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
          {/* Breadcrumb y Menú */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 transition"
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((item, index) => (
                <div key={item} className="flex items-center gap-2">
                  {index > 0 && <span className="text-slate-300">›</span>}
                  <span
                    className={
                      index === breadcrumbs.length - 1
                        ? "font-semibold text-slate-900"
                        : "text-slate-500"
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
            <span className="rounded-full bg-blue-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
              Plataforma
            </span>

            <button
              className="rounded-full border border-slate-200 p-2 transition hover:bg-slate-100"
              title="Cambiar tema"
            >
              <Moon className="h-5 w-5 text-slate-500" />
            </button>

            <button
              className="rounded-full border border-slate-200 p-2 transition hover:bg-slate-100"
              title="Notificaciones"
            >
              <Bell className="h-5 w-5 text-slate-500" />
            </button>

            <div className="h-8 w-px bg-slate-200" />

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold uppercase text-white">
                {(user?.email ?? "U").slice(0, 2).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {user?.email ?? "Usuario"}
                </p>
                <p className="text-xs text-slate-500">
                  {getRoleLabel(user?.role ?? "")}
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