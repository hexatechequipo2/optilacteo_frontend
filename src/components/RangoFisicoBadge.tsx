interface RangoFisicoBadgeProps {
  label: string;
  min: number;
  max: number;
}

export function RangoFisicoBadge({ label, min, max }: RangoFisicoBadgeProps) {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      {label}: {min}-{max}
    </span>
  );
}
