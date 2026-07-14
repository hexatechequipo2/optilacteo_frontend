import type { ReactNode } from "react";

type BadgeVariant = "success" | "warning" | "neutral" | "danger";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  danger: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

export function Badge({ variant = "neutral", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${VARIANT_CLASSES[variant]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          variant === "success"
            ? "bg-green-500"
            : variant === "warning"
              ? "bg-amber-500"
              : variant === "danger"
                ? "bg-red-500"
                : "bg-slate-400"
        }`}
      />
      {children}
    </span>
  );
}