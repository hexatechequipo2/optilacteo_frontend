import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { QLLogo } from "../../components/ui/QLLogo";
import { authService } from "../../services/auth.service";

interface FormErrors {
  newPassword?: string;
  confirmPassword?: string;
}

function validate(newPassword: string, confirmPassword: string): FormErrors {
  const errors: FormErrors = {};
  if (!newPassword) {
    errors.newPassword = "La contraseña es obligatoria";
  } else if (newPassword.length < 8) {
    errors.newPassword = "La contraseña debe tener al menos 8 caracteres";
  }
  if (!confirmPassword) {
    errors.confirmPassword = "Confirmá la contraseña";
  } else if (newPassword !== confirmPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden";
  }
  return errors;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // El token se guarda en memoria (state), no persiste en localStorage/sessionStorage
  const [token] = useState<string | null>(() => searchParams.get("token"));

  useEffect(() => {
    if (searchParams.get("token")) {
      // Limpia el token de la URL visible sin recargar la página
      navigate("/reset-password", { replace: true });
    }
  }, []);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const leftPanel = (
    <div
      className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, #bfdbfe 0%, #3b82f6 45%, #1a3a6e 100%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative z-10">
        <QLLogo variant="light" size="lg" />
      </div>
    </div>
  );

  if (!token) {
    return (
      <div className="flex min-h-screen">
        {leftPanel}
        <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-gray-50 px-8 py-12">
          <div className="w-full max-w-md flex flex-col items-center gap-4 text-center">
            <QLLogo variant="dark" size="sm" />
            <h1 className="mt-3 text-2xl font-bold text-slate-900">
              Link inválido o expirado
            </h1>
            <p className="text-slate-500 text-sm">
              El enlace que usaste no es válido o ya venció.
            </p>
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 hover:underline"
            >
              Solicitar nuevo link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError("");

    const validationErrors = validate(newPassword, confirmPassword);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await authService.resetPassword(token, newPassword, confirmPassword);
      setSuccess(true);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        const msg: unknown = err.response.data.message;
        setServerError(Array.isArray(msg) ? msg.join(", ") : String(msg));
      } else {
        setServerError("No se pudo conectar con el servidor. Intentá nuevamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {leftPanel}

      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-gray-50 px-8 py-12">
        <div className="w-full max-w-md">
          {success ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <QLLogo variant="dark" size="sm" />
              <CheckCircle size={48} className="mt-4 text-green-500" />
              <h1 className="text-2xl font-bold text-slate-900">
                ¡Contraseña actualizada correctamente!
              </h1>
              <p className="text-slate-600 text-sm">
                Ya podés ingresar con tu nueva contraseña.
              </p>
              <Button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                className="mt-2 w-full"
              >
                Ir al login
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8 flex flex-col items-center gap-3">
                <QLLogo variant="dark" size="sm" />
                <h1 className="mt-3 text-2xl font-bold text-slate-900">
                  Nueva contraseña
                </h1>
                <p className="text-center text-sm text-slate-500">
                  Elegí una contraseña segura para tu cuenta
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-5"
                noValidate
              >
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  label="Nueva contraseña"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  error={errors.newPassword}
                  autoComplete="new-password"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowNew((prev) => !prev)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={showNew ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />

                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  label="Confirmar contraseña"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowConfirm((prev) => !prev)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />

                {serverError && (
                  <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    <p>{serverError}</p>
                    <Link
                      to="/forgot-password"
                      className="mt-1 block text-blue-600 hover:underline"
                    >
                      Solicitar nuevo link
                    </Link>
                  </div>
                )}

                <Button type="submit" isLoading={isSubmitting}>
                  Guardar nueva contraseña
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}