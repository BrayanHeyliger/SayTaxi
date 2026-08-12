/**
 * FeaturesSection — Passenger
 * Design: Verde Operacional — layout asimétrico con artefactos operacionales de taxi
 * Sección alternada: texto izquierda + demo derecha, con chat bubbles y status badges
 */
import { useRef, useEffect, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { CheckCircle2, MapPin, DollarSign, Users, BarChart3, Shield, Zap } from "lucide-react";

const statusBadges = [
  { label: "En camino", color: "oklch(0.76 0.18 148)", bg: "oklch(0.76 0.18 148 / 0.12)" },
  { label: "Viaje activo", color: "oklch(0.65 0.15 80)", bg: "oklch(0.65 0.15 80 / 0.12)" },
  { label: "Completado", color: "oklch(0.65 0.15 250)", bg: "oklch(0.65 0.15 250 / 0.12)" },
  { label: "Conductor asignado", color: "oklch(0.76 0.18 148)", bg: "oklch(0.76 0.18 148 / 0.12)" },
  { label: "Pendiente", color: "oklch(0.65 0.12 30)", bg: "oklch(0.65 0.12 30 / 0.12)" },
  { label: "Cancelado", color: "oklch(0.65 0.15 20)", bg: "oklch(0.65 0.15 20 / 0.12)" },
];

function StatusBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ color, background: bg, border: `1px solid ${color}30` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function TripCard({ from, to, fare, driver, status }: {
  from: string; to: string; fare: string; driver: string; status: typeof statusBadges[0];
}) {
  return (
    <div
      className="rounded-2xl p-4 shadow-lg"
      style={{ background: "white", border: "1px solid oklch(0.90 0.005 100)" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: "oklch(0.76 0.18 148)" }} />
            <span className="text-xs text-[oklch(0.55_0.01_80)]">{from}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: "oklch(0.65 0.15 20)" }} />
            <span className="text-xs text-[oklch(0.55_0.01_80)]">{to}</span>
          </div>
        </div>
        <StatusBadge {...status} />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-[oklch(0.93_0.003_100)]">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "oklch(0.52 0.12 148)" }}
          >
            {driver[0]}
          </div>
          <span className="text-xs font-medium text-[oklch(0.35_0.01_80)]">{driver}</span>
        </div>
        <span className="text-sm font-bold" style={{ color: "oklch(0.52 0.12 148)" }}>{fare}</span>
      </div>
    </div>
  );
}

function ChatBubbleDemo() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex justify-start">
        <div className="chat-bubble-received px-3 py-2 text-xs max-w-[80%] shadow-sm">
          <p>¡Hola! Tu viaje ha sido asignado 🚕</p>
          <p className="font-semibold mt-1">Carlos M. — Toyota Corolla</p>
          <p className="text-gray-400 text-[10px] mt-1">Placa: ABC-1234 · ETA: 4 min</p>
        </div>
      </div>
      <div className="flex justify-end">
        <div className="chat-bubble-sent px-3 py-2 text-xs max-w-[80%] shadow-sm">
          <p>¿Cuánto demora?</p>
        </div>
      </div>
      <div className="flex justify-start">
        <div className="chat-bubble-received px-3 py-2 text-xs max-w-[80%] shadow-sm">
          <p>📍 Carlos está a 1.2 km de tu ubicación</p>
          <p className="mt-1">⏱️ Llegada estimada: <strong>4 minutos</strong></p>
          <p className="mt-1">🔗 <span className="underline" style={{ color: "oklch(0.52 0.12 148)" }}>Ver en mapa en tiempo real</span></p>
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    icon: Zap,
    title: "Confirma viajes, asigna conductores y cobra — todo desde WhatsApp",
    description: "El bot gestiona el flujo completo: solicitud, cálculo de tarifa, confirmación con botones interactivos y asignación automática al conductor más cercano. El cliente nunca sale de WhatsApp.",
    bullets: [
      "Botones interactivos nativos de WhatsApp",
      "Asignación automática por proximidad GPS",
      "Notificación instantánea al conductor",
    ],
    demo: <ChatBubbleDemo />,
    demoBg: "oklch(0.93 0.005 148 / 0.15)",
    demoTitle: "Bot en acción",
    flip: false,
  },
  {
    icon: BarChart3,
    title: "Dashboard en tiempo real: viajes, conductores e ingresos de un vistazo",
    description: "Visualiza el estado de cada viaje al instante. Sabe qué conductores están activos, cuántos viajes se completaron hoy y cuánto ingresó tu flota — sin abrir ninguna otra app.",
    bullets: [
      "Viajes activos, pendientes y completados",
      "Mapa en tiempo real con posición de conductores",
      "Reportes de ingresos exportables",
    ],
    demo: (
      <div className="flex flex-col gap-3 p-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Activos", value: "12", color: "oklch(0.76 0.18 148)" },
            { label: "Hoy", value: "127", color: "oklch(0.65 0.15 250)" },
            { label: "Ingresos", value: "$4,820", color: "oklch(0.65 0.12 30)" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: `${s.color}12`, border: `1px solid ${s.color}25` }}>
              <p className="text-base font-extrabold" style={{ color: s.color, fontFamily: "'Sora', sans-serif" }}>{s.value}</p>
              <p className="text-[10px] text-[oklch(0.55_0.01_80)]">{s.label}</p>
            </div>
          ))}
        </div>
        <TripCard from="Av. Corrientes 1234" to="Aeropuerto Ezeiza" fare="$3,200" driver="Carlos M." status={statusBadges[1]} />
        <TripCard from="Palermo Soho" to="Retiro" fare="$850" driver="Ana R." status={statusBadges[0]} />
      </div>
    ),
    demoBg: "white",
    demoTitle: "Dashboard de viajes",
    flip: true,
  },
  {
    icon: DollarSign,
    title: "Tarifas dinámicas: base, por km, por minuto, nocturnas y festivas",
    description: "Configura reglas de tarifa por zona, horario y tipo de servicio. El bot calcula automáticamente el costo estimado antes de que el cliente confirme el viaje.",
    bullets: [
      "Tarifa base + costo por km y por minuto",
      "Recargos nocturnos y festivos automáticos",
      "Tarifas diferentes por zona geográfica",
    ],
    demo: (
      <div className="flex flex-col gap-3 p-4">
        <div className="rounded-xl p-3" style={{ background: "oklch(0.76 0.18 148 / 0.08)", border: "1px solid oklch(0.76 0.18 148 / 0.2)" }}>
          <p className="text-xs font-bold text-[oklch(0.52_0.12_148)] mb-2">🗺️ Cálculo de tarifa</p>
          <div className="flex flex-col gap-1.5 text-xs">
            {[
              ["Tarifa base", "$150"],
              ["Distancia: 8.4 km × $85/km", "$714"],
              ["Tiempo: 22 min × $12/min", "$264"],
              ["Recargo nocturno (20%)", "+$226"],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className="text-[oklch(0.55_0.01_80)]">{label}</span>
                <span className="font-semibold text-[oklch(0.35_0.01_80)]">{val}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-[oklch(0.76_0.18_148/0.2)] font-bold">
              <span style={{ color: "oklch(0.52 0.12 148)" }}>Total estimado</span>
              <span style={{ color: "oklch(0.52 0.12 148)" }}>$1,354</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ background: "oklch(0.76 0.18 148)" }}>
            ✅ Confirmar viaje
          </button>
          <button className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[oklch(0.93_0.003_100)] text-[oklch(0.55_0.01_80)]">
            ❌ Cancelar
          </button>
        </div>
      </div>
    ),
    demoBg: "white",
    demoTitle: "Cálculo automático",
    flip: false,
  },
];

