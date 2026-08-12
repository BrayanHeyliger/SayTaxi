import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Phone, Star, Clock, DollarSign, LogOut, CheckCircle, Bell,
  Car, X, ChevronRight, AlertTriangle, Share2, Tag, Calendar,
  History, Home, Briefcase, MessageCircle, MapPin, Navigation, Gift
} from "lucide-react";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import LeafletMap, { type LeafletMapRef } from "@/components/LeafletMap";
import NominatimAutocomplete from "@/components/NominatimAutocomplete";
import { TripChat } from "@/components/TripChat";
import { useNotificationHistory } from "@/hooks/useNotificationHistory";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import ReferralPanel from "@/components/ReferralPanel";
import { ParcelTracking, type ParcelOrder } from "@/components/ParcelTracking";
import { ParcelHistory } from "@/components/ParcelHistory";
import { calculateParcelPricing, normalizeParcelOrder } from "@/lib/parcelUtils";
import { trpc } from "@/lib/trpc";
import PassengerMascot from "@/components/PassengerMascot";

type TripStatus = "idle" | "searching" | "accepted" | "in_progress" | "completed" | "rating";
type ActivePanel = "request" | "history" | "scheduled" | "promo" | "referrals" | "parcels";

interface TripNotification { id: string; message: string; time: string; type: "info" | "success" | "warning"; }
interface TripHistory { id: string; date: string; from: string; to: string; fare: string; driver: string; rating: number; }
interface MarketSlide {
  eyebrow: string;
  title: string;
  copy: string;
  stats: Array<{ label: string; value: string }>;
  gradient: string;
  accent: string;
}

const TRIPS_KEY = "wt_pending_trips";
const HISTORY_KEY = "wt_trip_history";
const LIVE_TRIP_KEY = "wt_live_trip_state";

const MARKET_SLIDES: MarketSlide[] = [
  {
    eyebrow: "Passenger Live",
    title: "Tu viaje, tu elección en una sola app",
    copy: "Elige conductor, sigue el trayecto en vivo y comparte el viaje con quien quieras. Diseñado para moverse rápido en ciudad y aeropuerto.",
    stats: [
      { label: "Tiempo medio", value: "5 min" },
      { label: "Pago", value: "Directo al conductor" },
      { label: "Cobertura", value: "Ciudad + aeropuerto" },
    ],
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    accent: "#d1fae5",
  },
  {
    eyebrow: "Tracking nativo",
    title: "Mira el mapa, la ETA y el movimiento real",
    copy: "La app muestra ruta viva, estado del viaje y acceso rápido a SOS, chat y compartir. Todo pensado para usarlo con una mano.",
    stats: [
      { label: "Tracking", value: "En vivo" },
      { label: "Seguridad", value: "SOS visible" },
      { label: "Experiencia", value: "Modo app" },
    ],
    gradient: "from-slate-900 via-slate-800 to-indigo-950",
    accent: "#bae6fd",
  },
  {
    eyebrow: "Passenger P2P",
    title: "Más opciones, más control, más claridad",
    copy: "Comparas vehículos, ves tarifas antes de pedir y mantienes la relación comercial transparente: plataforma SaaS, conductor independiente.",
    stats: [
      { label: "Opciones", value: "Economy · Premium" },
      { label: "Modelo", value: "Passenger P2P" },
      { label: "Transparencia", value: "Visible" },
    ],
    gradient: "from-fuchsia-600 via-rose-600 to-orange-500",
    accent: "#fbcfe8",
  },
];

