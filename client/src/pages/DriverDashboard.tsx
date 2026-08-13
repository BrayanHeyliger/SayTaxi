import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MapPin, Phone, Star, DollarSign, LogOut, CheckCircle, XCircle, Bell, Car,
  Navigation, AlertTriangle, MessageCircle, Shield, TrendingUp, Clock, FileText, Gift, Camera, Moon, Sun
} from "lucide-react";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { useNotificationHistory } from "@/hooks/useNotificationHistory";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import LeafletMap from "@/components/LeafletMap";
import ReferralPanel from "@/components/ReferralPanel";

import { TripChat } from "@/components/TripChat";
import SafetyTipsButton from "@/components/SafetyTipsButton";
import { DriverParcelPanel } from "@/components/DriverParcelPanel";
import GlobalMascotAssistant from "@/components/GlobalMascotAssistant";
const TRIPS_KEY = "wt_pending_trips";
const DRIVER_HISTORY_KEY = "wt_driver_history";
const LIVE_TRIP_KEY = "wt_live_trip_state";

interface PendingTrip {
  id: string; clientId: number; clientName: string;
  pickup: string; dropoff: string; fare: string;
  status: string; requestedAt: string; driver?: any;
  estimatedTime?: string; isBid?: boolean;
}

interface EarningsEntry { date: string; trips: number; earnings: number; }

