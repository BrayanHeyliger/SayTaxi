import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, Car, ArrowLeft, Mail, Lock, Phone, FileText, Building2, Eye, EyeOff, MapPin, ChevronRight } from "lucide-react";
import { useLocalAuth, type UserRole } from "@/contexts/LocalAuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { trpc } from "@/lib/trpc";

type RegisterType = "select" | "client" | "driver" | "fleet";

export default function Register() {
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const { register } = useLocalAuth();
  const [registerType, setRegisterType] = useState<RegisterType>("select");
  const [pendingTrip, setPendingTrip] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    licenseNumber: "",
    vehicleMake: "",
    vehicleModel: "",
    vehiclePlate: "",
    companyName: "",
    referralCode: "",
  });

  // Check for pending trip from Hero
  useEffect(() => {
    const raw = sessionStorage.getItem("pendingTrip");
    if (raw) {
      try {
        const trip = JSON.parse(raw);
        setPendingTrip(trip);
        // Auto-select client registration if there's a pending trip
        setRegisterType("client");
      } catch { /* ignore */ }
    }
  }, []);

  // Auto-fill referral code from URL param (?ref=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setFormData(f => ({ ...f, referralCode: ref.toUpperCase() }));
  }, []);

  // Auto-select role if coming from landing page section buttons
  useEffect(() => {
    const savedRole = sessionStorage.getItem("registerRole");
    if (savedRole === "driver") { setRegisterType("driver"); sessionStorage.removeItem("registerRole"); }
    else if (savedRole === "fleet") { setRegisterType("fleet"); sessionStorage.removeItem("registerRole"); }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const applyCodeMutation = trpc.referrals.applyCode.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    setError("");

    const role: UserRole = registerType === "fleet" ? "fleet" : registerType as UserRole;

    const result = await register({
      firstName: formData.firstName,
      lastName: formData.lastName || undefined,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      role,
      licenseNumber: formData.licenseNumber || undefined,
      vehicleMake: formData.vehicleMake || undefined,
      vehicleModel: formData.vehicleModel || undefined,
      vehiclePlate: formData.vehiclePlate || undefined,
      companyName: formData.companyName || undefined,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error || "Error al registrar");
      return;
    }

    // Apply referral code if provided
    if (formData.referralCode.trim() && (result as any).userId) {
      try {
        await applyCodeMutation.mutateAsync({
          code: formData.referralCode.trim().toUpperCase(),
          newUserId: (result as any).userId,
          newUserRole: role === "driver" ? "driver" : "client",
        });
        // Broadcast referral event so the referrer gets notified in real-time
        const event = {
          code: formData.referralCode.trim().toUpperCase(),
          newUserName: formData.firstName + (formData.lastName ? ` ${formData.lastName}` : ""),
          newUserRole: role === "driver" ? "driver" : "client",
          timestamp: Date.now(),
        };
        localStorage.setItem(`wt_referral_event_${event.code}`, JSON.stringify(event));
        try {
          const bc = new BroadcastChannel("wt_referral_notifications");
          bc.postMessage(event);
          bc.close();
        } catch { /* BroadcastChannel not available in some browsers */ }
      } catch { /* invalid code — don't block registration */ }
    }

    // Redirect based on role
    if (role === "driver") {
      // Send new drivers to the onboarding wizard to complete verification
      navigate("/driver-onboarding");
    } else if (role === "fleet") {
      navigate("/fleet-dashboard");
    } else {
      // pendingTrip stays in sessionStorage so ClientDashboard can read it
      navigate("/client-dashboard");
    }
  };

  const inputClass = (accent: "green" | "blue" | "indigo" = "green") => {
    const accentClass =
      accent === "blue"
        ? "focus:border-blue-300/60 focus:ring-blue-400/30"
        : accent === "indigo"
          ? "focus:border-indigo-300/60 focus:ring-indigo-400/30"
          : "focus:border-green-300/60 focus:ring-green-400/30";

    return `w-full rounded-xl border border-white/18 bg-black/28 px-3.5 py-2.5 text-white placeholder-white/45 outline-none transition-all focus:bg-black/35 focus:ring-2 ${accentClass}`;
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(165deg,_oklch(0.16_0.02_248)_0%,_oklch(0.1_0.018_252)_55%,_oklch(0.085_0.014_255)_100%)] px-4 py-12">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -left-20 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,_oklch(0.76_0.18_148/0.26),_transparent_66%)] blur-2xl" />
        <div className="absolute -right-28 top-8 h-96 w-96 rounded-full bg-[radial-gradient(circle,_oklch(0.68_0.07_210/0.22),_transparent_68%)] blur-3xl" />
        <div className="absolute bottom-[-140px] left-1/2 h-[380px] w-[620px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_oklch(0.82_0.03_145/0.16),_transparent_70%)] blur-3xl" />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20" />

      <div className="relative mx-auto w-full max-w-3xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-3 transition-transform hover:scale-105">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg shadow-green-500/20 ring-1 ring-white/10">
              <img src="/assets-storage/logo-icon_34950e08.png" alt="Logo" className="w-full h-full object-cover" style={{ background: "oklch(0.76 0.18 148)" }} />
            </div>
            <span className="text-white font-bold text-xl" style={{ fontFamily: "'Sora', sans-serif" }}>
              WhatsApp<span className="text-[oklch(0.76_0.18_148)]">Taxi</span>
            </span>
          </a>
        </div>

        {/* Selección de tipo */}
        {registerType === "select" && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-green-300/35 bg-green-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-green-200">
                Crear perfil
              </div>
              <h1 className="mb-2 text-4xl font-bold tracking-tight text-white" style={{ fontFamily: "'Sora', sans-serif" }}>Crear Cuenta</h1>
              <p className="text-white/65">Selecciona cómo quieres registrarte</p>
            </div>
            {pendingTrip && (
              <div className="rounded-2xl border border-green-300/30 bg-[linear-gradient(145deg,rgba(16,185,129,0.18),rgba(16,185,129,0.05))] p-4 flex items-center gap-3">
                <div className="text-2xl flex-shrink-0">🚕</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">Viaje pendiente de confirmar</p>
                  <p className="text-white/50 text-xs truncate">{pendingTrip.pickup} → {pendingTrip.destination}</p>
                  {pendingTrip.estimate && <p className="text-[oklch(0.76_0.18_148)] text-xs font-bold mt-0.5">${pendingTrip.estimate.price?.toFixed(2)} · {pendingTrip.estimate.km} km</p>}
                </div>
                <ChevronRight size={16} className="text-white/40 flex-shrink-0" />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="group cursor-pointer rounded-3xl border border-white/12 bg-slate-950/70 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-green-300/40 hover:shadow-[0_20px_45px_-25px_rgba(16,185,129,0.9)]" onClick={() => setRegisterType("client")}>
                <div className="text-center space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/20 transition-transform duration-300 group-hover:scale-105">
                    <User size={28} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Soy Cliente</h3>
                    <p className="text-white/55 text-sm mt-1">Quiero pedir taxis</p>
                  </div>
                  <Button className="w-full rounded-xl border border-green-300/45 bg-[linear-gradient(145deg,rgba(16,185,129,0.3),rgba(16,185,129,0.14))] font-semibold text-green-100 shadow-[0_14px_28px_-20px_rgba(16,185,129,0.9)] transition-all hover:border-green-200/70 hover:bg-[linear-gradient(145deg,rgba(16,185,129,0.42),rgba(16,185,129,0.22))]">Registrarme</Button>
                </div>
              </Card>
              <Card className="group cursor-pointer rounded-3xl border border-white/12 bg-slate-950/70 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/40 hover:shadow-[0_20px_45px_-25px_rgba(59,130,246,0.85)]" onClick={() => setRegisterType("driver")}>
                <div className="text-center space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/20 transition-transform duration-300 group-hover:scale-105">
                    <Car size={28} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Soy Conductor</h3>
                    <p className="text-white/55 text-sm mt-1">Quiero ganar dinero</p>
                  </div>
                  <Button className="w-full rounded-xl border border-blue-300/45 bg-[linear-gradient(145deg,rgba(59,130,246,0.28),rgba(59,130,246,0.12))] font-semibold text-blue-100 shadow-[0_14px_28px_-20px_rgba(59,130,246,0.9)] transition-all hover:border-blue-200/70 hover:bg-[linear-gradient(145deg,rgba(59,130,246,0.4),rgba(59,130,246,0.2))]">Registrarme</Button>
                </div>
              </Card>
              <Card className="group cursor-pointer rounded-3xl border border-white/12 bg-slate-950/70 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300/45 hover:shadow-[0_20px_45px_-25px_rgba(99,102,241,0.85)]" onClick={() => setRegisterType("fleet")}>
                <div className="text-center space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg shadow-indigo-500/20 transition-transform duration-300 group-hover:scale-105">
                    <Building2 size={28} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Soy Empresa</h3>
                    <p className="text-white/55 text-sm mt-1">Gestionar flotilla</p>
                  </div>
                  <Button className="w-full rounded-xl border border-indigo-300/45 bg-[linear-gradient(145deg,rgba(99,102,241,0.28),rgba(99,102,241,0.12))] font-semibold text-indigo-100 shadow-[0_14px_28px_-20px_rgba(99,102,241,0.9)] transition-all hover:border-indigo-200/70 hover:bg-[linear-gradient(145deg,rgba(99,102,241,0.4),rgba(99,102,241,0.2))]">Registrarme</Button>
                </div>
              </Card>
            </div>
            <div className="text-center pt-2">
              <p className="text-white/60 text-sm">
                ¿Ya tienes cuenta?{" "}
                <a href="/login" className="inline-flex items-center rounded-lg border border-emerald-300/45 bg-emerald-300/10 px-3 py-1.5 font-semibold text-[oklch(0.76_0.18_148)] transition-all hover:border-emerald-200/70 hover:bg-emerald-300/16">Iniciar Sesión</a>
              </p>
            </div>
            <div className="text-center">
              <a href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors">
                <ArrowLeft size={14} /> Volver al inicio
              </a>
            </div>
          </div>
        )}

        {/* Formulario */}
        {registerType !== "select" && (
          <Card className="relative overflow-hidden rounded-3xl border border-white/12 bg-slate-950/72 p-7 backdrop-blur-2xl shadow-[0_28px_90px_-36px_rgba(3,8,20,0.9)] sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_56%)]" />

            <button onClick={() => { setRegisterType("select"); setError(""); }} className="relative mb-6 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition-all hover:border-white/30 hover:text-white">
              <ArrowLeft size={14} /> Volver
            </button>

            <div className="relative flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${registerType === "client" ? "bg-gradient-to-br from-green-400 to-green-600" : registerType === "driver" ? "bg-gradient-to-br from-blue-400 to-blue-600" : "bg-gradient-to-br from-indigo-400 to-indigo-600"}`}>
                {registerType === "client" ? <User size={20} className="text-white" /> : registerType === "driver" ? <Car size={20} className="text-white" /> : <Building2 size={20} className="text-white" />}
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  {registerType === "client" ? "Registro de Cliente" : registerType === "driver" ? "Registro de Conductor" : "Registro de Empresa"}
                </h2>
                <p className="text-white/60 text-sm">Completa tus datos</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/82 text-sm font-medium mb-1.5">Nombre *</label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required className={inputClass()} placeholder="Tu nombre" />
                </div>
                <div>
                  <label className="block text-white/82 text-sm font-medium mb-1.5">Apellido</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className={inputClass()} placeholder="Tu apellido" />
                </div>
              </div>

              {registerType === "fleet" && (
                <div>
                  <label className="block text-white/82 text-sm font-medium mb-1.5"><Building2 size={14} className="inline mr-1" /> Nombre de la Empresa *</label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} required className={inputClass("indigo")} placeholder="Mi Empresa de Taxis" />
                </div>
              )}

              <div>
                <label className="block text-white/82 text-sm font-medium mb-1.5"><Mail size={14} className="inline mr-1" /> Email *</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required autoComplete="email" className={inputClass()} placeholder="tu@email.com" />
              </div>

              <div>
                <label className="block text-white/82 text-sm font-medium mb-1.5"><Phone size={14} className="inline mr-1" /> Teléfono *</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required className={inputClass()} placeholder="+1 234 567 8900" />
              </div>

              {registerType === "driver" && (
                <>
                  <div>
                    <label className="block text-white/82 text-sm font-medium mb-1.5"><FileText size={14} className="inline mr-1" /> Número de Licencia *</label>
                    <input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleInputChange} required className={inputClass("blue")} placeholder="DL-123456" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-white/82 text-sm font-medium mb-1.5">Marca *</label>
                      <input type="text" name="vehicleMake" value={formData.vehicleMake} onChange={handleInputChange} required className={inputClass("blue")} placeholder="Toyota" />
                    </div>
                    <div>
                      <label className="block text-white/82 text-sm font-medium mb-1.5">Modelo *</label>
                      <input type="text" name="vehicleModel" value={formData.vehicleModel} onChange={handleInputChange} required className={inputClass("blue")} placeholder="Corolla" />
                    </div>
                    <div>
                      <label className="block text-white/82 text-sm font-medium mb-1.5">Placa *</label>
                      <input type="text" name="vehiclePlate" value={formData.vehiclePlate} onChange={handleInputChange} required className={inputClass("blue")} placeholder="ABC-123" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-white/82 text-sm font-medium mb-1.5"><Lock size={14} className="inline mr-1" /> Contraseña *</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} required autoComplete="new-password" className={`${inputClass()} pr-12`} placeholder="Mínimo 6 caracteres" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-white/82 text-sm font-medium mb-1.5"><Lock size={14} className="inline mr-1" /> Confirmar Contraseña *</label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} required autoComplete="new-password" className={inputClass()} placeholder="Repite tu contraseña" />
              </div>

              {/* Referral code field */}
              <div>
                <label className="block text-white/82 text-sm font-medium mb-1.5">
                  <span className="mr-1">🎁</span> Código de referido <span className="text-white/30 text-xs">(opcional)</span>
                </label>
                <input
                  type="text"
                  name="referralCode"
                  value={formData.referralCode}
                  onChange={e => setFormData(f => ({ ...f, referralCode: e.target.value.toUpperCase() }))}
                  className={inputClass()}
                  placeholder="Ej: JUAN2024"
                  maxLength={20}
                />
                {formData.referralCode && (
                  <p className="text-xs text-green-400 mt-1">✓ Se aplicará al crear tu cuenta</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className={`mt-2 w-full rounded-xl py-3 text-base font-semibold shadow-[0_20px_44px_-20px_rgba(16,185,129,0.9)] transition-all hover:-translate-y-0.5 ${registerType === "driver" ? "bg-blue-600 text-white hover:bg-blue-500 shadow-[0_20px_44px_-20px_rgba(59,130,246,0.95)]" : registerType === "fleet" ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_20px_44px_-20px_rgba(99,102,241,0.95)]" : ""}`}
                style={registerType === "client" ? { background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" } : {}}
              >
                {loading ? "Registrando..." : `Crear Cuenta ${registerType === "client" ? "de Cliente" : registerType === "driver" ? "de Conductor" : "de Empresa"}`}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
