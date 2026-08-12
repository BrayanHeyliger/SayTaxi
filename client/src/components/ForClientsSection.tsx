import { ShieldCheck, Wallet, Star, Clock3 } from "lucide-react";

const paymentMethods = ["Efectivo", "Zelle", "Venmo", "Apple Pay", "Google Pay", "Stripe Connect"];

export default function ForClientsSection() {
  return (
    <section id="clientes" className="py-20 lg:py-28" style={{ background: "linear-gradient(180deg, oklch(0.97 0.004 110), oklch(0.985 0.002 100))" }}>
      <div className="container">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em]" style={{ background: "oklch(0.76 0.18 148 / 0.12)", color: "oklch(0.35 0.12 148)" }}>
            Passenger Marketplace
          </span>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900 lg:text-5xl" style={{ fontFamily: "'Sora', sans-serif" }}>
            Tu viaje, tu eleccion
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Ve conductores verificados en la plataforma y elige con quien viajar. Sin matching automatico obligatorio y sin comisiones ocultas para el pasajero.
          </p>
        </div>

        <div className="mb-10 grid items-stretch gap-8 lg:grid-cols-2">
          <article className="rounded-[28px] border border-slate-200/80 bg-white p-7 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.35)]">
            <div className="mb-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Verificado
            </div>
            <h3 className="mb-4 text-xl font-bold text-slate-900">Conductores verificados en plataforma</h3>
            <ul className="space-y-3 text-slate-600">
              <li className="flex gap-2"><ShieldCheck size={18} className="mt-0.5 text-emerald-600" /> Licencia de conducir vigente verificada</li>
              <li className="flex gap-2"><ShieldCheck size={18} className="mt-0.5 text-emerald-600" /> Seguro activo y evidencia documental</li>
              <li className="flex gap-2"><ShieldCheck size={18} className="mt-0.5 text-emerald-600" /> Antecedentes revisados</li>
              <li className="flex gap-2"><Clock3 size={18} className="mt-0.5 text-blue-600" /> Tiempo estimado de llegada visible antes de solicitar</li>
            </ul>
          </article>

          <article className="rounded-[28px] border border-slate-200/80 bg-white p-7 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.35)]">
            <div className="mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              Pago directo
            </div>
            <h3 className="mb-4 text-xl font-bold text-slate-900">Pago directo a tu conductor</h3>
            <p className="mb-4 text-slate-600">El pago del servicio va directamente al conductor independiente.</p>
            <div className="flex flex-wrap gap-2.5">
              {paymentMethods.map((method) => (
                <span key={method} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
                  {method}
                </span>
              ))}
            </div>
            <div className="mt-5 inline-flex items-start gap-2 rounded-2xl border border-blue-200/70 bg-blue-50 p-3 text-sm text-blue-900">
              <Wallet size={16} className="mt-0.5" />
              Passenger cobra al conductor por suscripción SaaS de uso de plataforma, no por comisión de cada viaje.
            </div>
          </article>
        </div>

        <div className="flex flex-col items-center justify-between gap-5 rounded-[32px] p-6 lg:flex-row lg:p-8" style={{ background: "linear-gradient(135deg, oklch(0.10 0.01 250), oklch(0.14 0.02 200))" }}>
          <div>
            <p className="text-sm text-white/70">Directorio transparente</p>
            <h3 className="mt-1 text-2xl font-extrabold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
              Elige conductor por perfil, tarifa y calificacion
            </h3>
          </div>
          <a href="/buscar-conductor" className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 font-bold shadow-lg shadow-black/20" style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}>
            Buscar conductor <Star size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}
