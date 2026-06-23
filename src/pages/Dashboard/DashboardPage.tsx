import { useAuth } from "../../hooks/useAuth";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 px-4">
      <h1 className="text-2xl font-bold text-slate-900">
        Bienvenido{user ? `, ${user.email}` : ""}
      </h1>
      {user?.empresa && <p className="text-slate-500">{user.empresa}</p>}
    </div>
  );
}
