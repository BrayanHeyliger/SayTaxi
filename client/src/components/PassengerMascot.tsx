import { useEffect, useMemo, useState } from "react";

type MascotMood = "idle" | "searching" | "ready" | "happy";

interface PassengerMascotProps {
  mood?: MascotMood;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
  animated?: boolean;
}

export default function PassengerMascot({
  mood = "idle",
  size = "md",
  className = "",
  label,
  animated = true,
}: PassengerMascotProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!animated) return;
    const interval = window.setInterval(() => setPhase((prev) => (prev + 1) % 3), 800);
    return () => window.clearInterval(interval);
  }, [animated]);

  const sizeClass = useMemo(() => {
    switch (size) {
      case "sm": return "w-16 h-16";
      case "lg": return "w-28 h-28";
      default: return "w-20 h-20";
    }
  }, [size]);

  const bounce = phase === 1 ? "translate-y-[-6px]" : phase === 2 ? "translate-y-[4px]" : "translate-y-0";
  const armSwing = mood === "searching" ? "rotate-[-12deg]" : mood === "ready" ? "rotate-[8deg]" : "rotate-0";

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      {label && <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>}
      <div className={`relative ${sizeClass} transition-transform duration-500 ${animated ? bounce : "translate-y-0"}`}>
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(16,185,129,0.28),_transparent_70%)] blur-xl" />
        <svg viewBox="0 0 220 220" className="relative h-full w-full drop-shadow-[0_10px_28px_rgba(0,0,0,0.16)]">
          <circle cx="110" cy="110" r="96" fill="url(#bg)" />
          <circle cx="98" cy="92" r="14" fill="#1f2937" />
          <circle cx="144" cy="92" r="14" fill="#1f2937" />
          <circle cx="98" cy="92" r="5" fill="#fff" />
          <circle cx="144" cy="92" r="5" fill="#fff" />
          <path d="M80 132c10 24 50 32 64 32 14 0 48-8 56-32" fill="none" stroke="#f59e0b" strokeWidth="10" strokeLinecap="round" />
          <path d="M84 104c-6-26-20-44-42-54" fill="none" stroke="#0f766e" strokeWidth="12" strokeLinecap="round" transform={`rotate(${mood === "ready" ? 12 : mood === "searching" ? -10 : 0} 84 104)`} />
          <path d="M146 104c12-22 28-37 54-48" fill="none" stroke="#0f766e" strokeWidth="12" strokeLinecap="round" transform={`rotate(${mood === "ready" ? -10 : mood === "searching" ? 8 : 0} 146 104)`} />
          <rect x="85" y="138" width="50" height="12" rx="6" fill="#0f766e" transform={`rotate(${armSwing} 110 144)`} />
          <path d="M84 150c18 8 33 8 54 0" fill="none" stroke="#f59e0b" strokeWidth="10" strokeLinecap="round" />
          <path d="M70 170c6 16 20 28 40 34" fill="none" stroke="#14b8a6" strokeWidth="10" strokeLinecap="round" />
          <path d="M152 170c-6 16-20 28-40 34" fill="none" stroke="#14b8a6" strokeWidth="10" strokeLinecap="round" />
          <circle cx="112" cy="178" r="10" fill="#fb923c" />
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d1fae5" />
              <stop offset="100%" stopColor="#a7f3d0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
