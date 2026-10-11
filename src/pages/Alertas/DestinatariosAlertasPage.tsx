import { Layout } from "../../components/layout/Layout";
import { DestinatariosYUmbralSection } from "./components/DestinatariosYUmbralSection";
import { HorariosSilencioCard } from "./components/HorariosSilencioCard";
import { usePermisos } from "../../hooks/usePermisos";

// HU-29/HU-30/HU-31: destinatarios por nivel y umbral de desconexión
// (configuracion_empresa) + horarios de silencio (monitoreo_alertas). La
// ruta acepta cualquiera de los dos módulos; cada sección se monta con su
// propio permiso. El título no anuncia "Destinatarios" a quien solo ve
// horarios de silencio.
export default function DestinatariosAlertasPage() {
  const { puede } = usePermisos();
  const puedeVerDestinatarios = puede("configuracion_empresa", "ver");
  const puedeVerHorarios = puede("monitoreo_alertas", "ver");
  const titulo = puedeVerDestinatarios ? "Destinatarios de alertas" : "Horarios de silencio";
  const subtitulo = puedeVerDestinatarios
    ? "Quién recibe cada nivel de alerta · los cambios se aplican de inmediato, sin reinicio"
    : "Horarios en los que las alertas informativas no se notifican en tiempo real";

  return (
    <Layout breadcrumb={`Consola > ${titulo}`}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {titulo}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitulo}</p>
      </div>

      {puedeVerDestinatarios && <DestinatariosYUmbralSection />}

      {puedeVerHorarios && <HorariosSilencioCard />}
    </Layout>
  );
}
