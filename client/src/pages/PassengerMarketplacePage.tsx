import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, MapPin, ShieldCheck, Star, Siren, Share2, Phone, BadgeCheck, Route, Users, CreditCard, CheckCircle2 } from "lucide-react";
import PassengerMascot from "@/components/PassengerMascot";
import NominatimAutocomplete from "@/components/NominatimAutocomplete";

type FlowStep = "search" | "requesting" | "confirmed" | "active" | "finished";

type DriverCard = {
  id: string;
  name: string;
  rating: number;
  photo: string;
  car: string;
  fareRange: string;
  eta: string;
  distanceMi: number;
  verified: boolean;
  trips: number;
  badge: string;
};

type SharedTrip = {
  id: string;
  clientId: number | string;
  clientName: string;
  pickup: string;
  dropoff: string;
  fare: string;
  status: string;
  requestedAt: string;
  vehicleType: string;
  scheduledFor: string | null;
  isBid: boolean;
  driver: null | {
    id: string;
    name: string;
    phone: string;
    vehicle: string;
    plate: string;
    rating: number;
    avatar?: string;
  };
  estimatedTime?: string;
};

type MarketSlide = {
  eyebrow: string;
  title: string;
  copy: string;
  stats: Array<{ label: string; value: string }>;
  gradient: string;
  accent: string;
};

const TRIPS_KEY = "wt_pending_trips";

