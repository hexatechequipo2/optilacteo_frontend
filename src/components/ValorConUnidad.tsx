interface ValorConUnidadProps {
  valor: number | string;
  unidad?: string;
  size?: "sm" | "lg";
}

const SIZE_CLASS: Record<"sm" | "lg", { valor: string; unidad: string }> = {
  sm: {
    valor: "text-slate-900 dark:text-white",
    unidad: "ml-1 text-slate-400 dark:text-slate-500",
  },
  lg: {
    valor: "text-2xl font-bold text-slate-900 dark:text-white",
    unidad: "ml-1 text-sm font-medium text-slate-400 dark:text-slate-500",
  },
};

export function ValorConUnidad({ valor, unidad, size = "sm" }: ValorConUnidadProps) {
  const classes = SIZE_CLASS[size];

  return (
    <span className={classes.valor}>
      {valor}
      {unidad && <span className={classes.unidad}>{unidad}</span>}
    </span>
  );
}
