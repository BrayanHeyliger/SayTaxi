/**
 * CTASection — Botones de acción directa en el landing
 * Pedir Viaje y Ser Chofer
 */
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import { User, Car, ArrowRight } from "lucide-react";

export default function CTASection() {
  const { t } = useI18n();
  return (
    <section
      id="cta"
      className="py-20 lg:py-28"
      style={{
        background: "linear-gradient(135deg, oklch(0.10 0.01 250) 0%, oklch(0.14 0.02 200) 100%)",
      }}
    >
      <div className="container max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
            style={{ background: "oklch(0.76 0.18 148 / 0.15)", color: "oklch(0.76 0.18 148)" }}
          >
            Únete ahora
          </div>
          <h2
            className="text-3xl lg:text-5xl font-extrabold text-white mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {t.cta.title}
          </h2>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Elige cómo quieres usar Passenger. Regístrate gratis en menos de 2 minutos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Pedir Viaje */}
          <div
            className="rounded-2xl p-8 border border-white/10 hover:border-green-500/40 transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
            style={{ background: "oklch(0.16 0.01 250)" }}
            onClick={() => window.location.href = "/register"}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-5 shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform">
              <User size={26} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>
              {t.cta.client}
            </h3>
            <p className="text-white/50 text-sm mb-6">
              Regístrate como cliente y solicita taxis al instante desde WhatsApp o la web.
            </p>
            <Button
              className="w-full font-semibold gap-2 group-hover:gap-3 transition-all"
              style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}
              onClick={(e) => { e.stopPropagation(); window.location.href = "/register"; }}
            >
              Registrarme como Cliente
              <ArrowRight size={16} />
            </Button>
          </div>

          {/* {t.cta.driver} */}
          <div
            className="rounded-2xl p-8 border border-white/10 hover:border-blue-500/40 transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
            style={{ background: "oklch(0.16 0.01 250)" }}
            onClick={() => window.location.href = "/register"}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
              <Car size={26} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>
              {t.cta.driver}
            </h3>
            <p className="text-white/50 text-sm mb-6">
              Regístrate como conductor, acepta viajes y gana dinero con tu propio horario.
            </p>
            <Button
              className="w-full font-semibold gap-2 bg-blue-600 hover:bg-blue-700 text-white group-hover:gap-3 transition-all"
              onClick={(e) => { e.stopPropagation(); window.location.href = "/register"; }}
            >
              Registrarme como Chofer
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>

        <p className="text-center text-white/30 text-sm mt-8">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="text-[oklch(0.76_0.18_148)] hover:underline">
            Iniciar Sesión
          </a>
        </p>
      </div>
    </section>
  );
}
