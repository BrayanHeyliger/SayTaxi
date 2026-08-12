/**
 * QuickQuoteForm — Mini formulario de cotización rápida
 * Genera un mensaje de WhatsApp automático con origen, destino y hora
 */
import { useEffect, useState } from "react";
import { MapPin, Navigation, Clock, MessageCircle, ChevronRight } from "lucide-react";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { useI18n } from "@/contexts/I18nContext";

export default function QuickQuoteForm() {
  const { config } = useSiteConfig();
  const { t } = useI18n();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [time, setTime] = useState("");
  const [vehicleType, setVehicleType] = useState("Económico");
  const [gettingLocation, setGettingLocation] = useState(false);

  const vehicleTypes = [
    { label: "🚗 Económico", value: "Económico" },
    { label: "🚙 Confort", value: "Confort" },
    { label: "🚘 Premium", value: "Premium" },
    { label: "🚐 SUV", value: "SUV" },
  ];

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`,
            { headers: { "Accept-Language": "es,en;q=0.9" } }
          );
          const data = await res.json();
          const address = data.display_name?.split(",").slice(0, 2).join(", ") || "Mi ubicación actual";
          setOrigin(address);
        } catch {
          setOrigin(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        }
        setGettingLocation(false);
      },
      () => setGettingLocation(false)
    );
  };

  useEffect(() => {
    if (!origin) handleGetLocation();
  }, []);

  const handleSendToWhatsApp = () => {
    if (!origin || !destination) return;
    const phone = config.contactPhone?.replace(/\D/g, "") || "";
    const timeText = time ? ` a las ${time}` : "";
    const message = encodeURIComponent(
      `¡Hola! Quiero solicitar un taxi 🚕\n\n📍 *Origen:* ${origin}\n🏁 *Destino:* ${destination}${timeText}\n🚗 *Vehículo:* ${vehicleType}\n\n¿Cuál es la tarifa estimada?`
    );
    const url = phone
      ? `https://wa.me/${phone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(url, "_blank");
  };

  const isReady = origin.trim() && destination.trim();

  return (
    <div
      className="rounded-3xl overflow-hidden shadow-2xl"
      style={{
        background: "linear-gradient(135deg, oklch(0.13 0.01 250) 0%, oklch(0.16 0.02 200) 100%)",
        border: "1px solid oklch(0.76 0.18 148 / 0.3)",
      }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center gap-3"
        style={{ background: "oklch(0.76 0.18 148 / 0.12)", borderBottom: "1px solid oklch(0.76 0.18 148 / 0.2)" }}
      >
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, oklch(0.52 0.12 148), oklch(0.76 0.18 148))" }}
        >
          <MessageCircle size={20} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm" style={{ fontFamily: "'Sora', sans-serif" }}>
            Cotización Rápida
          </p>
          <p className="text-white/50 text-xs">Recibe precio estimado en WhatsApp</p>
        </div>
        <div
          className="ml-auto px-2 py-1 rounded-full text-[10px] font-bold"
          style={{ background: "oklch(0.76 0.18 148 / 0.2)", color: "oklch(0.76 0.18 148)" }}
        >
          ⚡ Gratis
        </div>
      </div>

      {/* Form */}
      <div className="p-6 flex flex-col gap-4">
        {/* Origin */}
        <div className="relative">
          <label className="text-white/60 text-xs font-semibold mb-1.5 block uppercase tracking-wider">
            📍 Origen — ¿Dónde te recogemos?
          </label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Ej: Av. Corrientes 1234, Buenos Aires"
              className="w-full pl-9 pr-24 py-3 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all"
              style={{
                background: "oklch(0.18 0.01 250)",
                border: origin ? "1px solid oklch(0.76 0.18 148 / 0.5)" : "1px solid oklch(1 0 0 / 0.08)",
              }}
            />
            <button
              onClick={handleGetLocation}
              disabled={gettingLocation}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
              style={{ background: "oklch(0.76 0.18 148 / 0.15)", color: "oklch(0.76 0.18 148)" }}
            >
              <Navigation size={11} className={gettingLocation ? "animate-spin" : ""} />
              {gettingLocation ? "..." : "Mi ubicación"}
            </button>
          </div>
        </div>

        {/* Destination */}
        <div>
          <label className="text-white/60 text-xs font-semibold mb-1.5 block uppercase tracking-wider">
            🏁 Destino — ¿A dónde vas?
          </label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Ej: Aeropuerto Internacional Ezeiza"
              className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all"
              style={{
                background: "oklch(0.18 0.01 250)",
                border: destination ? "1px solid oklch(0.76 0.18 148 / 0.5)" : "1px solid oklch(1 0 0 / 0.08)",
              }}
            />
          </div>
        </div>

        {/* Time + Vehicle row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white/60 text-xs font-semibold mb-1.5 block uppercase tracking-wider">
              🕐 Hora de recogida
            </label>
            <div className="relative">
              <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full pl-9 pr-3 py-3 rounded-xl text-sm text-white outline-none transition-all"
                style={{
                  background: "oklch(0.18 0.01 250)",
                  border: "1px solid oklch(1 0 0 / 0.08)",
                  colorScheme: "dark",
                }}
              />
            </div>
          </div>
          <div>
            <label className="text-white/60 text-xs font-semibold mb-1.5 block uppercase tracking-wider">
              🚗 Tipo de vehículo
            </label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full px-3 py-3 rounded-xl text-sm text-white outline-none transition-all appearance-none"
              style={{
                background: "oklch(0.18 0.01 250)",
                border: "1px solid oklch(1 0 0 / 0.08)",
              }}
            >
              {vehicleTypes.map((v) => (
                <option key={v.value} value={v.value} style={{ background: "oklch(0.18 0.01 250)" }}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleSendToWhatsApp}
          disabled={!isReady}
          className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.97]"
          style={{
            background: isReady
              ? "linear-gradient(135deg, oklch(0.52 0.12 148), oklch(0.76 0.18 148))"
              : "oklch(0.25 0.01 250)",
            color: isReady ? "white" : "oklch(0.5 0.01 250)",
            cursor: isReady ? "pointer" : "not-allowed",
            boxShadow: isReady ? "0 8px 32px oklch(0.52 0.12 148 / 0.35)" : "none",
            fontFamily: "'Sora', sans-serif",
          }}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          {isReady ? "Solicitar cotización por WhatsApp" : "Completa origen y destino"}
          {isReady && <ChevronRight size={18} />}
        </button>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 pt-1">
          {["✅ Gratis", "⚡ Respuesta en 2 min", "🔒 Sin compromiso"].map((badge) => (
            <span key={badge} className="text-[10px] text-white/40 font-medium">{badge}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
