/**
 * BotDemoAnimation — Demostración animada del bot Passenger
 * Design: Verde Operacional — simulación de WhatsApp con burbujas animadas
 * Duración: 60 segundos con loop automático
 */
import { useEffect, useState, useRef } from "react";

interface Message {
  type: "sent" | "received";
  text: string;
  delay: number;
  duration?: number;
}

interface DemoState {
  messages: Message[];
  currentStep: number;
  isPlaying: boolean;
  showStatus?: string;
  showRating?: boolean;
  showDashboard?: boolean;
}

const demoSequence: Message[] = [
  { type: "received", text: "¡Hola! Soy TaxiBot 🚕\n¿A dónde te llevo hoy?", delay: 0.5 },
  { type: "sent", text: "Hola, necesito un taxi", delay: 3 },
  { type: "received", text: "📍 Comparte tu ubicación o escribe tu dirección", delay: 5.5 },
  { type: "sent", text: "📍 Av. Corrientes 1234, CABA\n🏁 Aeropuerto Ezeiza", delay: 8 },
  { type: "received", text: "🗺️ Ruta calculada\n📏 42 km · ⏱️ ~55 min\n💰 Tarifa: $3,200", delay: 11, duration: 4 },
  { type: "sent", text: "✅ Confirmar", delay: 15.5 },
  { type: "received", text: "🚕 ¡Conductor asignado!\n👤 Carlos M.\n🚗 Toyota Corolla · ABC-1234\n⏱️ ETA: 4 min", delay: 18 },
  { type: "received", text: "🚗 Carlos está en camino", delay: 23, duration: 2 },
  { type: "received", text: "📍 Carlos llegó a tu ubicación", delay: 26, duration: 2 },
  { type: "received", text: "🛣️ Viaje iniciado. ¡Buen viaje!", delay: 29, duration: 2 },
  { type: "received", text: "✅ Viaje finalizado\nTotal: $3,200", delay: 32 },
  { type: "received", text: "⭐ ¿Cómo fue tu viaje con Carlos?", delay: 35, duration: 3 },
  { type: "sent", text: "⭐⭐⭐⭐⭐ Excelente", delay: 39 },
];

