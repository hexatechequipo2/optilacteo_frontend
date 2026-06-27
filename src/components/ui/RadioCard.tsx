interface RadioCardProps {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: (value: string) => void;
}

export function RadioCard({
  name,
  value,
  label,
  checked,
  onChange,
}: RadioCardProps) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
        checked
          ? "border-blue-500 bg-blue-50"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="h-4 w-4 accent-blue-600"
      />
      <span className="text-sm font-medium text-slate-800">{label}</span>
    </label>
  );
}