export default function ClientDashboard() {
  const { user, isAuthenticated, logout } = useLocalAuth();
  const [, navigate] = useLocation();
  const { permission: notifPermission, requestPermission, sendNotification } = usePushNotifications();
  const { notifications: persistedNotifs, unreadCount, addNotification: addPersistedNotif, markAllRead, clearAll: clearAllNotifs } = useNotificationHistory(user?.role || "client");
  const [pendingTripBanner, setPendingTripBanner] = useState<string | null>(null);

  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [tripStatus, setTripStatus] = useState<TripStatus>("idle");
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [userViewbox, setUserViewbox] = useState<[number, number, number, number] | undefined>(undefined);
  const [userCountryCode, setUserCountryCode] = useState<string | undefined>(undefined);
  const [showNotifications, setShowNotifications] = useState(false);
  const [estimatedFare, setEstimatedFare] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<string | null>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(0);
  const [allFares, setAllFares] = useState<Record<string, string>>({});
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  // Availability counters per vehicle type (derived from spawned markers)
  const [vehicleAvailability, setVehicleAvailability] = useState<Record<string, { count: number; eta: string }>>({
    economy: { count: 3, eta: "2 min" },
    comfort:  { count: 2, eta: "4 min" },
    premium:  { count: 1, eta: "7 min" },
    suv:      { count: 2, eta: "5 min" },
  });
  const [selectedVehicle, setSelectedVehicle] = useState("economy");
  const [loyaltyPoints, setLoyaltyPoints] = useState(120);
  const [activePanel, setActivePanel] = useState<ActivePanel>("request");
  const [marketSlideIndex, setMarketSlideIndex] = useState(0);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [driverRating, setDriverRating] = useState(0);
  const [driverComment, setDriverComment] = useState("");
  const [tripHistory, setTripHistory] = useState<TripHistory[]>(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
  });
  const [showBidMode, setShowBidMode] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [parcelOrders, setParcelOrders] = useState<ParcelOrder[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<ParcelOrder | null>(null);
  const [showParcelTracking, setShowParcelTracking] = useState(false);
  const PARCELS_KEY = "wt_parcel_orders";
  const { data: serverParcelOrders } = trpc.parcels.listByClient.useQuery(undefined, { enabled: isAuthenticated });

  const mapRef = useRef<LeafletMapRef | null>(null);
  const driverAnimRef = useRef<number | null>(null);
  const [driverEta, setDriverEta] = useState<string | null>(null);
  const [driverDistance, setDriverDistance] = useState<string | null>(null);

  // LeafletMap handles vehicle spawning internally
  const clearVehicleMarkers = useCallback(() => {
    // Leaflet map handles its own cleanup
  }, []);
  useEffect(() => () => clearVehicleMarkers(), [clearVehicleMarkers]);

  // Recalculate fare when vehicle type changes (without re-fetching the route)
  useEffect(() => {
    if (routeDistanceKm > 0 && Object.keys(allFares).length > 0) {
      const rates: Record<string, number> = { economy: 1.2, comfort: 1.8, premium: 2.5, suv: 3.0 };
      const computed: Record<string, string> = {};
      Object.entries(rates).forEach(([vid, rate]) => {
        let f = 2.5 + routeDistanceKm * rate;
        if (promoApplied) f *= 0.85;
        computed[vid] = `$${f.toFixed(2)}`;
      });
      setAllFares(computed);
      setEstimatedFare(computed[selectedVehicle] || null);
    }
  }, [selectedVehicle, promoApplied, routeDistanceKm]);


  // Load pending trip from sessionStorage (set by HeroSection before registration)
  useEffect(() => {
    if (!isAuthenticated) return;
    const raw = sessionStorage.getItem("pendingTrip");
    if (!raw) return;
    try {
      const pending = JSON.parse(raw);
      sessionStorage.removeItem("pendingTrip");
      if (pending.pickup) setPickupLocation(pending.pickup);
      if (pending.destination) setDropoffLocation(pending.destination);
      if (pending.vehicle) setSelectedVehicle(pending.vehicle);
      if (pending.estimate) {
        const km = pending.estimate.km || 0;
        setRouteDistanceKm(km);
        setEstimatedTime(`${pending.estimate.minutes || 0} min`);
        setEstimatedDistance(`${km} km`);
        const rates: Record<string, number> = { economy: 1.2, comfort: 1.8, premium: 2.5, suv: 3.0 };
        const computed: Record<string, string> = {};
        Object.entries(rates).forEach(([vid, rate]) => {
          computed[vid] = `$${(2.5 + km * rate).toFixed(2)}`;
        });
        setAllFares(computed);
        setEstimatedFare(computed[pending.vehicle || "economy"] || null);
      }
      // Mostrar banner en lugar de toast para no bloquear el botón
      setPendingTripBanner("🚕 ¡Tu viaje está listo! Confirma la solicitud abajo.");
      setTimeout(() => setPendingTripBanner(null), 4000);
    } catch {
      sessionStorage.removeItem("pendingTrip");
    }
  }, [isAuthenticated]);

  useEffect(() => { if (!isAuthenticated) navigate("/login"); }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (serverParcelOrders && Array.isArray(serverParcelOrders) && serverParcelOrders.length > 0) {
      const normalized = (serverParcelOrders as any[]).map((order) => normalizeParcelOrder(order));
      setParcelOrders(normalized);
      sessionStorage.setItem(PARCELS_KEY, JSON.stringify(normalized));
      return;
    }

    try {
      const stored = JSON.parse(sessionStorage.getItem(PARCELS_KEY) || "[]");
      if (stored.length > 0) {
        setParcelOrders(stored.map((order: any) => normalizeParcelOrder(order)));
      }
    } catch {}
  }, [isAuthenticated, serverParcelOrders]);

  // Poll for driver acceptance
  useEffect(() => {
    if (tripStatus !== "searching") return;
    const autoAssign = setTimeout(() => {
      const trips = JSON.parse(localStorage.getItem(TRIPS_KEY) || "[]");
      const myTrip = trips.find((t: any) => t.clientId === user?.id && t.status === "requested");
      if (myTrip) {
        const updatedTrip = { ...myTrip, status: "accepted", driver: { name: "Carlos M.", vehicle: "Toyota Corolla", plate: "ABC-123", rating: 4.8, phone: "" }, estimatedTime: "4 min" };
        const updated = trips.map((t: any) => t.id === myTrip.id ? updatedTrip : t);
        localStorage.setItem(TRIPS_KEY, JSON.stringify(updated));
        setCurrentTrip(updatedTrip);
        setTripStatus("accepted");
        addNotification("🚕 ¡Carlos M. aceptó tu viaje! ETA: 4 min", "success", "¡Conductor en camino! 🚕", "Carlos M. aceptó tu viaje. Llegará en 4 minutos.");
        setLoyaltyPoints(p => p + 10);
        if (pickupCoords) startDriverApproach(pickupCoords);
        else startDriverApproach({ lat: 19.4326, lng: -99.1332 });
      }
    }, 6000);
    return () => clearTimeout(autoAssign);
  }, [tripStatus, user?.id]);

  const addNotification = useCallback((message: string, type: "info" | "success" | "warning" = "info", pushTitle?: string, pushBody?: string) => {
    const soundMap: Record<string, "new_trip" | "accepted" | "info"> = {
      success: "accepted",
      warning: "info",
      info: "info",
    };
    addPersistedNotif(message, { type, sound: soundMap[type] || "info", url: "/client-dashboard" });
    if (pushTitle) sendNotification(pushTitle, { body: pushBody || message, url: "/client-dashboard", tag: "trip-update" });
  }, [addPersistedNotif, sendNotification]);

  const handleParcelStatusUpdate = useCallback((order: ParcelOrder, status: ParcelOrder['status'], title: string, body: string) => {
    setParcelOrders(prev => prev.map(item => item.id === order.id ? { ...item, status } : item));
    addNotification(body, status === 'delivered' ? 'success' : 'info', title, body);
  }, [addNotification]);

  const calculateRoute = useCallback(async (pickup: { lat: number; lng: number }, dropoff: { lat: number; lng: number }) => {
    if (!mapRef.current) return;
    setIsCalculatingRoute(true);
    mapRef.current.setPickup(pickup.lat, pickup.lng, "Recogida");
    mapRef.current.setDropoff(dropoff.lat, dropoff.lng, "Destino");
    const route = await mapRef.current.getRoute();
    setIsCalculatingRoute(false);
    if (route) {
      const distKm = route.distanceKm;
      setRouteDistanceKm(distKm);
      setEstimatedDistance(`${distKm.toFixed(1)} km`);
      setEstimatedTime(`${route.durationMin} min`);
      const rates: Record<string, number> = { economy: 1.2, comfort: 1.8, premium: 2.5, suv: 3.0 };
      const computed: Record<string, string> = {};
      Object.entries(rates).forEach(([vid, rate]) => {
        let f = 2.5 + distKm * rate;
        if (promoApplied) f *= 0.85;
        computed[vid] = `$${f.toFixed(2)}`;
      });
      setAllFares(computed);
      setEstimatedFare(computed[selectedVehicle] || null);
    }
  }, [selectedVehicle, promoApplied]);

  // Animate driver approaching pickup using Leaflet
  const startDriverApproach = useCallback((pickup: { lat: number; lng: number }) => {
    const spread = 0.008;
    let driverPos = {
      lat: pickup.lat + (Math.random() > 0.5 ? 1 : -1) * (0.003 + Math.random() * spread),
      lng: pickup.lng + (Math.random() > 0.5 ? 1 : -1) * (0.003 + Math.random() * spread),
    };
    const liveTrip = {
      tripId: currentTrip?.id,
      phase: "approaching",
      pickup,
      driverStart: driverPos,
      driverName: currentTrip?.driver?.name || "Conductor",
      updatedAt: Date.now(),
    };

    if (driverAnimRef.current) clearInterval(driverAnimRef.current);
    localStorage.setItem(LIVE_TRIP_KEY, JSON.stringify(liveTrip));

    mapRef.current?.setRouteBetween(
      { lat: driverPos.lat, lng: driverPos.lng, label: liveTrip.driverName },
      { lat: pickup.lat, lng: pickup.lng, label: "Tu ubicación" },
      { vehicleEmoji: "🚕", vehicleLabel: liveTrip.driverName, animate: true }
    ).then((route) => {
      if (route) {
        setDriverEta(route.durationMin <= 1 ? "Menos de 1 min" : `${route.durationMin} min`);
        setDriverDistance(route.distanceKm < 1 ? `${Math.round(route.distanceKm * 1000)} m` : `${route.distanceKm.toFixed(1)} km`);
      }
    });

    driverAnimRef.current = window.setTimeout(() => {
      setDriverEta("¡Llegó!");
      setDriverDistance("0 m");
      setTripStatus("in_progress");
      localStorage.setItem(LIVE_TRIP_KEY, JSON.stringify({ ...liveTrip, phase: "arrived", updatedAt: Date.now() }));
    }, 7000);
  }, [currentTrip?.driver?.name, currentTrip?.id]);

  const handleMapReady = useCallback((ref: LeafletMapRef) => {
    mapRef.current = ref;
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setPickupCoords(coords);
      // Build a ~30km bounding box around the user's GPS position for destination search bias
      const delta = 0.27; // ~30km
      setUserViewbox([coords.lng - delta, coords.lat - delta, coords.lng + delta, coords.lat + delta]);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`, { headers: { "Accept-Language": "es" } });
        const data = await res.json();
        if (data.display_name) setPickupLocation(data.display_name.split(",").slice(0, 2).join(","));
        if (data.address?.country_code) setUserCountryCode(data.address.country_code);
      } catch {}
    });
  }, []);

  const handlePickupSelect = (address: string, lat: number, lng: number) => {
    const coords = { lat, lng };
    setPickupCoords(coords);
    mapRef.current?.setPickup(lat, lng, address);
    mapRef.current?.spawnVehicles(lat, lng);
    if (dropoffCoords) calculateRoute(coords, dropoffCoords);
  };

  const handleDropoffSelect = (address: string, lat: number, lng: number) => {
    const coords = { lat, lng };
    setDropoffCoords(coords);
    mapRef.current?.setDropoff(lat, lng, address);
    if (pickupCoords) calculateRoute(pickupCoords, coords);
    else mapRef.current?.panTo(lat, lng);
  };

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocalización no disponible"); return; }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setPickupCoords(coords);
      mapRef.current?.setPickup(coords.lat, coords.lng, "Mi ubicación");
      mapRef.current?.spawnVehicles(coords.lat, coords.lng);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`, { headers: { "Accept-Language": "es" } });
        const data = await res.json();
        setPickupLocation(data.display_name?.split(",").slice(0, 2).join(",") || "Mi ubicación 📍");
        if (dropoffCoords) calculateRoute(coords, dropoffCoords);
      } catch { setPickupLocation("Mi ubicación 📍"); }
      setGettingLocation(false);
    }, () => { setGettingLocation(false); toast.error("No se pudo obtener tu ubicación"); });
  };

  const handleApplyPromo = () => {
    const validCodes = ["TAXI10", "BIENVENIDO", "PROMO20", "WHATSAPP"];
    if (validCodes.includes(promoCode.toUpperCase())) {
      setPromoApplied(true);
      toast.success("¡Código aplicado! 15% de descuento");
      addNotification("🎉 Código promocional aplicado: 15% de descuento", "success");
    } else {
      toast.error("Código inválido. Prueba: BIENVENIDO");
    }
  };

  const handleRequestTrip = () => {
    if (!pickupLocation || !dropoffLocation) { toast.error("Completa origen y destino"); return; }
    mapRef.current?.clearRoute();
    const fare = showBidMode && bidAmount ? `$${bidAmount}` : (estimatedFare || "$15.00");
    const newTrip = {
      id: Date.now().toString(), clientId: user?.id, clientName: user?.name,
      pickup: pickupLocation, dropoff: dropoffLocation, fare, status: "requested",
      requestedAt: new Date().toISOString(), vehicleType: selectedVehicle,
      scheduledFor: scheduledDate && scheduledTime ? `${scheduledDate} ${scheduledTime}` : null,
      isBid: showBidMode, driver: null,
    };
    const trips = JSON.parse(localStorage.getItem(TRIPS_KEY) || "[]");
    trips.push(newTrip);
    localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
    setCurrentTrip(newTrip);
    setTripStatus("searching");
    addNotification(scheduledDate ? `📅 Viaje programado para ${scheduledDate} ${scheduledTime}` : "🔍 Buscando conductor disponible...", "info");
  };

  const handleCancelTrip = () => {
    if (currentTrip) {
      const trips = JSON.parse(localStorage.getItem(TRIPS_KEY) || "[]");
      localStorage.setItem(TRIPS_KEY, JSON.stringify(trips.filter((t: any) => t.id !== currentTrip.id)));
    }
    setTripStatus("idle"); setCurrentTrip(null);
    localStorage.removeItem(LIVE_TRIP_KEY);
    addNotification("Viaje cancelado", "warning");
  };

  const handleSubmitRating = () => {
    const newEntry: TripHistory = {
      id: currentTrip?.id || Date.now().toString(),
      date: new Date().toLocaleDateString("es"),
      from: currentTrip?.pickup || "", to: currentTrip?.dropoff || "",
      fare: currentTrip?.fare || "", driver: currentTrip?.driver?.name || "Conductor", rating: driverRating,
    };
    const history = [newEntry, ...tripHistory.slice(0, 19)];
    setTripHistory(history);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    setLoyaltyPoints(p => p + 50);
    toast.success("¡Gracias por tu calificación! +50 puntos");
    setTripStatus("idle"); setCurrentTrip(null); setDriverRating(0); setDriverComment("");
    localStorage.removeItem(LIVE_TRIP_KEY);
  };

  const handleCallDriver = () => {
    // Abrir chat interno en lugar de llamada directa — el teléfono del conductor es privado
    toast.info("💬 Usa el chat para contactar al conductor de forma segura");
  };

  const handleMessageDriver = () => {
    setChatOpen(true);
  };

  const handleCreateParcel = useCallback((order: ParcelOrder) => {
    const normalized = normalizeParcelOrder(order as unknown as Parameters<typeof normalizeParcelOrder>[0]);
    setParcelOrders(prev => {
      const next = [normalized, ...prev];
      sessionStorage.setItem(PARCELS_KEY, JSON.stringify(next));
      return next;
    });
    addNotification(`📦 Paquete creado con código ${order.trackingCode}`, 'info', 'Paquete creado', `Tu paquete está pendiente de aceptación. Código: ${order.trackingCode}`);
  }, [addNotification]);

  const handleSOS = () => {
    const msg = `🚨 EMERGENCIA - Pasajero: ${user?.name} | Viaje: ${currentTrip?.pickup} → ${currentTrip?.dropoff} | Conductor: ${currentTrip?.driver?.name || "N/A"} | Placa: ${currentTrip?.driver?.plate || "N/A"}`;
    if (navigator.share) { navigator.share({ title: "SOS Emergencia", text: msg }); }
    else { navigator.clipboard.writeText(msg); toast.error("🚨 Info de emergencia copiada al portapapeles"); }
    addNotification("🚨 Alerta SOS enviada", "warning");
  };

  const handleShareTrip = () => {
    const text = `Estoy en un viaje con Passenger 🚕\nConductor: ${currentTrip?.driver?.name}\nVehículo: ${currentTrip?.driver?.vehicle} (${currentTrip?.driver?.plate})\nDesde: ${currentTrip?.pickup}\nHacia: ${currentTrip?.dropoff}`;
    if (navigator.share) { navigator.share({ title: "Compartir viaje", text }); }
    else { navigator.clipboard.writeText(text); toast.success("Información del viaje copiada"); }
  };

  const vehicles = [
    { id: "economy", label: "Económico", icon: "🚗", price: "$1.20/km", time: "3 min" },
    { id: "comfort", label: "Confort", icon: "🚙", price: "$1.80/km", time: "5 min" },
    { id: "premium", label: "Premium", icon: "🚘", price: "$2.50/km", time: "8 min" },
    { id: "suv", label: "SUV", icon: "🚐", price: "$3.00/km", time: "6 min" },
  ];

  const loyaltyLevel = loyaltyPoints < 200 ? { name: "Bronce", color: "text-amber-600", next: 200 } :
    loyaltyPoints < 500 ? { name: "Plata", color: "text-slate-400", next: 500 } :
    loyaltyPoints < 1000 ? { name: "Oro", color: "text-yellow-500", next: 1000 } :
    { name: "Platino", color: "text-purple-500", next: 9999 };

  const mascotState =
    tripStatus === "searching"
      ? { mood: "searching" as const, text: "Buscando conductor cerca de ti..." }
      : tripStatus === "accepted"
      ? { mood: "ready" as const, text: "Tu conductor acepto. Va en camino." }
      : tripStatus === "in_progress"
      ? { mood: "happy" as const, text: "Todo va bien. Disfruta tu viaje." }
      : { mood: "idle" as const, text: "Listo para ayudarte en tu proximo viaje." };

  useEffect(() => {
    if (tripStatus !== "idle" || activePanel !== "request") return;
    const interval = window.setInterval(() => {
      setMarketSlideIndex((current) => (current + 1) % MARKET_SLIDES.length);
    }, 4500);
    return () => window.clearInterval(interval);
  }, [activePanel, tripStatus]);

  if (!isAuthenticated) return null;

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="wt-header bg-white shadow-sm border-b border-slate-200 flex-shrink-0 relative">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm">{user?.name?.[0] || "C"}</div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{user?.name}</p>
              <p className={`text-xs font-medium ${loyaltyLevel.color}`}>⭐ {loyaltyLevel.name} · {loyaltyPoints} pts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllRead(); }} className="relative p-2 rounded-lg hover:bg-slate-100">
                <Bell size={20} className="text-slate-600" />
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </button>
              {showNotifications && (
                <div className="wt-notification-panel absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl">
                  <div className="p-3 border-b border-slate-200 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">Notificaciones</h3>
                      <p className="text-xs text-slate-400">Últimas 24 horas</p>
                    </div>
                    <button onClick={clearAllNotifs} className="text-xs text-slate-500 hover:text-red-500 transition-colors">Limpiar</button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {persistedNotifs.length === 0
                      ? <div className="p-6 text-center"><Bell size={28} className="mx-auto text-slate-200 mb-2" /><p className="text-sm text-slate-400">Sin notificaciones</p></div>
                      : persistedNotifs.map(n => (
                        <div key={n.id} className={`p-3 border-b border-slate-100 flex gap-3 items-start ${!n.read ? "bg-green-50/60" : ""}`}>
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.type === "success" ? "bg-green-500" : n.type === "warning" ? "bg-yellow-500" : n.type === "error" ? "bg-red-500" : "bg-blue-500"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-800 leading-snug">{n.message}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{new Date(n.timestamp).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-1.5" />}
                        </div>
                      ))
                    }
                  </div>
                  <div className="p-2 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400">Se reinicia automáticamente cada 24 h</p>
                  </div>
                </div>
              )}
            </div>
            {/* Botón activar notificaciones push */}
            {notifPermission !== "granted" && (
              <button onClick={requestPermission} title="Activar notificaciones" className="p-2 rounded-lg hover:bg-green-50 text-green-600 border border-green-200 text-xs flex items-center gap-1">
                <Bell size={14} /> Push
              </button>
            )}
            <Button variant="outline" size="sm" onClick={() => { logout(); navigate("/"); }} className="gap-1.5 text-xs"><LogOut size={14} /> Salir</Button>
          </div>
        </div>
      </header>

      {/* Banner de viaje listo — aparece 4 segundos y desaparece */}
      {pendingTripBanner && (
        <div className="bg-green-500 text-white text-sm font-semibold px-4 py-2.5 flex items-center justify-between animate-pulse">
          <span>{pendingTripBanner}</span>
          <button onClick={() => setPendingTripBanner(null)} className="ml-3 text-white/80 hover:text-white">✕</button>
        </div>
      )}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
        <PassengerMascot mood={mascotState.mood} size="sm" animated className="shrink-0" />
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700 font-semibold">Asistente Passenger</p>
          <p className="text-sm text-slate-700">{mascotState.text}</p>
        </div>
      </div>
      {/* Main content — fills remaining height */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0" style={{ height: 'calc(100vh - 65px)' }}>

        {/* MAPA — altura explícita garantizada */}
        <div className="relative lg:flex-1" style={{ height: '56vw', minHeight: '260px', maxHeight: '420px' }}>
          {/* En desktop, ocupa todo el espacio restante */}
          <style>{`@media (min-width: 1024px) { .map-container { height: 100% !important; max-height: none !important; } }`}</style>
          <LeafletMap
            height="100%"
            onMapReady={handleMapReady}
            className="map-container absolute inset-0 w-full h-full"
          />
          {/* Chat flotante — visible cuando hay viaje activo */}
          {(tripStatus === "accepted" || tripStatus === "in_progress") && currentTrip && (
            <div id="trip-chat-anchor">
            <TripChat
              tripId={currentTrip.id}
              userId={user?.id != null ? String(user.id) : "client"}
              userName={user?.name || "Cliente"}
              role="client"
              otherPartyName={currentTrip.driver?.name || "Conductor"}
              forceOpen={chatOpen}
              onOpenChange={setChatOpen}
            />
            </div>
          )}
          {/* Status overlay en el mapa */}
          {tripStatus === "searching" && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2 z-10">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-slate-900">Buscando conductor...</span>
            </div>
          )}
          {tripStatus === "searching" && (
            <div className="absolute left-4 bottom-4 z-10 rounded-2xl border border-emerald-200 bg-white/95 p-3 shadow-lg">
              <div className="flex items-center gap-2">
                <PassengerMascot mood="searching" size="sm" animated />
                <p className="text-xs font-medium text-emerald-800">Estoy revisando opciones para ti</p>
              </div>
            </div>
          )}
          {(tripStatus === "accepted" || tripStatus === "in_progress") && currentTrip?.driver && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2 z-10">
              <Car size={16} />
              <span className="text-sm font-semibold">{currentTrip.driver.name} · ETA {currentTrip.estimatedTime}</span>
            </div>
          )}
        </div>

        {/* Panel lateral derecho */}
        <div className="w-full lg:w-[400px] bg-white shadow-xl flex flex-col flex-shrink-0" style={{ flex: '1 1 auto', minHeight: 0, maxHeight: '100%' }}>

          {/* Tabs — solo en idle */}
          {tripStatus === "idle" && (
            <div className="flex border-b border-slate-200 flex-shrink-0">
              {[
                { id: "request" as ActivePanel, label: "Viaje", icon: Car },
                { id: "parcels" as ActivePanel, label: "Paquetes", icon: Briefcase },
                { id: "scheduled" as ActivePanel, label: "Programar", icon: Calendar },
                { id: "history" as ActivePanel, label: "Historial", icon: History },
                { id: "promo" as ActivePanel, label: "Promos", icon: Tag },
                { id: "referrals" as ActivePanel, label: "Referidos", icon: Gift },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActivePanel(tab.id)}
                  className={`flex-1 flex flex-col items-center py-2.5 text-xs font-medium transition-colors ${activePanel === tab.id ? "text-green-600 border-b-2 border-green-500" : "text-slate-500 hover:text-slate-700"}`}>
                  <tab.icon size={16} className="mb-0.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Contenido scrollable */}
          <div className="flex-1 overflow-y-auto pb-24 lg:pb-0">

            {/* SOLICITAR VIAJE */}
            {/* Broadcast Announcements */}
            <div className="px-4 pt-3">
              <AnnouncementBanner target="clients" />
            </div>

            {/* SOLICITAR VIAJE */}
            {tripStatus === "idle" && activePanel === "request" && (
              <div className="p-4 flex flex-col gap-3">
                <div className="overflow-hidden rounded-3xl border border-slate-900/10 bg-slate-950 text-white shadow-xl">
                  <div className="flex items-center justify-between px-4 pt-4 text-[11px] uppercase tracking-[0.35em] text-emerald-200">
                    <span>Passenger Live</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setMarketSlideIndex((current) => (current - 1 + MARKET_SLIDES.length) % MARKET_SLIDES.length)}
                        className="rounded-full border border-white/15 bg-white/10 p-1 text-white/80 hover:bg-white/20"
                        aria-label="Slide anterior"
                      >
                        <ChevronRight size={14} className="rotate-180" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarketSlideIndex((current) => (current + 1) % MARKET_SLIDES.length)}
                        className="rounded-full border border-white/15 bg-white/10 p-1 text-white/80 hover:bg-white/20"
                        aria-label="Slide siguiente"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="relative px-4 pb-4 pt-3">
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                      <div
                        className="flex transition-transform duration-700 ease-out"
                        style={{ width: `${MARKET_SLIDES.length * 100}%`, transform: `translateX(-${marketSlideIndex * (100 / MARKET_SLIDES.length)}%)` }}
                      >
                        {MARKET_SLIDES.map((slide) => (
                          <div key={slide.title} className="w-full shrink-0 p-4" style={{ width: `${100 / MARKET_SLIDES.length}%` }}>
                            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${slide.gradient} p-4 shadow-lg`}>
                              <div className="absolute inset-0 opacity-25" style={{ background: `radial-gradient(circle at top right, ${slide.accent}, transparent 42%)` }} />
                              <div className="relative flex items-start justify-between gap-3">
                                <div className="max-w-[72%]">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/85">{slide.eyebrow}</p>
                                  <h3 className="mt-2 text-xl font-black leading-tight text-white">{slide.title}</h3>
                                  <p className="mt-2 text-sm leading-5 text-white/88">{slide.copy}</p>
                                </div>
                                <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-right backdrop-blur-sm">
                                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/70">Live</p>
                                  <p className="text-lg font-black text-white">App</p>
                                </div>
                              </div>
                              <div className="relative mt-4 grid grid-cols-3 gap-2">
                                {slide.stats.map((stat) => (
                                  <div key={stat.label} className="rounded-xl border border-white/10 bg-white/10 px-2 py-2 backdrop-blur-sm">
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
                  </div>
                  <div className="flex items-center justify-between px-4 pb-4">
                    <div className="flex items-center gap-1.5">
                      {MARKET_SLIDES.map((slide, index) => (
                        <button
                          key={slide.title}
                          type="button"
                          onClick={() => setMarketSlideIndex(index)}
                          className={`h-1.5 rounded-full transition-all ${marketSlideIndex === index ? "w-8 bg-white" : "w-3 bg-white/35 hover:bg-white/50"}`}
                          aria-label={`Ir al slide ${index + 1}`}
                        />
                      ))}
                    </div>
                    <Button
                      type="button"
                      onClick={() => setActivePanel("request")}
                      className="h-8 rounded-full bg-white px-3 text-xs font-semibold text-slate-950 hover:bg-emerald-50"
                    >
                      Pedir viaje
                    </Button>
                  </div>
                </div>

                <h2 className="text-lg font-bold text-slate-900">¿A dónde vamos?</h2>

                {/* Lugares guardados */}
                <div className="flex gap-2">
                  {[{ label: "Casa", icon: Home, addr: "Calle Principal 123" }, { label: "Trabajo", icon: Briefcase, addr: "Av. Reforma 456" }].map(p => (
                    <button key={p.label} onClick={() => setDropoffLocation(p.addr)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-medium text-slate-700 transition-colors">
                      <p.icon size={11} /> {p.label}
                    </button>
                  ))}
                </div>

                {/* Pickup con autocompletado */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <NominatimAutocomplete
                      value={pickupLocation}
                      onChange={setPickupLocation}
                      onSelect={handlePickupSelect}
                      placeholder="¿Desde dónde te recogemos?"
                      icon={<span className="w-3 h-3 rounded-full inline-block bg-green-500" />}
                      autoLocate
                    />
                  </div>
                  <button onClick={handleGetMyLocation} disabled={gettingLocation} className="px-3 py-3 rounded-xl border border-slate-200 hover:bg-green-50 transition-colors" title="Mi ubicación">
                    {gettingLocation ? <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /> : <Navigation size={16} className="text-green-500" />}
                  </button>
                </div>

                {/* Dropoff con autocompletado */}
                <NominatimAutocomplete
                  value={dropoffLocation}
                  onChange={setDropoffLocation}
                  onSelect={handleDropoffSelect}
                  placeholder="¿A dónde vas?"
                  icon={<span className="w-3 h-3 rounded-full border-2 border-red-500 inline-block" />}
                  countryCode={userCountryCode}
                  viewbox={userViewbox}
                />

                {/* Tipo de vehículo */}
                <div>
                 <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tipo de vehículo</p>
                 <div className="grid grid-cols-2 gap-2">
                   {vehicles.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVehicle(v.id)}
                        className={`p-2.5 rounded-xl border-2 text-left transition-all relative overflow-hidden ${selectedVehicle === v.id ? "border-green-500 bg-green-50" : "border-slate-200 hover:border-slate-300 bg-white"}`}
                      >
                        {/* Selected indicator */}
                        {selectedVehicle === v.id && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                        {/* Icon + label */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xl">{v.icon}</span>
                          <p className="text-xs font-bold text-slate-900">{v.label}</p>
                        </div>
                        {/* Price — show calculated fare or rate */}
                        {allFares[v.id] ? (
                          <p className={`text-base font-black ${selectedVehicle === v.id ? "text-green-700" : "text-slate-800"}`}>{allFares[v.id]}</p>
                        ) : (
                          <p className="text-xs text-slate-500">{v.price}</p>
                        )}
                        {/* ETA + availability */}
                        <div className="flex items-center gap-1 mt-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${(vehicleAvailability[v.id]?.count ?? 0) > 0 ? "bg-green-500" : "bg-slate-300"}`} />
                          <p className="text-xs text-slate-500">
                            {(vehicleAvailability[v.id]?.count ?? 0) > 0
                              ? `${vehicleAvailability[v.id]?.count} disp · ${vehicleAvailability[v.id]?.eta}`
                              : "No disponible"}
                          </p>
                        </div>
                      </button>
                   ))}
                 </div>
                </div>

                {/* Modo puja */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Modo Puja (proponer precio)</label>
                  <button onClick={() => setShowBidMode(!showBidMode)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${showBidMode ? "bg-green-500" : "bg-slate-300"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showBidMode ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
                {showBidMode && (
                  <input type="number" placeholder="Tu oferta en USD ($)" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                )}

               {/* Estimación */}
               {isCalculatingRoute && (
                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2">
                   <div className="w-4 h-4 rounded-full border-2 border-green-500 border-t-transparent animate-spin flex-shrink-0" />
                   <span className="text-sm text-slate-500">Calculando ruta y tarifa...</span>
                 </div>
               )}
                {/* Tarifa estimada — se muestra siempre con valores base o calculados */}
                {!isCalculatingRoute && (
                 <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl overflow-hidden">
                   <div className="px-4 py-3 flex justify-between items-center border-b border-green-200">
                     <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                         <Car size={16} className="text-green-600" />
                       </div>
                       <div>
                         <p className="text-xs text-green-700 font-medium">{vehicles.find(v => v.id === selectedVehicle)?.label}</p>
                          <p className="text-xs text-green-600">{estimatedDistance ? `${estimatedDistance} · ${estimatedTime}` : "Selecciona destino para calcular"}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       {promoApplied && <span className="text-xs text-green-600 font-medium bg-green-200 px-1.5 py-0.5 rounded-full block mb-0.5">-15% PROMO</span>}
                        <span className="text-2xl font-black text-green-800">{estimatedFare || "~$8.00"}</span>
                        {!estimatedFare && <span className="text-xs text-green-600 block">estimado base</span>}
                     </div>
                   </div>
                   <div className="px-4 py-2 space-y-1">
                     <div className="flex justify-between text-xs text-green-700">
                       <span>Tarifa base</span><span>$2.50</span>
                     </div>
                     <div className="flex justify-between text-xs text-green-700">
                        <span>Distancia {estimatedDistance ? `(${estimatedDistance})` : "(por calcular)"}</span>
                        <span>{routeDistanceKm > 0 ? `$${(routeDistanceKm * ({ economy: 1.2, comfort: 1.8, premium: 2.5, suv: 3.0 }[selectedVehicle] || 1.2)).toFixed(2)}` : "—"}</span>
                     </div>
                     {promoApplied && (
                       <div className="flex justify-between text-xs text-green-600 font-medium">
                         <span>Descuento promocional</span><span>-15%</span>
                       </div>
                     )}
                     <div className="flex justify-between text-xs font-bold text-green-800 pt-1 border-t border-green-200">
                        <span>Total estimado</span><span>{estimatedFare || "~$8.00"}</span>
                     </div>
                   </div>
                    {pickupLocation && dropoffLocation && (
                      <div className="px-4 py-2 bg-green-100/60 flex items-center gap-2">
                        <MapPin size={12} className="text-green-600 flex-shrink-0" />
                        <p className="text-xs text-green-700 truncate">{pickupLocation} → {dropoffLocation}</p>
                      </div>
                    )}
                    {!pickupLocation && (
                      <div className="px-4 py-2 bg-blue-50 flex items-center gap-2">
                        <Navigation size={12} className="text-blue-500 flex-shrink-0" />
                        <p className="text-xs text-blue-600">Ingresa origen y destino para ver el precio exacto</p>
                      </div>
                    )}
                 </div>
               )}

                {/* Lealtad */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-200">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-semibold text-purple-800">Programa de Lealtad</p>
                    <p className={`text-xs font-bold ${loyaltyLevel.color}`}>{loyaltyLevel.name}</p>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-1.5">
                    <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min((loyaltyPoints / loyaltyLevel.next) * 100, 100)}%` }} />
                  </div>
                  <p className="text-xs text-purple-600 mt-1">{loyaltyPoints} / {loyaltyLevel.next} pts</p>
                </div>
              </div>
            )}

            {/* PROGRAMAR VIAJE */}
            {tripStatus === "idle" && activePanel === "scheduled" && (
              <div className="p-4 flex flex-col gap-3">
                <h2 className="text-lg font-bold text-slate-900">Programar Viaje</h2>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                  <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Hora</label>
                  <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" /></div>
                <NominatimAutocomplete value={pickupLocation} onChange={setPickupLocation} onSelect={handlePickupSelect} placeholder="¿Dónde te recogemos?" icon={<span className="w-3 h-3 rounded-full inline-block bg-green-500" />} autoLocate />
                <NominatimAutocomplete value={dropoffLocation} onChange={setDropoffLocation} onSelect={handleDropoffSelect} placeholder="¿A dónde vas?" icon={<span className="w-3 h-3 rounded-full border-2 border-red-500 inline-block" />} countryCode={userCountryCode} viewbox={userViewbox} />
                <Button onClick={() => { if (scheduledDate && scheduledTime && pickupLocation && dropoffLocation) { handleRequestTrip(); setActivePanel("request"); } else { toast.error("Completa todos los campos"); } }}
                  className="w-full py-3 font-bold" style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}>
                  <Calendar size={15} className="mr-2" /> Programar Viaje
                </Button>
              </div>
            )}

            {/* HISTORIAL */}
            {tripStatus === "idle" && activePanel === "history" && (
              <div className="p-4 flex flex-col gap-3">
                <h2 className="text-lg font-bold text-slate-900">Historial de Viajes</h2>
                {tripHistory.length === 0 ? (
                  <div className="text-center py-10"><History size={40} className="mx-auto text-slate-300 mb-3" /><p className="text-slate-500 text-sm">No hay viajes aún</p></div>
                ) : tripHistory.map(trip => (
                  <div key={trip.id} className="border border-slate-200 rounded-xl p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div><p className="text-xs text-slate-500">{trip.date}</p><p className="text-sm font-medium text-slate-900 truncate max-w-[180px]">{trip.from} → {trip.to}</p></div>
                      <div className="text-right"><p className="font-bold text-green-600">{trip.fare}</p>
                        <div className="flex items-center gap-0.5 justify-end">{[1,2,3,4,5].map(s => <Star key={s} size={10} className={s <= trip.rating ? "text-yellow-500 fill-yellow-500" : "text-slate-300"} />)}</div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Conductor: {trip.driver}</p>
                    <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={() => { setPickupLocation(trip.from); setDropoffLocation(trip.to); setActivePanel("request"); }}>Repetir viaje</Button>
                  </div>
                ))}
              </div>
            )}

            {/* PROMOS */}
            {tripStatus === "idle" && activePanel === "promo" && (
              <div className="p-4 flex flex-col gap-3">
                <h2 className="text-lg font-bold text-slate-900">Códigos Promocionales</h2>
                <div className="flex gap-2">
                  <input type="text" placeholder="Ingresa tu código" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none uppercase" />
                  <Button onClick={handleApplyPromo} className="bg-green-500 hover:bg-green-600 text-white">Aplicar</Button>
                </div>
                {promoApplied && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <p className="text-sm text-green-800 font-medium">¡Código aplicado! 15% de descuento</p>
                  </div>
                )}
                <div className="space-y-2">
                  {[{ code: "BIENVENIDO", desc: "15% para nuevos usuarios" }, { code: "TAXI10", desc: "10% en viajes al aeropuerto" }, { code: "PROMO20", desc: "20% en tu primer viaje Premium" }].map(c => (
                    <div key={c.code} className="border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                      <div><p className="font-mono font-bold text-slate-900 text-sm">{c.code}</p><p className="text-xs text-slate-500">{c.desc}</p></div>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => setPromoCode(c.code)}>Usar</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* REFERIDOS */}
            {tripStatus === "idle" && activePanel === "referrals" && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Gift size={16} className="text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Programa de Referidos</h2>
                    <p className="text-xs text-slate-500">Invita amigos y gana recompensas</p>
                  </div>
                </div>
                <ReferralPanel
                  userId={user?.id || 0}
                  userName={user?.name || "Usuario"}
                  userRole="client"
                />
              </div>
            )}

            {/* BUSCANDO */}

                        {/* PAQUETES */}
            {tripStatus === "idle" && activePanel === "parcels" && !showParcelTracking && (
              <div className="p-4 flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Briefcase size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Envío de Paquetes</h2>
                    <p className="text-xs text-slate-500">Entrega rápida y segura en minutos</p>
                  </div>
                </div>
                
                {parcelOrders.length === 0 ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                    <p className="text-sm text-blue-800 font-medium">📦 No hay paquetes activos</p>
                    <p className="text-xs text-blue-600 mt-1">Crea un nuevo envío desde el formulario en el Hero</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {parcelOrders.map(order => (
                      <Card key={order.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedParcel(order); setShowParcelTracking(true); }}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900">Código: {order.trackingCode}</p>
                            <p className="text-xs text-slate-500 truncate">{order.pickupAddress}</p>
                            <p className="text-xs text-slate-500 truncate">→ {order.dropoffAddress}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                              order.status === "accepted" ? "bg-blue-100 text-blue-800" :
                              order.status === "in_transit" ? "bg-orange-100 text-orange-800" :
                              order.status === "delivered" ? "bg-green-100 text-green-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {order.status === "pending" ? "⏳" :
                               order.status === "accepted" ? "🚗" :
                               order.status === "in_transit" ? "📦" :
                               order.status === "delivered" ? "✅" : "❌"}
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PARCEL TRACKING */}
            {tripStatus === "idle" && activePanel === "parcels" && showParcelTracking && selectedParcel && (
              <div className="p-4 flex flex-col gap-4">
                <button
                  onClick={() => setShowParcelTracking(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 mb-2 flex items-center gap-1"
                >
                  ← Volver
                </button>
                <ParcelTracking
                  order={selectedParcel}
                  onClose={() => setShowParcelTracking(false)}
                />
              </div>
            )}
            {/* BUSCANDO */}

            {/* PAQUETES - HISTORIAL */}
            {tripStatus === "idle" && activePanel === "parcels" && (
              <div className="p-4 flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Briefcase size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Historial de Paquetes</h2>
                    <p className="text-xs text-slate-500">Tus entregas recientes</p>
                  </div>
                </div>
                <ParcelHistory />
              </div>
            )}
            {tripStatus === "searching" && (
              <div className="p-5 flex flex-col items-center gap-4 justify-center h-full">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                  <Car size={36} className="text-green-600 animate-bounce" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Buscando conductor...</h3>
                <div className="bg-slate-50 rounded-xl p-4 w-full text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-slate-500">Recogida</span><span className="font-medium text-slate-900 text-right max-w-[60%] truncate">{currentTrip?.pickup}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Destino</span><span className="font-medium text-slate-900 text-right max-w-[60%] truncate">{currentTrip?.dropoff}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Tarifa</span><span className="font-bold text-green-600">{currentTrip?.fare}</span></div>
                </div>
                <Button variant="outline" onClick={handleCancelTrip} className="w-full text-red-500 border-red-200 hover:bg-red-50"><X size={16} className="mr-2" /> Cancelar</Button>
              </div>
            )}

            {/* CONDUCTOR ACEPTÓ */}
            {(tripStatus === "accepted" || tripStatus === "in_progress") && currentTrip?.driver && (
              <div className="p-4 flex flex-col gap-3">
                <div className={`flex items-center gap-2 rounded-xl p-3 ${tripStatus === "accepted" ? "bg-green-50 border border-green-200" : "bg-blue-50 border border-blue-200"}`}>
                  <CheckCircle size={18} className={tripStatus === "accepted" ? "text-green-600" : "text-blue-600"} />
                  <p className={`text-sm font-semibold ${tripStatus === "accepted" ? "text-green-800" : "text-blue-800"}`}>
                    {tripStatus === "accepted" ? "¡Conductor en camino!" : "Viaje en progreso"}
                  </p>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-4 bg-slate-50 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold">{currentTrip.driver.name[0]}</div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{currentTrip.driver.name}</p>
                      <p className="text-sm text-slate-500">{currentTrip.driver.vehicle}</p>
                      <p className="text-xs font-mono text-slate-400">Placa: {currentTrip.driver.plate}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full">
                      <Star size={13} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-bold text-yellow-700">{currentTrip.driver.rating}</span>
                    </div>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-3 border-t border-slate-200">
                    <div className="flex items-center gap-2"><Clock size={15} className="text-slate-400" /><div><p className="text-xs text-slate-500">ETA en tiempo real</p><p className="font-bold text-slate-900 text-sm">{driverEta || currentTrip.estimatedTime}</p></div></div>
                    {driverDistance && (
                    <div className="flex items-center gap-2"><Navigation size={15} className="text-blue-400" /><div><p className="text-xs text-slate-500">Distancia</p><p className="font-bold text-blue-600 text-sm">{driverDistance}</p></div></div>
                    )}
                    {!driverDistance && (
                    <div className="flex items-center gap-2"><DollarSign size={15} className="text-slate-400" /><div><p className="text-xs text-slate-500">Tarifa</p><p className="font-bold text-green-600 text-sm">{currentTrip.fare}</p></div></div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleMessageDriver} className="bg-green-600 hover:bg-green-700 text-white gap-2 text-sm"><MessageCircle size={15} /> Chat Seguro</Button>
                  <Button onClick={handleSOS} variant="outline" className="gap-2 text-sm text-red-500 border-red-200"><AlertTriangle size={15} /> SOS</Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" onClick={handleShareTrip} className="gap-1 text-xs"><Share2 size={12} /> Compartir</Button>
                  <Button variant="outline" size="sm" onClick={handleSOS} className="gap-1 text-xs text-red-500 border-red-200"><AlertTriangle size={12} /> SOS</Button>
                  <Button variant="outline" size="sm" onClick={handleCancelTrip} className="gap-1 text-xs text-slate-500"><X size={12} /> Cancelar</Button>
                </div>
                {tripStatus === "in_progress" && (
                  <Button onClick={() => setTripStatus("rating")} className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    <CheckCircle size={16} /> Finalizar Viaje
                  </Button>
                )}
              </div>
            )}

            {/* CALIFICACIÓN */}
            {tripStatus === "rating" && (
              <div className="p-5 flex flex-col gap-4">
                <h2 className="text-xl font-bold text-slate-900">Califica tu viaje</h2>
                <p className="text-sm text-slate-500">¿Cómo fue tu experiencia con {currentTrip?.driver?.name}?</p>
                <div className="flex justify-center gap-3 py-2">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setDriverRating(s)}>
                      <Star size={38} className={`transition-all ${s <= driverRating ? "text-yellow-500 fill-yellow-500 scale-110" : "text-slate-300 hover:text-yellow-400"}`} />
                    </button>
                  ))}
                </div>
                <textarea placeholder="Comentario opcional..." value={driverComment} onChange={(e) => setDriverComment(e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none" />
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                  <p className="text-sm text-purple-800 font-medium">+50 puntos de lealtad al calificar</p>
                </div>
                <Button onClick={handleSubmitRating} disabled={driverRating === 0} className="w-full py-3 font-bold"
                  style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}>Enviar Calificación</Button>
                <Button variant="outline" onClick={() => { setTripStatus("idle"); setCurrentTrip(null); }} className="w-full text-slate-500">Omitir</Button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Botón fijo en la parte inferior — solo visible en móvil cuando el panel de solicitud está activo */}
      {tripStatus === "idle" && activePanel === "request" && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 p-4 shadow-2xl">
          <Button onClick={handleRequestTrip} className="w-full py-4 font-bold text-base rounded-xl shadow-lg"
            style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}>
            {showBidMode ? "Enviar Oferta" : "🚕 Solicitar Viaje"} <ChevronRight size={18} className="ml-1" />
          </Button>
        </div>
      )}
      <SafetyTipsButton audience="clients" />
    </div>
  );
}
import SafetyTipsButton from "@/components/SafetyTipsButton";
