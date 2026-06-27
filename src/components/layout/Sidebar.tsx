import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  LogOut,
  LayoutDashboard,
  Building2,
  Users,
} from "lucide-react";
import { usuariosService } from "../../services/usuarios.service";
import { empresasService } from "../../services/empresa.service";
import { getRoleLabel, Role } from "../../types/usuario.types";
import optilacteoLogo from "../../assets/images/optilacteo_logo.png";

export function Sidebar() {
  const { user, logout } = useAuth();
  
  const esAdmin = user?.role === Role.ADMIN;
  const esGerente = user?.role === Role.GERENTE;
  const puedeVerUsuarios = esAdmin || esGerente;

  const [counts, setCounts] = useState({
    empresas: 0,
    usuarios: 0,
  });

  useEffect(() => {
    async function loadCounts() {
      try {
        const [empresas, usuarios] = await Promise.all([
          empresasService.getAll(),
          puedeVerUsuarios ? usuariosService.getAll() : Promise.resolve([])
        ]);

        setCounts({
          empresas: empresas.length,
          usuarios: usuarios.length,
        });
      } catch (error) {
        console.error("Error al cargar contadores:", error);
      }
    }

    loadCounts();
  }, [puedeVerUsuarios]);

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard },
    { label: "Empresas", icon: Building2, count: counts.empresas },
    ...(puedeVerUsuarios
      ? [{ label: "Usuarios", icon: Users, count: counts.usuarios }]
      : []),
  ];

  return (
    <aside className="flex h-screen w-70 flex-shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm transition-all duration-300">
      <div className="flex items-center gap-3 border-b border-slate-200 p-4">
        <img src={optilacteoLogo} alt="OptiLácteo" className="h-10 w-10 object-contain flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-slate-900">OptiLácteo</h1>
        </div>
        <span className="flex-shrink-0 rounded-md bg-blue-100 px-3 py-1 text-xs font-semibold uppercase text-blue-700">
          {user?.role}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-2 pb-2 text-xs font-semibold tracking-wide text-slate-400">
          CONSOLA
        </p>

        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === "Usuarios"; 

            return (
              <li key={item.label}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>

                  {item.count !== undefined && (
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs ${
                        isActive
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex-shrink-0 border-t border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold uppercase text-white">
            {(user?.email ?? "U").slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {user?.email ?? "Usuario"}
            </p>
            <p className="text-xs text-slate-500">
              {getRoleLabel(user?.role ?? "")}
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-md p-2 text-slate-400 transition hover:bg-slate-50 hover:text-red-600"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}