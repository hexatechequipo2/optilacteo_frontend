import type { RolType, ModuloSistema, UpdatePermisoDto } from "../../../types/rol.types";

interface MatrizPermisosProps {
  roles: RolType[];
  onTogglePermiso: (rolId: number, payload: UpdatePermisoDto) => Promise<void>;
}

const MODULOS: { key: ModuloSistema; label: string }[] = [
  { key: "dashboard", label: "Ver dashboard" },
  { key: "recepcion", label: "Recepción de lotes" },
  { key: "destino_productivo_ia", label: "Destino productivo (IA)" },
  { key: "monitoreo_alertas", label: "Monitoreo y alertas" },
  { key: "sensores_iot", label: "Sensores IoT" },
  { key: "trazabilidad", label: "Trazabilidad" },
  { key: "reportes_forecast", label: "Reportes y forecast" },
  { key: "asistente_voz", label: "Asistente de voz" },
];

type NivelAcceso = "sin_acceso" | "solo_lectura" | "lectura_escritura";

// Orden del ciclo al hacer click: cada nivel implica los permisos del anterior
// (no se puede representar canWrite sin canRead).
const CICLO: NivelAcceso[] = ["sin_acceso", "solo_lectura", "lectura_escritura"];

const NIVEL_CONFIG: Record<NivelAcceso, { label: string; swatchClass: string }> = {
  sin_acceso: {
    label: "Sin acceso",
    swatchClass: "bg-slate-100 dark:bg-slate-800",
  },
  solo_lectura: {
    label: "Solo lectura",
    swatchClass: "bg-blue-200 dark:bg-blue-300",
  },
  lectura_escritura: {
    label: "Lectura y escritura",
    swatchClass: "bg-blue-600 dark:bg-blue-600",
  },
};

function getPermiso(rol: RolType, modulo: ModuloSistema) {
  return rol.permisos.find((p) => p.modulo === modulo) ?? {
    modulo,
    canRead: false,
    canWrite: false,
  };
}

function getNivel(permiso: { canRead: boolean; canWrite: boolean }): NivelAcceso {
  if (permiso.canWrite) return "lectura_escritura";
  if (permiso.canRead) return "solo_lectura";
  return "sin_acceso";
}

function nivelAPermiso(nivel: NivelAcceso): { canRead: boolean; canWrite: boolean } {
  if (nivel === "lectura_escritura") return { canRead: true, canWrite: true };
  if (nivel === "solo_lectura") return { canRead: true, canWrite: false };
  return { canRead: false, canWrite: false };
}

export function MatrizPermisos({ roles, onTogglePermiso }: MatrizPermisosProps) {
  // El Administrador tiene acceso total implícito y no gestiona permisos
  // por módulo, así que no tiene sentido mostrarlo en esta matriz.
  const rolesVisibles = roles.filter(
    (rol) => rol.nombre.trim().toLowerCase() !== "administrador",
  );

  const handleClick = (rol: RolType, modulo: ModuloSistema) => {
    const nivelActual = getNivel(getPermiso(rol, modulo));
    const siguiente = CICLO[(CICLO.indexOf(nivelActual) + 1) % CICLO.length];
    onTogglePermiso(rol.id, { modulo, ...nivelAPermiso(siguiente) });
  };

  if (rolesVisibles.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Matriz de permisos por rol
        </h2>

        {/* Leyenda */}
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          {CICLO.map((nivel) => (
            <div key={nivel} className="flex items-center gap-1.5">
              <span
                className={`h-3 w-3 flex-shrink-0 rounded-sm ${NIVEL_CONFIG[nivel].swatchClass}`}
              />
              {NIVEL_CONFIG[nivel].label}
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="w-56 px-4 py-3">Módulo</th>
              {rolesVisibles.map((rol) => (
                <th
                  key={rol.id}
                  className="w-28 px-2 py-3 text-center leading-tight"
                >
                  {rol.nombre}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {MODULOS.map(({ key, label }) => (
              <tr key={key}>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                  {label}
                </td>

                {rolesVisibles.map((rol) => {
                  const nivel = getNivel(getPermiso(rol, key));
                  return (
                    <td key={rol.id} className="px-2 py-3">
                      <div className="group relative flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleClick(rol, key)}
                          aria-label={`${label} · ${rol.nombre} · ${NIVEL_CONFIG[nivel].label}`}
                          className={`h-8 w-8 rounded-md transition hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 dark:hover:ring-offset-slate-900 ${NIVEL_CONFIG[nivel].swatchClass}`}
                        />
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition group-hover:opacity-100 dark:bg-slate-700"
                        >
                          {label} · {rol.nombre} · {NIVEL_CONFIG[nivel].label}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
