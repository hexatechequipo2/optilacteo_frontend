const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-violet-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-indigo-600",
  "bg-teal-600",
];

function getColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

interface EmpresaAvatarProps {
  nombre: string;
}

export function EmpresaAvatar({ nombre }: EmpresaAvatarProps) {
  const colorClass = AVATAR_COLORS[getColorIndex(nombre)];
  const initials = getInitials(nombre);

  return (
    <div
      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white ${colorClass}`}
    >
      {initials}
    </div>
  );
}
