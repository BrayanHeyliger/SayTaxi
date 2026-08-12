import { useState } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";

export function ParcelPromoBar() {
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("parcelPromo_dismissed") === "true";
    }
    return false;
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("parcelPromo_dismissed", "true");
  };

  return (
    <div className="relative w-full h-auto overflow-hidden border-y border-white/12 bg-[linear-gradient(145deg,rgba(3,8,20,0.9),rgba(8,18,35,0.78))]">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-0 left-0 w-40 h-40 bg-green-400/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-emerald-400/35 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* Left: Promo Image */}
          <div className="flex justify-center lg:justify-start">
            <img
              src="/assets-storage/parcel_promo_banner_0ebebc94.png"
              alt="Nuevo servicio de paquetería"
              className="w-full max-w-md h-auto rounded-xl shadow-lg"
            />
          </div>

          {/* Right: Text Content */}
          <div className="space-y-4 text-center lg:text-left">
            <div className="inline-flex lg:inline-flex items-center gap-2 rounded-full border border-green-300/35 bg-green-300/12 px-4 py-2 shadow-[0_10px_30px_-20px_rgba(52,211,153,0.9)]">
              <span className="text-2xl">📦</span>
              <span className="text-sm font-semibold text-green-200">NUEVO SERVICIO</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Envío de Paquetes
            </h2>

            <p className="max-w-md mx-auto text-base sm:text-lg text-white/78 lg:mx-0">
              Entrega rápida y segura de paquetes en minutos. Mismo servicio confiable de Passenger, ahora para tus envíos.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
              <div className="flex items-center gap-2 text-sm text-white/84">
                <span className="text-xl">⚡</span>
                <span>Entrega en 15-30 min</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/84">
                <span className="text-xl">🔒</span>
                <span>Rastreo en tiempo real</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/84">
                <span className="text-xl">💰</span>
                <span>Precios competitivos</span>
              </div>
            </div>

            <button
              onClick={() => {
                navigate("/client-dashboard?tab=parcels");
              }}
              className="inline-block rounded-full bg-[oklch(0.76_0.18_148)] px-8 py-3 font-bold text-[oklch(0.08_0.02_148)] shadow-[0_20px_44px_-20px_rgba(16,185,129,0.95)] transition-all duration-200 hover:scale-105 hover:brightness-105 mt-2"
            >
              Enviar Paquete →
            </button>
          </div>
        </div>
      </div>

      {/* Close Button */}
      <button
        onClick={handleDismiss}
        className="absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-white/12"
        aria-label="Cerrar promoción"
      >
        <X size={20} className="text-white/65" />
      </button>
    </div>
  );
}
