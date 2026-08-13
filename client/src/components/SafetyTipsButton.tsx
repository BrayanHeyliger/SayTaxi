import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { X, ChevronLeft, ChevronRight, Shield } from "lucide-react";

type Audience = "clients" | "drivers" | "fleet";

interface Props {
  audience: Audience;
  position?: "bottom-right" | "bottom-left";
}

const audienceLabels: Record<Audience, string> = {
  clients: "Consejos para Pasajeros",
  drivers: "Consejos para Conductores",
  fleet: "Consejos para Flotillas",
};

const categoryColors: Record<string, string> = {
  "Antes del viaje":        "bg-blue-100 text-blue-700",
  "Durante el viaje":       "bg-green-100 text-green-700",
  "Pagos en efectivo":      "bg-yellow-100 text-yellow-700",
  "Cobros en efectivo":     "bg-yellow-100 text-yellow-700",
  "Al llegar":              "bg-purple-100 text-purple-700",
  "Emergencias":            "bg-red-100 text-red-700",
  "Antes de salir":         "bg-blue-100 text-blue-700",
  "Seguridad personal":     "bg-red-100 text-red-700",
  "Gestión de conductores": "bg-indigo-100 text-indigo-700",
  "Gestión de vehículos":   "bg-teal-100 text-teal-700",
  "Finanzas y efectivo":    "bg-yellow-100 text-yellow-700",
  "Legal y cumplimiento":   "bg-slate-100 text-slate-700",
};

export default function SafetyTipsButton({ audience, position = "bottom-right" }: Props) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [pulse, setPulse] = useState(true);

  const { data: tips = [] } = trpc.safetyTips.getByAudience.useQuery({ audience });

  // Stop pulse after 5 seconds
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible || open) return;
    const hideTimer = setTimeout(() => setVisible(false), 20000);
    return () => clearTimeout(hideTimer);
  }, [visible, open]);

  const categories = ["all", ...Array.from(new Set(tips.map((t: any) => String(t.category))))];
  const filtered = filterCategory === "all" ? tips : tips.filter((t: any) => t.category === filterCategory);
  const current = filtered[currentIndex] || filtered[0];

  const prev = () => setCurrentIndex(i => (i - 1 + filtered.length) % filtered.length);
  const next = () => setCurrentIndex(i => (i + 1) % filtered.length);

  const posClass = position === "bottom-right"
    ? "right-3 bottom-28 sm:right-4 sm:bottom-20"
    : "left-3 bottom-28 sm:left-4 sm:bottom-20";

  if (!visible && !open) return null;

  return (
    <>
      {/* Floating bulb button */}
      <button
        onClick={() => { setOpen(true); setPulse(false); }}
        className={`wt-safety-btn fixed ${posClass} w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95`}
        style={{ background: "linear-gradient(135deg, #FCD34D, #F59E0B)" }}
        title="Consejos de seguridad"
      >
        <span className="text-xl">💡</span>
        {pulse && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ background: "#FCD34D" }} />
        )}
        {tips.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {tips.length > 9 ? "9+" : tips.length}
          </span>
        )}
        <span
          role="button"
          aria-label="Cerrar bombilla"
          title="Cerrar"
          onClick={(e) => {
            e.stopPropagation();
            setVisible(false);
          }}
          className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-slate-900/85 text-white text-[10px] leading-none flex items-center justify-center"
        >
          x
        </span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center p-4" style={{ zIndex: 99999 }} onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4" style={{ background: "linear-gradient(135deg, #FEF3C7, #FDE68A)" }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{audienceLabels[audience]}</h3>
                    <p className="text-xs text-amber-700">{filtered.length} consejos disponibles</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center hover:bg-white transition-colors">
                  <X size={16} className="text-slate-600" />
                </button>
              </div>

              {/* Category filter */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 mt-3 scrollbar-hide">
                {(categories as string[]).map(cat => (
                  <button key={cat} onClick={() => { setFilterCategory(cat); setCurrentIndex(0); }}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filterCategory === cat ? "bg-amber-500 text-white" : "bg-white/70 text-amber-800 hover:bg-white"}`}>
                    {cat === "all" ? "Todos" : String(cat)}
                  </button>
                ))}
              </div>
            </div>

            {/* Tip content */}
            {current ? (
              <div className="px-5 py-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-3xl flex-shrink-0">{current.icon}</span>
                  <div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-1 inline-block ${categoryColors[current.category] || "bg-slate-100 text-slate-600"}`}>
                      {current.category}
                    </span>
                    <h4 className="font-bold text-slate-900 text-base leading-tight">{current.title}</h4>
                  </div>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">{current.tip}</p>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-5">
                  <button onClick={prev} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors">
                    <ChevronLeft size={14} /> Anterior
                  </button>
                  <div className="flex gap-1">
                    {filtered.slice(0, Math.min(filtered.length, 8)).map((_: any, i: number) => (
                      <button key={i} onClick={() => setCurrentIndex(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex % Math.min(filtered.length, 8) ? "bg-amber-500 w-3" : "bg-slate-200"}`} />
                    ))}
                    {filtered.length > 8 && <span className="text-xs text-slate-400">+{filtered.length - 8}</span>}
                  </div>
                  <button onClick={next} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors">
                    Siguiente <ChevronRight size={14} />
                  </button>
                </div>
                <p className="text-center text-xs text-slate-400 mt-2">{currentIndex + 1} de {filtered.length}</p>
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-slate-400 text-sm">No hay consejos en esta categoría</p>
              </div>
            )}

            {/* Footer */}
            <div className="px-5 pb-5">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <Shield size={14} className="text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">Tu seguridad es nuestra prioridad. Ante cualquier emergencia, usa el botón SOS en la app.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
