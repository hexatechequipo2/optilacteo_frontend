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

function getPermiso(rol: RolType, modulo: ModuloSistema) {
  return rol.permisos.find((p) => p.modulo === modulo) ?? {
    modulo,
    canRead: false,
    canWrite: false,
  };
}

export function MatrizPermisos({ roles, onTogglePermiso }: MatrizPermisosProps) {
  // El Administrador tiene acceso total implícito y no gestiona permisos
  // por módulo, así que no tiene sentido mostrarlo en esta matriz.
  const rolesVisibles = roles.filter(
    (rol) => rol.nombre.trim().toLowerCase() !== "administrador",
  );

  const handleToggle = (
    rol: RolType,
    modulo: ModuloSistema,
    field: "canRead" | "canWrite",
    value: boolean,
  ) => {
    const permisoActual = getPermiso(rol, modulo);
    onTogglePermiso(rol.id, {
      modulo,
      canRead: field === "canRead" ? value : permisoActual.canRead,
      canWrite: field === "canWrite" ? value : permisoActual.canWrite,
    });
  };

  if (rolesVisibles.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Matriz de permisos por rol
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Módulo</th>
              {rolesVisibles.map((rol) => (
                <th key={rol.id} className="px-4 py-3 text-center">
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
                  const permiso = getPermiso(rol, key);
                  return (
                    <td key={rol.id} className="px-4 py-3">
                      <div className="flex items-center justify-center gap-3">
                        <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <input
                            type="checkbox"
                            checked={permiso.canRead}
                            onChange={(e) =>
                              handleToggle(rol, key, "canRead", e.target.checked)
                            }
                          />
                          Lectura
                        </label>
                        <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <input
                            type="checkbox"
                            checked={permiso.canWrite}
                            onChange={(e) =>
                              handleToggle(rol, key, "canWrite", e.target.checked)
                            }
                          />
                          Escritura
                        </label>
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