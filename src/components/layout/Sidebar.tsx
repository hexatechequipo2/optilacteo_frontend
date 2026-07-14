import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  LogOut,
  LayoutDashboard,
  Building2,
  Users,
  Package,
  Home,
} from "lucide-react";
import { usuariosService } from "../../services/usuarios.service";
import { empresasService } from "../../services/empresa.service";
import { planesService } from "../../services/planes.service";
import { proveedoresService } from "../../services/proveedores.service";
import optilacteoLogo from "../../assets/images/optilacteo_logo.png";

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const esAdmin = user?.rolNombre === "Administrador";
  const esGerente = user?.rolNombre === "Gerente";
  const puedeVerDashboard = esAdmin;
  const puedeVerUsuarios = esAdmin || esGerente;
  const puedeVerEmpresas = esAdmin;
  const puedeVerPlanes = esAdmin;
  const puedeVerProveedores = esAdmin || esGerente;

  const [counts, setCounts] = useState({
    empresas: 0,
    usuarios: 0,
    planes: 0,
    proveedores: 0,
  });

  useEffect(() => {
    async function loadCounts() {
      try {
        // Ejecutamos las llamadas
        const [empresasRes, usuariosRes, planesRes, proveedoresRes] = await Promise.all([
          puedeVerEmpresas ? empresasService.getAll({ limit: 1 }) : { data: [], meta: { total: 0 } },
          puedeVerUsuarios ? usuariosService.getAll({ page: 1, limit: 1 }) : { data: [], meta: { total: 0 } },
          // Si planes/proveedores NO están paginados, devuelven array. Si lo están, ajusta a .meta.total
          puedeVerPlanes ? planesService.getAll() : [],
          puedeVerProveedores ? proveedoresService.getAll({ page: 1, limit: 1 }) : { data: [], meta: { total: 0 } },
        ]);

        setCounts({
          // Accedemos a meta.total si existe, sino al length del array de datos
          empresas: empresasRes.meta?.total ?? empresasRes.data?.length ?? 0,
          usuarios: usuariosRes.meta?.total ?? usuariosRes.data?.length ?? 0,
          // Si estos NO tienen paginación, siguen siendo arrays y usamos .length
          planes: (Array.isArray(planesRes) ? planesRes.length : 0),
          proveedores: proveedoresRes.meta?.total ?? 0,
        });
      } catch (error) {
        console.error("Error al cargar contadores:", error);
      }
    }

    loadCounts();
  }, [puedeVerEmpresas, puedeVerUsuarios, puedeVerPlanes, puedeVerProveedores]);
  const navItems = [
    ...(puedeVerDashboard
      ? [{ label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" }]
      : []),
    ...(puedeVerEmpresas
      ? [{ label: "Empresas", icon: Building2, count: counts.empresas, path: "/empresas" }]
      : []),
    ...(puedeVerUsuarios
      ? [{ label: "Usuarios", icon: Users, count: counts.usuarios, path: "/usuarios" }]
      : []),
    ...(puedeVerPlanes
      ? [{ label: "Planes", icon: Package, count: counts.planes, path: "/planes" }]
      : []),
    ...(puedeVerProveedores
      ? [{ label: "Proveedores", icon: Home, count: counts.proveedores, path: "/proveedores" }]
      : []),
  ];

  return (
    <aside className="flex h-screen w-70 flex-shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <img src={optilacteoLogo} alt="OptiLácteo" className="h-10 w-10 object-contain flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-slate-900 dark:text-white">OptiLácteo</h1>
        </div>
        <span className="flex-shrink-0 rounded-md bg-blue-100 px-3 py-1 text-xs font-semibold uppercase text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
          {user?.rolNombre ?? "Sin rol"}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-2 pb-2 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
          CONSOLA
        </p>

        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
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
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
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

      <div className="flex-shrink-0 border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold uppercase text-white">
            {(user?.email ?? "U").slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
              {user?.email ?? "Usuario"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {user?.rolNombre ?? "Sin rol"}
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-md p-2 text-slate-400 transition hover:bg-slate-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-red-400"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}