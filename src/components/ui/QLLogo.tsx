import logoSrc from "../../assets/images/optilacteo_logo.png";

interface QLLogoProps {
  variant: "light" | "dark";
  size: "sm" | "lg";
}

export function QLLogo({ variant, size }: QLLogoProps) {
  const isLight = variant === "light";
  const textColor = isLight ? "text-white" : "text-slate-900";
  const iconPx = size === "lg" ? 88 : 40;
  const textCls = size === "lg" ? "text-3xl" : "text-lg";
  const layoutCls = size === "lg" ? "flex-col gap-4" : "flex-row gap-2";

  const logoImg = (
    <img
      src={logoSrc}
      alt="OptiLácteo logo"
      width={iconPx}
      height={iconPx}
      style={isLight ? undefined : { mixBlendMode: "multiply" }}
    />
  );

  return (
    <div className={`flex items-center ${layoutCls}`}>
      {isLight ? (
        <div className="rounded-2xl bg-white p-3 shadow-lg shadow-blue-950/30">
          {logoImg}
        </div>
      ) : (
        logoImg
      )}
      <span className={`font-bold ${textCls} ${textColor} tracking-tight`}>
        OptiLácteo
      </span>
    </div>
  );
}
