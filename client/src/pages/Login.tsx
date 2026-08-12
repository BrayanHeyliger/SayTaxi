import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.13_0.01_250)] to-[oklch(0.08_0.02_250)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-green-500/20">
              <img
                src="/manus-storage/logo-icon_34950e08.png"
                alt="Passenger Logo"
                className="w-full h-full object-cover"
                style={{ background: "oklch(0.76 0.18 148)" }}
              />
            </div>
            <span className="text-white font-bold text-xl" style={{ fontFamily: "'Sora', sans-serif" }}>
              Passenger
            </span>
          </a>
        </div>

        <Card className="p-8 bg-white/5 backdrop-blur-sm border border-white/10">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
              Iniciar Sesión
            </h1>
            <p className="text-white/50 text-sm mt-2">Accede a tu panel de control</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-1.5">
                <Mail size={14} className="inline mr-1" /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-1.5">
                <Lock size={14} className="inline mr-1" /> Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none pr-12"
                  placeholder="Tu contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-semibold text-base shadow-lg shadow-green-500/25 mt-2"
              style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}
            >
              {loading ? "Ingresando..." : t.login.submit}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-white/50 text-sm">
              ¿No tienes cuenta?{" "}
              <a href="/register" className="text-[oklch(0.76_0.18_148)] hover:underline font-medium">
                Registrarse
              </a>
            </p>
          </div>
        </Card>

        <div className="text-center mt-6">
          <a href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors">
            <ArrowLeft size={14} />
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
