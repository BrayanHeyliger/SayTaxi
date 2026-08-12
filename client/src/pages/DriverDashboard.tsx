import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MapPin, Phone, Star, DollarSign, LogOut, CheckCircle, XCircle, Bell, Car,
  Navigation, AlertTriangle, MessageCircle, Shield, TrendingUp, Clock, FileText, Gift
} from "lucide-react";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
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
  const { user, isAuthenticated, logout } = useLocalAuth();
  const [, navigate] = useLocation();
  const { permission: notifPermission, requestPermission, sendNotification } = usePushNotifications();
  const { notifications: persistedNotifs, unreadCount, addNotification: addPersistedNotif, markAllRead, clearAll: clearAllNotifs } = useNotificationHistory(user?.role || "driver");
  const [showNotifications, setShowNotifications] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [pendingTrips, setPendingTrips] = useState<PendingTrip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<PendingTrip | null>(null);
  const [tripPhase, setTripPhase] = useState<"idle" | "accepted" | "otp_verify" | "in_progress" | "completed" | "rating">("idle");
  const [newTripAlert, setNewTripAlert] = useState(false);
  const [earnings, setEarnings] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [otpInput, setOtpInput] = useState("");
  const [otpCode] = useState("4821"); // Demo OTP
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
    setTripPhase("otp_verify");
    toast.info("Ingresa el código OTP del pasajero para iniciar el viaje");
  };

  const handleVerifyOTP = () => {
    if (otpInput === otpCode) {
      setTripPhase("in_progress");
      toast.success("¡OTP verificado! Viaje iniciado");
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
    } else {
      toast.error("Código OTP incorrecto");
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
    setOtpInput("");
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
    // No exponemos el número del pasajero — usar chat interno
    toast.info("💬 Escríbele al pasajero por el chat seguro de abajo");
    document.getElementById("driver-chat-anchor")?.scrollIntoView({ behavior: "smooth" });
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

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">{user?.name?.[0] || "D"}</div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{user?.name}</p>
              <p className="text-xs text-slate-500">Panel de Conductor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${isOnline ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
              {isOnline ? "● En Línea" : "○ Desconectado"}
            </div>
            {newTripAlert && (
              <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold animate-bounce">
                <Bell size={12} /> ¡Nuevo viaje!
              </div>
            )}
            {/* Campana con historial de 24h — igual que el cliente */}
            <div className="relative">
              <button onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllRead(); }} className="relative p-2 rounded-lg hover:bg-slate-100">
                <Bell size={20} className="text-slate-600" />
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50">
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
                        <div key={n.id} className={`p-3 border-b border-slate-100 flex gap-3 items-start ${!n.read ? "bg-blue-50/60" : ""}`}>
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.type === "success" ? "bg-green-500" : n.type === "warning" ? "bg-yellow-500" : n.type === "error" ? "bg-red-500" : "bg-blue-500"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-800 leading-snug">{n.message}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{new Date(n.timestamp).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
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
            {notifPermission !== "granted" && (
              <button onClick={requestPermission} title="Activar notificaciones push" className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 border border-blue-200 text-xs flex items-center gap-1">
                <Bell size={14} /> Push
              </button>
            )}
            <Button variant="outline" size="sm" onClick={() => { logout(); navigate("/"); }} className="gap-1.5 text-xs">
              <LogOut size={13} /> Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 flex">
          {[
            { id: "trips" as const, label: "Viajes", icon: Car },
            { id: "earnings" as const, label: "Ganancias", icon: DollarSign },
            { id: "parcels" as const, label: "Paquetes", icon: FileText },
            { id: "referrals" as const, label: "Referidos", icon: Gift },
            { id: "profile" as const, label: "Perfil", icon: Shield },
            { id: "docs" as const, label: "Documentos", icon: FileText },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full pb-32 lg:pb-6">

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
                <h2 className="text-xl font-bold text-slate-900">Programa de Referidos</h2>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Toggle Online — moved to top near map for mobile */}
            <div className="lg:col-span-2 order-first">
              <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-slate-900">Disponibilidad</h2>
                    <p className="text-xs text-slate-600 mt-0.5">{isOnline ? "Recibirás solicitudes de viaje" : "Activa para recibir viajes"}</p>
                  </div>
                  <button
                    onClick={() => setIsOnline(!isOnline)}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${isOnline ? "bg-green-500" : "bg-slate-300"}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isOnline ? "translate-x-6" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </Card>
            </div>
            <div className="lg:col-span-2 space-y-4 order-2 lg:order-2">

              {/* Viaje Actual */}
              {currentTrip && tripPhase !== "idle" ? (
                <Card className="p-5">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">
                    {tripPhase === "accepted" ? "Viaje Aceptado — En camino" :
                     tripPhase === "otp_verify" ? "Verificar Pasajero (OTP)" :
                     tripPhase === "in_progress" ? "Viaje en Progreso" :
                     tripPhase === "rating" ? "Calificar Pasajero" : "Viaje Completado"}
                  </h2>

                  {/* Datos del viaje */}
                  {tripPhase !== "rating" && (
                    <div className="bg-slate-50 rounded-xl p-4 mb-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-slate-900">{currentTrip.clientName}</p>
                          <p className="text-xs text-slate-500">Pasajero</p>
                        </div>
                        <p className="font-bold text-green-600 text-xl">{currentTrip.fare}</p>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex gap-2 items-start">
                          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5"><MapPin size={11} className="text-green-600" /></div>
                          <div><p className="text-xs text-slate-500">Recogida</p><p className="font-medium text-slate-900">{currentTrip.pickup}</p></div>
                        </div>
                        <div className="flex gap-2 items-start">
                          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5"><MapPin size={11} className="text-red-600" /></div>
                          <div><p className="text-xs text-slate-500">Destino</p><p className="font-medium text-slate-900">{currentTrip.dropoff}</p></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OTP Verificación */}
                  {tripPhase === "otp_verify" && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                        <p className="text-sm text-blue-800 mb-1">Pide al pasajero su código OTP</p>
                        <p className="text-xs text-blue-600">(Demo: el código es <strong>4821</strong>)</p>
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Ingresa código OTP" value={otpInput} onChange={(e) => setOtpInput(e.target.value)}
                          maxLength={4} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-center text-2xl font-bold tracking-widest focus:ring-2 focus:ring-blue-500 outline-none" />
                        <Button onClick={handleVerifyOTP} className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                          <CheckCircle size={18} />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Rating del pasajero */}
                  {tripPhase === "rating" && (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">¿Cómo fue el pasajero {currentTrip.clientName}?</p>
                      <div className="flex justify-center gap-3 py-2">
                        {[1,2,3,4,5].map(s => (
                          <button key={s} onClick={() => setPassengerRating(s)}>
                            <Star size={36} className={`transition-all ${s <= passengerRating ? "text-yellow-500 fill-yellow-500 scale-110" : "text-slate-300 hover:text-yellow-400"}`} />
                          </button>
                        ))}
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-green-600">{currentTrip.fare} ganados</p>
                        <p className="text-xs text-green-700">Viaje completado exitosamente</p>
                      </div>
                      <Button onClick={handleSubmitRating} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 font-bold">
                        Finalizar y Cobrar
                      </Button>
                    </div>
                  )}

                  {/* Acciones según fase */}
                  {tripPhase === "accepted" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Button onClick={handleCallPassenger} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                          <Phone size={15} /> Llamar
                        </Button>
                        <Button onClick={handleMessagePassenger} className="bg-[#25D366] hover:bg-[#1ebe57] text-white gap-2">
                          <MessageCircle size={15} /> WhatsApp
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleNavigate(currentTrip.pickup)} className="gap-1 text-xs">
                          <Navigation size={12} /> Ir a recoger
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleSOS} className="gap-1 text-xs text-red-500 border-red-200">
                          <AlertTriangle size={12} /> SOS
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleArrived} className="gap-1 text-xs text-blue-600 border-blue-200">
                          <CheckCircle size={12} /> Llegué
                        </Button>
                      </div>
                      <Button variant="outline" onClick={() => { setCurrentTrip(null); setTripPhase("idle"); }} className="w-full text-red-500 border-red-200">
                        <XCircle size={16} className="mr-2" /> Cancelar Viaje
                      </Button>
                    </div>
                  )}

                  {tripPhase === "in_progress" && (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                        <p className="font-semibold mb-1">📍 Destino del pasajero:</p>
                        <p className="text-blue-800">{currentTrip.dropoff}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button onClick={() => handleNavigate(currentTrip.dropoff)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                          <Navigation size={15} /> 🗺️ Navegar GPS
                        </Button>
                        <Button onClick={handleSOS} variant="outline" className="text-red-500 border-red-200 gap-2">
                          <AlertTriangle size={15} /> SOS
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs text-green-600 border-green-200"
                          onClick={handleCallPassenger}>
                          <Phone size={12} /> Llamar cliente
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs text-green-600 border-green-200"
                          onClick={handleMessagePassenger}>
                          <MessageCircle size={12} /> WhatsApp
                        </Button>
                      </div>
                      <Button onClick={handleCompleteTrip} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 font-bold gap-2">
                        <CheckCircle size={18} /> Finalizar Viaje
                      </Button>
                    </div>
                  )}
                </Card>
              ) : (
                /* Viajes disponibles */
                <Card className="p-5">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">
                    Viajes Disponibles {pendingTrips.length > 0 && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-sm rounded-full">{pendingTrips.length}</span>}
                  </h2>
                  {!isOnline ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                      <Car size={40} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-600 font-medium">Conéctate para ver viajes disponibles</p>
                      <Button onClick={() => setIsOnline(true)} className="mt-4 bg-green-500 hover:bg-green-600 text-white">Conectar Ahora</Button>
                    </div>
                  ) : pendingTrips.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                      <Bell size={40} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-600 font-medium">Esperando solicitudes...</p>
                      <p className="text-sm text-slate-500 mt-1">Te notificaremos cuando haya un viaje</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingTrips.map(trip => (
                        <div key={trip.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-slate-900">{trip.clientName}</p>
                              <p className="text-xs text-slate-500">{new Date(trip.requestedAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</p>
                              {trip.isBid && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Puja</span>}
                            </div>
                            <p className="font-bold text-green-600 text-xl">{trip.fare}</p>
                          </div>
                          <div className="space-y-1.5 text-sm mb-4">
                            <p className="text-slate-600"><MapPin size={13} className="inline mr-1 text-green-500" />{trip.pickup}</p>
                            <p className="text-slate-600"><MapPin size={13} className="inline mr-1 text-red-500" />{trip.dropoff}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleRejectTrip(trip.id)} className="text-red-500 border-red-200">Rechazar</Button>
                            <Button size="sm" onClick={() => handleAcceptTrip(trip)} className="bg-green-500 hover:bg-green-600 text-white">Aceptar</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4 order-1 lg:order-2 lg:sticky lg:top-4 self-start">
              {/* Mapa de ubicación */}
              <Card className="overflow-hidden p-0">
                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 text-sm">Mi Ubicación</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isOnline ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {isOnline ? "● En línea" : "○ Desconectado"}
                    </span>
                    <Button
                      onClick={() => setIsOnline(!isOnline)}
                      className={`h-8 rounded-full px-3 text-xs font-semibold ${isOnline ? "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20" : "bg-slate-200 hover:bg-slate-300 text-slate-700"}`}
                    >
                      {isOnline ? "Desconectar" : "Conectar"}
                    </Button>
                  </div>
                </div>
                <div className="relative w-full" style={{ height: "240px" }}>
                  <LeafletMap
                    height="100%"
                    className="absolute inset-0 w-full h-full"
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
                {currentTrip && (tripPhase === "accepted" || tripPhase === "in_progress") && (
                  <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
                    <p className="text-xs text-blue-700 font-medium">Ruta activa: {currentTrip.pickup} → {currentTrip.dropoff}</p>
                  </div>
                )}
              </Card>
              <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                <h3 className="font-semibold text-green-900 mb-2">Ganancias de Hoy</h3>
                <p className="text-3xl font-bold text-green-600">${earnings.toFixed(2)}</p>
                <p className="text-sm text-green-700 mt-1">{completedCount} viajes completados</p>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Mi Perfil</h3>
                <div className="space-y-2 text-sm">
                  <div><p className="text-slate-500">Nombre</p><p className="font-medium text-slate-900">{user?.name}</p></div>
                  <div><p className="text-slate-500">Email</p><p className="font-medium text-slate-900 text-xs">{user?.email}</p></div>
                  <div className="flex items-center gap-2 pt-1"><Star size={16} className="text-yellow-500 fill-yellow-500" /><div><p className="text-xs text-slate-500">Calificación</p><p className="font-medium">5.0 / 5.0</p></div></div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB: GANANCIAS */}
        {activeTab === "earnings" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Mis Ganancias</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5"><p className="text-sm text-slate-500">Hoy</p><p className="text-3xl font-bold text-green-600">${earnings.toFixed(2)}</p><p className="text-sm text-slate-500">{completedCount} viajes</p></Card>
              <Card className="p-5"><p className="text-sm text-slate-500">Esta Semana</p><p className="text-3xl font-bold text-slate-900">$741.00</p><p className="text-sm text-slate-500">41 viajes</p></Card>
              <Card className="p-5"><p className="text-sm text-slate-500">Este Mes</p><p className="text-3xl font-bold text-slate-900">$2,890.00</p><p className="text-sm text-slate-500">156 viajes</p></Card>
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
                    <p className="font-bold text-green-600 text-lg">${i === 0 ? earnings.toFixed(2) : entry.earnings.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* TAB: PAQUETES */}
        {activeTab === "parcels" && (
          <div className="space-y-6 max-w-4xl">
            <h1 className="text-2xl font-bold text-slate-900">Entregas de Paquetes</h1>
            <DriverParcelPanel />
          </div>
        )}

        {/* TAB: PERFIL */}
        {activeTab === "profile" && (
          <div className="space-y-6 max-w-lg">
            <h1 className="text-2xl font-bold text-slate-900">Mi Perfil</h1>
            <Card className="p-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">{user?.name?.[0]}</div>
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
            <h1 className="text-2xl font-bold text-slate-900">Mis Documentos</h1>
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
      {currentTrip && (tripPhase === "accepted" || tripPhase === "in_progress") && (
        <div className="fixed bottom-0 left-0 right-0 z-[9985] border-t border-slate-200 bg-white/96 px-4 py-3 shadow-[0_-12px_40px_rgba(15,23,42,0.18)] backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            <div className="flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-sm">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Viaje activo</p>
                <p className="text-sm font-semibold leading-tight">{currentTrip.pickup} → {currentTrip.dropoff}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">ETA</p>
                <p className="text-sm font-semibold text-emerald-300">{currentTrip.estimatedTime || "5 min"}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => handleNavigate(tripPhase === "accepted" ? currentTrip.pickup : currentTrip.dropoff)} className="h-12 gap-1.5 rounded-2xl bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-blue-700">
                <Navigation size={15} /> Navegar
              </Button>
              <Button onClick={handleMessagePassenger} className="h-12 gap-1.5 rounded-2xl bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700">
                <MessageCircle size={15} /> Chat
              </Button>
              <Button onClick={handleSOS} variant="outline" className="h-12 gap-1.5 rounded-2xl border-red-200 bg-white px-3 text-xs font-semibold text-red-500 shadow-sm hover:bg-red-50">
                <AlertTriangle size={15} /> SOS
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Chat seguro — visible cuando hay viaje activo */}
      {currentTrip && (currentTrip.status === "accepted" || currentTrip.status === "in_progress") && (
        <div id="driver-chat-anchor" className="fixed bottom-20 right-4 z-[9990]">
          <TripChat
            tripId={currentTrip.id}
            userId={user?.id != null ? String(user.id) : "driver"}
            userName={user?.name || "Conductor"}
            role="driver"
            otherPartyName={currentTrip.clientName || "Pasajero"}
          />
        </div>
      )}
      <GlobalMascotAssistant
        storageKey="wt_mascot_driver"
        title="Asistente Driver"
        mood={driverMascotMood}
        messages={driverMascotMessages}
      />
      <SafetyTipsButton audience="drivers" />
    </div>
  );
}
