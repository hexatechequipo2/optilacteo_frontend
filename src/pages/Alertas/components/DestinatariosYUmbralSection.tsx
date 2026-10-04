import { NivelDestinatariosCard } from "./NivelDestinatariosCard";
import { UmbralDesconexionCard } from "./UmbralDesconexionCard";
import { useConfiguracionAlertas } from "../../../hooks/useConfiguracionAlertas";
import { useConfiguracionAlertaDesconexion } from "../../../hooks/useConfiguracionAlertaDesconexion";
import { useRoles } from "../../../hooks/useRoles";
import { useUsuariosActivos } from "../../../hooks/useUsuariosActivos";
import { usePermisos } from "../../../hooks/usePermisos";
import { NivelAlerta } from "../../../types/notificacion.types";

// Mismo orden de severidad que los tabs de AlertasPage (HU-25):
// Crítica -> Advertencia -> Informativa.
const NIVELES: NivelAlerta[] = [NivelAlerta.CRITICA, NivelAlerta.ADVERTENCIA, NivelAlerta.INFORMATIVA];

// HU-26/HU-29/HU-31, extraído de DestinatariosAlertasPage.tsx: quién recibe
// cada nivel de alerta + umbral de desconexión (configuracion_empresa en el
// back). Vive en un componente aparte que la página monta solo con
// configuracion_empresa:ver, para no disparar estos hooks sin permiso.
export function DestinatariosYUmbralSection() {
  const { configuraciones, isLoading, error, agregarRol, agregarUsuario, quitarDestinatario } =
    useConfiguracionAlertas();
  const {
    configuracion: configuracionDesconexion,
    isLoading: isLoadingDesconexion,
    isSaving: isSavingDesconexion,
    actualizarUmbral,
  } = useConfiguracionAlertaDesconexion();
  const { puede } = usePermisos();
  const puedeElegirRol = puede("gestion_roles", "ver"); // GET /roles
  const puedeElegirUsuario = puede("gestion_usuarios", "ver"); // GET /user
  const { roles, isLoading: isLoadingRoles } = useRoles({ habilitado: puedeElegirRol });
  const {
    usuarios,
    isLoading: isLoadingUsuarios,
    error: errorUsuarios,
  } = useUsuariosActivos({ habilitado: puedeElegirUsuario });

  return (
    <>
      {/* HU-31: umbral de desconexión de sensores, misma gobernanza
          (Admin/Gerente) que los destinatarios por nivel de abajo — vive
          en esta sección en vez de una ruta nueva para no fragmentar
          "configuración de alertas" en dos entradas de menú. */}
      <div className="mb-6">
        <UmbralDesconexionCard
          configuracion={configuracionDesconexion}
          isLoading={isLoadingDesconexion}
          isSaving={isSavingDesconexion}
          onActualizar={actualizarUmbral}
          puedeEditar={puede("configuracion_empresa", "editar")}
        />
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
        <div className="mb-6 flex flex-col gap-4">
          {NIVELES.map((nivel) => {
            const configuracionesDelNivel = configuraciones.filter((c) => c.nivelAlerta === nivel);
            const rolesAsignados = new Set(configuracionesDelNivel.map((c) => c.rolId));
            const usuariosAsignados = new Set(configuracionesDelNivel.map((c) => c.usuarioId));
            const rolesDisponibles = roles.filter((r) => !rolesAsignados.has(r.id));
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
                puedeAgregar={puede("configuracion_empresa", "crear")}
                puedeQuitar={puede("configuracion_empresa", "eliminar")}
                puedeElegirRol={puedeElegirRol}
                puedeElegirUsuario={puedeElegirUsuario}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
