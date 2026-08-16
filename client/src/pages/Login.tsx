import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { apiUrl } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";

export default function Login() {
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const { login } = useLocalAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-white/18 bg-black/28 px-4 py-3 text-white placeholder-white/45 outline-none transition-all focus:bg-black/35 focus:ring-2 focus:border-green-300/60 focus:ring-green-400/30";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error || "Credenciales incorrectas");
      return;
    }

    const stored = localStorage.getItem("wt_user");
    if (stored) {
      const user = JSON.parse(stored);
      if (user.role === "admin") {
        navigate("/admin");
        return;
      } else if (user.role === "dispatcher") {
        navigate("/dispatcher");
        return;
      } else if (user.role === "driver") {
        navigate("/driver-dashboard");
        return;
      } else if (user.role === "fleet") {
        navigate("/fleet-dashboard");
        return;
      } else {
        try {
          const res = await fetch(
            apiUrl(`/api/trpc/referrals.getDispatcherByEmail?input=${encodeURIComponent(JSON.stringify({ json: { email } }))}`),
            { credentials: "include" }
          );
          const data = await res.json();
          const dispatcher = data?.result?.data?.json;
          if (dispatcher && dispatcher.status === "active") {
            navigate("/dispatcher");
            return;
          }
        } catch {
          // not a dispatcher
        }

        navigate("/client-dashboard");
      }
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(165deg,_oklch(0.16_0.02_248)_0%,_oklch(0.1_0.018_252)_55%,_oklch(0.085_0.014_255)_100%)] px-4 py-12">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -left-20 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,_oklch(0.76_0.18_148/0.26),_transparent_66%)] blur-2xl" />
        <div className="absolute -right-28 top-8 h-96 w-96 rounded-full bg-[radial-gradient(circle,_oklch(0.68_0.07_210/0.22),_transparent_68%)] blur-3xl" />
        <div className="absolute bottom-[-140px] left-1/2 h-[380px] w-[620px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_oklch(0.82_0.03_145/0.16),_transparent_70%)] blur-3xl" />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20" />

      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-3 transition-transform hover:scale-105">
            <div className="h-12 w-12 overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-lg shadow-green-500/20">
              <img
                src="/assets-storage/logo-icon_34950e08.png"
                alt="Logo"
                className="h-full w-full object-cover"
                style={{ background: "oklch(0.76 0.18 148)" }}
              />
            </div>
            <span className="text-xl font-bold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
              Passenger
            </span>
          </a>
        </div>

        <Card className="relative overflow-hidden rounded-3xl border border-white/12 bg-slate-950/72 p-7 backdrop-blur-2xl shadow-[0_28px_90px_-36px_rgba(3,8,20,0.9)] sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_56%)]" />

          <div className="relative mb-6 flex items-center justify-between">
            <a href="/" className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition-all hover:border-white/30 hover:text-white">
              <ArrowLeft size={14} />
              Volver al inicio
            </a>
            <span className="rounded-full border border-green-300/35 bg-green-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-green-200">
              Acceso seguro
            </span>
          </div>

          <div className="relative mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
              Iniciar sesión
            </h1>
            <p className="mt-2 text-sm text-white/60">Accede a tu panel de control</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/82">
                <Mail size={14} className="mr-1 inline" /> Correo
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputClass}
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/82">
                <Lock size={14} className="mr-1 inline" /> Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={`${inputClass} pr-12`}
                  placeholder="Tu contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 transition hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl border border-green-300/45 bg-[linear-gradient(145deg,rgba(5,150,105,0.9),rgba(6,120,88,0.95))] py-3 text-base font-bold tracking-[0.01em] text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.75)] shadow-[0_14px_28px_-20px_rgba(5,150,105,0.95)] transition-all hover:border-green-200/70 hover:bg-[linear-gradient(145deg,rgba(4,134,95,0.95),rgba(5,105,76,0.98))]"
            >
              {loading ? "Ingresando..." : t.login.submit}
            </Button>
          </form>

          <div className="relative mt-5 text-center">
            <p className="text-sm text-white/60">
              ¿No tienes cuenta?{" "}
              <a href="/register" className="inline-flex items-center rounded-lg border border-emerald-300/45 bg-emerald-300/10 px-3 py-1.5 font-semibold text-[oklch(0.76_0.18_148)] transition-all hover:border-emerald-200/70 hover:bg-emerald-300/16">
                Registrarse
              </a>
            </p>
          </div>

          <p className="relative mt-6 text-center text-xs text-white/45">
            Al continuar aceptas nuestros términos y políticas de privacidad.
          </p>
        </Card>
      </div>
    </div>
  );
}
