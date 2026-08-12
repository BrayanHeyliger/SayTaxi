/**
 * ModulesSection — Passenger
 * Design: Verde Operacional — tabs con módulos A/B/C, dark bg
 */
import { useState, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageCircle, LayoutDashboard, Crown,
  Car, DollarSign, Settings, Users, BarChart3,
  Building2, CreditCard, TrendingUp, Globe
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

// Icons for each module feature (kept static, only text is translated)
const moduleIcons = {
  bot: [MessageCircle, "📍", "🗺️", "✅", Car, "⭐"],
  panel: [BarChart3, Car, DollarSign, Settings, Users, TrendingUp],
  admin: [CreditCard, Building2, "💳", BarChart3, Globe, Settings],
};

const modules = {
  bot: {
    label: "Bot WhatsApp",
    icon: MessageCircle,
    description: "El bot que convierte WhatsApp en tu central de despacho: recibe pedidos, calcula tarifas, confirma viajes y notifica al cliente en cada etapa — sin que salga de la app.",
    features: [
      { icon: MessageCircle, title: "Bienvenida e idioma", desc: "Saludo automático y detección/selección de idioma del cliente." },
      { icon: "📍", title: "Solicitud de ubicación", desc: "Pide ubicación en tiempo real o dirección exacta vía WhatsApp." },
      { icon: "🗺️", title: "Cálculo de ruta y tarifa", desc: "Distancia, tiempo y costo estimado con Google Maps API." },
      { icon: "✅", title: "Confirmación del viaje", desc: "Botones interactivos para confirmar o cancelar el pedido." },
      { icon: Car, title: "Asignación de conductor", desc: "Notifica nombre, auto, placa y enlace de seguimiento." },
      { icon: "⭐", title: "Calificación del viaje", desc: "Encuesta de satisfacción de 1 a 5 estrellas al finalizar." },
    ],
  },
  panel: {
    label: "Panel Empresa",
    icon: LayoutDashboard,
    description: "Tu central de operaciones: ve en tiempo real qué conductores están activos, qué viajes están en curso y cuánto ingresó tu flota hoy — todo en un dashboard web.",
    features: [
      { icon: BarChart3, title: "Dashboard de viajes", desc: "Vista en tiempo real de viajes activos, pendientes y completados." },
      { icon: Car, title: "Gestión de flota", desc: "Conductores, vehículos, placas y documentos en un solo lugar." },
      { icon: DollarSign, title: "Gestión de tarifas", desc: "Tarifa base, costo por km/min, mínimos y recargos nocturnos." },
      { icon: Settings, title: "Ajustes de WhatsApp", desc: "Credenciales API, respuestas automáticas y mensajes personalizados." },
      { icon: Users, title: "App para conductores", desc: "PWA para recibir alertas, aceptar/rechazar y navegar al cliente." },
      { icon: TrendingUp, title: "Reportes y métricas", desc: "Ingresos, volumen de viajes y satisfacción del cliente." },
    ],
  },
  admin: {
    label: "Super Admin",
    icon: Crown,
    description: "Controla toda la plataforma: da de alta empresas de taxi, gestiona sus suscripciones, monitorea el uso de la API de WhatsApp y cobra automáticamente con Stripe.",
    features: [
      { icon: CreditCard, title: "Gestión de suscripciones", desc: "Planes Básico, Pro y Enterprise con límites configurables." },
      { icon: Building2, title: "Gestión de tenants", desc: "Altas, bajas, suspensión y monitoreo de uso por empresa." },
      { icon: "💳", title: "Facturación con Stripe", desc: "Cobros recurrentes automáticos para las membresías SaaS." },
      { icon: BarChart3, title: "Reportes globales", desc: "Ganancias, volumen de viajes por región y métricas de API." },
      { icon: Globe, title: "Multi-región", desc: "Soporte para empresas en múltiples países y monedas." },
      { icon: Settings, title: "Configuración global", desc: "Parámetros del sistema, límites de API y configuración de seguridad." },
    ],
  },
};

type ModuleKey = keyof typeof modules;

export default function ModulesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const { t } = useI18n();
  const moduleTabIcons = { bot: MessageCircle, panel: LayoutDashboard, admin: Crown };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="modules"
      className="py-20 lg:py-28 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, oklch(0.13 0.01 250) 0%, oklch(0.16 0.02 200) 100%)" }}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-10 blur-3xl pointer-events-none"
        style={{ background: "oklch(0.76 0.18 148)" }}
      />

      <div className="container relative z-10" ref={ref}>
        <div
          className="text-center max-w-2xl mx-auto mb-14"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.23,1,0.32,1)",
          }}
        >
          <div
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
            style={{ background: "oklch(0.76 0.18 148 / 0.15)", color: "oklch(0.76 0.18 148)" }}
          >
            <LayoutDashboard size={12} />
            {t.modules.badge}
          </div>
          <h2
            className="text-3xl lg:text-4xl font-extrabold text-white mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {t.modules.title}
          </h2>
          <p className="text-white/60 text-lg">
            {t.modules.sub}
          </p>
        </div>

        <Tabs defaultValue="bot" className="w-full">
          <TabsList
            className="w-full max-w-lg mx-auto mb-10 p-1 rounded-2xl flex gap-1"
            style={{ background: "oklch(0.18 0.01 250)" }}
          >
          {(["bot", "panel", "admin"] as const).map((key) => {
              const Icon = moduleTabIcons[key];
              const mod = t.modules[key];
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all data-[state=active]:text-[oklch(0.08_0.02_148)] data-[state=inactive]:text-white/60"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{mod.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(["bot", "panel", "admin"] as const).map((key) => {
            const mod = t.modules[key];
            const icons = moduleIcons[key];
            return (
              <TabsContent key={key} value={key}>
                <div
                  className="rounded-3xl p-6 lg:p-8 mb-8"
                  style={{ background: "oklch(0.18 0.01 250)", border: "1px solid oklch(0.76 0.18 148 / 0.2)" }}
                >
                  <p className="text-white/70 text-base text-center max-w-xl mx-auto">{mod.desc}</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mod.features.map((feature, i) => {
                    const iconEntry = icons[i];
                    const IconComp = typeof iconEntry === "string" ? null : iconEntry as React.ElementType;
                    return (
                      <div
                        key={i}
                        className="p-5 rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-[oklch(0.76_0.18_148/0.1)] group"
                        style={{
                          background: "oklch(0.18 0.01 250)",
                          border: "1px solid oklch(1 0 0 / 0.08)",
                          opacity: visible ? 1 : 0,
                          transform: visible ? "translateY(0)" : "translateY(20px)",
                          transition: `opacity 0.5s ease ${i * 0.06}s, transform 0.5s cubic-bezier(0.23,1,0.32,1) ${i * 0.06}s, box-shadow 0.2s ease`,
                        }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: "oklch(0.76 0.18 148 / 0.15)" }}>
                            {typeof iconEntry === "string" ? (
                              <span>{iconEntry}</span>
                            ) : (
                              IconComp && <IconComp size={16} style={{ color: "oklch(0.76 0.18 148)" }} />
                            )}
                          </div>
                          <h4 className="text-white font-semibold text-sm" style={{ fontFamily: "'Sora', sans-serif" }}>
                            {feature.title}
                          </h4>
                        </div>
                        <p className="text-white/50 text-xs leading-relaxed">{feature.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </section>
  );
}
