import { LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function SinFuncionalidadesPage() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
          Sin funcionalidades disponibles
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Todavía no hay funcionalidades disponibles para tu rol.
        </p>
        <button
          onClick={logout}
          className="mt-6 inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
