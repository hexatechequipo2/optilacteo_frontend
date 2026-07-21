import { useState } from "react";
import { Layout } from "../../components/layout/Layout";
import { Tabs } from "../../components/ui/Tabs";
import { useEmpresaActual } from "../../hooks/useEmpresaActual";
import { LogoIdentidadTab } from "./components/LogoIdentidadTab";
import { UmbralesCalidadTab } from "./components/UmbralesCalidadTab";

type TabConfiguracion = "umbrales" | "logo-identidad";

const TABS: { value: TabConfiguracion; label: string }[] = [
  { value: "umbrales", label: "Umbrales de calidad" },
  { value: "logo-identidad", label: "Logo e identidad" },
];

export default function ConfiguracionPage() {
  const { empresa } = useEmpresaActual();
  const [tabActiva, setTabActiva] = useState<TabConfiguracion>("logo-identidad");

  return (
    <Layout breadcrumb="Consola > Configuración">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Configuración de la empresa
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Parámetros propios de {empresa?.name ?? "tu empresa"} · visible solo para tu organización
        </p>
      </div>

      <div className="mb-6">
        <Tabs tabs={TABS} value={tabActiva} onChange={setTabActiva} />
      </div>

      {tabActiva === "logo-identidad" ? <LogoIdentidadTab /> : <UmbralesCalidadTab />}
    </Layout>
  );
}
