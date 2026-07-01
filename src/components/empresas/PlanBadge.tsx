interface PlanConfig {
  dot: string;
  bg: string;
  text: string;
  label: string;
}

const PLAN_CONFIG: Record<string, PlanConfig> = {
  starter: {
    dot: "bg-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    label: "Starter",
  },
  pro: {
    dot: "bg-blue-500",
    bg: "bg-blue-50 dark:bg-blue-500/15",
    text: "text-blue-700 dark:text-blue-400",
    label: "Pro",
  },
  enterprise: {
    dot: "bg-violet-500",
    bg: "bg-violet-50 dark:bg-violet-500/15",
    text: "text-violet-700 dark:text-violet-400",
    label: "Enterprise",
  },
};

interface PlanBadgeProps {
  plan: string;
}

export function PlanBadge({ plan }: PlanBadgeProps) {
  const config = PLAN_CONFIG[plan.toLowerCase()] ?? PLAN_CONFIG.starter;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
