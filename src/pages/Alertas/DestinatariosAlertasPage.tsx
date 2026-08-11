import { useState } from "react";
import { Layout } from "../../components/layout/Layout";
import { Button } from "../../components/ui/Button";
import { ReglaAlertaCard } from "./components/ReglaAlertaCard";
import { MOCK_REGLAS_ALERTA } from "./constants/reglasAlertaMock";
import type { DestinatarioAlerta, ReglaAlerta } from "../../types/destinatarioAlerta.types";

export default function DestinatariosAlertasPage() {
  // HU-29: mock data — todavía no hay endpoint de reglas/destinatarios de
  // alertas. El estado vive acá para poder agregar destinatarios en la UI;
  // "Guardar cambios" queda sin funcionalidad hasta conectar al back.
  const [reglas, setReglas] = useState<ReglaAlerta[]>(MOCK_REGLAS_ALERTA);

  const handleAgregarDestinatario = (reglaId: string, destinatario: DestinatarioAlerta) => {
    setReglas((prev) =>
      prev.map((regla) =>
        regla.id === reglaId
          ? { ...regla, destinatarios: [...regla.destinatarios, destinatario] }
          : regla,
      ),
    );
  };

  return (
    <Layout breadcrumb="Consola > Destinatarios de alertas">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Destinatarios de alertas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Quién recibe cada nivel de alerta · los cambios se aplican de inmediato, sin reinicio
          </p>
        </div>
        <Button type="button" className="!w-auto px-6">
          Guardar cambios
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {reglas.map((regla) => (
          <ReglaAlertaCard key={regla.id} regla={regla} onAgregarDestinatario={handleAgregarDestinatario} />
        ))}
      </div>
    </Layout>
  );
}