export default function BotDemoAnimation() {
  const [demoState, setDemoState] = useState<DemoState>({
    messages: [],
    currentStep: 0,
    isPlaying: true,
    showStatus: undefined,
    showRating: false,
    showDashboard: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!demoState.isPlaying) return;

    startTimeRef.current = Date.now();

    const updateAnimation = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;

      // Add messages based on elapsed time
      const visibleMessages = demoSequence.filter((msg) => msg.delay <= elapsed);

      setDemoState((prev) => {
        if (visibleMessages.length !== prev.messages.length) {
          return {
            ...prev,
            messages: visibleMessages,
            currentStep: visibleMessages.length,
          };
        }

        // Show status badges at specific times
        let newStatus = prev.showStatus;
        if (elapsed >= 23 && elapsed < 25) newStatus = "En camino";
        else if (elapsed >= 26 && elapsed < 28) newStatus = "Llegó";
        else if (elapsed >= 29 && elapsed < 31) newStatus = "Viaje activo";
        else newStatus = undefined;

        // Show rating at end
        const showRating = elapsed >= 35 && elapsed < 40;

        // Show dashboard at very end
        const showDashboard = elapsed >= 42;

        if (newStatus !== prev.showStatus || showRating !== prev.showRating || showDashboard !== prev.showDashboard) {
          return { ...prev, showStatus: newStatus, showRating, showDashboard };
        }

        return prev;
      });

      // Loop after 50 seconds
      if (elapsed < 50) {
        animationRef.current = setTimeout(updateAnimation, 100) as unknown as NodeJS.Timeout;
      } else {
        // Reset and restart
        setTimeout(() => {
          setDemoState({
            messages: [],
            currentStep: 0,
            isPlaying: true,
            showStatus: undefined,
            showRating: false,
            showDashboard: false,
          });
        }, 3000);
      }
    };

    animationRef.current = setTimeout(updateAnimation, 100);

    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [demoState.isPlaying]);

  useEffect(() => {
    // Scroll only within the chat container, not the whole page
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [demoState.messages]);

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Phone frame */}
      <div
        className="relative w-72 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/50 bg-black"
        style={{
          border: "2px solid oklch(0.25 0.01 250)",
          aspectRatio: "9/16",
        }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[oklch(0.10_0.01_250)]">
          <span className="text-white text-xs font-medium">9:41</span>
          <div className="flex gap-1">
            <div className="w-4 h-2 rounded-sm bg-white/60" />
            <div className="w-1 h-2 rounded-sm bg-white/60" />
          </div>
        </div>

        {/* WhatsApp header */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ background: "oklch(0.52 0.12 180)" }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "oklch(0.76 0.18 148)" }}
          >
            🚕
          </div>
          <div>
            <p className="text-white font-semibold text-sm">TaxiBot</p>
            <p className="text-white/70 text-xs">En línea</p>
          </div>
        </div>

        {/* Chat messages */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-2.5"
          style={{
            background: "url('https://images.unsplash.com/photo-1557683316-973673baf926?w=300&q=30') center/cover",
            backgroundColor: "oklch(0.93 0.005 148 / 0.9)",
            maxHeight: "calc(100% - 140px)",
          }}
        >
          {demoState.messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.type === "sent" ? "justify-end" : "justify-start"} animate-fade-up`}
              style={{
                animationDelay: `${i * 0.1}s`,
                opacity: 1,
              }}
            >
              <div
                className={`max-w-[80%] px-3 py-2 text-xs shadow-sm ${
                  msg.type === "sent" ? "chat-bubble-sent" : "chat-bubble-received"
                }`}
              >
                <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                <p className={`text-[10px] mt-1 text-right ${msg.type === "sent" ? "text-black/40" : "text-gray-400"}`}>
                  {String(10 + i).padStart(2, "0")}:{30 + i * 2} {msg.type === "sent" ? "✓✓" : ""}
                </p>
              </div>
            </div>
          ))}

          {/* Status badge */}
          {demoState.showStatus && (
            <div className="flex justify-center my-2">
              <span
                className="text-xs font-bold px-3 py-1.5 rounded-full animate-pulse"
                style={{
                  color: "oklch(0.76 0.18 148)",
                  background: "oklch(0.76 0.18 148 / 0.15)",
                  border: "1px solid oklch(0.76 0.18 148 / 0.3)",
                }}
              >
                {demoState.showStatus}
              </span>
            </div>
          )}

          {/* Rating prompt */}
          {demoState.showRating && (
            <div className="flex justify-center gap-1 my-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-lg animate-bounce" style={{ animationDelay: `${star * 0.1}s` }}>
                  ⭐
                </span>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 px-3 py-3 bg-[oklch(0.96_0.005_100)] border-t border-[oklch(0.90_0.005_100)]">
          <div className="flex-1 bg-white rounded-full px-4 py-2 text-xs text-gray-400 shadow-sm">
            Escribe un mensaje...
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs"
            style={{ background: "oklch(0.76 0.18 148)" }}
          >
            ➤
          </div>
        </div>
      </div>

      {/* Dashboard preview at end */}
      {demoState.showDashboard && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-3xl animate-fade-up"
          style={{
            background: "linear-gradient(135deg, oklch(0.13 0.01 250 / 0.95), oklch(0.18 0.02 200 / 0.95))",
          }}
        >
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "oklch(0.76 0.18 148 / 0.2)" }}
            >
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>
              Viaje completado
            </h3>
            <p className="text-white/60 text-sm mb-4">
              Dashboard actualizado con ingresos y calificación
            </p>
            <div className="flex gap-4 justify-center text-center">
              {[
                { label: "Viajes hoy", value: "127" },
                { label: "Ingresos", value: "$4,820" },
                { label: "Rating", value: "4.9 ⭐" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-extrabold text-[oklch(0.76_0.18_148)]" style={{ fontFamily: "'Sora', sans-serif" }}>
                    {stat.value}
                  </p>
                  <p className="text-white/50 text-xs">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
