/**
 * HeroSection — 100% nativo: Leaflet + OpenStreetMap + Nominatim
 * Sin dependencia de Google Maps
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Navigation, Clock, ChevronRight, Shield, Zap, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import LeafletMap, { type LeafletMapRef } from "@/components/LeafletMap";
import NominatimAutocomplete from "@/components/NominatimAutocomplete";
import { HeroParcelForm } from "@/components/HeroParcelForm";
import PassengerMascot from "@/components/PassengerMascot";
import type { ParcelFormData } from "@/components/HeroParcelForm";
import { trpc } from "@/lib/trpc";

const VEHICLES = [
  { id: "economy", label: "Económico", emoji: "🚗", base: 6,  perKm: 0.9, eta: "3 min", seats: 4 },
  { id: "comfort",  label: "Confort",   emoji: "🚙", base: 9,  perKm: 1.3, eta: "5 min", seats: 4 },
  { id: "premium",  label: "Premium",   emoji: "🚘", base: 14, perKm: 1.8, eta: "7 min", seats: 4 },
  { id: "suv",      label: "SUV",       emoji: "🚐", base: 18, perKm: 2.2, eta: "8 min", seats: 6 },
];

const EXTRAS = [
  { id: "pet",        label: "Mascota",        icon: "🐾", price: 2 },
  { id: "luggage",    label: "Maletas",         icon: "🧳", price: 1 },
  { id: "child_seat", label: "Silla de niño",   icon: "👶", price: 3 },
  { id: "wheelchair", label: "Silla de ruedas", icon: "♿", price: 0 },
  { id: "music",      label: "Música a gusto",  icon: "🎵", price: 0 },
];

// Geocodifica una dirección de texto usando Nominatim (fallback cuando el usuario escribe sin seleccionar sugerencia)
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { "Accept-Language": "es" } }
    );
    const data = await res.json();
    if (data && data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

export default function HeroSection() {
  const [, navigate] = useLocation();
  const { config } = useSiteConfig();
  const { isAuthenticated, register } = useLocalAuth();

  const [pickup, setPickup]           = useState("");
  const [destination, setDestination] = useState("");
  const [tripTime, setTripTime]       = useState<"now" | "later">("now");
  const [selectedVehicle, setSelectedVehicle] = useState("economy");
  const [selectedExtras, setSelectedExtras]   = useState<string[]>([]);
  const [step, setStep] = useState<"form" | "estimate" | "register">("form");
  const [estimate, setEstimate] = useState<{ price: number; km: number; minutes: number } | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");

  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords,   setDestCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<LeafletMapRef | null>(null);
  const [userCountryCode, setUserCountryCode] = useState<string | undefined>(undefined);
  const [destViewbox, setDestViewbox] = useState<[number, number, number, number] | undefined>(undefined);

  const [regName, setRegName]         = useState("");
  const [regPhone, setRegPhone]       = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [regLoading, setRegLoading]   = useState(false);
  const [regError, setRegError]       = useState("");
  const [serviceType, setServiceType] = useState<"trip" | "parcel">("trip");
  const [heroMascotStep, setHeroMascotStep] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHeroMascotStep((prev) => (prev + 1) % 3);
    }, 2300);
    return () => window.clearInterval(interval);
  }, []);

  const createParcelMutation = trpc.parcels.create.useMutation({
    onError: () => {
      // silent fallback — parcel stored locally without toast
    },
  });

  const handleMapReady = useCallback((ref: LeafletMapRef) => {
    mapRef.current = ref;
    // Solo intentar geolocalización automática si el usuario ya dio permiso antes
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then(result => {
        if (result.state === "granted") {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            setPickupCoords({ lat, lng });
            ref.setPickup(lat, lng, "Mi ubicación");
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: { "Accept-Language": "es" } });
              const data = await res.json();
              if (data.display_name) setPickup(data.display_name.split(",").slice(0, 2).join(",").trim());
              if (data.address?.country_code) setUserCountryCode(data.address.country_code);
              const radius = 0.45;
              setDestViewbox([lng - radius, lat - radius, lng + radius, lat + radius]);
            } catch {}
          });
        }
      }).catch(() => {});
    }
  }, []);

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Tu navegador no soporta geolocalización");
      return;
    }
    setGpsLoading(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setPickupCoords({ lat, lng });
        mapRef.current?.setPickup(lat, lng, "Mi ubicación");
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: { "Accept-Language": "es" } });
          const data = await res.json();
          setPickup(data.display_name?.split(",").slice(0, 2).join(",").trim() || "Mi ubicación actual 📍");
          if (data.address?.country_code) setUserCountryCode(data.address.country_code);
          const radius = 0.45;
          setDestViewbox([lng - radius, lat - radius, lng + radius, lat + radius]);
        } catch {
          setPickup("Mi ubicación actual 📍");
        }
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) setGpsError("Permiso denegado. Escribe tu dirección manualmente.");
        else if (err.code === 2) setGpsError("No se pudo detectar tu ubicación. Escribe tu dirección.");
        else setGpsError("Error de ubicación. Escribe tu dirección manualmente.");
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleCalculate = async () => {
    if (!pickup.trim() || !destination.trim()) return;
    setCalculating(true);
    setCalcError("");

    // Si no hay coordenadas (usuario escribió sin seleccionar sugerencia), geocodificar
    let pCoords = pickupCoords;
    let dCoords = destCoords;

    if (!pCoords) {
      pCoords = await geocodeAddress(pickup);
      if (pCoords) {
        setPickupCoords(pCoords);
        mapRef.current?.setPickup(pCoords.lat, pCoords.lng, pickup);
      }
    }
    if (!dCoords) {
      dCoords = await geocodeAddress(destination);
      if (dCoords) {
        setDestCoords(dCoords);
        mapRef.current?.setDropoff(dCoords.lat, dCoords.lng, destination);
      }
    }

    let km = 5; let minutes = 12;
    if (pCoords && dCoords) {
      mapRef.current?.setDropoff(dCoords.lat, dCoords.lng, destination);
      const route = await mapRef.current?.getRoute();
      if (route) {
        km = parseFloat(route.distanceKm.toFixed(1));
        minutes = route.durationMin;
      }
    } else if (!pCoords || !dCoords) {
      // Estimación con distancia por defecto si no se pueden geocodificar las direcciones
      km = 5; minutes = 12;
    }

    const v = VEHICLES.find(v => v.id === selectedVehicle) || VEHICLES[0];
    const extrasTotal = selectedExtras.reduce((sum, id) => sum + (EXTRAS.find(e => e.id === id)?.price || 0), 0);
    const price = parseFloat((v.base + km * v.perKm + extrasTotal).toFixed(2));
    setEstimate({ price, km, minutes });
    setStep("estimate");
    setCalculating(false);
  };

  const handleRequestTrip = () => {
    if (isAuthenticated) {
      sessionStorage.setItem("pendingTrip", JSON.stringify({ pickup, destination, vehicle: selectedVehicle, extras: selectedExtras, estimate }));
      navigate("/client-dashboard");
    } else {
      setStep("register");
    }
  };

  const handleParcelSubmit = (data: ParcelFormData) => {
    const persistOrder = (trackingCode: string) => {
      const order = {
        id: `parcel-${Date.now()}`,
        trackingCode,
        pickupAddress: data.pickupAddress,
        pickupLat: data.pickupLat,
        pickupLng: data.pickupLng,
        dropoffAddress: data.dropoffAddress,
        dropoffLat: data.dropoffLat,
        dropoffLng: data.dropoffLng,
        status: "pending" as const,
        estimatedPrice: data.estimatedPrice,
        actualPrice: data.estimatedPrice,
        createdAt: new Date().toISOString(),
        packageType: data.packageType,
        weight: data.weight,
        description: data.description,
      };

      const previousOrders = JSON.parse(sessionStorage.getItem("wt_parcel_orders") || "[]");
      sessionStorage.setItem("wt_parcel_orders", JSON.stringify([order, ...previousOrders]));
    };

    if (isAuthenticated) {
      createParcelMutation.mutate(
        {
          pickupAddress: data.pickupAddress,
          pickupLat: data.pickupLat,
          pickupLng: data.pickupLng,
          dropoffAddress: data.dropoffAddress,
          dropoffLat: data.dropoffLat,
          dropoffLng: data.dropoffLng,
          packageType: data.packageType,
          weight: data.weight,
          description: data.description,
          estimatedPrice: data.estimatedPrice,
        },
        {
          onSuccess: (result) => {
            persistOrder(result.trackingCode);
            navigate("/client-dashboard?tab=parcels");
          },
          onError: () => {
            persistOrder(`WT${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
            navigate("/client-dashboard?tab=parcels");
          },
        }
      );
      return;
    }

    persistOrder(`WT${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true); setRegError("");
    const nameParts = regName.trim().split(" ");
    const result = await register({
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(" ") || undefined,
      email: `${regPhone.replace(/\D/g, "")}@taxi.app`,
      phone: regPhone,
      password: regPassword,
      role: "client"
    });
    setRegLoading(false);
    if (!result.success) { setRegError(result.error || "Error al registrar"); return; }
    sessionStorage.setItem("pendingTrip", JSON.stringify({ pickup, destination, vehicle: selectedVehicle, extras: selectedExtras, estimate }));
    navigate("/client-dashboard");
  };

  const v = VEHICLES.find(v => v.id === selectedVehicle) || VEHICLES[0];
  const extrasTotal = selectedExtras.reduce((s, id) => s + (EXTRAS.find(e => e.id === id)?.price || 0), 0);

  return (
    <section className="relative w-full flex flex-col pt-16 overflow-x-hidden" style={{ background: "linear-gradient(135deg, oklch(0.10 0.01 250) 0%, oklch(0.14 0.02 200) 100%)" }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full opacity-8 blur-2xl sm:h-96 sm:w-96 sm:opacity-10 sm:blur-3xl" style={{ background: "oklch(0.76 0.18 148)" }} />
        <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full opacity-7 blur-2xl sm:h-64 sm:w-64 sm:opacity-8 sm:blur-3xl" style={{ background: "oklch(0.52 0.12 148)" }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_40%)]" />
      </div>

      <div className="container relative z-10 py-6 pb-10 lg:py-16">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-16 lg:items-start">
          <div className="order-2 lg:order-1 text-center lg:text-left motion-safe:animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200 backdrop-blur">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
              Conductores disponibles ahora
            </div>
            <h1 className="mb-4 mt-6 text-4xl font-extrabold leading-[1.08] text-white sm:text-5xl lg:text-6xl" style={{ fontFamily: "'Sora', sans-serif" }}>
              Conecta con<br /><span className="text-emerald-300">conductores locales verificados.</span>
            </h1>
            <p className="mx-auto mb-6 max-w-xl text-lg leading-relaxed text-white/70 lg:mx-0">
              Elige quien te lleva, ve tiempos reales y reserva con confianza desde una experiencia premium y transparente.
            </p>
            <div className="mb-6 rounded-3xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <PassengerMascot
                  mood={heroMascotStep === 0 ? "searching" : heroMascotStep === 1 ? "ready" : "happy"}
                  size="sm"
                  animated
                />
                <div className="text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">Asistente Passenger</p>
                  <p className="text-sm text-white/80">
                    {heroMascotStep === 0 && "Buscando el mejor carro cerca de ti..."}
                    {heroMascotStep === 1 && "Conductor ideal detectado. Preparando ruta."}
                    {heroMascotStep === 2 && "Todo listo: vamos camino al carro."}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-8 overflow-hidden rounded-full border border-emerald-300/25 bg-black/25 px-3">
                <div className="flex h-full items-center gap-2 whitespace-nowrap text-xs text-emerald-100 animate-mascot-walk">
                  <span>🚕</span>
                  <span>Camino al punto de recogida</span>
                </div>
              </div>
            </div>
            <div className="mb-6 flex flex-col items-center gap-3 lg:items-start">
              {[{ icon: Shield, text: "Conductores verificados" }, { icon: Zap, text: "Llegada en 3-8 min" }].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 text-sm text-white/80 backdrop-blur">
                  <Icon size={15} className="text-emerald-300" /> {text}
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center justify-center gap-3 text-sm text-white/70 sm:flex-row lg:justify-start">
              <a href="/driver-onboarding" className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 font-semibold text-emerald-100 transition hover:bg-emerald-500/25">
                <span>🚗</span> Empieza a ganar - Suscribete
              </a>
              <a href="/buscar-conductor" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 font-semibold text-white/80 transition hover:bg-white/20">
                <span>📍</span> Buscar conductor
              </a>
            </div>
          </div>

          <div className="order-1 lg:order-2 w-full max-w-sm mx-auto sm:max-w-md lg:max-w-none motion-safe:animate-fade-up" style={{ animationDelay: "80ms" }}>
            <div className="overflow-hidden rounded-[28px] border border-white/20 bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:p-5 lg:p-6">

              <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Reserva rápida</p>
                  <p className="text-sm font-semibold text-slate-800">Viaja con confianza y transparencia</p>
                </div>
                <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Sin cargos ocultos</div>
              </div>

              <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setServiceType("trip")}
                  className={`flex-1 py-2 px-3 rounded-md font-semibold text-sm transition-all ${
                    serviceType === "trip"
                      ? "bg-white text-green-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🚗 Viaje
                </button>
                <button
                  onClick={() => setServiceType("parcel")}
                  className={`flex-1 py-2 px-3 rounded-md font-semibold text-sm transition-all ${
                    serviceType === "parcel"
                      ? "bg-white text-green-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  📦 Paquete
                </button>
              </div>

              {/* STEP: FORM */}
              {step === "form" && serviceType === "trip" && (
                <>
                  <h2 className="text-lg lg:text-xl font-bold text-slate-900 mb-4" style={{ fontFamily: "'Sora', sans-serif" }}>¿A dónde vas hoy?</h2>

                  {/* Pickup */}
                  <div className="mb-3">
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0">
                        <NominatimAutocomplete
                          placeholder="¿Dónde te recogemos?"
                          value={pickup}
                          onChange={(val) => { setPickup(val); if (!val) setPickupCoords(null); }}
                          onSelect={(addr, lat, lng) => { setPickupCoords({ lat, lng }); setGpsError(""); mapRef.current?.setPickup(lat, lng, addr); }}
                          icon={<span className="w-3 h-3 rounded-full inline-block" style={{ background: "oklch(0.76 0.18 148)" }} />}
                          autoLocate
                        />
                      </div>
                      <button
                        onClick={handleGetMyLocation}
                        disabled={gpsLoading}
                        className="px-3 py-3 rounded-xl border border-slate-200 hover:bg-green-50 transition-colors flex-shrink-0 disabled:opacity-50"
                        title="Usar mi ubicación actual"
                      >
                        {gpsLoading ? <Loader2 size={16} className="text-green-500 animate-spin" /> : <Navigation size={16} className="text-green-500" />}
                      </button>
                    </div>
                    {gpsError && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600">
                        <AlertCircle size={12} />
                        <span>{gpsError}</span>
                      </div>
                    )}
                  </div>

                  {/* Destination */}
                  <div className="mb-4">
                    <NominatimAutocomplete
                          placeholder="¿A dónde vas?"
                          value={destination}
                          onChange={(val) => { setDestination(val); if (!val) setDestCoords(null); }}
                          onSelect={(addr, lat, lng) => { setDestCoords({ lat, lng }); mapRef.current?.setDropoff(lat, lng, addr); }}
                          icon={<span className="w-3 h-3 rounded-full border-2 inline-block" style={{ borderColor: "#EF4444" }} />}
                          countryCode={userCountryCode}
                          viewbox={destViewbox}
                        />
                  </div>

                  {/* Time selector */}
                  <div className="flex gap-2 mb-4">
                    {(["now", "later"] as const).map(t => (
                      <button key={t} onClick={() => setTripTime(t)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${tripTime === t ? "border-green-500 text-green-700 bg-green-50" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                        <Clock size={13} /> {t === "now" ? "Ahora" : "Programar"}
                      </button>
                    ))}
                  </div>

                  {/* Extras — compact scrollable row */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Requisitos especiales</p>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {EXTRAS.map(ex => (
                        <button key={ex.id} onClick={() => setSelectedExtras(prev => prev.includes(ex.id) ? prev.filter(x => x !== ex.id) : [...prev, ex.id])}
                          className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedExtras.includes(ex.id) ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                          {ex.icon} {ex.label} <span className="text-slate-400">{ex.price > 0 ? `+$${ex.price}` : "+$0"}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Map preview — smaller on desktop to avoid overflow */}
                  <div className="rounded-2xl overflow-hidden mb-4 hidden sm:block" style={{ height: 130 }}>
                    <LeafletMap height="130px" onMapReady={handleMapReady} />
                  </div>

                  {calcError && (
                    <div className="flex items-center gap-1.5 mb-3 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                      <AlertCircle size={12} />
                      <span>{calcError}</span>
                    </div>
                  )}

                  <button
                    onClick={handleCalculate}
                    disabled={!pickup.trim() || !destination.trim() || calculating}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}
                  >
                    {calculating
                      ? <><Loader2 size={16} className="animate-spin" /> Calculando ruta...</>
                      : <>Buscar conductor <ChevronRight size={16} /></>
                    }
                  </button>
                  <p className="text-center text-xs text-slate-400 mt-2">Sin cargos hasta confirmar el viaje</p>
                </>
              )}

              {/* STEP: ESTIMATE */}
              {step === "estimate" && estimate && (
                <>
                  <button onClick={() => setStep("form")} className="text-xs text-slate-400 hover:text-slate-600 mb-3 flex items-center gap-1">← Cambiar</button>
                  <h2 className="text-lg font-bold text-slate-900 mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>Tu viaje estimado</h2>
                  <p className="text-slate-500 text-xs mb-3 truncate">{pickup} → {destination}</p>
                  <div className="flex gap-2 mb-4 text-xs">
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600">📍 {estimate.km} km</span>
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600">⏱ {estimate.minutes} min</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {VEHICLES.map(vh => {
                      const p = (vh.base + estimate.km * vh.perKm + extrasTotal).toFixed(2);
                      return (
                        <button key={vh.id} onClick={() => setSelectedVehicle(vh.id)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${selectedVehicle === vh.id ? "border-green-500 bg-green-50" : "border-slate-200 hover:border-slate-300"}`}>
                          <p className="text-lg">{vh.emoji}</p>
                          <p className="text-xs font-semibold text-slate-700">{vh.label}</p>
                          <p className="text-base font-extrabold text-slate-900">${p}</p>
                          <p className="text-xs text-slate-400">{vh.eta}</p>
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={handleRequestTrip}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                    style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}>
                    Pedir {v.emoji} {v.label} · ${(v.base + estimate.km * v.perKm + extrasTotal).toFixed(2)} <ChevronRight size={16} />
                  </button>
                </>
              )}

              {/* PARCEL FORM */}
              {step === "form" && serviceType === "parcel" && (
                <HeroParcelForm
                  onSubmit={handleParcelSubmit}
                  onNavigateToDashboard={() => {
                    if (isAuthenticated) {
                      navigate("/client-dashboard?tab=parcels");
                    } else {
                      setStep("register");
                    }
                  }}
                />
              )}

              {/* STEP: REGISTER */}
              {step === "register" && (
                <>
                  <button onClick={() => setStep("estimate")} className="text-xs text-slate-400 hover:text-slate-600 mb-3 flex items-center gap-1">← Volver</button>
                  <h2 className="text-lg font-bold text-slate-900 mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>Casi listo 🚕</h2>
                  <p className="text-slate-500 text-sm mb-3">Crea tu cuenta para confirmar el viaje</p>
                  {estimate && (
                    <div className="p-3 rounded-xl mb-3 text-sm" style={{ background: "oklch(0.76 0.18 148 / 0.1)", border: "1px solid oklch(0.76 0.18 148 / 0.3)" }}>
                      <p className="font-semibold text-slate-800">{v.emoji} {v.label} · ${(v.base + estimate.km * v.perKm + extrasTotal).toFixed(2)}</p>
                      <p className="text-slate-500 text-xs truncate">{pickup} → {destination}</p>
                    </div>
                  )}
                  {regError && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs text-center">{regError}</div>}
                  <form onSubmit={handleRegister} className="space-y-3">
                    <input type="text" required placeholder="Tu nombre completo" value={regName} onChange={e => setRegName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none" />
                    <input type="tel" required placeholder="Número de teléfono" value={regPhone} onChange={e => setRegPhone(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none" />
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required placeholder="Contraseña (mín. 6 caracteres)" value={regPassword} onChange={e => setRegPassword(e.target.value)}
                        className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <button type="submit" disabled={regLoading}
                      className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}>
                      {regLoading ? <><Loader2 size={16} className="animate-spin" /> Creando cuenta...</> : <>Confirmar viaje <ChevronRight size={16} /></>}
                    </button>
                  </form>
                  <p className="text-center text-xs text-slate-400 mt-3">¿Ya tienes cuenta? <a href="/login" className="text-green-600 hover:underline">Inicia sesión</a></p>
                </>
              )}
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="flex -space-x-2">
                {["/assets-storage/avatar1_c813ee08.jpg", "/assets-storage/avatar2_b26d0545.jpg", "/assets-storage/avatar3_46cc7298.jpg", "/assets-storage/avatar4_6f0fea6f.jpg"].map((src, i) => (
                  <img key={i} src={src} alt="Cliente" className="w-8 h-8 rounded-full border-2 object-cover object-center" style={{ borderColor: "oklch(0.14 0.02 200)" }} />
                ))}
              </div>
              <p className="text-white/50 text-sm"><span className="text-white font-bold">2,400+</span> clientes activos esta semana</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
