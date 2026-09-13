import { Layout } from "../../components/layout/Layout";
import { DestinatariosYUmbralSection } from "./components/DestinatariosYUmbralSection";
import { HorariosSilencioCard } from "./components/HorariosSilencioCard";
import { useAuth } from "../../hooks/useAuth";

// HU-30: a diferencia de destinatarios/umbral de desconexión (Admin/Gerente
// only), horarios de silencio también lo administra Responsable de
// producción (ver @Roles en NotificacionesController.listarHorariosSilencio
// del backend) — por eso la ruta se amplió a los 3 roles (ver App.tsx), pero
// DestinatariosYUmbralSection solo se monta para Admin/Gerente. El
// título/breadcrumb varía por rol para no anunciarle "Destinatarios de
// alertas" a quien solo va a ver la card de horarios de silencio (coincide
// con el nav item propio "Horarios de silencio" en Sidebar.tsx).
export default function DestinatariosAlertasPage() {
  const { user } = useAuth();
  const puedeVerDestinatarios =
    user?.rolNombre === "Administrador" || user?.rolNombre === "Gerente";
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

      <HorariosSilencioCard />
    </Layout>
  );
}
