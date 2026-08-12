import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Lock, ArrowLeft, Eye, EyeOff, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
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

    // Get user from localStorage to determine redirect
    const stored = localStorage.getItem("wt_user");
    if (stored) {
      const user = JSON.parse(stored);
      if (user.role === "admin") {
        navigate("/client-dashboard");
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
        // Check if this client email is also a dispatcher
        try {
          const res = await fetch(
            `/api/trpc/referrals.getDispatcherByEmail?input=${encodeURIComponent(JSON.stringify({ json: { email } }))}`,
            { credentials: "include" }
          );
          const data = await res.json();
          const dispatcher = data?.result?.data?.json;
          if (dispatcher && dispatcher.status === "active") {
            navigate("/dispatcher");
            return;
          }
        } catch { /* not a dispatcher */ }
        navigate("/client-dashboard");
      }
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(165deg,_oklch(0.16_0.02_248)_0%,_oklch(0.1_0.018_252)_55%,_oklch(0.085_0.014_255)_100%)] px-4 py-10 sm:py-14">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -left-20 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,_oklch(0.76_0.18_148/0.26),_transparent_66%)] blur-2xl" />
        <div className="absolute -right-28 top-8 h-96 w-96 rounded-full bg-[radial-gradient(circle,_oklch(0.68_0.07_210/0.22),_transparent_68%)] blur-3xl" />
        <div className="absolute bottom-[-140px] left-1/2 h-[380px] w-[620px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_oklch(0.82_0.03_145/0.16),_transparent_70%)] blur-3xl" />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20" />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <div className="w-full">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-3 transition-transform hover:scale-105">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg shadow-green-500/20 ring-1 ring-white/10">
              <img
                src="/assets-storage/logo-icon_34950e08.png"
                alt="Passenger Logo"
                className="w-full h-full object-cover"
                style={{ background: "oklch(0.76 0.18 148)" }}
              />
            </div>
            <span className="text-white font-bold text-xl" style={{ fontFamily: "'Sora', sans-serif" }}>
              Pas<span className="text-[oklch(0.76_0.18_148)]">senger</span>
            </span>
          </a>
        </div>

        <Card className="relative overflow-hidden rounded-3xl border border-white/12 bg-slate-950/72 p-7 backdrop-blur-2xl shadow-[0_28px_90px_-36px_rgba(3,8,20,0.9)] sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_56%)]" />

          <div className="relative mb-6 flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-green-300/30 bg-green-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-green-200">
                <Sparkles size={12} />
                Acceso rápido
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-[2rem]" style={{ fontFamily: "'Sora', sans-serif" }}>
                Iniciar Sesión
              </h1>
              <p className="mt-1.5 text-sm text-white/68">{t.login.sub}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/8 p-2.5 text-green-200 shadow-[0_12px_32px_-20px_rgba(52,211,153,0.9)]">
              <ShieldCheck size={20} />
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="group">
              <label className="mb-1.5 flex items-center text-sm font-medium text-white/85">
                <Mail size={14} className="mr-1.5 text-green-300" /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-white/18 bg-black/28 px-4 py-3 text-white placeholder-white/45 outline-none transition-all focus:border-green-300/60 focus:bg-black/35 focus:ring-2 focus:ring-green-400/30"
                placeholder="tu@email.com"
              />
            </div>

            <div className="group">
              <label className="mb-1.5 flex items-center text-sm font-medium text-white/85">
                <Lock size={14} className="mr-1.5 text-green-300" /> Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/18 bg-black/28 px-4 py-3 pr-12 text-white placeholder-white/45 outline-none transition-all focus:border-green-300/60 focus:bg-black/35 focus:ring-2 focus:ring-green-400/30"
                  placeholder="Tu contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 transition-colors hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl py-3 text-base font-semibold shadow-[0_20px_44px_-20px_rgba(16,185,129,0.9)] transition-all hover:translate-y-[-1px] hover:brightness-105"
              style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}
            >
              {loading ? "Ingresando..." : t.login.submit}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-white/72">
              ¿No tienes cuenta?{" "}
              <a
                href="/register"
                className="inline-flex items-center rounded-lg border border-emerald-300/45 bg-emerald-300/10 px-3 py-1.5 font-semibold text-[oklch(0.76_0.18_148)] transition-all hover:border-emerald-200/70 hover:bg-emerald-300/16"
              >
                Registrarse
              </a>
            </p>
          </div>
        </Card>

        <div className="mt-5 text-center">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white/70">
            <ArrowLeft size={14} />
            Volver al inicio
          </a>
        </div>
        </div>
      </div>
    </div>
  );
}
