import { Building2, ChevronRight } from "lucide-react";

export default function ForFleetSection() {
  return (
    <section id="flotilla" className="py-18 lg:py-24" style={{ background: "oklch(0.98 0.005 100)" }}>
      <div className="container">
        <div className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_25px_80px_-35px_rgba(0,0,0,0.35)] lg:p-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.24em]" style={{ background: "oklch(0.52 0.12 148 / 0.10)", color: "oklch(0.35 0.12 148)" }}>
                <Building2 size={12} /> B2B SaaS independiente
              </span>
              <h2 className="mt-4 text-3xl font-extrabold text-slate-900 lg:text-4xl" style={{ fontFamily: "'Sora', sans-serif" }}>
                Tienes una flotilla? Gestiona tu empresa con Passenger
              </h2>
              <p className="mt-3 text-lg text-slate-600">
                Mantuvimos el servicio para empresas y operaciones de flotilla como módulo separado del Marketplace P2P de pasajeros y conductores independientes.
              </p>
              <p className="mt-3 text-sm text-slate-500">
                Planes disponibles: $49, $149 y $399 por mes.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a href="#pricing" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-6 py-3 font-semibold text-slate-800 hover:bg-slate-50">
                Ver planes B2B
              </a>
              <a href="/register" onClick={(e) => { e.preventDefault(); sessionStorage.setItem("registerRole", "fleet"); window.location.href = "/register"; }} className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-bold shadow-lg shadow-emerald-500/10" style={{ background: "oklch(0.52 0.12 148)", color: "white" }}>
                Crear flotilla <ChevronRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