export default function DriverDashboard() {
  const { user, isAuthenticated, updateUser, logout } = useLocalAuth();
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();
  const { permission: notifPermission, requestPermission, sendNotification } = usePushNotifications();
  const { notifications: persistedNotifs, unreadCount, addNotification: addPersistedNotif, markAllRead, clearAll: clearAllNotifs } = useNotificationHistory(user?.role || "driver");
  const [showNotifications, setShowNotifications] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [pendingTrips, setPendingTrips] = useState<PendingTrip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<PendingTrip | null>(null);
  const [tripPhase, setTripPhase] = useState<"idle" | "accepted" | "arrived" | "on_board" | "in_progress" | "completed" | "rating">("idle");
  const [newTripAlert, setNewTripAlert] = useState(false);
  const [earnings, setEarnings] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [passengerRating, setPassengerRating] = useState(0);
  const [activeTab, setActiveTab] = useState<"trips" | "earnings" | "referrals" | "profile" | "docs" | "parcels">("trips");
  const [liveTripState, setLiveTripState] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<any>(null);
  const [earningsHistory] = useState<EarningsEntry[]>([
    { date: "Hoy", trips: completedCount, earnings },
    { date: "Ayer", trips: 8, earnings: 145.50 },
    { date: "Lun", trips: 12, earnings: 210.00 },
    { date: "Dom", trips: 6, earnings: 98.00 },
    { date: "Sáb", trips: 15, earnings: 287.50 },
  ]);
  const [etaTickSeconds, setEtaTickSeconds] = useState(0);
  const [statusPulseOn, setStatusPulseOn] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!isAuthenticated) navigate("/login"); }, [isAuthenticated]);

  useEffect(() => {
    const syncLiveTrip = () => {
      try {
        const raw = localStorage.getItem(LIVE_TRIP_KEY);
        setLiveTripState(raw ? JSON.parse(raw) : null);
      } catch {
        setLiveTripState(null);
      }
    };

    syncLiveTrip();
    const restoreActiveTrip = () => {
      try {
        const trips: PendingTrip[] = JSON.parse(localStorage.getItem(TRIPS_KEY) || "[]");
        const activeTrip = trips.find((trip) => trip.status === "accepted" || trip.status === "in_progress");
        if (activeTrip) {
          setCurrentTrip(activeTrip);
          setTripPhase(activeTrip.status === "in_progress" ? "in_progress" : "accepted");
        }
      } catch {}
    };

    restoreActiveTrip();
    window.addEventListener("storage", syncLiveTrip);
    const interval = window.setInterval(syncLiveTrip, 2000);
    return () => {
      window.removeEventListener("storage", syncLiveTrip);
      window.clearInterval(interval);
    };
  }, []);

  const checkTrips = useCallback(() => {
    if (!isOnline || tripPhase !== "idle") return;
    const trips: PendingTrip[] = JSON.parse(localStorage.getItem(TRIPS_KEY) || "[]");
    const available = trips.filter(t => t.status === "requested");
    if (available.length > pendingTrips.length) {
      const newest = available[available.length - 1];
      setNewTripAlert(true);
      setTimeout(() => setNewTripAlert(false), 4000);
      // Persistir notificación + sonido
      addPersistedNotif(`🚕 Nuevo viaje: ${newest?.pickup} → ${newest?.dropoff} · ${newest?.fare}`, {
        type: "success", sound: "new_trip", url: "/driver-dashboard",
      });
      // Push al sistema operativo
      sendNotification("🚕 ¡Nuevo viaje disponible!", {
        body: `${newest?.pickup} → ${newest?.dropoff}`,
        url: "/driver-dashboard",
        tag: "new-trip",
      });
    }
    setPendingTrips(available);
  }, [isOnline, tripPhase, pendingTrips.length, sendNotification, addPersistedNotif]);

  useEffect(() => {
    const interval = setInterval(checkTrips, 2000);
    return () => clearInterval(interval);
  }, [checkTrips]);

  useEffect(() => {
    if (!mapRef.current || !currentTrip || !currentLocation) return;
    if (tripPhase !== "accepted" && tripPhase !== "in_progress") return;
    const destinationLabel = tripPhase === "accepted" ? currentTrip.pickup : currentTrip.dropoff;
    let cancelled = false;

    const drawLiveRoute = async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationLabel)}&limit=1`);
        const data = await res.json();
        if (cancelled || !data?.[0]) return;
        mapRef.current.setRouteBetween(
          { lat: currentLocation.lat, lng: currentLocation.lng, label: "Mi posición" },
          { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: destinationLabel },
          { vehicleEmoji: "🚕", vehicleLabel: user?.name || "Conductor", animate: true }
        );
      } catch {}
    };

    drawLiveRoute();
    return () => { cancelled = true; };
  }, [currentTrip, currentLocation, tripPhase, user?.name]);

  useEffect(() => {
    if (!currentTrip || (tripPhase !== "accepted" && tripPhase !== "in_progress")) {
      setEtaTickSeconds(0);
      setStatusPulseOn(false);
      return;
    }
    const timer = window.setInterval(() => {
      setEtaTickSeconds((prev) => prev + 1);
      setStatusPulseOn((prev) => !prev);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [currentTrip, tripPhase]);

  const handleAcceptTrip = (trip: PendingTrip) => {
    const trips: PendingTrip[] = JSON.parse(localStorage.getItem(TRIPS_KEY) || "[]");
    const updated = trips.map(t => t.id === trip.id ? {
      ...t, status: "accepted",
      driver: { id: user?.id, name: user?.name, phone: user?.phone || "+15550000", vehicle: "Mi Vehículo", plate: "XXX-000", rating: 4.8 },
      estimatedTime: "5 min",
    } : t);
    localStorage.setItem(TRIPS_KEY, JSON.stringify(updated));
    setCurrentTrip({ ...trip, status: "accepted", estimatedTime: "5 min" });
    setTripPhase("accepted");
    setPendingTrips([]);
    localStorage.setItem(LIVE_TRIP_KEY, JSON.stringify({
      tripId: trip.id,
      phase: "accepted",
      pickup: { label: trip.pickup },
      dropoff: { label: trip.dropoff },
      driverName: user?.name || "Conductor",
      updatedAt: Date.now(),
    }));
    toast.success("¡Viaje aceptado!");
    addPersistedNotif(`✅ Viaje aceptado: ${trip.pickup} → ${trip.dropoff} · ${trip.fare}`, {
      type: "success", sound: "accepted", url: "/driver-dashboard",
    });
    sendNotification("✅ Viaje aceptado", { body: `${trip.pickup} → ${trip.dropoff} · ${trip.fare}`, url: "/driver-dashboard", tag: "trip-accepted" });
  };

  const handleArrived = () => {
    setTripPhase("arrived");
    toast.success("¡Llegaste al pasajero!");
  };

  const handlePassengerOnBoard = () => {
    setTripPhase("on_board");
    toast.success("Pasajero a bordo. ¡Listo para iniciar!");
  };

  const handleStartTrip = () => {
    setTripPhase("in_progress");
    toast.success("¡Viaje iniciado!");
    if (currentTrip) {
      const trips: PendingTrip[] = JSON.parse(localStorage.getItem(TRIPS_KEY) || "[]");
      const updated = trips.map(t => t.id === currentTrip.id ? { ...t, status: "in_progress" } : t);
      localStorage.setItem(TRIPS_KEY, JSON.stringify(updated));
      localStorage.setItem(LIVE_TRIP_KEY, JSON.stringify({
        tripId: currentTrip.id,
        phase: "in_progress",
        pickup: { label: currentTrip.pickup },
        dropoff: { label: currentTrip.dropoff },
        driverName: user?.name || "Conductor",
        updatedAt: Date.now(),
      }));
    }
  };

  const handleCompleteTrip = () => {
    localStorage.removeItem(LIVE_TRIP_KEY);
    if (currentTrip) {
      const trips: PendingTrip[] = JSON.parse(localStorage.getItem(TRIPS_KEY) || "[]");
      const updated = trips.map((trip) => trip.id === currentTrip.id ? { ...trip, status: "completed" } : trip);
      localStorage.setItem(TRIPS_KEY, JSON.stringify(updated));
    }
    setTripPhase("rating");
  };

  const handleSubmitRating = () => {
    if (!currentTrip) return;
    const trips: PendingTrip[] = JSON.parse(localStorage.getItem(TRIPS_KEY) || "[]");
    const updated = trips.filter(t => t.id !== currentTrip.id);
    localStorage.setItem(TRIPS_KEY, JSON.stringify(updated));
    const fareNum = parseFloat(currentTrip.fare.replace("$", "")) || 0;
    setEarnings(prev => prev + fareNum);
    setCompletedCount(prev => prev + 1);
    setTripPhase("idle");
    setCurrentTrip(null);
    setPassengerRating(0);
    localStorage.removeItem(LIVE_TRIP_KEY);
    toast.success(`¡Viaje completado! +${currentTrip.fare} ganados`);
  };

  const handleRejectTrip = (tripId: string) => {
    setPendingTrips(prev => prev.filter(t => t.id !== tripId));
  };

  const handleCallPassenger = () => {
    // El número del pasajero es privado — usar el chat interno
    toast.info("💬 Usa el chat seguro para contactar al pasajero");
    document.getElementById("driver-chat-anchor")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleMessagePassenger = () => {
    setChatOpen(true);
    toast.info("💬 Chat seguro abierto");
  };

  const handleSOS = () => {
    const msg = `🚨 SOS CONDUCTOR: ${user?.name} | Viaje activo | Pasajero: ${currentTrip?.clientName}`;
    navigator.clipboard.writeText(msg).catch(() => {});
    toast.error("🚨 Alerta SOS enviada a la central");
  };

  const handleNavigate = (destination: string) => {
    if (!destination) { toast.error("No hay destino activo"); return; }
    const encoded = encodeURIComponent(destination);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    // Use OpenStreetMap/OsmAnd for navigation (no Google dependency)
    if (isIOS) {
      window.open(`https://maps.apple.com/?daddr=${encoded}&dirflg=d`, "_blank");
    } else if (isAndroid) {
      // Try OsmAnd first, fallback to OSM web
      window.location.href = `osmand.navigation:q=${encoded}`;
      setTimeout(() => {
        window.open(`https://www.openstreetmap.org/search?query=${encoded}`, "_blank");
      }, 500);
    } else {
      window.open(`https://www.openstreetmap.org/search?query=${encoded}`, "_blank");
    }
    toast.success(`Abriendo navegación hacia: ${destination}`);
  };

  const driverMascotMood =
    tripPhase === "accepted"
      ? "ready"
      : tripPhase === "arrived" || tripPhase === "on_board"
      ? "happy"
      : tripPhase === "in_progress"
      ? "happy"
      : pendingTrips.length > 0
      ? "searching"
      : "idle";

  const driverMascotMessages =
    tripPhase === "accepted"
      ? [
          "Excelente, ya aceptaste este viaje.",
          "Recuerda confirmar llegada con el pasajero.",
          "Mantente atento al punto de recogida.",
        ]
      : tripPhase === "arrived"
      ? [
          "Llegaste al punto de recogida.",
          "Confirma la identidad del pasajero antes de continuar.",
          "Todo listo para subir al pasajero.",
        ]
      : tripPhase === "on_board"
      ? [
          "Pasajero a bordo.",
          "Asegurate de que todos esten listos antes de iniciar.",
          "¡Arranquemos el viaje!",
        ]
      : tripPhase === "in_progress"
      ? [
          "Viaje en curso, mantengamos una experiencia premium.",
          "Conduccion suave y comunicacion clara.",
          "Te acompano hasta completar este viaje.",
        ]
      : pendingTrips.length > 0
      ? [
          `Tienes ${pendingTrips.length} viaje(s) esperando respuesta.`,
          "Revisa origen, destino y tarifa antes de aceptar.",
          "Responder rapido mejora tu tasa de conversion.",
        ]
      : isOnline
      ? [
          "Estas en linea. Te aviso cuando entre un viaje.",
          "Todo listo para recibir nuevas solicitudes.",
          "Un buen dia para ganar con Passenger.",
        ]
      : [
          "Activa modo en linea para empezar a recibir viajes.",
          "Estoy aqui para ayudarte en tu jornada.",
          "Cuando quieras, arrancamos.",
        ];

  const phaseLabel =
    tripPhase === "accepted"
      ? "En ruta a recogida"
      : tripPhase === "arrived"
      ? "Llegaste al pasajero"
      : tripPhase === "on_board"
      ? "Pasajero a bordo"
      : tripPhase === "in_progress"
      ? "Viaje en curso"
      : tripPhase === "rating"
      ? "Calificacion"
      : "Disponible";

  const rawEta = Number((currentTrip?.estimatedTime || "5").match(/\d+/)?.[0] || 5);
  const liveEtaMinutes = Math.max(1, rawEta - Math.floor(etaTickSeconds / 75));
  const liveEtaLabel = `${liveEtaMinutes} min`;
  const hasActiveTrip = Boolean(
    currentTrip &&
    (tripPhase === "accepted" || tripPhase === "arrived" || tripPhase === "on_board" || tripPhase === "in_progress")
  );
  const showFloatingHelpers = !chatOpen && !hasActiveTrip;

  const handleProfilePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen válida");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 2 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const nextPhotoUrl = typeof reader.result === "string" ? reader.result : "";
      if (!nextPhotoUrl) return;
      updateUser({ photoUrl: nextPhotoUrl });
      toast.success("Foto de perfil actualizada");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  if (!isAuthenticated) return null;

  return (
    <div className="wt-panel h-screen overflow-hidden flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-emerald-500/15 dark:bg-[#0f172a]/80">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => profilePhotoInputRef.current?.click()}
                className="relative h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-[#0f172a] text-white flex items-center justify-center font-bold shadow-sm ring-2 ring-white/60 dark:ring-emerald-500/40"
                title="Cambiar foto de perfil"
              >
                {user?.photoUrl ? (
                  <img src={user.photoUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                ) : (
                  <span>{user?.name?.[0] || "D"}</span>
                )}
                <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#0f172a] ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
              </button>
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfilePhotoChange}
              />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">{user?.name}</p>
                <p className="text-xs font-normal text-slate-500 dark:text-slate-400">Panel de Conductor</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hidden sm:block dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {isOnline ? "En línea" : "Offline"}
              </div>
              {toggleTheme && (
                <button onClick={toggleTheme} title={theme === "dark" ? "Modo claro" : "Modo oscuro"} className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-100/80 text-slate-700 transition hover:bg-slate-200/80 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              )}
              <div className="relative">
                <button onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllRead(); }} className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-100/80 text-slate-600 transition hover:bg-slate-200/80 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
                  <Bell size={16} />
                  {unreadCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 dark:bg-[#0f172a] dark:border-white/10">
                    <div className="p-3 border-b border-slate-200 flex justify-between items-center dark:border-white/10">
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm dark:text-slate-100">Notificaciones</h3>
                        <p className="text-xs text-slate-400">Últimas 24 horas</p>
                      </div>
                      <button onClick={clearAllNotifs} className="text-xs text-slate-500 hover:text-red-500 transition-colors dark:text-slate-400">Limpiar</button>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {persistedNotifs.length === 0
                        ? <div className="p-6 text-center"><Bell size={28} className="mx-auto text-slate-200 mb-2 dark:text-slate-700" /><p className="text-sm text-slate-400">Sin notificaciones</p></div>
                        : persistedNotifs.map(n => (
                          <div key={n.id} className={`p-3 border-b border-slate-100 flex gap-3 items-start dark:border-white/5 ${!n.read ? "bg-blue-50/60 dark:bg-blue-500/10" : ""}`}>
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.type === "success" ? "bg-green-500" : n.type === "warning" ? "bg-yellow-500" : n.type === "error" ? "bg-red-500" : "bg-blue-500"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-800 leading-snug dark:text-slate-200">{n.message}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{new Date(n.timestamp).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                          </div>
                        ))
                      }
                    </div>
                    <div className="p-2 border-t border-slate-100 text-center dark:border-white/5">
                      <p className="text-xs text-slate-400">Se reinicia automáticamente cada 24 h</p>
                    </div>
                  </div>
                )}
              </div>
              {notifPermission !== "granted" && (
                <button onClick={requestPermission} title="Activar notificaciones push" className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400">
                  <Bell size={14} />
                </button>
              )}
              <Button variant="outline" size="sm" onClick={() => { logout(); navigate("/"); }} className="gap-1.5 text-xs rounded-full dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
                <LogOut size={13} />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center">
            <div className="flex-1 text-center">
              <p className={`text-sm font-semibold ${isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"}`}>{isOnline ? "En línea" : "Desconectado"}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Estado</p>
            </div>
            <div className="flex-1 text-center border-l border-slate-200/80 dark:border-white/10">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{completedCount}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Viajes hoy</p>
            </div>
            <div className="flex-1 text-center border-l border-slate-200/80 dark:border-white/10">
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">${earnings.toFixed(2)}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Ganancias</p>
            </div>
          </div>

          {newTripAlert && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 animate-pulse">
              <Bell size={12} /> ¡Nuevo viaje disponible!
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white/70 border-b border-slate-200/70 backdrop-blur-xl dark:bg-[#0f172a]/70 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto scrollbar-thin">
          {[
            { id: "trips" as const, label: "Viajes", icon: Car },
            { id: "earnings" as const, label: "Ganancias", icon: DollarSign },
            { id: "parcels" as const, label: "Paquetes", icon: FileText },
            { id: "referrals" as const, label: "Referidos", icon: Gift },
            { id: "profile" as const, label: "Perfil", icon: Shield },
            { id: "docs" as const, label: "Documentos", icon: FileText },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}>
              <tab.icon size={15} /> <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto max-w-7xl mx-auto px-4 py-8 w-full pb-6 sm:px-6">

        {/* TAB: REFERIDOS */}
        {/* Broadcast Announcements */}
        <div className="mb-4">
          <AnnouncementBanner target="drivers" />
        </div>

        {/* TAB: REFERIDOS */}
        {activeTab === "referrals" && (
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Gift size={20} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Programa de Referidos</h2>
                <p className="text-sm text-slate-500">Recluta conductores y gana bonos en efectivo</p>
              </div>
            </div>
            <ReferralPanel
              userId={user?.id || 0}
              userName={user?.name || "Conductor"}
              userRole="driver"
            />
          </div>
        )}

        {/* TAB: VIAJES */}
        {activeTab === "trips" && (
          <div className="space-y-4">
            <Card className="rounded-2xl border-slate-200 bg-slate-950/85! p-4 text-white shadow-sm backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Modo conductor</p>
                  <h2 className="mt-1 text-lg font-bold">{isOnline ? "En linea - recibiendo viajes" : "Desconectado"}</h2>
                  <p className="text-xs text-white/65">{isOnline ? "ETA promedio 4-6 min" : "Activa tu estado para empezar a ganar"}</p>
                </div>
                <button
                  onClick={() => setIsOnline(!isOnline)}
                  className={`relative h-7 w-14 rounded-full transition-colors ${isOnline ? "bg-emerald-500" : "bg-slate-500"}`}
                >
                  <div className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform dark:bg-white ${isOnline ? "translate-x-8" : "translate-x-1"}`} />
                </button>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
              <div className="space-y-4 lg:col-span-2">
                <Card className="overflow-hidden border-slate-200 p-0 relative z-0">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-900">Mapa en vivo</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isOnline ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {isOnline ? "● En linea" : "○ Offline"}
                    </span>
                  </div>
                  <div className="relative z-0 w-full" style={{ height: "min(52vh, 420px)" }}>
                    <LeafletMap
                      height="100%"
                      className="absolute inset-0 z-0 h-full w-full"
                      onMapReady={(ref) => {
                        mapRef.current = ref;
                        navigator.geolocation?.getCurrentPosition(async (pos) => {
                          const { latitude: lat, longitude: lng } = pos.coords;
                          setCurrentLocation({ lat, lng });
                          ref.setPickup(lat, lng, "Mi posición");
                        });
                      }}
                    />
                  </div>
                  {currentTrip && (tripPhase === "accepted" || tripPhase === "arrived" || tripPhase === "on_board" || tripPhase === "in_progress") && (
                    <div className="border-t border-blue-100 bg-blue-50 px-4 py-3">
                      <p className="text-xs font-medium text-blue-700">Ruta activa: {currentTrip.pickup} → {currentTrip.dropoff}</p>
                    </div>
                  )}
                </Card>

                {currentTrip && tripPhase !== "idle" ? (
                  <Card className="rounded-2xl p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Estado</p>
                        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{phaseLabel}</h2>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600">ETA</p>
                        <p className="text-sm font-bold text-emerald-700">{liveEtaLabel}</p>
                      </div>
                    </div>

                    {tripPhase !== "rating" && (
                      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{currentTrip.clientName}</p>
                            <p className="text-xs text-slate-500">{tripPhase === "accepted" ? "Pickup" : "Destino"}</p>
                          </div>
                          <p className="text-xl font-bold text-emerald-600">{currentTrip.fare}</p>
                        </div>
                        <div className="space-y-1.5 text-sm">
                          <p className="truncate text-slate-700"><MapPin size={13} className="mr-1 inline text-emerald-500" />{currentTrip.pickup}</p>
                          <p className="truncate text-slate-700"><MapPin size={13} className="mr-1 inline text-red-500" />{currentTrip.dropoff}</p>
                        </div>
                      </div>
                    )}

                    {tripPhase === "arrived" && (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                          <CheckCircle size={28} className="mx-auto mb-1 text-emerald-600" />
                          <p className="text-sm font-semibold text-emerald-800">Llegaste al pasajero</p>
                          <p className="text-xs text-emerald-600">Confirma su identidad antes de continuar</p>
                        </div>
                        <Button onClick={handlePassengerOnBoard} className="h-12 w-full rounded-xl bg-emerald-500 font-semibold text-white hover:bg-emerald-600">
                          <CheckCircle size={16} className="mr-2" /> Pasajero a bordo
                        </Button>
                      </div>
                    )}

                    {tripPhase === "on_board" && (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
                          <Car size={28} className="mx-auto mb-1 text-blue-600" />
                          <p className="text-sm font-semibold text-blue-800">Pasajero a bordo</p>
                          <p className="text-xs text-blue-600">Listo para comenzar el viaje</p>
                        </div>
                        <Button onClick={handleStartTrip} className="h-12 w-full rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700">
                          <Navigation size={16} className="mr-2" /> Iniciar viaje
                        </Button>
                      </div>
                    )}

                    {tripPhase === "rating" && (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total del viaje</p>
                          <p className="mt-1 text-3xl font-bold text-emerald-600">{currentTrip.fare}</p>
                          <div className="mt-3 space-y-1.5 text-sm">
                            <p className="truncate text-slate-700"><MapPin size={13} className="mr-1 inline text-emerald-500" />{currentTrip.pickup}</p>
                            <p className="truncate text-slate-700"><MapPin size={13} className="mr-1 inline text-red-500" />{currentTrip.dropoff}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600">¿Cómo fue el pasajero {currentTrip.clientName}?</p>
                        <div className="flex justify-center gap-3 py-2">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button key={s} onClick={() => setPassengerRating(s)}>
                              <Star size={36} className={`transition-all ${s <= passengerRating ? "scale-110 fill-yellow-500 text-yellow-500" : "text-slate-300 hover:text-yellow-400"}`} />
                            </button>
                          ))}
                        </div>
                        <Button onClick={handleSubmitRating} className="h-12 w-full rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700">
                          <DollarSign size={16} className="mr-2" /> Finalizar y cobrar
                        </Button>
                      </div>
                    )}

                    {tripPhase === "accepted" && (
                      <div className="space-y-3">
                        <Button onClick={() => handleNavigate(currentTrip.pickup)} className="h-12 w-full rounded-xl bg-emerald-500 font-semibold text-white hover:bg-emerald-600">
                          <Navigation size={16} className="mr-2" /> Ir a recoger
                        </Button>
                        <div className="grid grid-cols-3 gap-2 md:grid-cols-3">
                          <Button variant="outline" size="sm" onClick={handleCallPassenger} className="gap-1 text-xs"><Phone size={12} /> Llamar</Button>
                          <Button variant="outline" size="sm" onClick={handleMessagePassenger} className="gap-1 text-xs"><MessageCircle size={12} /> Chat</Button>
                          <Button variant="outline" size="sm" onClick={handleArrived} className="gap-1 text-xs text-blue-600 border-blue-200"><CheckCircle size={12} /> Llegue</Button>
                        </div>
                        <Button variant="outline" onClick={handleSOS} className="w-full border-red-200 text-red-500"><AlertTriangle size={14} className="mr-2" /> SOS</Button>
                      </div>
                    )}

                    {tripPhase === "in_progress" && (
                      <div className="space-y-3">
                        <Button onClick={() => handleNavigate(currentTrip.dropoff)} className="h-12 w-full rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700">
                          <Navigation size={16} className="mr-2" /> Navegar a destino
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" onClick={handleMessagePassenger} className="gap-1 text-xs"><MessageCircle size={12} /> Chat</Button>
                          <Button variant="outline" size="sm" onClick={handleSOS} className="gap-1 text-xs border-red-200 text-red-500"><AlertTriangle size={12} /> SOS</Button>
                        </div>
                        <Button onClick={handleCompleteTrip} className="h-12 w-full rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700">
                          <CheckCircle size={16} className="mr-2" /> Finalizar viaje
                        </Button>
                      </div>
                    )}
                  </Card>
                ) : (
                  <Card className="rounded-2xl p-5">
                    <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                      Viajes disponibles {pendingTrips.length > 0 && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-sm text-emerald-700">{pendingTrips.length}</span>}
                    </h2>
                    {!isOnline ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 py-8 text-center">
                        <Car size={40} className="mx-auto mb-3 text-slate-300" />
                        <p className="font-medium text-slate-600">Activa modo en linea para recibir viajes</p>
                        <Button onClick={() => setIsOnline(true)} className="mt-4 bg-emerald-500 text-white hover:bg-emerald-600">Conectar ahora</Button>
                      </div>
                    ) : pendingTrips.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 py-8 text-center">
                        <Bell size={40} className="mx-auto mb-3 text-slate-300" />
                        <p className="font-medium text-slate-600">Esperando solicitudes</p>
                        <p className="mt-1 text-sm text-slate-500">Te notificaremos cuando entre un viaje</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingTrips.map((trip) => (
                          <div key={trip.id} className="rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-md">
                            <div className="mb-3 flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-slate-900">{trip.clientName}</p>
                                <p className="text-xs text-slate-500">{new Date(trip.requestedAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</p>
                              </div>
                              <p className="text-xl font-bold text-emerald-600">{trip.fare}</p>
                            </div>
                            <div className="mb-4 space-y-1.5 text-sm">
                              <p className="text-slate-600"><MapPin size={13} className="mr-1 inline text-emerald-500" />{trip.pickup}</p>
                              <p className="text-slate-600"><MapPin size={13} className="mr-1 inline text-red-500" />{trip.dropoff}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleRejectTrip(trip.id)} className="border-red-200 text-red-500">Rechazar</Button>
                              <Button size="sm" onClick={() => handleAcceptTrip(trip)} className="bg-emerald-500 text-white hover:bg-emerald-600">Aceptar</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )}
              </div>

              <div className="space-y-4 lg:sticky lg:top-4 self-start">
                <Card className="relative overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-4 dark:border-emerald-400/25 dark:from-[oklch(0.18_0.05_165)] dark:to-[oklch(0.13_0.035_170)] dark:shadow-[0_16px_40px_-20px_rgba(16,185,129,0.45)]">
                  <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,oklch(0.76_0.18_148/0.28),transparent_66%)] blur-2xl dark:bg-[radial-gradient(circle,oklch(0.76_0.18_148/0.32),transparent_66%)]" />
                  <h3 className="mb-2 font-semibold text-emerald-900 dark:text-emerald-300">Ganancias de hoy</h3>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.75)]">${earnings.toFixed(2)}</p>
                  <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300/80">{completedCount} viajes completados</p>
                </Card>
                <Card className="p-4">
                  <h3 className="mb-3 font-semibold text-slate-900">Mi perfil</h3>
                  <div className="space-y-2 text-sm">
                    <div><p className="text-slate-500">Nombre</p><p className="font-medium text-slate-900">{user?.name}</p></div>
                    <div><p className="text-slate-500">Email</p><p className="text-xs font-medium text-slate-900">{user?.email}</p></div>
                    <div className="flex items-center gap-2 pt-1"><Star size={16} className="fill-yellow-500 text-yellow-500" /><div><p className="text-xs text-slate-500">Calificacion</p><p className="font-medium">5.0 / 5.0</p></div></div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* TAB: GANANCIAS */}
        {activeTab === "earnings" && (
          <div className="space-y-6">
            <h1 className="text-[1.35rem] font-semibold tracking-tight text-slate-900 dark:text-slate-100">Mis Ganancias</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 dark:border-emerald-400/20 dark:bg-[oklch(0.18_0.05_165)] dark:shadow-[0_16px_40px_-20px_rgba(16,185,129,0.4)]"><p className="text-sm text-slate-500 dark:text-emerald-300/70">Hoy</p><p className="text-3xl font-bold text-green-600 dark:text-emerald-300">${earnings.toFixed(2)}</p><p className="text-sm text-slate-500 dark:text-slate-400">{completedCount} viajes</p></Card>
              <Card className="p-5"><p className="text-sm text-slate-500 dark:text-slate-400">Esta Semana</p><p className="text-3xl font-bold text-slate-900 dark:text-slate-100">$741.00</p><p className="text-sm text-slate-500 dark:text-slate-400">41 viajes</p></Card>
              <Card className="p-5"><p className="text-sm text-slate-500 dark:text-slate-400">Este Mes</p><p className="text-3xl font-bold text-slate-900 dark:text-slate-100">$2,890.00</p><p className="text-sm text-slate-500 dark:text-slate-400">156 viajes</p></Card>
            </div>
            <Card className="p-5">
              <h2 className="text-base font-bold text-slate-900 mb-4">Historial de Ganancias</h2>
              <div className="space-y-3">
                {earningsHistory.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div>
                      <p className="font-medium text-slate-900">{entry.date}</p>
                      <p className="text-sm text-slate-500">{i === 0 ? completedCount : entry.trips} viajes</p>
                    </div>
                    <p className="font-bold text-green-600 text-lg dark:text-emerald-300">${i === 0 ? earnings.toFixed(2) : entry.earnings.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* TAB: PAQUETES */}
        {activeTab === "parcels" && (
          <div className="space-y-6 max-w-4xl">
            <h1 className="text-[1.35rem] font-semibold tracking-tight text-slate-900 dark:text-slate-100">Entregas de Paquetes</h1>
            <DriverParcelPanel />
          </div>
        )}

        {/* TAB: PERFIL */}
        {activeTab === "profile" && (
          <div className="space-y-6 max-w-lg">
            <h1 className="text-[1.35rem] font-semibold tracking-tight text-slate-900 dark:text-slate-100">Mi Perfil</h1>
            <Card className="p-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="relative w-16 h-16">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {user?.photoUrl ? (
                      <img src={user.photoUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                    ) : (
                      <span>{user?.name?.[0]}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    className="absolute -right-1 -bottom-1 rounded-full bg-white p-1.5 shadow border border-slate-200 text-slate-600 hover:bg-slate-50"
                    title="Cambiar foto"
                  >
                    <Camera size={12} />
                  </button>
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{user?.name}</p>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                  <div className="flex items-center gap-1 mt-1"><Star size={14} className="text-yellow-500 fill-yellow-500" /><span className="text-sm font-medium">5.0 · {completedCount} viajes</span></div>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                {[["Teléfono", user?.phone || "No registrado"], ["Estado", isOnline ? "En línea" : "Desconectado"], ["Viajes Completados", completedCount.toString()], ["Calificación Promedio", "5.0 ⭐"]].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-medium text-slate-900">{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* TAB: DOCUMENTOS */}
        {activeTab === "docs" && (
          <div className="space-y-6 max-w-lg">
            <h1 className="text-[1.35rem] font-semibold tracking-tight text-slate-900 dark:text-slate-100">Mis Documentos</h1>
            <Card className="p-5">
              <div className="space-y-4">
                {[
                  { name: "Licencia de Conducir", status: "valid", expires: "2027-03-15" },
                  { name: "Seguro del Vehículo", status: "valid", expires: "2026-12-01" },
                  { name: "Inspección Vehicular", status: "expiring", expires: "2026-09-10" },
                  { name: "Antecedentes Penales", status: "valid", expires: "2028-01-20" },
                  { name: "Foto de Perfil", status: "valid", expires: "N/A" },
                ].map(doc => (
                  <div key={doc.name} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${doc.status === "valid" ? "bg-green-100" : "bg-yellow-100"}`}>
                        <FileText size={16} className={doc.status === "valid" ? "text-green-600" : "text-yellow-600"} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{doc.name}</p>
                        <p className="text-xs text-slate-500">Vence: {doc.expires}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${doc.status === "valid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {doc.status === "valid" ? "Vigente" : "Por vencer"}
                    </span>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <FileText size={16} /> Subir Documento
              </Button>
            </Card>
          </div>
        )}
      </main>
      {
        <div className="border-t border-slate-800 bg-slate-950/98 px-4 py-3 shadow-[0_-16px_40px_rgba(2,6,23,0.55)] backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white shadow-sm">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${hasActiveTrip ? "bg-emerald-400" : "bg-slate-500"} ${statusPulseOn ? "opacity-100" : "opacity-40"}`} />
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">{hasActiveTrip ? phaseLabel : "Sin viaje activo"}</p>
                </div>
                <p className="truncate text-sm font-semibold leading-tight">{hasActiveTrip ? `${currentTrip?.pickup} → ${currentTrip?.dropoff}` : "Activa modo en línea para recibir viajes"}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">{tripPhase === "rating" ? "Total" : "ETA"}</p>
                {tripPhase === "rating" ? (
                  <p className="flex items-center justify-end gap-1 text-sm font-bold text-emerald-300">
                    <DollarSign size={13} /> {currentTrip?.fare}
                  </p>
                ) : (
                  <p className="flex items-center justify-end gap-1 text-sm font-semibold text-emerald-300">
                    <Clock size={13} /> {hasActiveTrip ? liveEtaLabel : "--"}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => {
                  if (!hasActiveTrip) { toast.info("No hay viaje activo para navegar"); return; }
                  handleNavigate(tripPhase === "accepted" ? currentTrip!.pickup : currentTrip!.dropoff);
                }}
                disabled={!hasActiveTrip}
                className="h-14 gap-1 rounded-2xl bg-blue-600 px-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-300"
              >
                <Navigation size={16} /> GPS
              </Button>
              <Button
                onClick={() => {
                  if (!hasActiveTrip) { toast.info("No hay viaje activo para abrir chat"); return; }
                  handleMessagePassenger();
                }}
                disabled={!hasActiveTrip}
                className="h-14 gap-1 rounded-2xl bg-emerald-600 px-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-300"
              >
                <MessageCircle size={16} /> Chat
              </Button>
              <Button onClick={handleSOS} variant="outline" className="h-14 gap-1 rounded-2xl border-red-300 bg-red-50 px-2 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-100">
                <AlertTriangle size={16} /> SOS
              </Button>
            </div>
            {hasActiveTrip && (
              <Button
                onClick={() => {
                  if (tripPhase === "accepted") handleArrived();
                  else if (tripPhase === "arrived") handlePassengerOnBoard();
                  else if (tripPhase === "on_board") handleStartTrip();
                  else if (tripPhase === "in_progress") handleCompleteTrip();
                }}
                className="h-14 w-full rounded-2xl gap-1 text-sm font-bold text-white shadow-sm
                  ${tripPhase === 'in_progress' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}"
              >
                {tripPhase === "accepted" ? (<><CheckCircle size={18} /> Llegué al pasajero</>)
                  : tripPhase === "arrived" ? (<><CheckCircle size={18} /> Pasajero a bordo</>)
                  : tripPhase === "on_board" ? (<><Navigation size={18} /> Iniciar viaje</>)
                  : (<><CheckCircle size={18} /> Finalizar viaje</>)}
              </Button>
            )}
          </div>
        </div>
      }
      {/* Chat seguro — visible cuando hay viaje activo */}
      {currentTrip && (currentTrip.status === "accepted" || currentTrip.status === "in_progress") && (
        <div id="driver-chat-anchor" className="fixed bottom-20 right-4 z-[9990]">
          <TripChat
            tripId={currentTrip.id}
            userId={user?.id != null ? String(user.id) : "driver"}
            userName={user?.name || "Conductor"}
            role="driver"
            otherPartyName={currentTrip.clientName || "Pasajero"}
            showLauncher={false}
            fullScreen
            enableBackClose
            forceOpen={chatOpen}
            onOpenChange={setChatOpen}
          />
        </div>
      )}
      {showFloatingHelpers && (
        <GlobalMascotAssistant
          storageKey="wt_mascot_driver"
          title="Asistente Driver"
          mood={driverMascotMood}
          messages={driverMascotMessages}
          className="left-3 right-auto bottom-52 sm:bottom-5 sm:right-5 sm:left-auto"
        />
      )}
      {showFloatingHelpers && <SafetyTipsButton audience="drivers" position="bottom-left" />}
    </div>
  );
}