function FeatureRow({ feature, index }: { feature: typeof features[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const Icon = feature.icon;

  return (
    <div
      ref={ref}
      className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.23,1,0.32,1)",
      }}
    >
      {/* Content */}
      <div className={feature.flip ? "lg:order-2" : ""}>
        <div
          className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
          style={{ background: "oklch(0.76 0.18 148 / 0.1)", color: "oklch(0.52 0.12 148)" }}
        >
          <Icon size={12} />
          Característica clave
        </div>
        <h3
          className="text-2xl lg:text-3xl font-extrabold text-[oklch(0.14_0.01_250)] mb-4 leading-tight"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {feature.title}
        </h3>
        <p className="text-[oklch(0.55_0.01_80)] leading-relaxed mb-6">
          {feature.description}
        </p>
        <ul className="flex flex-col gap-3">
          {feature.bullets.map((b, i) => (
            <li key={i} className="flex items-center gap-3">
              <CheckCircle2 size={16} style={{ color: "oklch(0.76 0.18 148)" }} className="flex-shrink-0" />
              <span className="text-[oklch(0.45_0.01_80)] text-sm">{b}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Demo panel */}
      <div className={feature.flip ? "lg:order-1" : ""}>
        <div
          className="rounded-3xl overflow-hidden shadow-xl shadow-black/10"
          style={{
            border: "1px solid oklch(0.90 0.005 100)",
            background: feature.demoBg,
          }}
        >
          {/* Panel header */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-b"
            style={{ background: "oklch(0.97 0.003 100)", borderColor: "oklch(0.90 0.005 100)" }}
          >
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-[oklch(0.60_0.01_80)] ml-2">{feature.demoTitle}</span>
          </div>
          {feature.demo}
        </div>
      </div>
    </div>
  );
}

export default function FeaturesSection() {
  const { t } = useI18n();
  return (
    <section id="features" className="py-20 lg:py-28 bg-[oklch(0.97_0.003_100)]">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
            style={{ background: "oklch(0.76 0.18 148 / 0.1)", color: "oklch(0.52 0.12 148)" }}
          >
            <Zap size={12} />
            {t.features.badge}
          </div>
          <h2
            className="text-3xl lg:text-4xl font-extrabold text-[oklch(0.14_0.01_250)] mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Asigna conductores, calcula tarifas y{" "}
            <span style={{ color: "oklch(0.52 0.12 148)" }}>confirma viajes desde WhatsApp</span>
          </h2>
          <p className="text-[oklch(0.55_0.01_80)] text-lg leading-relaxed">
            Sin apps adicionales. Sin complicaciones. Tu flota operando al 100% desde el chat.
          </p>
        </div>

        <div className="flex flex-col gap-20 lg:gap-28">
          {features.map((feature, i) => (
            <FeatureRow key={i} feature={feature} index={i} />
          ))}
        </div>

        {/* Status badges band */}
        <div
          className="mt-20 rounded-3xl p-6 lg:p-8"
          style={{ background: "white", border: "1px solid oklch(0.90 0.005 100)" }}
        >
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="flex-shrink-0 text-center lg:text-left">
              <p
                className="text-sm font-bold text-[oklch(0.14_0.01_250)] mb-1"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Estados del viaje en tiempo real
              </p>
              <p className="text-xs text-[oklch(0.60_0.01_80)]">Cada estado notifica automáticamente al cliente por WhatsApp</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
              {statusBadges.map((badge) => (
                <StatusBadge key={badge.label} {...badge} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
