import { Layout } from "../../components/layout/Layout";
import { NivelDestinatariosCard } from "./components/NivelDestinatariosCard";
import { useConfiguracionAlertas } from "../../hooks/useConfiguracionAlertas";
import { useRoles } from "../../hooks/useRoles";
import { useUsuariosActivos } from "../../hooks/useUsuariosActivos";
import { NivelAlerta } from "../../types/notificacion.types";

// Mismo orden de severidad que los tabs de AlertasPage (HU-25):
// Crítica -> Advertencia -> Informativa.
const NIVELES: NivelAlerta[] = [NivelAlerta.CRITICA, NivelAlerta.ADVERTENCIA, NivelAlerta.INFORMATIVA];

// HU-26/HU-29: quién recibe cada nivel de alerta, contra el back real
// (GET/POST/DELETE /notificaciones/configuracion). Cada agregar/quitar
// persiste al toque — no hay endpoint de guardado en lote, así que no hay
// botón "Guardar cambios" ni estado sin sincronizar. Un destinatario puede
// ser un rol completo o un usuario puntual (rolId XOR usuarioId).
export default function DestinatariosAlertasPage() {
  const { configuraciones, isLoading, error, agregarRol, agregarUsuario, quitarDestinatario } =
    useConfiguracionAlertas();
  const { roles, isLoading: isLoadingRoles } = useRoles();
  const {
    usuarios,
    isLoading: isLoadingUsuarios,
    error: errorUsuarios,
  } = useUsuariosActivos();

  return (
    <Layout breadcrumb="Consola > Destinatarios de alertas">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Destinatarios de alertas
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Quién recibe cada nivel de alerta · los cambios se aplican de inmediato, sin reinicio
        </p>
      </div>

      {(error || errorUsuarios) && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {/* Dos fuentes de error (configuración vs. usuarios disponibles)
              pueden coexistir — ambas se muestran, no se pisan. Este banner
              es la única salida visible del error de useUsuariosActivos: sin
              esto, un fallo ahí queda mudo y el selector "+ Usuario" se ve
              simplemente deshabilitado sin explicación (bug ya visto). */}
          {error && <p>{error}</p>}
          {errorUsuarios && <p>{errorUsuarios}</p>}
        </div>
      )}

      {isLoading || isLoadingRoles || isLoadingUsuarios ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>
      ) : (
        <div className="flex flex-col gap-4">
          {NIVELES.map((nivel) => {
            const configuracionesDelNivel = configuraciones.filter((c) => c.nivelAlerta === nivel);
            const rolesAsignados = new Set(configuracionesDelNivel.map((c) => c.rolId));
            const usuariosAsignados = new Set(configuracionesDelNivel.map((c) => c.usuarioId));
            const rolesDisponibles = roles.filter((r) => r.isActive && !rolesAsignados.has(r.id));
            const usuariosDisponibles = usuarios.filter((u) => !usuariosAsignados.has(u.id));

            return (
              <NivelDestinatariosCard
                key={nivel}
                nivel={nivel}
                configuraciones={configuracionesDelNivel}
                rolesDisponibles={rolesDisponibles}
                usuariosDisponibles={usuariosDisponibles}
                onAgregarRol={(rol) => agregarRol(nivel, rol)}
                onAgregarUsuario={(usuario) => agregarUsuario(nivel, usuario)}
                onQuitarDestinatario={quitarDestinatario}
              />
            );
          })}
        </div>
      )}
    </Layout>
  );
}
