/**
 * TestimonialsSection — Passenger
 * Muestra los testimonios configurados desde el panel admin
 */
import { useSiteConfig } from "@/contexts/SiteConfigContext";

export default function TestimonialsSection() {
  const { config } = useSiteConfig();
  const testimonials = (config as any).testimonials || [];

  if (!config.showTestimonials || testimonials.length === 0) return null;

  return (
    <section
      className="py-20 lg:py-28 relative overflow-hidden"
      style={{ background: "oklch(0.11 0.01 250)" }}
    >
      {/* Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse, oklch(0.76 0.18 148), transparent)" }}
      />

      <div className="container relative z-10">
        <div className="mb-14 text-center">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold"
            style={{
              background: "oklch(0.76 0.18 148 / 0.12)",
              borderColor: "oklch(0.76 0.18 148 / 0.3)",
              color: "oklch(0.76 0.18 148)",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            Testimonios
          </div>
          <h2 className="mb-4 text-3xl font-bold text-white lg:text-4xl" style={{ fontFamily: `'${config.fontFamily}', sans-serif` }}>
            Lo que dicen nuestros <span className="text-emerald-300">clientes</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-white/55">
            Personas reales, experiencias reales y un servicio que combina confianza, conveniencia y un toque premium.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t: any) => {
            const avatar = t.avatarUrl || t.avatar || "/assets-storage/avatar1_c813ee08.jpg";
            return (
              <div
                key={t.id}
                className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/8 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-md transition hover:-translate-y-1 hover:border-emerald-400/30"
              >
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="text-lg" style={{ color: star <= (t.rating || 5) ? "#FBBF24" : "oklch(1 0 0 / 0.15)" }}>
                      ★
                    </span>
                  ))}
                </div>

                <p className="flex-1 text-sm leading-relaxed text-white/75">"{t.text}"</p>

                <div className="flex items-center gap-3 border-t border-white/10 pt-3">
                  <img
                    src={avatar}
                    alt={t.name || "Cliente"}
                    className="h-12 w-12 flex-shrink-0 rounded-full border border-white/15 object-cover object-center"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name || "Cliente"}</p>
                    <p className="text-xs text-white/45">{t.company || "Usuario verificado"}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
