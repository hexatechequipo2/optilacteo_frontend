interface StatCardProps {
  label: string;
  value: string | number;
  detail: string;
}

/** Tarjeta de resumen — ancho fluido para adaptarse a mobile, tablet y desktop */
export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-2 truncate text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
        {value}
      </p>
      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
        {detail}
      </p>
    </div>
  );
}
