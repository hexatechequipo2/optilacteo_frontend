import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Role } from "../../types/usuario.types";

const REDIRECT_DELAY_MS = 3000;

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const esGerente = user?.role === Role.GERENTE;

  useEffect(() => {
    if (!esGerente) return;

    const timer = setTimeout(() => {
      navigate("/usuarios", { replace: true });
    }, REDIRECT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [esGerente, navigate]);

  return (
    <div className="flex flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">
        Bienvenido{user ? `, ${user.email}` : ""}
      </h1>
      {user?.empresa && <p className="text-slate-500">{user.empresa}</p>}
      {esGerente && (
        <p className="text-sm text-slate-400">
          Serás redireccionado a la Sección de Usuarios...
        </p>
      )}
    </div>
  );
}