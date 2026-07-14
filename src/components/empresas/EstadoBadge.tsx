interface EstadoBadgeProps {
  isActive: boolean;
}

export function EstadoBadge({ isActive }: EstadoBadgeProps) {
  return isActive ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-500/15 dark:text-green-400">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      Activa
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-500/15 dark:text-red-400">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Suspendida
    </span>
  );
}
