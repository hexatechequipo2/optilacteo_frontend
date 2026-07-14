interface SectionHeaderProps {
  children: string;
}

export function SectionHeader({ children }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
        {children}
      </span>
      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}