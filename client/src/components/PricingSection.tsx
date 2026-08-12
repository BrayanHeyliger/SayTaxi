import { Building2, CheckCircle2, ChevronRight } from "lucide-react";

const fleetPlans = [
  {
    name: "Starter Fleet",
    price: "$49/mes",
    desc: "Flotilla pequena que inicia operaciones con panel central.",
    features: ["Hasta 5 conductores", "Panel B2B", "Soporte email"],
  },
  {
    name: "Growth Fleet",
    price: "$149/mes",
    desc: "Para empresas en crecimiento con operacion diaria intensa.",
    features: ["Hasta 50 conductores", "Reportes avanzados", "Soporte prioritario"],
    highlight: true,
  },
  {
    name: "Enterprise Fleet",
    price: "$399/mes",
    desc: "Para operaciones de alto volumen y necesidades personalizadas.",
    features: ["Conductores ilimitados", "Analitica completa", "SLA dedicado"],
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 lg:py-28 bg-[linear-gradient(170deg,_oklch(0.1_0.01_250),_oklch(0.14_0.02_200))]">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4" style={{ background: "oklch(0.76 0.18 148 / 0.1)", color: "oklch(0.52 0.12 148)" }}>
            <Building2 size={12} /> Servicio B2B separado
          </span>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4" style={{ fontFamily: "'Sora', sans-serif" }}>
            Tienes una flotilla? Gestiona tu empresa con Passenger
          </h2>
          <p className="text-white/65 text-lg">
            Este módulo es independiente del Marketplace P2P y funciona como SaaS B2B para empresas de transporte.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {fleetPlans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-3xl p-6 border ${plan.highlight ? "border-emerald-300/40 bg-emerald-400/10" : "border-white/15 bg-white/5"}`}
            >
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <p className="text-3xl font-extrabold mt-2" style={{ color: "oklch(0.76 0.18 148)", fontFamily: "'Sora', sans-serif" }}>{plan.price}</p>
              <p className="text-white/65 mt-3 text-sm">{plan.desc}</p>
              <ul className="space-y-2 mt-4 text-sm text-white/80">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 text-emerald-300" /> {feature}</li>
                ))}
              </ul>
              <a href="/register" onClick={(e) => { e.preventDefault(); sessionStorage.setItem("registerRole", "fleet"); window.location.href = "/register"; }} className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold" style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}>
                Crear cuenta de flotilla <ChevronRight size={15} />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