const mockDrivers: DriverCard[] = [
  { id: "d1", name: "Carlos Mendoza", rating: 4.9, photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80", car: "Toyota Camry · Gris", fareRange: "$18 - $24", eta: "4 min", distanceMi: 1.1, verified: true, trips: 842, badge: "Top rated" },
  { id: "d2", name: "Ana Rodriguez", rating: 4.8, photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=80", car: "Honda Accord · Negro", fareRange: "$20 - $27", eta: "6 min", distanceMi: 1.8, verified: true, trips: 624, badge: "Premium" },
  { id: "d3", name: "Miguel Torres", rating: 4.7, photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80", car: "Nissan Altima · Blanco", fareRange: "$16 - $22", eta: "5 min", distanceMi: 1.5, verified: true, trips: 518, badge: "Fast pickup" },
];

const paymentMethods = ["Efectivo", "Zelle", "Venmo", "Apple Pay", "Google Pay", "Stripe Connect in-app"];

const marketSlides: MarketSlide[] = [
  {
    eyebrow: "Passenger Live",
    title: "Pide, sigue y comparte tu viaje en una sola vista",
    copy: "Una experiencia nativa pensada para moverse rápido: eliges conductor, ves el avance en vivo y mantienes el control del trayecto.",
    stats: [
      { label: "Tiempo medio", value: "4 min" },
      { label: "Cobertura", value: "Ciudad + aeropuerto" },
      { label: "Soporte", value: "SOS visible" },
    ],
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    accent: "#a7f3d0",
  },
  {
    eyebrow: "Tracking nativo",
    title: "La app se siente viva, rápida y hecha para el celular",
    copy: "Información de primera arriba del mapa: ETA, tarifa, estado y acciones clave a un toque, como una plataforma de delivery moderna.",
    stats: [
      { label: "Estado", value: "En vivo" },
      { label: "Acciones", value: "1 toque" },
      { label: "Diseño", value: "Mobile first" },
    ],
    gradient: "from-slate-900 via-slate-800 to-indigo-950",
    accent: "#bfdbfe",
  },
  {
    eyebrow: "Passenger P2P",
    title: "Comparas conductor, precio y confianza antes de pedir",
    copy: "La plataforma presenta opciones visibles y transparentes, con el conductor independiente y la operación centralizada en la app SaaS.",
    stats: [
      { label: "Modelo", value: "Passenger P2P" },
      { label: "Pago", value: "Directo" },
      { label: "Transparencia", value: "Alta" },
    ],
    gradient: "from-fuchsia-600 via-rose-600 to-orange-500",
    accent: "#fbcfe8",
  },
];

function readTrips(): SharedTrip[] {
  try {
    return JSON.parse(localStorage.getItem(TRIPS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeTrips(trips: SharedTrip[]) {
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
}

export default function PassengerMarketplacePage() {
  const [step, setStep] = useState<FlowStep>("search");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverCard | null>(null);
  const [requestTimer, setRequestTimer] = useState(60);
  const [tripId, setTripId] = useState<string | null>(null);
  const [activeTrip, setActiveTrip] = useState<SharedTrip | null>(null);
  const [rating, setRating] = useState(0);
  const [tip, setTip] = useState("");
  const [requestExpired, setRequestExpired] = useState(false);
  const [showIntroMascot, setShowIntroMascot] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);
  const [shareState, setShareState] = useState<string>("Comparte tu viaje con un familiar o contacto de confianza.");
  const [marketSlideIndex, setMarketSlideIndex] = useState(0);

  const canSearch = pickup.trim().length > 2 && dropoff.trim().length > 2;

  const sortedDrivers = useMemo(
    () => [...mockDrivers].sort((a, b) => (a.distanceMi - b.distanceMi) || (b.rating - a.rating)),
    []
  );

  useEffect(() => {
    if (!tripId) return;

    const syncTrip = () => {
      const trips = readTrips();
      const next = trips.find((trip) => trip.id === tripId);
      if (!next) return;

      setActiveTrip(next);

      if (next.status === "accepted") {
        setStep("confirmed");
        return;
      }

      if (next.status === "in_progress") {
        setStep("active");
        return;
      }

      if (next.status === "completed") {
        setStep("finished");
      }
    };

    syncTrip();
    const interval = window.setInterval(syncTrip, 1200);
    return () => window.clearInterval(interval);
  }, [tripId]);

  useEffect(() => {
    try {
      const trips = readTrips();
      const latest = [...trips].reverse().find((trip) => trip.status === "requested" || trip.status === "accepted" || trip.status === "in_progress");
      if (!latest) return;

      setTripId(latest.id);
      setActiveTrip(latest);
      setPickup(latest.pickup || pickup);
      setDropoff(latest.dropoff || dropoff);
      setSelectedDriver(mockDrivers.find((driver) => driver.id === latest.driver?.id) || mockDrivers[0]);

      if (latest.status === "requested") setStep("requesting");
      if (latest.status === "accepted") setStep("confirmed");
      if (latest.status === "in_progress") setStep("active");
    } catch {
      // No persisted trip available.
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntroMascot(false), 2200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (step !== "requesting") return;
    const timer = window.setInterval(() => {
      setRequestTimer((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setRequestExpired(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (step !== "search") return;
    const interval = window.setInterval(() => {
      setMarketSlideIndex((current) => (current + 1) % marketSlides.length);
    }, 4200);
    return () => window.clearInterval(interval);
  }, [step]);

  const toggleOption = (value: string) => {
    setOptions((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const requestTrip = (driver: DriverCard) => {
    const storedUser = (() => {
      try {
        return JSON.parse(localStorage.getItem("wt_user") || "null");
      } catch {
        return null;
      }
    })();

    const newTrip: SharedTrip = {
      id: `trip-${Date.now()}`,
      clientId: storedUser?.id || `guest-${Date.now()}`,
      clientName: storedUser?.name || "Invitado",
      pickup,
      dropoff,
      fare: driver.fareRange.split(" - ")[0],
      status: "requested",
      requestedAt: new Date().toISOString(),
      vehicleType: driver.car,
      scheduledFor: null,
      isBid: false,
      driver: null,
    };

    const trips = readTrips();
    trips.push(newTrip);
    writeTrips(trips);

    setTripId(newTrip.id);
    setSelectedDriver(driver);
    setActiveTrip(newTrip);
    setStep("requesting");
    setRequestTimer(60);
  };

  const handleShareTrip = async () => {
    const text = activeTrip
      ? `Estoy en un viaje con Passenger 🚕\nRecogida: ${activeTrip.pickup}\nDestino: ${activeTrip.dropoff}\nConductor: ${activeTrip.driver?.name || selectedDriver?.name || "Pendiente"}\nVehículo: ${activeTrip.driver?.vehicle || selectedDriver?.car || "Pendiente"}`
      : "Estoy usando Passenger";

    if (navigator.share) {
      await navigator.share({ title: "Compartir viaje", text });
      setShareState("Viaje compartido desde el dispositivo.");
    } else {
      await navigator.clipboard.writeText(text);
      setShareState("Información del viaje copiada al portapapeles.");
    }
  };

  const handleSOS = async () => {
    const msg = activeTrip
      ? `🚨 EMERGENCIA - Pasajero: ${activeTrip.clientName} | Viaje: ${activeTrip.pickup} → ${activeTrip.dropoff} | Conductor: ${activeTrip.driver?.name || selectedDriver?.name || "N/A"}`
      : "🚨 EMERGENCIA - No hay viaje activo";

    if (navigator.share) {
      await navigator.share({ title: "SOS Emergencia", text: msg });
    } else {
      await navigator.clipboard.writeText(msg);
      setShareState("Información de emergencia copiada al portapapeles.");
    }
  };

  const chooseAnotherDriver = () => {
    // Auto-select next driver from sorted list
    const currentIndex = sortedDrivers.findIndex(d => d.id === selectedDriver?.id);
    const nextIndex = (currentIndex + 1) % sortedDrivers.length;
    const nextDriver = sortedDrivers[nextIndex];
    
    setRequestExpired(false);
    setSelectedDriver(nextDriver);
    setRequestTimer(60);
    setTripId(null);
    setActiveTrip(null);
    
    // Automatically send request to next driver
    setTimeout(() => {
      requestTrip(nextDriver);
    }, 300);
  };

  const startRide = () => {
    if (!tripId) return;
    const trips = readTrips();
    const next = trips.map((trip) => trip.id === tripId ? { ...trip, status: "in_progress" } : trip);
    writeTrips(next);
    setStep("active");
  };

  const finishRide = () => {
    if (!tripId) return;
    const trips = readTrips();
    const next = trips.map((trip) => trip.id === tripId ? { ...trip, status: "completed" } : trip);
    writeTrips(next);
    setStep("finished");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(165deg,_oklch(0.16_0.02_248)_0%,_oklch(0.1_0.018_252)_55%,_oklch(0.085_0.014_255)_100%)] px-2 py-3 text-white sm:px-3 sm:py-4 md:px-4 md:py-8">
      <div className="mx-auto max-w-6xl">
        {/* Mobile Header - Hide on phone, show on tablet+ */}
        <a href="/" className="mb-2 hidden items-center gap-2 text-sm text-white/70 hover:text-white sm:mb-3 md:mb-4 md:inline-flex md:text-base">
          <ArrowLeft size={16} /> Volver al inicio
        </a>

        <div className="rounded-2xl border border-white/15 bg-slate-950/72 p-3 shadow-[0_28px_90px_-36px_rgba(3,8,20,0.9)] backdrop-blur-2xl sm:rounded-[28px] sm:p-4 md:rounded-[32px] md:p-8">
          {/* Hero Section - Compact on mobile */}
          <div className="mb-3 flex flex-col gap-1.5 sm:mb-4 md:mb-6 md:gap-3 lg:mb-6 lg:flex-row lg:items-end lg:justify-between">
            {showIntroMascot && (
              <div className="mb-2 flex items-center gap-3 rounded-2xl border border-emerald-200/60 bg-white/90 px-3 py-2 shadow-sm sm:mb-0">
                <PassengerMascot mood="searching" size="sm" animated />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Preparando tu viaje</p>
                  <p className="text-sm text-slate-600">Estamos encontrando al conductor perfecto para ti.</p>
                </div>
              </div>
            )}
            <div className="max-w-3xl">
              <div className="mb-1.5 hidden rounded-full border border-emerald-300/35 bg-emerald-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-emerald-200 sm:mb-2 md:inline-flex">
                Passenger P2P en vivo
              </div>
              <h1 className="text-lg font-extrabold leading-tight sm:text-xl md:text-3xl lg:text-5xl" style={{ fontFamily: "'Sora', sans-serif" }}>
                Tu viaje, tu elección
              </h1>
              <p className="mt-0.5 hidden max-w-2xl text-xs text-white/65 sm:mt-1 md:block md:mt-3 md:text-sm lg:text-base">
                Elige un conductor, sigue el estado en vivo y comparte si necesitas más seguridad.
              </p>
            </div>
            <div className="hidden gap-1.5 text-[10px] text-white/70 sm:grid sm:grid-cols-3 sm:gap-2 lg:min-w-[330px] md:text-xs">
              <div className="rounded-xl border border-white/10 bg-white/6 px-2 py-1.5 sm:rounded-2xl sm:px-3 sm:py-2"><BadgeCheck size={12} className="mr-1 inline sm:size-14 text-emerald-300" /> Verificados</div>
              <div className="rounded-xl border border-white/10 bg-white/6 px-2 py-1.5 sm:rounded-2xl sm:px-3 sm:py-2"><Route size={12} className="mr-1 inline sm:size-14 text-blue-300" /> Tracking</div>
              <div className="rounded-xl border border-white/10 bg-white/6 px-2 py-1.5 sm:rounded-2xl sm:px-3 sm:py-2"><ShieldCheck size={12} className="mr-1 inline sm:size-14 text-yellow-300" /> SOS</div>
            </div>
          </div>

          <div className="grid gap-3 sm:gap-4 md:gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-2.5 sm:space-y-3 md:space-y-6">
              {step === "search" && (
                <section className="space-y-2.5 sm:space-y-3 md:space-y-4">
                  {/* Location Inputs - Full width on mobile, larger touch targets */}
                  <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 md:gap-4">
                    <label className="space-y-1 text-xs text-white/70 sm:space-y-1.5 md:space-y-2 md:text-sm">
                      <span className="block">📍 Recogida</span>
                      <NominatimAutocomplete value={pickup} onChange={setPickup} onSelect={(address) => setPickup(address)} placeholder="Tu ubicación" autoLocate />
                    </label>
                    <label className="space-y-1 text-xs text-white/70 sm:space-y-1.5 md:space-y-2 md:text-sm">
                      <span className="block">🎯 Destino</span>
                      <NominatimAutocomplete value={dropoff} onChange={setDropoff} onSelect={(address) => setDropoff(address)} placeholder="¿A dónde?" />
                    </label>
                  </div>

                  {/* Special Options - Horizontal scroll on mobile */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between sm:mb-2 md:mb-3">
                      <p className="text-xs font-semibold text-white/80 sm:text-sm">✨ Opciones</p>
                      <p className="hidden text-[10px] text-white/45 md:block">Personaliza tu viaje</p>
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-1.5 sm:gap-2 sm:pb-2 md:flex-wrap md:overflow-visible md:pb-0">
                      {['Mascota', 'Maletas', 'Silla niño', 'Silla ruedas', 'Música'].map((item) => (
                        <button key={item} onClick={() => toggleOption(item)} className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[10px] transition sm:px-3 sm:py-1.5 sm:text-xs md:px-3 md:py-2 md:text-sm ${options.includes(item) ? 'border-emerald-300 bg-emerald-400/15 text-emerald-100' : 'border-white/15 bg-white/6 text-white/75 active:bg-white/15 hover:bg-white/10'}`}>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search Button - Full width on mobile, prominent */}
                  <button
                    disabled={!canSearch}
                    onClick={() => setStep("search")}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-emerald-500/30 transition active:scale-95 disabled:opacity-50 disabled:shadow-none sm:rounded-2xl sm:py-3 md:inline-flex md:w-auto md:items-center md:gap-2"
                  >
                    <span className="block md:hidden">🚗 Buscar</span>
                    <span className="hidden md:inline-flex md:items-center md:gap-2">
                      Ver conductores disponibles
                    </span>
                  </button>

                  {/* Drivers List - Mobile optimized */}
                  <div className="space-y-1.5 sm:space-y-2 md:space-y-2.5">
                    {sortedDrivers.map((driver) => (
                      <article key={driver.id} className="group flex gap-2.5 rounded-lg border border-white/10 bg-white/6 p-2.5 transition active:bg-white/15 hover:border-emerald-400/40 hover:bg-white/10 sm:rounded-[16px] sm:gap-3 sm:p-3 md:rounded-[18px] md:gap-4 md:p-4">
                        {/* Profile Image */}
                        <div className="flex-shrink-0">
                          <img src={driver.photo} alt={driver.name} className="h-14 w-14 rounded-lg object-cover sm:h-16 sm:w-16 sm:rounded-[12px] md:h-20 md:w-20" />
                        </div>

                        {/* Main Info */}
                        <div className="flex flex-1 flex-col justify-between gap-1.5 sm:gap-2">
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-0.5">
                                <h3 className="text-xs font-semibold text-white truncate sm:text-sm md:text-base">{driver.name}</h3>
                                {driver.verified && <ShieldCheck size={12} className="flex-shrink-0 text-emerald-300 sm:size-14" />}
                              </div>
                              <p className="text-[9px] text-white/55 truncate sm:text-[10px] md:text-xs">{driver.car}</p>
                            </div>
                            {/* Rating Badge */}
                            <div className="flex-shrink-0 flex items-center gap-0.5 bg-yellow-500/15 px-1.5 py-0.5 rounded-md sm:px-2 sm:py-1 sm:rounded-lg">
                              <Star size={10} className="text-yellow-300 sm:size-12" />
                              <span className="text-[9px] font-semibold text-yellow-200 sm:text-xs">{driver.rating}</span>
                            </div>
                          </div>

                          {/* ETA & Price - Inline */}
                          <div className="flex items-center justify-between gap-1.5 text-[10px] sm:gap-2 sm:text-xs">
                            <div className="flex items-center gap-1 text-white/70">
                              <Clock3 size={11} className="text-blue-400 sm:size-12" />
                              <span>{driver.eta}</span>
                            </div>
                            <div className="flex items-center gap-1 text-white/70">
                              <CreditCard size={11} className="text-emerald-400 sm:size-12" />
                              <span className="font-semibold text-white">{driver.fareRange}</span>
                            </div>
                          </div>
                        </div>

                        {/* Select Button */}
                        <div className="flex-shrink-0 flex items-center">
                          <button 
                            onClick={() => requestTrip(driver)} 
                            className="hidden group-hover:flex items-center justify-center h-10 w-10 rounded-lg bg-white text-slate-900 font-bold text-base transition hover:bg-emerald-50 sm:h-12 sm:w-12 sm:rounded-[12px] md:flex"
                          >
                            →
                          </button>
                          <button 
                            onClick={() => requestTrip(driver)} 
                            className="md:hidden flex-shrink-0 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white transition active:scale-95 hover:bg-emerald-600 sm:px-3 sm:py-2 sm:rounded-xl sm:text-sm"
                          >
                            Elegir
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {step === "requesting" && selectedDriver && (
                <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  {!requestExpired ? (
                    <>
                      <article className="rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)] backdrop-blur-md">
                        {/* Top Section with Driver */}
                        <div className="flex items-center gap-3">
                          <img src={selectedDriver.photo} alt={selectedDriver.name} className="h-16 w-16 rounded-2xl object-cover" />
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Buscando a</p>
                            <h2 className="text-xl font-bold text-white">{selectedDriver.name}</h2>
                            <p className="text-sm text-white/60">{selectedDriver.car}</p>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-transparent p-6">
                          <div className="mb-4 flex items-center justify-center rounded-full border border-emerald-400/20 bg-white/10 p-2">
                            <PassengerMascot mood="ready" size="sm" animated />
                          </div>
                          <p className="text-center text-sm font-semibold text-white mb-2">Conectando...</p>
                          <div className="flex gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: "0s" }} />
                            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: "0.3s" }} />
                            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: "0.6s" }} />
                          </div>
                        </div>

                        {/* Timer */}
                        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <p className="text-sm text-white/60 mb-2">Esperando respuesta</p>
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-5xl font-extrabold text-emerald-300 font-mono">{String(requestTimer).padStart(2, "0")}</span>
                            <span className="text-2xl text-white/50">s</span>
                          </div>
                        </div>

                        {/* Info Badges */}
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
                          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5">⚡ Respuesta directa</span>
                          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5">💰 Pago seguro</span>
                          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5">🔒 Verificado</span>
                        </div>
                      </article>

                      <article className="rounded-[28px] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-blue-500/5 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.18)] backdrop-blur-md">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-2xl animate-float">✨</span>
                          <h3 className="text-lg font-semibold text-white">Mientras esperas...</h3>
                        </div>
                        <ul className="space-y-3 text-sm text-white/75">
                          <li className="flex gap-3">
                            <span className="text-base flex-shrink-0 mt-0.5">📍</span>
                            <span>Tu ubicación está marcada y es visible para el conductor.</span>
                          </li>
                          <li className="flex gap-3">
                            <span className="text-base flex-shrink-0 mt-0.5">🔐</span>
                            <span>Todos tus datos están protegidos con cifrado de extremo a extremo.</span>
                          </li>
                          <li className="flex gap-3">
                            <span className="text-base flex-shrink-0 mt-0.5">💬</span>
                            <span>Cuando acepte, podrás chatear directamente con el conductor.</span>
                          </li>
                          <li className="flex gap-3">
                            <span className="text-base flex-shrink-0 mt-0.5">🆘</span>
                            <span>Tienes acceso a SOS en cualquier momento del viaje.</span>
                          </li>
                        </ul>
                      </article>
                    </>
                  ) : (
                    <article className="rounded-[28px] border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-red-500/5 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.22)] backdrop-blur-md lg:col-span-2 animate-slide-up">
                      <div className="text-center">
                        <div className="mb-4 flex justify-center">
                          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/20 animate-pulse">
                            <span className="text-4xl">⏱️</span>
                          </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Tiempo agotado</h2>
                        <p className="mt-3 text-base text-white/70">El conductor <strong className="text-orange-300">{selectedDriver.name}</strong> no pudo responder.</p>
                        <p className="mt-3 text-sm text-white/55">No te preocupes, intentaremos con el siguiente conductor automáticamente.</p>
                      </div>
                      
                      {/* Auto selection info */}
                      <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-center">
                        <p className="text-xs text-emerald-200">
                          <span className="text-sm">⚡</span> El siguiente será <strong>{sortedDrivers[(sortedDrivers.findIndex(d => d.id === selectedDriver?.id) + 1) % sortedDrivers.length]?.name}</strong>
                        </p>
                      </div>
                      
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <button
                          onClick={chooseAnotherDriver}
                          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:shadow-emerald-500/50 active:scale-95"
                        >
                          <span>⚡</span> Auto
                        </button>
                        <button
                          onClick={() => setStep("search")}
                          className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/6 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                        >
                          <span>⟲</span> Volver
                        </button>
                      </div>
                    </article>
                  )}
                </section>
              )}

              {step === "confirmed" && activeTrip && (
                <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <article className="rounded-[28px] border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)] backdrop-blur-md animate-slide-up">
                    <div className="flex items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/15 text-3xl animate-bounce-gentle">🎉</div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-emerald-300 font-semibold">¡Viaje confirmado!</p>
                        <h2 className="text-xl font-bold text-white">{activeTrip.driver?.name || selectedDriver?.name}</h2>
                        <p className="text-sm text-white/60">{activeTrip.driver?.vehicle || selectedDriver?.car}</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3 text-sm">
                      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                        <p className="text-white/45 text-xs mb-1">⏱️ ETA</p>
                        <p className="font-semibold text-emerald-200">{activeTrip.estimatedTime || selectedDriver?.eta}</p>
                      </div>
                      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                        <p className="text-white/45 text-xs mb-1">💰 Tarifa</p>
                        <p className="font-semibold text-emerald-200">{activeTrip.fare}</p>
                      </div>
                      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                        <p className="text-white/45 text-xs mb-1">🔢 Placa</p>
                        <p className="font-semibold text-emerald-200">{activeTrip.driver?.plate || "Pendiente"}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button onClick={handleShareTrip} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"><Share2 size={16} /> 📤 Compartir</button>
                      <button onClick={handleSOS} className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-4 py-3 font-semibold text-white transition hover:bg-red-600"><Siren size={16} /> 🆘 SOS</button>
                      <button onClick={startRide} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-400/15 px-4 py-3 font-semibold text-emerald-100 transition hover:bg-emerald-400/25">🚗 Iniciar</button>
                    </div>
                  </article>

                  <article className="rounded-[28px] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl animate-float">🗺️</span>
                      <p className="text-sm font-semibold text-white">Detalles del viaje</p>
                    </div>
                    <div className="space-y-3 text-sm text-white/70">
                      <div className="flex gap-2">
                        <span>📍</span>
                        <div>
                          <p className="text-xs text-white/50">Recogida</p>
                          <p className="text-white">{activeTrip.pickup}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span>🎯</span>
                        <div>
                          <p className="text-xs text-white/50">Destino</p>
                          <p className="text-white">{activeTrip.dropoff}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
                      <p className="text-emerald-300 font-semibold mb-1">✨ Tip:</p>
                      {shareState}
                    </div>
                  </article>
                </section>
              )}

              {step === "active" && activeTrip && (
                <section className="space-y-4">
                  <article className="rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)] backdrop-blur-md">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/45">Viaje en curso</p>
                        <h2 className="text-xl font-bold text-white">{activeTrip.pickup} → {activeTrip.dropoff}</h2>
                        <p className="text-sm text-white/60">Conductor: {activeTrip.driver?.name || selectedDriver?.name} · {activeTrip.driver?.vehicle || selectedDriver?.car}</p>
                      </div>
                      <div className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">Live</div>
                    </div>
                    <div className="mt-4 flex h-52 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-sm text-white/55">
                      GPS en tiempo real y ruta compartida
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button onClick={handleShareTrip} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900"><Share2 size={16} /> Compartir viaje</button>
                      <button onClick={handleSOS} className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-4 py-3 font-semibold text-white"><Siren size={16} /> SOS / 911</button>
                      <button onClick={finishRide} className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-4 py-3 font-semibold text-white">Finalizar viaje</button>
                    </div>
                  </article>
                </section>
              )}

              {step === "finished" && (
                <section className="space-y-4">
                  <article className="rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)] backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-2xl">🎉</div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/45">Viaje finalizado</p>
                        <h2 className="text-xl font-bold text-white">Tu experiencia quedó registrada</h2>
                        <p className="text-sm text-white/60">Ahora puedes calificar y dejar propina.</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-sm text-white/60">Paga directamente a tu conductor:</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {paymentMethods.map((method) => (
                          <button key={method} onClick={() => setPaymentMethod(method)} className={`rounded-full border px-3 py-1.5 text-sm transition ${paymentMethod === method ? 'border-emerald-300 bg-emerald-400/15 text-emerald-100' : 'border-white/15 bg-white/6 text-white/75 hover:bg-white/10'}`}>
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>

                  <article className="rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)] backdrop-blur-md">
                    <h3 className="text-lg font-semibold text-white">Califica al conductor</h3>
                    <div className="mt-3 flex gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => setRating(n)} className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg ${rating >= n ? 'border-yellow-300 bg-yellow-400 text-slate-900' : 'border-white/15 bg-white/6 text-white/70'}`}>
                          ★
                        </button>
                      ))}
                    </div>
                    <label className="mt-4 block text-sm text-white/70">
                      Propina opcional (USD)
                      <input value={tip} onChange={(e) => setTip(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="0.00" />
                    </label>
                  </article>
                </section>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)] backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Seguridad</p>
                <h3 className="mt-2 text-lg font-semibold text-white">Viaje seguro en una sola vista</h3>
                <div className="mt-4 space-y-3 text-sm text-white/75">
                  <div className="flex gap-2"><Share2 size={16} className="mt-0.5 text-blue-300" /> Compartir ubicación y ruta con un contacto de confianza.</div>
                  <div className="flex gap-2"><Siren size={16} className="mt-0.5 text-red-300" /> SOS / 911 visible en todo momento durante el trayecto.</div>
                  <div className="flex gap-2"><Phone size={16} className="mt-0.5 text-emerald-300" /> Comunicación segura sin exponer datos personales.</div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)] backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Resumen operativo</p>
                <div className="mt-4 space-y-3 text-sm text-white/75">
                  <div className="flex items-center justify-between"><span>Estado</span><span className="font-semibold text-white">{step === "search" ? "Explorando" : step === "requesting" ? "En cola" : step === "confirmed" ? "Confirmado" : step === "active" ? "En curso" : "Finalizado"}</span></div>
                  <div className="flex items-center justify-between"><span>Conductor</span><span className="font-semibold text-white">{selectedDriver?.name || activeTrip?.driver?.name || "Pendiente"}</span></div>
                  <div className="flex items-center justify-between"><span>Tarifa</span><span className="font-semibold text-white">{activeTrip?.fare || selectedDriver?.fareRange || "—"}</span></div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/60">
                  {shareState}
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/8 p-3">
                  <PassengerMascot mood="happy" size="sm" animated />
                  <div>
                    <p className="text-sm font-semibold text-white">Tu acompañante Passenger</p>
                    <p className="text-xs text-white/65">La experiencia se siente más humana y tranquila durante cada paso.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)] backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">Mercado</p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setMarketSlideIndex((current) => (current - 1 + marketSlides.length) % marketSlides.length)}
                      className="rounded-full border border-white/10 bg-white/6 p-1.5 text-white/75 hover:bg-white/12"
                      aria-label="Slide anterior"
                    >
                      <ArrowLeft size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarketSlideIndex((current) => (current + 1) % marketSlides.length)}
                      className="rounded-full border border-white/10 bg-white/6 p-1.5 text-white/75 hover:bg-white/12"
                      aria-label="Slide siguiente"
                    >
                      <ArrowLeft size={13} className="rotate-180" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-black/20">
                  <div
                    className="flex transition-transform duration-700 ease-out"
                    style={{ width: `${marketSlides.length * 100}%`, transform: `translateX(-${marketSlideIndex * (100 / marketSlides.length)}%)` }}
                  >
                    {marketSlides.map((slide) => (
                      <div key={slide.title} className="w-full shrink-0 p-3" style={{ width: `${100 / marketSlides.length}%` }}>
                        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${slide.gradient} p-4 text-white shadow-lg`}>
                          <div className="absolute inset-0 bg-gradient-to-br from-black/35 via-black/15 to-black/35" />
                          <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at top right, ${slide.accent}, transparent 42%)` }} />
                          <div className="relative flex items-start justify-between gap-3">
                            <div className="max-w-[72%]">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/85">{slide.eyebrow}</p>
                              <h3 className="mt-2 text-lg font-black leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]">{slide.title}</h3>
                              <p className="mt-2 text-sm leading-5 text-white/92 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">{slide.copy}</p>
                            </div>
                            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-right backdrop-blur-sm">
                              <p className="text-[10px] uppercase tracking-[0.25em] text-white/70">Live</p>
                              <p className="text-lg font-black text-white">App</p>
                            </div>
                          </div>
                          <div className="relative mt-4 grid grid-cols-3 gap-2">
                            {slide.stats.map((stat) => (
                              <div key={stat.label} className="rounded-xl border border-white/12 bg-black/18 px-2 py-2 backdrop-blur-sm">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-white/65">{stat.label}</p>
                                <p className="mt-1 text-xs font-bold text-white">{stat.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {marketSlides.map((slide, index) => (
                      <button
                        key={slide.title}
                        type="button"
                        onClick={() => setMarketSlideIndex(index)}
                        className={`h-1.5 rounded-full transition-all ${marketSlideIndex === index ? "w-8 bg-white" : "w-3 bg-white/35 hover:bg-white/50"}`}
                        aria-label={`Ir al slide ${index + 1}`}
                      />
                    ))}
                  </div>
                  <button type="button" className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/12">
                    Ver conductores
                  </button>
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-6 grid gap-2 text-xs text-white/65 md:grid-cols-3">
            <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2">Sin matching automático</div>
            <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2">Pago directo al conductor</div>
            <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2">Tracking y SOS visibles</div>
          </div>
        </div>
      </div>
    </div>
  );
}