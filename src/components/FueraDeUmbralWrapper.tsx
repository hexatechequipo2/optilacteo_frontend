import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

interface FueraDeUmbralWrapperProps {
  fueraDeUmbral: boolean;
  children: ReactNode;
}

export function FueraDeUmbralWrapper({ fueraDeUmbral, children }: FueraDeUmbralWrapperProps) {
  if (!fueraDeUmbral) {
    return <>{children}</>;
  }

  return (
    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {children}
    </span>
  );
}
