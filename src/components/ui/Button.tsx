import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

export function Button({
  isLoading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className="flex items-center justify-center rounded-md bg-[#3d6fcf] px-4 py-2 text-base font-semibold text-white transition hover:bg-[#3460b5] disabled:cursor-not-allowed disabled:opacity-60"
      {...props}
    >
      {isLoading ? "Cargando..." : children}
    </button>
  );
}
