import { useMemo, useState } from "react";
import { Layout } from "../../components/layout/Layout";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { useAuth } from "../../hooks/useAuth";
import { useEmpresaActual } from "../../hooks/useEmpresaActual";
import { useEmpresasOpciones } from "../../hooks/useEmpresasOpciones";
import { usePermisos } from "../../hooks/usePermisos";
import { useRoles } from "../../hooks/useRoles";
import type { ModuloPermiso } from "../../types/permisos.types";
import type { GuardarRolDto, RolType } from "../../types/rol.types";
import { RolEditor } from "./components/RolEditor";

// HU-72: roles de la empresa y su matriz de permisos por módulo y acción.
// La ruta exige gestion_roles:ver; crear/editar/eliminar se gatean con la
// acción correspondiente y las protecciones vuelven del back como 409.
// Administrador (sin empresa) elige primero sobre qué empresa opera.
export default function RolesPage() {
  const { user } = useAuth();
  const { empresa: miEmpresa } = useEmpresaActual();
  const { puede, esSistema } = usePermisos();
  const { empresas: empresasOpciones } = useEmpresasOpciones({ habilitado: esSistema });
  const [empresaElegidaId, setEmpresaElegidaId] = useState<number | undefined>(undefined);
  const empresa = esSistema
    ? empresasOpciones.find((e) => e.id === empresaElegidaId)
    : miEmpresa;
  const { roles, isLoading, error, crearRol, actualizarRol, eliminarRol } = useRoles({
    empresaId: empresaElegidaId,
  });

  const puedeCrear = puede("gestion_roles", "crear");
  const puedeEditar = puede("gestion_roles", "editar");
  const puedeEliminar = puede("gestion_roles", "eliminar");

  // "nuevo" = alta en curso; null = primer rol de la lista.
  const [seleccion, setSeleccion] = useState<number | "nuevo" | null>(null);
  const rolSeleccionado: RolType | null =
    seleccion === "nuevo" ? null : (roles.find((r) => r.id === seleccion) ?? roles[0] ?? null);
  const enAlta = seleccion === "nuevo";

  // El back solo deja otorgar módulos de sistema contratados por la empresa.
  const modulosContratados = useMemo(
    () =>
      empresa?.modulos ? new Set<ModuloPermiso>(empresa.modulos.map((m) => m.modulo)) : null,
    [empresa?.modulos],
  );

  const guardar = async (dto: GuardarRolDto) => {
    if (enAlta) {
      const creado = await crearRol(dto);
      setSeleccion(creado.id);
    } else if (rolSeleccionado) {
      await actualizarRol(rolSeleccionado.id, dto);
    }
  };

  const eliminar = async () => {
    if (!rolSeleccionado) return;
    await eliminarRol(rolSeleccionado.id);
    setSeleccion(null);
  };

  const tipoRol = (rol: RolType) =>
    rol.esSistema ? (
      <Badge variant="info">Sistema</Badge>
    ) : rol.esCatalogo ? (
      <Badge variant="neutral">Catálogo</Badge>
    ) : (
      <Badge variant="success">Personalizado</Badge>
    );

  return (
    <Layout breadcrumb="Consola > Roles y permisos">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Roles y permisos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Qué puede ver y hacer cada rol de {empresa?.name ?? "tu empresa"}, por módulo y acción
          </p>
        </div>
        {esSistema && (
          <div className="w-64">
            <Select
              id="roles-empresa"
              aria-label="Empresa"
              value={empresaElegidaId === undefined ? "" : String(empresaElegidaId)}
              onChange={(e) => {
                setEmpresaElegidaId(e.target.value ? Number(e.target.value) : undefined);
                setSeleccion(null);
              }}
              options={[
                { value: "", label: "Elegí una empresa" },
                ...empresasOpciones.map((e) => ({ value: String(e.id), label: e.name })),
              ]}
            />
          </div>
        )}
        {puedeCrear && (!esSistema || empresaElegidaId !== undefined) && (
          <Button type="button" className="!w-auto px-6" onClick={() => setSeleccion("nuevo")}>
            + Nuevo rol
          </Button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          {error}
        </p>
      )}

      {esSistema && empresaElegidaId === undefined ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Elegí una empresa para ver y editar sus roles.
        </p>
      ) : isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando roles...</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <ul className="flex flex-col gap-2">
            {roles.map((rol) => {
              const activo = !enAlta && rolSeleccionado?.id === rol.id;
              return (
                <li key={rol.id}>
                  <button
                    type="button"
                    onClick={() => setSeleccion(rol.id)}
                    className={`flex w-full flex-col gap-1.5 rounded-lg border px-4 py-3 text-left transition ${
                      activo
                        ? "border-blue-400 bg-blue-50 dark:border-blue-500/60 dark:bg-blue-500/10"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {rol.nombre}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {tipoRol(rol)}
                      {rol.usuarios} usuario(s)
                    </span>
                  </button>
                </li>
              );
            })}
            {enAlta && (
              <li className="rounded-lg border border-dashed border-blue-400 px-4 py-3 text-sm font-semibold text-blue-700 dark:text-blue-400">
                Nuevo rol
              </li>
            )}
          </ul>

          {(enAlta || rolSeleccionado) && (
            <RolEditor
              key={enAlta ? "nuevo" : rolSeleccionado!.id}
              rol={enAlta ? null : rolSeleccionado}
              modulosContratados={modulosContratados}
              puedeGuardar={enAlta ? puedeCrear : puedeEditar}
              puedeEliminar={puedeEliminar}
              esRolPropio={!esSistema && !enAlta && rolSeleccionado?.id === user?.rolId}
              onGuardar={guardar}
              onEliminar={eliminar}
            />
          )}
        </div>
      )}
    </Layout>
  );
}
