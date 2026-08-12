import { useEffect, useMemo, useState } from "react";
import { BellOff, MessageCircle, X } from "lucide-react";
import PassengerMascot from "@/components/PassengerMascot";

type MascotMood = "idle" | "searching" | "ready" | "happy";

interface GlobalMascotAssistantProps {
  storageKey: string;
  title?: string;
  messages: string[];
  mood?: MascotMood;
}

export default function GlobalMascotAssistant({
  storageKey,
  title = "Asistente Passenger",
  messages,
  mood = "idle",
}: GlobalMascotAssistantProps) {
  const [hidden, setHidden] = useState(false);
  const [muted, setMuted] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { hidden?: boolean; muted?: boolean };
      setHidden(Boolean(saved.hidden));
      setMuted(Boolean(saved.muted));
    } catch {
      // Ignore malformed local preferences.
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ hidden, muted }));
    } catch {
      // Best effort persistence.
    }
  }, [hidden, muted, storageKey]);

  useEffect(() => {
    if (muted || messages.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [messages.length, muted]);

  const message = useMemo(() => {
    if (!messages.length) return "Estoy aqui para ayudarte.";
    return messages[index % messages.length];
  }, [messages, index]);

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        className="fixed bottom-5 right-5 z-[70] inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30"
      >
        <MessageCircle size={15} />
        Ver asistente
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-[70] w-[300px] rounded-3xl border border-emerald-200/70 bg-white/95 p-3 shadow-[0_22px_45px_-22px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <PassengerMascot mood={mood} size="sm" animated />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">{title}</p>
            <p className="text-sm text-slate-700">{muted ? "Mensajes pausados" : message}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMuted((prev) => !prev)}
            className="rounded-full border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Silenciar asistente"
            title="Silenciar asistente"
          >
            <BellOff size={14} />
          </button>
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="rounded-full border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar asistente"
            title="Cerrar asistente"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
