import { Layout } from "../../components/layout/Layout";
import { NivelDestinatariosCard } from "./components/NivelDestinatariosCard";
import { useConfiguracionAlertas } from "../../hooks/useConfiguracionAlertas";
import { useRoles } from "../../hooks/useRoles";
import { NivelAlerta } from "../../types/notificacion.types";

// Mismo orden de severidad que los tabs de AlertasPage (HU-25):
// Crítica -> Advertencia -> Informativa.
const NIVELES: NivelAlerta[] = [NivelAlerta.CRITICA, NivelAlerta.ADVERTENCIA, NivelAlerta.INFORMATIVA];

// HU-26: quién recibe cada nivel de alerta, contra el back real
// (GET/POST/DELETE /notificaciones/configuracion). Cada agregar/quitar
// persiste al toque — no hay endpoint de guardado en lote, así que no hay
// botón "Guardar cambios" ni estado sin sincronizar.
export default function DestinatariosAlertasPage() {
  const { configuraciones, isLoading, error, agregarRol, quitarRol } = useConfiguracionAlertas();
  const { roles, isLoading: isLoadingRoles } = useRoles();

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

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading || isLoadingRoles ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>
      ) : (
        <div className="flex flex-col gap-4">
          {NIVELES.map((nivel) => {
            const configuracionesDelNivel = configuraciones.filter((c) => c.nivelAlerta === nivel);
            const rolesAsignados = new Set(configuracionesDelNivel.map((c) => c.rolId));
            const rolesDisponibles = roles.filter((r) => r.isActive && !rolesAsignados.has(r.id));

            return (
              <NivelDestinatariosCard
                key={nivel}
                nivel={nivel}
                configuraciones={configuracionesDelNivel}
                rolesDisponibles={rolesDisponibles}
                onAgregarRol={(rol) => agregarRol(nivel, rol)}
                onQuitarRol={quitarRol}
              />
            );
          })}
        </div>
      )}
    </Layout>
  );
}
