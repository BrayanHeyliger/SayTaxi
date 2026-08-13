import { useMemo } from "react";
import { Check, MessageCircle, Search, Sparkles, UserRound } from "lucide-react";

type MascotMood = "idle" | "searching" | "ready" | "happy";

interface PassengerMascotProps {
  mood?: MascotMood;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
  animated?: boolean;
  variant?: number;
}

export default function PassengerMascot({
  mood = "idle",
  size = "md",
  className = "",
  label,
  animated = true,
}: PassengerMascotProps) {
  const sizeClass = useMemo(() => {
    switch (size) {
      case "sm":
        return "w-14 h-14";
      case "lg":
        return "w-24 h-24";
      default:
        return "w-[4.5rem] h-[4.5rem]";
    }
  }, [size]);

  const moodBadge =
    mood === "searching" ? "Buscando" : mood === "ready" ? "Listo" : mood === "happy" ? "En marcha" : "Esperando";

  const MoodIcon =
    mood === "searching"
      ? Search
      : mood === "ready"
        ? Check
        : mood === "happy"
          ? Sparkles
          : MessageCircle;

  const moodIconClass =
    mood === "searching" ? "text-cyan-600" : mood === "ready" ? "text-emerald-600" : mood === "happy" ? "text-amber-500" : "text-slate-500";

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      {label && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      )}

      <div className={`relative ${sizeClass} ${animated ? "transition-transform duration-700 hover:scale-[1.03]" : ""}`}>
        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle,_rgba(14,165,233,0.22),_transparent_72%)] blur-lg" />

        <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100 shadow-[0_10px_24px_rgba(15,23,42,0.16)]">
          <UserRound className="h-[44%] w-[44%] text-slate-700" strokeWidth={1.8} />
        </div>

        <div className="absolute -right-2 -top-2 flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
          <MoodIcon className={`h-3 w-3 ${moodIconClass} ${mood === "searching" && animated ? "animate-pulse" : ""}`} strokeWidth={2.2} />
          <span>{moodBadge}</span>
        </div>
      </div>
    </div>
  );
}
