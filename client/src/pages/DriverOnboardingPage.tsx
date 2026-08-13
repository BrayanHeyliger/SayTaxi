import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, ShieldCheck, Upload, CreditCard, MapPin, User, Car, FileText } from "lucide-react";

type VerificationStatus = "pending" | "approved" | "rejected";

type OnboardingData = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  ssn: string;
  licenseFront: string;
  licenseBack: string;
  selfie: string;
  licenseNumber: string;
  licenseState: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  licensePlate: string;
  registrationNumber: string;
  vehicleExteriorPhoto: string;
  vehicleInteriorPhoto: string;
  insurerName: string;
  policyNumber: string;
  insuranceFile: string;
  rideshareEndorsement: boolean;
  rideshareEndorsementFile: string;
  subscriptionPlan: "basic" | "pro" | "premium";
  profilePhoto: string;
  bio: string;
  suggestedFareMin: string;
  suggestedFareMax: string;
  coverageZones: string;
  availability: string;
};

const initialData: OnboardingData = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  ssn: "",
  licenseFront: "",
  licenseBack: "",
  selfie: "",
  licenseNumber: "",
  licenseState: "",
  vehicleMake: "",
  vehicleModel: "",
  vehicleYear: "",
  vehicleColor: "",
  licensePlate: "",
  registrationNumber: "",
  vehicleExteriorPhoto: "",
  vehicleInteriorPhoto: "",
  insurerName: "",
  policyNumber: "",
  insuranceFile: "",
  rideshareEndorsement: false,
  rideshareEndorsementFile: "",
  subscriptionPlan: "pro",
  profilePhoto: "",
  bio: "",
  suggestedFareMin: "",
  suggestedFareMax: "",
  coverageZones: "Orlando Downtown, Kissimmee, Winter Park",
  availability: "Lun-Dom 6:00 AM - 11:00 PM",
};

const steps = [
  "Datos personales",
  "Identidad",
  "Vehiculo",
  "Seguro",
  "Antecedentes",
  "Suscripcion",
  "Perfil",
] as const;

const planDetails = {
  basic: {
    name: "Basico",
    price: "$29/semana",
    benefits: ["Aparecer en el directorio", "Hasta 10 leads/dia", "Soporte email"],
  },
  pro: {
    name: "Pro",
    price: "$49/semana",
    benefits: ["Visibilidad destacada", "Leads ilimitados", "Perfil con fotos", "Soporte prioritario"],
  },
  premium: {
    name: "Premium",
    price: "$79/semana",
    benefits: ["Todo lo anterior", "Pagina personalizada", "Estadisticas", "Reserva directa"],
  },
};

function MaskedSsnPreview({ ssn }: { ssn: string }) {
  const digits = ssn.replace(/\D/g, "");
  if (!digits) return <span className="text-white/60">No registrado</span>;
  const last4 = digits.slice(-4).padStart(4, "*");
  return <span className="font-semibold">***-**-{last4}</span>;
}

