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

  return (
    <div className="min-h-screen bg-[linear-gradient(165deg,_oklch(0.16_0.02_248)_0%,_oklch(0.1_0.018_252)_55%,_oklch(0.085_0.014_255)_100%)] text-white px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <a href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-5">
          <ArrowLeft size={16} /> Volver al inicio
        </a>

        <div className="rounded-3xl border border-white/15 bg-slate-950/70 backdrop-blur-xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/60">Onboarding de conductor</p>
              <h1 className="text-2xl md:text-3xl font-extrabold" style={{ fontFamily: "'Sora', sans-serif" }}>
                Empieza a ganar con suscripcion SaaS
              </h1>
              <p className="text-white/65 mt-2">Proceso de verificación en 7 pasos para activar tu perfil en Passenger.</p>
            </div>
            <div className="text-sm text-white/80">Paso {step + 1} de {steps.length}</div>
          </div>

          <div className="w-full h-2 rounded-full bg-white/10 mb-2 overflow-hidden">
            <div className="h-full bg-[oklch(0.76_0.18_148)] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-white/60 mb-6">{steps[step]}</p>

          {!completed && step === 0 && (
            <section className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="space-y-1 text-sm">Nombre completo
                  <input value={data.fullName} onChange={(e) => update("fullName", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm">Email
                  <input type="email" value={data.email} onChange={(e) => update("email", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm">Telefono
                  <input value={data.phone} onChange={(e) => update("phone", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm">Contrasena
                  <input type="password" value={data.password} onChange={(e) => update("password", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
              </div>
              <label className="space-y-1 text-sm block">SSN (encriptado)
                <input value={data.ssn} onChange={(e) => update("ssn", e.target.value)} placeholder="XXX-XX-1234" className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                <p className="text-xs text-white/55">Vista protegida: <MaskedSsnPreview ssn={data.ssn} /></p>
              </label>
            </section>
          )}

          {!completed && step === 1 && (
            <section className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="space-y-1 text-sm">Licencia (frente URL)
                  <input value={data.licenseFront} onChange={(e) => update("licenseFront", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm">Licencia (reverso URL)
                  <input value={data.licenseBack} onChange={(e) => update("licenseBack", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm">Selfie verificacion URL
                  <input value={data.selfie} onChange={(e) => update("selfie", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm">Numero de licencia
                  <input value={data.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
              </div>
              <label className="space-y-1 text-sm block">Estado emisor
                <input value={data.licenseState} onChange={(e) => update("licenseState", e.target.value)} placeholder="Florida" className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
              </label>
            </section>
          )}

          {!completed && step === 2 && (
            <section className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="space-y-1 text-sm">Marca
                  <input value={data.vehicleMake} onChange={(e) => update("vehicleMake", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm">Modelo
                  <input value={data.vehicleModel} onChange={(e) => update("vehicleModel", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm">Ano
                  <input value={data.vehicleYear} onChange={(e) => update("vehicleYear", e.target.value)} placeholder="2008+" className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm">Color
                  <input value={data.vehicleColor} onChange={(e) => update("vehicleColor", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm">Placa
                  <input value={data.licensePlate} onChange={(e) => update("licensePlate", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm">Numero de registro
                  <input value={data.registrationNumber} onChange={(e) => update("registrationNumber", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="space-y-1 text-sm">Foto exterior URL
                  <input value={data.vehicleExteriorPhoto} onChange={(e) => update("vehicleExteriorPhoto", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm">Foto interior URL
                  <input value={data.vehicleInteriorPhoto} onChange={(e) => update("vehicleInteriorPhoto", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
              </div>
            </section>
          )}

          {!completed && step === 3 && (
            <section className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="space-y-1 text-sm">Aseguradora
                  <input value={data.insurerName} onChange={(e) => update("insurerName", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm">Numero de poliza
                  <input value={data.policyNumber} onChange={(e) => update("policyNumber", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
              </div>
              <label className="space-y-1 text-sm block">Poliza vigente URL
                <input value={data.insuranceFile} onChange={(e) => update("insuranceFile", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={data.rideshareEndorsement} onChange={(e) => update("rideshareEndorsement", e.target.checked)} />
                Confirmo que tengo Rideshare Endorsement
              </label>
              {data.rideshareEndorsement && (
                <label className="space-y-1 text-sm block">Documento de endorsement URL
                  <input value={data.rideshareEndorsementFile} onChange={(e) => update("rideshareEndorsementFile", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
              )}
            </section>
          )}

          {!completed && step === 4 && (
            <section className="space-y-5">
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
            <section className="space-y-4">
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
            <section className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="space-y-1 text-sm">Foto de perfil URL
                  <input value={data.profilePhoto} onChange={(e) => update("profilePhoto", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm">Horarios de disponibilidad
                  <input value={data.availability} onChange={(e) => update("availability", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm">Tarifa sugerida min (USD)
                  <input value={data.suggestedFareMin} onChange={(e) => update("suggestedFareMin", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm">Tarifa sugerida max (USD)
                  <input value={data.suggestedFareMax} onChange={(e) => update("suggestedFareMax", e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
                </label>
              </div>
              <label className="space-y-1 text-sm block">Descripcion breve
                <textarea value={data.bio} onChange={(e) => update("bio", e.target.value)} className="w-full min-h-[90px] rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm block">Zonas de cobertura
                <textarea value={data.coverageZones} onChange={(e) => update("coverageZones", e.target.value)} className="w-full min-h-[70px] rounded-xl bg-black/30 border border-white/20 px-3 py-2" />
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

          <div className="flex items-center justify-between mt-7">
            <button
              onClick={back}
              disabled={step === 0 || completed}
              className="px-4 py-2 rounded-xl border border-white/20 disabled:opacity-40"
            >
              Anterior
            </button>

            {step < steps.length - 1 && !completed && (
              <button onClick={next} className="px-4 py-2 rounded-xl bg-white text-slate-900 font-semibold">Siguiente</button>
            )}

            {step === steps.length - 1 && !completed && (
              <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-xl bg-[oklch(0.76_0.18_148)] text-[oklch(0.1_0.02_150)] font-bold disabled:opacity-60">
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
      </div>
    </div>
  );
}
