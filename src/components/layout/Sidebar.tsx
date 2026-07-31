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
  Settings,
  ClipboardList,
  ClipboardCheck,
  Cpu,
  FlaskConical,
  X,
} from "lucide-react";
import { usuariosService } from "../../services/usuarios.service";
import { empresasService } from "../../services/empresa.service";
import { planesService } from "../../services/planes.service";
import { proveedoresService } from "../../services/proveedores.service";
import { loteService } from "../../services/lote.service";
import { sensorService } from "../../services/sensor.service";
import { useEmpresaActual } from "../../hooks/useEmpresaActual";
import optilacteoLogo from "../../assets/images/optilacteo_logo.png";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { empresa, isLoading: isLoadingEmpresa } = useEmpresaActual();

  const esAdmin = user?.rolNombre === "Administrador";
  const esGerente = user?.rolNombre === "Gerente";
  const esResponsableProduccion = user?.rolNombre === "Responsable de producción";
  const puedeVerDashboard = esAdmin;
  // HU-38: dashboard operativo propio del Responsable de producción — no es
  // el mismo /dashboard de plataforma que ve el Administrador. Gerente
  // también lo puede consultar (ver allowedRoles en App.tsx).
  const puedeVerDashboardProduccion = esResponsableProduccion || esGerente;
  const puedeVerUsuarios = esAdmin || esGerente;
  const puedeVerEmpresas = esAdmin;
  // HU-23: Responsable de calidad entra en modo solo lectura (ver
  // ConfiguracionPage.tsx / App.tsx).
  const puedeVerConfiguracion = esGerente || user?.rolNombre === "Responsable de calidad";
  const puedeVerPlanes = esAdmin;
  const puedeVerProveedores = esAdmin || esGerente;
  // HU-20 suma Operario de línea (carga manual) y Responsable de producción
  // (historial) además de Responsable de calidad/Gerente/Administrador
  // (HU-60).
  // TODO(backend): GET /lotes todavía no habilita esos dos roles nuevos
  // (ver comentario en App.tsx) — la pantalla les va a quedar vacía/con
  // error 403 hasta que se actualice ese lado.
  const puedeVerLotes =
    esAdmin ||
    esGerente ||
    user?.rolNombre === "Responsable de calidad" ||
    user?.rolNombre === "Operario de línea" ||
    user?.rolNombre === "Responsable de producción";
  // HU-22: GET /lotes/no-aptos y POST /lotes/:id/revision son exclusivos de
  // Responsable de Calidad en el backend (lote.controller.ts) — a diferencia
  // de /lotes, ningún otro rol tiene acceso de lectura acá.
  const puedeVerRevisionCalidad = user?.rolNombre === "Responsable de calidad";
  // HU-20: vista standalone de medición manual, exclusiva de Operario de
  // línea (ver comentario en App.tsx sobre por qué no reusa /lotes).
  const puedeVerMedicionManual = user?.rolNombre === "Operario de línea";
  // GET /sensores (backend) habilita también a Responsable de producción y
  // Operario de línea, ver sensor.controller.ts.
  const puedeVerSensores =
    esAdmin ||
    esGerente ||
    user?.rolNombre === "Responsable de calidad" ||
    user?.rolNombre === "Responsable de producción" ||
    user?.rolNombre === "Operario de línea";

  const [counts, setCounts] = useState({
    empresas: 0,
    usuarios: 0,
    planes: 0,
    proveedores: 0,
    lotes: 0,
    sensores: 0,
    revisionCalidad: 0,
  });

  useEffect(() => {
    async function loadCounts() {
      try {
        // Ejecutamos las llamadas
        const [
          empresasRes,
          usuariosRes,
          planesRes,
          proveedoresRes,
          lotesTotal,
          sensoresRes,
          revisionCalidadRes,
        ] = await Promise.all([
            puedeVerEmpresas ? empresasService.getAll({ limit: 1 }) : { data: [], meta: { total: 0 } },
            puedeVerUsuarios ? usuariosService.getAll({ page: 1, limit: 1 }) : { data: [], meta: { total: 0 } },
            // Si planes/proveedores NO están paginados, devuelven array. Si lo están, ajusta a .meta.total
            puedeVerPlanes ? planesService.getAll() : [],
            puedeVerProveedores ? proveedoresService.getAll({ page: 1, limit: 1 }) : { data: [], meta: { total: 0 } },
            // .catch(() => 0): GET /lotes todavía no habilita Operario de
            // línea/Responsable de producción (ver comentario en
            // puedeVerLotes) — que ese 403 no tire abajo el resto de los
            // contadores del Promise.all.
            puedeVerLotes ? loteService.count().catch(() => 0) : 0,
            // No hay endpoint de conteo dedicado para sensores, se toma el length del getAll.
            puedeVerSensores ? sensorService.getAll() : [],
            // HU-22: no hay endpoint de conteo dedicado, se toma el length de
            // GET /lotes/no-aptos.
            puedeVerRevisionCalidad ? loteService.getNoAptos().catch(() => []) : [],
          ]);

        setCounts({
          // Accedemos a meta.total si existe, sino al length del array de datos
          empresas: empresasRes.meta?.total ?? empresasRes.data?.length ?? 0,
          usuarios: usuariosRes.meta?.total ?? usuariosRes.data?.length ?? 0,
          // Si estos NO tienen paginación, siguen siendo arrays y usamos .length
          planes: (Array.isArray(planesRes) ? planesRes.length : 0),
          proveedores: proveedoresRes.meta?.total ?? 0,
          lotes: lotesTotal,
          sensores: sensoresRes.length,
          revisionCalidad: revisionCalidadRes.length,
        });
      } catch (error) {
        console.error("Error al cargar contadores:", error);
      }
    }

    loadCounts();
  }, [
    puedeVerEmpresas,
    puedeVerUsuarios,
    puedeVerPlanes,
    puedeVerProveedores,
    puedeVerLotes,
    puedeVerSensores,
    puedeVerRevisionCalidad,
  ]);
  const navItems = [
    ...(puedeVerDashboard
      ? [{ label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" }]
      : []),
    ...(puedeVerDashboardProduccion
      ? [{ label: "Dashboard", icon: LayoutDashboard, path: "/dashboard-produccion" }]
      : []),
    ...(puedeVerEmpresas
      ? [{ label: "Empresas", icon: Building2, count: counts.empresas, path: "/empresas" }]
      : []),
    ...(puedeVerConfiguracion
      ? [{ label: "Configuración", icon: Settings, path: "/configuracion" }]
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
    ...(puedeVerLotes
      ? [{ label: "Lotes", icon: ClipboardList, count: counts.lotes, path: "/lotes" }]
      : []),
    ...(puedeVerMedicionManual
      ? [{ label: "Medición manual", icon: FlaskConical, path: "/mediciones-manuales" }]
      : []),
    ...(puedeVerRevisionCalidad
      ? [
          {
            label: "Revisión de calidad",
            icon: ClipboardCheck,
            count: counts.revisionCalidad,
            path: "/lotes/revision",
          },
        ]
      : []),
    ...(puedeVerSensores
      ? [{ label: "Sensores", icon: Cpu, count: counts.sensores, path: "/sensores" }]
      : []),
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-screen w-70 flex-shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm transition-transform duration-300 print:hidden dark:border-slate-800 dark:bg-slate-900 dark:shadow-none lg:static lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        {isLoadingEmpresa ? (
          <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
        ) : (
          <img
            src={empresa?.logoUrl || optilacteoLogo}
            alt={empresa?.name ?? "OptiLácteo"}
            className="h-10 w-10 flex-shrink-0 rounded-md object-contain"
          />
        )}

        <div className="min-w-0 flex-1">
          {isLoadingEmpresa ? (
            <div className="h-5 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ) : (
            <h1 className="truncate text-xl font-bold text-slate-900 dark:text-white">
              {empresa?.name ?? "OptiLácteo"}
            </h1>
          )}
        </div>

        <span className="flex-shrink-0 rounded-md bg-blue-100 px-3 py-1 text-xs font-semibold uppercase text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
          {user?.rolNombre ?? "Sin rol"}
        </span>

        <button
          type="button"
          onClick={onClose}
          className={`flex-shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 lg:hidden ${
            isOpen ? "" : "hidden"
          }`}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-2 pb-2 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
          CONSOLA
        </p>

        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Match por prefijo más largo: /lotes/revision no puede activar
            // también "Lotes" (/lotes) solo porque comparte el prefijo.
            const rutaActivaMasEspecifica = navItems
              .map((i) => i.path)
              .filter(
                (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
              )
              .sort((a, b) => b.length - a.length)[0];
            const isActive = item.path === rutaActivaMasEspecifica;

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