export default function DriverOnboardingPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [backgroundStatus, setBackgroundStatus] = useState<VerificationStatus>("pending");
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  const progress = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);

  const update = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    setSaving(true);
    const payload = {
      ...data,
      backgroundCheckStatus: backgroundStatus,
      profileStatus: backgroundStatus === "approved" ? "active" : "pending_verification",
      subscriptionActivated: true,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("wt_driver_onboarding", JSON.stringify(payload));
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSaving(false);
    setCompleted(true);
  };

  const inputClass =
    "w-full rounded-xl border border-white/18 bg-black/28 px-3 py-2.5 text-white placeholder-white/45 outline-none transition-all focus:bg-black/35 focus:ring-2 focus:border-green-300/60 focus:ring-green-400/30";
  const labelClass = "space-y-1 text-sm text-white/86";
  const sectionCardClass = "rounded-2xl border border-white/12 bg-white/[0.04] p-4 md:p-5";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(165deg,_oklch(0.16_0.02_248)_0%,_oklch(0.1_0.018_252)_55%,_oklch(0.085_0.014_255)_100%)] text-white px-4 py-8">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -left-20 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,_oklch(0.76_0.18_148/0.26),_transparent_66%)] blur-2xl" />
        <div className="absolute -right-28 top-8 h-96 w-96 rounded-full bg-[radial-gradient(circle,_oklch(0.68_0.07_210/0.22),_transparent_68%)] blur-3xl" />
        <div className="absolute bottom-[-140px] left-1/2 h-[380px] w-[620px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_oklch(0.82_0.03_145/0.16),_transparent_70%)] blur-3xl" />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20" />

      <div className="relative mx-auto max-w-6xl">
        <a href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-5">
          <ArrowLeft size={16} /> Volver al inicio
        </a>

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-slate-950/72 p-6 shadow-[0_28px_90px_-36px_rgba(3,8,20,0.9)] backdrop-blur-2xl md:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_56%)]" />

            <div className="relative flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/60">Onboarding de conductor</p>
                <h1 className="text-2xl font-extrabold md:text-3xl" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Perfil premium para conductores
                </h1>
                <p className="text-white/65 mt-2">Proceso de verificacion en 7 pasos para activar tu perfil en Passenger.</p>
              </div>
              <div className="text-sm text-white/80">Paso {step + 1} de {steps.length}</div>
            </div>

            <div className="relative mb-6">
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-[oklch(0.76_0.18_148)] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                {steps.map((name, index) => (
                  <div
                    key={name}
                    className={`rounded-lg border px-2 py-1.5 text-[11px] ${index <= step ? "border-emerald-300/45 bg-emerald-300/10 text-emerald-100" : "border-white/12 bg-white/[0.03] text-white/58"}`}
                  >
                    {index + 1}. {name}
                  </div>
                ))}
              </div>
            </div>

            {!completed && step === 0 && (
            <section className={`${sectionCardClass} space-y-4`}>
              <div className="grid md:grid-cols-2 gap-4">
                <label className={labelClass}>Nombre completo
                  <input value={data.fullName} onChange={(e) => update("fullName", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Email
                  <input type="email" value={data.email} onChange={(e) => update("email", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Telefono
                  <input value={data.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Contrasena
                  <input type="password" value={data.password} onChange={(e) => update("password", e.target.value)} className={inputClass} />
                </label>
              </div>
              <label className={`${labelClass} block`}>SSN (encriptado)
                <input value={data.ssn} onChange={(e) => update("ssn", e.target.value)} placeholder="XXX-XX-1234" className={inputClass} />
                <p className="text-xs text-white/55">Vista protegida: <MaskedSsnPreview ssn={data.ssn} /></p>
              </label>
            </section>
          )}

          {!completed && step === 1 && (
            <section className={`${sectionCardClass} space-y-4`}>
              <div className="grid md:grid-cols-2 gap-4">
                <label className={labelClass}>Licencia (frente URL)
                  <input value={data.licenseFront} onChange={(e) => update("licenseFront", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Licencia (reverso URL)
                  <input value={data.licenseBack} onChange={(e) => update("licenseBack", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Selfie verificacion URL
                  <input value={data.selfie} onChange={(e) => update("selfie", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Numero de licencia
                  <input value={data.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} className={inputClass} />
                </label>
              </div>
              <label className={`${labelClass} block`}>Estado emisor
                <input value={data.licenseState} onChange={(e) => update("licenseState", e.target.value)} placeholder="Florida" className={inputClass} />
              </label>
            </section>
          )}

          {!completed && step === 2 && (
            <section className={`${sectionCardClass} space-y-4`}>
              <div className="grid md:grid-cols-2 gap-4">
                <label className={labelClass}>Marca
                  <input value={data.vehicleMake} onChange={(e) => update("vehicleMake", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Modelo
                  <input value={data.vehicleModel} onChange={(e) => update("vehicleModel", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Ano
                  <input value={data.vehicleYear} onChange={(e) => update("vehicleYear", e.target.value)} placeholder="2008+" className={inputClass} />
                </label>
                <label className={labelClass}>Color
                  <input value={data.vehicleColor} onChange={(e) => update("vehicleColor", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Placa
                  <input value={data.licensePlate} onChange={(e) => update("licensePlate", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Numero de registro
                  <input value={data.registrationNumber} onChange={(e) => update("registrationNumber", e.target.value)} className={inputClass} />
                </label>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <label className={labelClass}>Foto exterior URL
                  <input value={data.vehicleExteriorPhoto} onChange={(e) => update("vehicleExteriorPhoto", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Foto interior URL
                  <input value={data.vehicleInteriorPhoto} onChange={(e) => update("vehicleInteriorPhoto", e.target.value)} className={inputClass} />
                </label>
              </div>
            </section>
          )}

          {!completed && step === 3 && (
            <section className={`${sectionCardClass} space-y-4`}>
              <div className="grid md:grid-cols-2 gap-4">
                <label className={labelClass}>Aseguradora
                  <input value={data.insurerName} onChange={(e) => update("insurerName", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Numero de poliza
                  <input value={data.policyNumber} onChange={(e) => update("policyNumber", e.target.value)} className={inputClass} />
                </label>
              </div>
              <label className={`${labelClass} block`}>Poliza vigente URL
                <input value={data.insuranceFile} onChange={(e) => update("insuranceFile", e.target.value)} className={inputClass} />
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={data.rideshareEndorsement} onChange={(e) => update("rideshareEndorsement", e.target.checked)} />
                Confirmo que tengo Rideshare Endorsement
              </label>
              {data.rideshareEndorsement && (
                <label className={`${labelClass} block`}>Documento de endorsement URL
                  <input value={data.rideshareEndorsementFile} onChange={(e) => update("rideshareEndorsementFile", e.target.value)} className={inputClass} />
                </label>
              )}
            </section>
          )}

          {!completed && step === 4 && (
            <section className={`${sectionCardClass} space-y-5`}>
              <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                <h2 className="font-semibold mb-2 flex items-center gap-2"><ShieldCheck size={16} /> Verificacion de antecedentes</h2>
                <p className="text-sm text-white/70 mb-3">Integracion recomendada: Checkr, GoodHire o Persona. Estado de ejemplo para flujo funcional.</p>
                <div className="flex flex-wrap gap-2">
                  {(["pending", "approved", "rejected"] as VerificationStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => setBackgroundStatus(status)}
                      className={`px-3 py-1.5 rounded-lg text-sm border ${backgroundStatus === status ? "border-emerald-300 bg-emerald-400/20" : "border-white/20 bg-white/5"}`}
                    >
                      {status === "pending" ? "Pendiente" : status === "approved" ? "Aprobado" : "Rechazado"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/65 mt-3">Nota legal: el conductor no recibe solicitudes hasta estar aprobado.</p>
              </div>
            </section>
          )}

          {!completed && step === 5 && (
            <section className={`${sectionCardClass} space-y-4`}>
              <div className="grid md:grid-cols-3 gap-3">
                {(Object.keys(planDetails) as Array<keyof typeof planDetails>).map((plan) => (
                  <button
                    key={plan}
                    onClick={() => update("subscriptionPlan", plan)}
                    className={`rounded-2xl border p-4 text-left ${data.subscriptionPlan === plan ? "border-emerald-300 bg-emerald-400/15" : "border-white/15 bg-white/5"}`}
                  >
                    <p className="font-semibold">{planDetails[plan].name}</p>
                    <p className="text-lg font-extrabold mt-1">{planDetails[plan].price}</p>
                    <ul className="mt-3 text-xs text-white/70 space-y-1">
                      {planDetails[plan].benefits.map((b) => <li key={b}>• {b}</li>)}
                    </ul>
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white/75">
                Cobro recurrente sugerido: Stripe Billing (semanal/mensual) con activacion automatica del perfil.
              </div>
            </section>
          )}

          {!completed && step === 6 && (
            <section className={`${sectionCardClass} space-y-4`}>
              <div className="grid md:grid-cols-2 gap-4">
                <label className={labelClass}>Foto de perfil URL
                  <input value={data.profilePhoto} onChange={(e) => update("profilePhoto", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Horarios de disponibilidad
                  <input value={data.availability} onChange={(e) => update("availability", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Tarifa sugerida min (USD)
                  <input value={data.suggestedFareMin} onChange={(e) => update("suggestedFareMin", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>Tarifa sugerida max (USD)
                  <input value={data.suggestedFareMax} onChange={(e) => update("suggestedFareMax", e.target.value)} className={inputClass} />
                </label>
              </div>
              <label className={`${labelClass} block`}>Descripcion breve
                <textarea value={data.bio} onChange={(e) => update("bio", e.target.value)} className={`${inputClass} min-h-[90px]`} />
              </label>
              <label className={`${labelClass} block`}>Zonas de cobertura
                <textarea value={data.coverageZones} onChange={(e) => update("coverageZones", e.target.value)} className={`${inputClass} min-h-[70px]`} />
              </label>
            </section>
          )}

          {completed && (
            <section className="rounded-2xl border border-emerald-300/40 bg-emerald-400/10 p-5">
              <h2 className="text-xl font-bold flex items-center gap-2"><CheckCircle2 size={20} /> Onboarding completado</h2>
              <p className="text-white/80 mt-2">Tu perfil fue guardado como conductor SaaS con plan {planDetails[data.subscriptionPlan].name}. Estado de antecedentes: {backgroundStatus}.</p>
              <div className="grid md:grid-cols-3 gap-3 mt-4 text-sm">
                <div className="rounded-xl bg-black/30 border border-white/15 p-3"><User size={16} className="mb-1" /> Cliente del software (no empleado)</div>
                <div className="rounded-xl bg-black/30 border border-white/15 p-3"><CreditCard size={16} className="mb-1" /> Suscripcion recurrente activa</div>
                <div className="rounded-xl bg-black/30 border border-white/15 p-3"><MapPin size={16} className="mb-1" /> Perfil listo para directorio</div>
              </div>
              <button onClick={() => navigate("/driver-dashboard")} className="mt-5 px-4 py-2 rounded-xl bg-[oklch(0.76_0.18_148)] text-[oklch(0.1_0.02_150)] font-bold">Ir al panel de conductor</button>
            </section>
          )}

          <div className="relative flex items-center justify-between mt-7">
            <button
              onClick={back}
              disabled={step === 0 || completed}
              className="px-4 py-2 rounded-xl border border-white/20 bg-white/[0.04] hover:bg-white/[0.09] disabled:opacity-40"
            >
              Anterior
            </button>

            {step < steps.length - 1 && !completed && (
              <button onClick={next} className="px-4 py-2 rounded-xl border border-green-300/45 bg-[linear-gradient(145deg,rgba(5,150,105,0.9),rgba(6,120,88,0.95))] text-white font-semibold">Siguiente</button>
            )}

            {step === steps.length - 1 && !completed && (
              <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-xl border border-green-300/45 bg-[linear-gradient(145deg,rgba(5,150,105,0.9),rgba(6,120,88,0.95))] text-white font-bold disabled:opacity-60">
                {saving ? "Guardando..." : "Finalizar onboarding"}
              </button>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-white/60">
            <div className="rounded-lg border border-white/12 bg-white/5 px-2 py-2 flex items-center gap-1"><FileText size={13} /> Licencia USA vigente</div>
            <div className="rounded-lg border border-white/12 bg-white/5 px-2 py-2 flex items-center gap-1"><Car size={13} /> Auto 4 puertas (2008+)</div>
            <div className="rounded-lg border border-white/12 bg-white/5 px-2 py-2 flex items-center gap-1"><ShieldCheck size={13} /> Seguro + endorsement</div>
            <div className="rounded-lg border border-white/12 bg-white/5 px-2 py-2 flex items-center gap-1"><Upload size={13} /> Documentos verificables</div>
          </div>
          </div>

          <aside className="rounded-3xl border border-white/12 bg-slate-950/72 p-5 shadow-[0_28px_90px_-36px_rgba(3,8,20,0.9)] backdrop-blur-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/90">Resumen</p>
            <h2 className="mt-2 text-xl font-bold" style={{ fontFamily: "'Sora', sans-serif" }}>Estado del perfil</h2>
            <p className="mt-2 text-sm text-white/65">Este panel muestra el avance en tiempo real y mantiene el estilo visual del login de cliente.</p>

            <div className="mt-4 space-y-2 text-sm">
              <div className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2">Plan: <span className="font-semibold">{planDetails[data.subscriptionPlan].name}</span></div>
              <div className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2">Antecedentes: <span className="font-semibold">{backgroundStatus}</span></div>
              <div className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2">Progreso: <span className="font-semibold">{progress}%</span></div>
            </div>

            <div className="mt-4 rounded-xl border border-emerald-300/35 bg-emerald-300/10 p-3 text-xs text-emerald-100">
              Consejo: usa fotos limpias, bio corta y zonas claras para convertir mejor.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
