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
  Bell,
  Siren,
  History,
  Snowflake,
  Droplets,
  HardDrive,
  ShieldCheck,
  X,
  KeyRound,
  Route,
} from "lucide-react";
import { usuariosService } from "../../services/usuarios.service";
import { empresasService } from "../../services/empresa.service";
import { planesService } from "../../services/planes.service";
import { proveedoresService } from "../../services/proveedores.service";
import { loteService } from "../../services/lote.service";
import { sensorService } from "../../services/sensor.service";
import { useEmpresaActual } from "../../hooks/useEmpresaActual";
import { usePermisos } from "../../hooks/usePermisos";
import { puedeEntrarA, type RutaApp } from "../../utils/accesoRutas";
import optilacteoLogo from "../../assets/images/optilacteo_logo.png";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
}

export function Sidebar({ isOpen, onClose, isCollapsed }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { empresa, isLoading: isLoadingEmpresa } = useEmpresaActual();

  const permisos = usePermisos();
  const entra = (ruta: RutaApp) => puedeEntrarA(ruta, permisos);

  // La visibilidad de cada ítem sale de la misma regla que protege la ruta
  // (utils/accesoRutas.ts), así menú y ProtectedRoute no se desalinean.
  const puedeVerDashboard = entra("/dashboard");
  const puedeVerDashboardProduccion = entra("/dashboard-produccion");
  const puedeVerUsuarios = entra("/usuarios");
  const puedeVerRoles = entra("/roles");
  const puedeVerAuditoria = entra("/auditoria");
  const puedeVerEmpresas = entra("/empresas");
  const puedeVerDispositivos = entra("/dispositivos");
  const puedeVerConfiguracion = entra("/configuracion");
  const puedeVerPlanes = entra("/planes");
  const puedeVerProveedores = entra("/proveedores");
  const puedeVerTambos = entra("/tambos");
  const puedeVerLotes = entra("/lotes");
  const puedeVerRevisionCalidad = entra("/lotes/revision");
  const puedeVerConsultaLotes = entra("/lotes/consulta");
  const puedeVerMedicionManual = entra("/mediciones-manuales");
  const puedeVerIngresoCamara = entra("/ingreso-camara");
  const puedeVerSensores = entra("/sensores");
  const puedeVerConfigAlertas = entra("/alertas/destinatarios");
  const puedeVerAlertasMonitoreo = entra("/alertas");
  const puedeVerHistorialAlertas = entra("/alertas/historial");

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
        // Cada llamada lleva su propio .catch(): un 403/500 aislado (p.ej. un
        // rol con un permiso de módulo desactivado) no debe tirar abajo el
        // resto de los contadores vía el reject conjunto de Promise.all.
        const [
          empresasRes,
          usuariosRes,
          planesRes,
          proveedoresRes,
          lotesTotal,
          sensoresRes,
          revisionCalidadRes,
        ] = await Promise.all([
            puedeVerEmpresas
              ? empresasService.getAll({ limit: 1 }).catch(() => ({ data: [], meta: { total: 0 } }))
              : { data: [], meta: { total: 0 } },
            puedeVerUsuarios
              ? usuariosService.getAll({ page: 1, limit: 1 }).catch(() => ({ data: [], meta: { total: 0 } }))
              : { data: [], meta: { total: 0 } },
            // Si planes/proveedores NO están paginados, devuelven array. Si lo están, ajusta a .meta.total
            puedeVerPlanes ? planesService.getAll().catch(() => []) : [],
            puedeVerProveedores
              ? proveedoresService.getAll({ page: 1, limit: 1 }).catch(() => ({ data: [], meta: { total: 0 } }))
              : { data: [], meta: { total: 0 } },
            puedeVerLotes ? loteService.count().catch(() => 0) : 0,
            // No hay endpoint de conteo dedicado para sensores, se toma el length del getAll.
            puedeVerSensores ? sensorService.getAll().catch(() => []) : [],
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
    ...(puedeVerDispositivos
      ? [{ label: "Dispositivos", icon: HardDrive, path: "/dispositivos" }]
      : []),
    ...(puedeVerConfiguracion
      ? [{ label: "Configuración", icon: Settings, path: "/configuracion" }]
      : []),
    ...(puedeVerUsuarios
      ? [{ label: "Usuarios", icon: Users, count: counts.usuarios, path: "/usuarios" }]
      : []),
    ...(puedeVerRoles
      ? [{ label: "Roles y permisos", icon: KeyRound, path: "/roles" }]
      : []),
    ...(puedeVerAuditoria
      ? [{ label: "Auditoría", icon: ShieldCheck, path: "/auditoria" }]
      : []),
    ...(puedeVerPlanes
      ? [{ label: "Planes", icon: Package, count: counts.planes, path: "/planes" }]
      : []),
    ...(puedeVerProveedores
      ? [
          {
            label: "Proveedores",
            icon: Home,
            count: counts.proveedores,
            path: "/proveedores",
          },
        ]
      : []),
    ...(puedeVerTambos ? [{ label: "Tambos", icon: Droplets, path: "/tambos" }] : []),
    ...(puedeVerLotes
      ? [{ label: "Lotes", icon: ClipboardList, count: counts.lotes, path: "/lotes" }]
      : []),
    ...(puedeVerConsultaLotes
      ? [{ label: "Consulta de lotes", icon: Route, path: "/lotes/consulta" }]
      : []),
    ...(puedeVerMedicionManual
      ? [{ label: "Medición manual", icon: FlaskConical, path: "/mediciones-manuales" }]
      : []),
    ...(puedeVerIngresoCamara
      ? [{ label: "Ingreso a cámara", icon: Snowflake, path: "/ingreso-camara" }]
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
    ...(puedeVerConfigAlertas
      ? [{ label: "Config. de alertas", icon: Bell, path: "/alertas/destinatarios" }]
      : []),
    ...(puedeVerAlertasMonitoreo
      ? [{ label: "Alertas", icon: Siren, path: "/alertas" }]
      : []),
    ...(puedeVerHistorialAlertas
      ? [{ label: "Historial de alertas", icon: History, path: "/alertas/historial" }]
      : []),
  ];

  // El modo colapsado es solo de escritorio: todo lo que oculta o reacomoda
  // va con prefijo lg:, así el drawer de mobile se ve siempre completo
  // aunque haya quedado guardado "colapsado".
  const ocultoSiColapsado = isCollapsed ? "lg:hidden" : "";

  return (
    <aside
      id="sidebar-principal"
      className={`fixed inset-y-0 left-0 z-40 flex h-screen w-70 flex-shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-sm transition-[translate,width] duration-300 print:hidden dark:border-slate-800 dark:bg-slate-900 dark:shadow-none lg:static lg:translate-x-0 ${
        isCollapsed ? "lg:w-18" : ""
      } ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="flex items-start gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        {isLoadingEmpresa ? (
          <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
        ) : (
          <img
            src={empresa?.logoUrl || optilacteoLogo}
            alt={empresa?.name ?? "OptiLácteo"}
            className="h-10 w-10 flex-shrink-0 rounded-md object-contain"
          />
        )}

        {/* HU-81: nombre de empresa y rol en líneas propias, cada uno en su
            propio renglón, en vez de compartir una fila con truncate — así
            un rol largo (ej. "Responsable de producción") ya no empuja ni
            recorta el nombre de la empresa, sea cual sea su longitud. */}
        <div className={`flex min-w-0 flex-1 flex-col gap-1.5 ${ocultoSiColapsado}`}>
          {isLoadingEmpresa ? (
            <div className="h-5 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ) : (
            <h1 className="break-words text-xl font-bold leading-tight text-slate-900 dark:text-white">
              {empresa?.name ?? "OptiLácteo"}
            </h1>
          )}

          {/* Sin "truncate": si el nombre del rol no entra en una línea
              (ej. "Responsable de producción"), el pill se achica a lo
              que ocupa el texto y, si no alcanza, pasa a una segunda
              línea — nunca lo recorta con "...". */}
          <span className="self-start rounded-md bg-blue-100 px-3 py-1 text-xs font-semibold uppercase leading-snug text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
            {user?.rolNombre ?? "Sin rol"}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú lateral"
          className={`flex-shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 lg:hidden ${
            isOpen ? "" : "hidden"
          }`}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className={`px-2 pb-2 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500 ${ocultoSiColapsado}`}>
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
                  // Colapsado solo queda el ícono: el label pasa al tooltip
                  // nativo y al nombre accesible del botón.
                  title={isCollapsed ? item.label : undefined}
                  aria-label={
                    isCollapsed
                      ? item.count ? `${item.label}, ${item.count}` : item.label
                      : undefined
                  }
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition ${
                    isCollapsed ? "lg:justify-center" : ""
                  } ${
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="relative flex flex-shrink-0">
                      <Icon className="h-4 w-4" />
                      {isCollapsed && !!item.count && (
                        <span className="absolute -right-2.5 -top-2 hidden h-3.5 min-w-3.5 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-semibold leading-none text-white lg:flex">
                          {item.count > 99 ? "99+" : item.count}
                        </span>
                      )}
                    </span>
                    <span className={`whitespace-nowrap ${ocultoSiColapsado}`}>{item.label}</span>
                  </div>

                  {item.count !== undefined && (
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs ${ocultoSiColapsado} ${
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
        <div className={`flex items-center gap-3 ${isCollapsed ? "lg:flex-col" : ""}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold uppercase text-white">
            {(user?.email ?? "U").slice(0, 2)}
          </div>
          <div className={`min-w-0 flex-1 ${ocultoSiColapsado}`}>
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