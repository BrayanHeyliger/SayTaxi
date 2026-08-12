/**
 * HowItWorksSection — Passenger
 * Design: Verde Operacional — flujo visual con chat bubbles y status badges reales
 */
import { useRef, useEffect, useState } from "react";
import { MessageCircle, MapPin, CheckCircle, Car, Star, BarChart3 } from "lucide-react";
import BotDemoAnimation from "./BotDemoAnimation";
import { useI18n } from "@/contexts/I18nContext";

const steps = [
  {
    number: "01",
    icon: MessageCircle,
    title: "El cliente escribe a tu WhatsApp",
    description: "El bot saluda automáticamente, detecta el idioma y guía al cliente paso a paso. Sin descargar ninguna app.",
    artifact: (
      <div className="flex flex-col gap-2">
        <div className="flex justify-start">
          <div className="chat-bubble-received px-3 py-2 text-xs shadow-sm max-w-[85%]">
            <p>¡Hola! Soy TaxiBot 🚕</p>
            <p>¿A dónde te llevo hoy?</p>
            <p className="text-gray-400 text-[10px] mt-1">10:30</p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="chat-bubble-sent px-3 py-2 text-xs shadow-sm max-w-[85%]">
            <p>Hola, necesito un taxi</p>
            <p className="text-black/40 text-[10px] mt-1">10:30 ✓✓</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: "02",
    icon: MapPin,
    title: "Comparte ubicación y destino",
    description: "El bot solicita la ubicación en tiempo real o dirección. Google Maps calcula la ruta y estima la tarifa al instante.",
    artifact: (
      <div className="flex flex-col gap-2">
        <div className="flex justify-start">
          <div className="chat-bubble-received px-3 py-2 text-xs shadow-sm max-w-[85%]">
            <p>📍 Comparte tu ubicación o escribe tu dirección</p>
            <p className="text-gray-400 text-[10px] mt-1">10:31</p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="chat-bubble-sent px-3 py-2 text-xs shadow-sm max-w-[85%]">
            <p>📍 Av. Corrientes 1234, CABA</p>
            <p className="font-semibold mt-1">🏁 Aeropuerto Ezeiza</p>
            <p className="text-black/40 text-[10px] mt-1">10:32 ✓✓</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: "03",
    icon: CheckCircle,
    title: "Ve el costo y confirma el viaje",
    description: "El cliente recibe el desglose de la tarifa y confirma con un botón. Sin llamadas. Sin negociaciones.",
    artifact: (
      <div className="flex flex-col gap-2">
        <div className="flex justify-start">
          <div className="chat-bubble-received px-3 py-2 text-xs shadow-sm max-w-[90%]">
            <p>🗺️ <strong>Ruta calculada</strong></p>
            <p>📏 42 km · ⏱️ ~55 min</p>
            <p className="font-bold mt-1" style={{ color: "oklch(0.52 0.12 148)" }}>💰 Tarifa: $3,200</p>
            <p className="text-gray-400 text-[10px] mt-1">10:32</p>
          </div>
        </div>
        <div className="flex gap-2 mt-1">
          <button className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-white" style={{ background: "oklch(0.76 0.18 148)" }}>
            ✅ Confirmar
          </button>
          <button className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold bg-gray-100 text-gray-500">
            ❌ Cancelar
          </button>
        </div>
      </div>
    ),
  },
  {
    number: "04",
    icon: Car,
    title: "Conductor asignado en segundos",
    description: "El sistema notifica al conductor más cercano. Al aceptar, el cliente recibe todos los datos del chofer.",
    artifact: (
      <div className="flex flex-col gap-2">
        <div className="flex justify-start">
          <div className="chat-bubble-received px-3 py-2 text-xs shadow-sm max-w-[90%]">
            <p>🚕 <strong>¡Conductor asignado!</strong></p>
            <p className="mt-1">👤 Carlos M.</p>
            <p>🚗 Toyota Corolla · <span className="font-mono font-bold">ABC-1234</span></p>
            <p>⏱️ Llegada estimada: <strong>4 min</strong></p>
            <p className="underline mt-1" style={{ color: "oklch(0.52 0.12 148)" }}>📍 Ver en mapa en tiempo real</p>
            <p className="text-gray-400 text-[10px] mt-1">10:33</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: "05",
    icon: Star,
    title: "Notificaciones en cada etapa del viaje",
    description: "El cliente recibe mensajes automáticos: conductor en camino, llegó, viaje iniciado y finalizado.",
    artifact: (
      <div className="flex flex-col gap-1.5">
        {[
          { text: "🚗 Carlos está en camino", status: "En camino", color: "oklch(0.76 0.18 148)" },
          { text: "📍 Carlos llegó a tu ubicación", status: "Llegó", color: "oklch(0.65 0.15 80)" },
          { text: "🛣️ Viaje iniciado. ¡Buen viaje!", status: "Viaje activo", color: "oklch(0.65 0.15 250)" },
          { text: "✅ Viaje finalizado. Total: $3,200", status: "Completado", color: "oklch(0.52 0.12 148)" },
        ].map((n, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex justify-start flex-1">
              <div className="chat-bubble-received px-3 py-1.5 text-[10px] shadow-sm">
                {n.text}
              </div>
            </div>
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ color: n.color, background: `${n.color}15`, border: `1px solid ${n.color}30` }}
            >
              {n.status}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    number: "06",
    icon: BarChart3,
    title: "Califica y el admin lo ve todo",
    description: "Encuesta de satisfacción automática al finalizar. El administrador ve métricas, ingresos y conductores en el dashboard.",
    artifact: (
      <div className="flex flex-col gap-2">
        <div className="flex justify-start">
          <div className="chat-bubble-received px-3 py-2 text-xs shadow-sm max-w-[90%]">
            <p>⭐ ¿Cómo fue tu viaje con Carlos?</p>
            <div className="flex gap-1 mt-2">
              {[1,2,3,4,5].map((s) => (
                <span key={s} className="text-lg">{s <= 5 ? "⭐" : "☆"}</span>
              ))}
            </div>
            <p className="text-gray-400 text-[10px] mt-1">10:58</p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="chat-bubble-sent px-3 py-2 text-xs shadow-sm max-w-[85%]">
            <p>⭐⭐⭐⭐⭐ Excelente servicio</p>
            <p className="text-black/40 text-[10px] mt-1">10:59 ✓✓</p>
          </div>
        </div>
      </div>
    ),
  },
];

type StepData = { number: string; icon: React.ElementType; title: string; description: string; artifact: React.ReactNode };
function StepCard({ step, index }: { step: StepData; index: number }) {
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

  const Icon = step.icon;
  const isFlipped = index % 2 === 1;

  return (
    <div
      ref={ref}
      className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.6s ease ${index * 0.05}s, transform 0.6s cubic-bezier(0.23,1,0.32,1) ${index * 0.05}s`,
      }}
    >
      {/* Content */}
      <div className={isFlipped ? "lg:order-2" : ""}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 flex flex-col items-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg, oklch(0.52 0.12 180), oklch(0.76 0.18 148))" }}
            >
              <Icon size={22} className="text-white" />
            </div>
            {index < steps.length - 1 && (
              <div
                className="w-0.5 h-8 mt-2"
                style={{ background: "linear-gradient(to bottom, oklch(0.76 0.18 148 / 0.4), transparent)" }}
              />
            )}
          </div>
          <div className="flex-1">
            <span
              className="text-xs font-bold tracking-widest mb-2 block"
              style={{ color: "oklch(0.76 0.18 148)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              {step.number}
            </span>
            <h3
              className="text-xl font-bold text-[oklch(0.14_0.01_250)] mb-3"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {step.title}
            </h3>
            <p className="text-[oklch(0.55_0.01_80)] leading-relaxed text-sm">
              {step.description}
            </p>
          </div>
        </div>
      </div>

      {/* Artifact panel */}
      <div className={isFlipped ? "lg:order-1" : ""}>
        <div
          className="rounded-3xl overflow-hidden shadow-lg"
          style={{
            border: "1px solid oklch(0.90 0.005 100)",
            background: "white",
          }}
        >
          {/* Mock phone bar */}
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{ background: "oklch(0.52 0.12 180)" }}
          >
            <div className="w-7 h-7 rounded-full bg-[oklch(0.76_0.18_148)] flex items-center justify-center text-sm">🚕</div>
            <div>
              <p className="text-white text-xs font-semibold leading-none">TaxiBot</p>
              <p className="text-white/60 text-[10px]">En línea</p>
            </div>
          </div>
          <div
            className="p-4 min-h-32"
            style={{ background: "oklch(0.95 0.005 148 / 0.3)" }}
          >
            {step.artifact}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorksSection() {
  const { t } = useI18n();
  const icons = [MessageCircle, MapPin, CheckCircle, Car, Star, BarChart3];
  const translatedSteps: StepData[] = t.howItWorks.steps.map((s, i) => ({
    number: `${t.howItWorks.step} ${String(i + 1).padStart(2, "0")}`,
    icon: icons[i],
    title: s.title,
    description: s.desc,
    artifact: steps[i]?.artifact,
  }));
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-white">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
            style={{ background: "oklch(0.76 0.18 148 / 0.1)", color: "oklch(0.52 0.12 148)" }}
          >
            <MessageCircle size={12} />
            {t.howItWorks.badge}
          </div>
          <h2
            className="text-3xl lg:text-4xl font-extrabold text-[oklch(0.14_0.01_250)] mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {t.howItWorks.title}
          </h2>
          <p className="text-[oklch(0.55_0.01_80)] text-lg">
            {t.howItWorks.sub}
          </p>
        </div>

        <div className="flex flex-col gap-10 lg:gap-14">
          {translatedSteps.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}
        </div>

        {/* Interactive bot demo section */}
        <div className="mt-20 lg:mt-28 pt-16 lg:pt-20 border-t" style={{ borderColor: "oklch(0.90 0.005 100)" }}>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
              style={{ background: "oklch(0.76 0.18 148 / 0.1)", color: "oklch(0.52 0.12 148)" }}
            >
              <MessageCircle size={12} />
              {t.howItWorks.demoBadge}
            </div>
            <h3
              className="text-2xl lg:text-3xl font-extrabold text-[oklch(0.14_0.01_250)] mb-4"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
            {t.howItWorks.demoTitle}
            </h3>
            <p className="text-[oklch(0.55_0.01_80)] text-lg">
            {t.howItWorks.demoSub}
            </p>
          </div>

          <div className="flex justify-center">
            <BotDemoAnimation />
          </div>
        </div>
      </div>
    </section>
  );
}
