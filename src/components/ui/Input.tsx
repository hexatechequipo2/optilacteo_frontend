import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          className={`rounded-md border px-3 py-2 text-base text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 ${
            error ? "border-red-500" : "border-slate-300"
          } ${className}`}
          {...props}
        />
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    );
  },
);

Input.displayName = "Input";