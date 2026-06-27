import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { CheckCircle } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { QLLogo } from "../../components/ui/QLLogo";
import { authService } from "../../services/auth.service";

function validateEmail(email: string): string {
  if (!email.trim()) return "El correo es obligatorio";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "El correo no es válido";
  return "";
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError("");

    const error = validateEmail(email);
    setEmailError(error);
    if (error) return;

    setIsSubmitting(true);
    try {
      await authService.requestPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setServerError(err.response.data.message);
      } else {
        setServerError("No se pudo conectar con el servidor. Intentá nuevamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Columna izquierda — gradiente azul idéntico a LoginPage */}
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

      {/* Columna derecha — formulario */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-gray-50 px-8 py-12">
        <div className="w-full max-w-md">
          {success ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <QLLogo variant="dark" size="sm" />
              <CheckCircle size={48} className="mt-4 text-green-500" />
              <h1 className="text-2xl font-bold text-slate-900">
                Revisá tu correo
              </h1>
              <p className="text-slate-600">
                Te enviamos las instrucciones para restablecer tu contraseña.
              </p>
              <Link
                to="/login"
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                Volver al login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 flex flex-col items-center gap-3">
                <QLLogo variant="dark" size="sm" />
                <h1 className="mt-3 text-2xl font-bold text-slate-900">
                  Recuperar contraseña
                </h1>
                <p className="text-center text-sm text-slate-500">
                  Ingresá tu correo y te enviamos un link para restablecer tu contraseña
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-5"
                noValidate
              >
                <Input
                  id="email"
                  type="email"
                  label="Correo corporativo"
                  placeholder="admin@optilacteo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  error={emailError}
                  autoComplete="email"
                />

                {serverError && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {serverError}
                  </p>
                )}

                <Button type="submit" isLoading={isSubmitting}>
                  Enviar link de recuperación
                </Button>

                <Link
                  to="/login"
                  className="text-center text-sm text-blue-600 hover:underline"
                >
                  ← Volver al login
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
