import { CheckCircle2, ChevronRight, ShieldCheck } from "lucide-react";

const plans = [
  {
    name: "Basico",
    price: "$29/semana",
    benefits: ["Aparecer en el directorio", "Hasta 10 leads/dia", "Soporte email"],
  },
  {
    name: "Pro",
    price: "$49/semana",
    benefits: ["Visibilidad destacada", "Leads ilimitados", "Perfil con fotos", "Soporte prioritario"],
  },
  {
    name: "Premium",
    price: "$79/semana",
    benefits: ["Todo lo anterior", "Pagina personalizada", "Estadisticas", "Reserva directa"],
  },
];

const requirements = [
  "Mayor de 21 anos",
  "Licencia de conducir de USA vigente (minimo 1 ano)",
  "Auto de 4 puertas (modelo 2008+)",
  "Seguro de auto personal vigente",
  "Background check aprobado",
  "Rideshare Endorsement en poliza de seguro",
];

export default function ForDriversSection() {
  return (
    <section id="conductores" className="py-20 lg:py-28" style={{ background: "oklch(0.10 0.01 250)" }}>
      <div className="container">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em]" style={{ background: "oklch(0.76 0.18 148 / 0.15)", color: "oklch(0.76 0.18 148)" }}>
            Suscripcion conductores
          </span>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight text-white lg:text-5xl" style={{ fontFamily: "'Sora', sans-serif" }}>
            Tu plataforma para conseguir mas clientes
          </h2>
          <p className="mt-4 text-lg text-white/65">
            Paga una suscripcion semanal y accede a cientos de pasajeros en Orlando. Tu decides que viajes aceptar.
          </p>
        </div>

        <div className="mb-10 grid gap-4 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <article key={plan.name} className="rounded-[28px] border border-white/15 bg-white/8 p-6 backdrop-blur-md shadow-[0_20px_55px_rgba(0,0,0,0.22)]">
              {index === 1 && (
                <div className="mb-4 inline-flex rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
                  Más popular
                </div>
              )}
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <p className="mt-2 text-3xl font-extrabold" style={{ color: "oklch(0.76 0.18 148)", fontFamily: "'Sora', sans-serif" }}>{plan.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-white/75">
                {plan.benefits.map((benefit) => (
                  <li key={benefit} className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 text-emerald-300" /> {benefit}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="rounded-[32px] border border-white/15 bg-white/5 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.2)] lg:p-8">
          <h3 className="mb-4 text-xl font-bold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>Requisitos para rodar</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {requirements.map((item) => (
              <div key={item} className="flex gap-2 text-sm text-white/75">
                <ShieldCheck size={16} className="mt-0.5 text-emerald-300" /> {item}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href="/driver-onboarding" className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-bold shadow-lg shadow-black/20" style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}>
              Empieza a ganar - Suscribete <ChevronRight size={16} />
            </a>
            <a href="/buscar-conductor" className="inline-flex items-center justify-center rounded-2xl border border-white/25 px-6 py-3 font-semibold text-white/85 hover:text-white">
              Ver como te eligen los pasajeros
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
