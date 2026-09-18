import { NivelDestinatariosCard } from "./NivelDestinatariosCard";
import { UmbralDesconexionCard } from "./UmbralDesconexionCard";
import { useConfiguracionAlertas } from "../../../hooks/useConfiguracionAlertas";
import { useConfiguracionAlertaDesconexion } from "../../../hooks/useConfiguracionAlertaDesconexion";
import { useRoles } from "../../../hooks/useRoles";
import { useUsuariosActivos } from "../../../hooks/useUsuariosActivos";
import { NivelAlerta } from "../../../types/notificacion.types";

// Mismo orden de severidad que los tabs de AlertasPage (HU-25):
// Crítica -> Advertencia -> Informativa.
const NIVELES: NivelAlerta[] = [NivelAlerta.CRITICA, NivelAlerta.ADVERTENCIA, NivelAlerta.INFORMATIVA];

// HU-26/HU-29/HU-31, extraído de DestinatariosAlertasPage.tsx: quién recibe
// cada nivel de alerta + umbral de desconexión. Sigue siendo Admin/Gerente
// only en el backend (GET/POST/DELETE /notificaciones/configuracion y
// /notificaciones/configuracion-alerta-desconexion) — por eso vive en un
// componente aparte que HU-30 monta condicionalmente: Responsable de
// producción entra a la misma página por los horarios de silencio, pero no
// debe disparar estos hooks (le devolverían 403), mismo criterio que
// TABS_RESPONSABLE_CALIDAD en ConfiguracionPage.tsx.
export function DestinatariosYUmbralSection() {
  const { configuraciones, isLoading, error, agregarRol, agregarUsuario, quitarDestinatario } =
    useConfiguracionAlertas();
  const {
    configuracion: configuracionDesconexion,
    isLoading: isLoadingDesconexion,
    isSaving: isSavingDesconexion,
    actualizarUmbral,
  } = useConfiguracionAlertaDesconexion();
  const { roles, isLoading: isLoadingRoles } = useRoles();
  const {
    usuarios,
    isLoading: isLoadingUsuarios,
    error: errorUsuarios,
  } = useUsuariosActivos();

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
    </>
  );
}
