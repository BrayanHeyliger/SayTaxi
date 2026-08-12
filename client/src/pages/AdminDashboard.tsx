import { VehiclesExtrasEditor } from "@/components/VehiclesExtrasEditor";
import FAQEditor from "@/components/FAQEditor";
import { AdminParcelStats } from "@/components/AdminParcelStats";
import { useNotificationHistory } from "@/hooks/useNotificationHistory";
import GlobalMascotAssistant from "@/components/GlobalMascotAssistant";
import { useState, useRef, useCallback, useEffect, type ChangeEvent } from "react";
import { useLocation } from "wouter";
import MessagesInbox from "@/components/MessagesInbox";
import { trpc } from "@/lib/trpc";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { LanguageSelectorLight } from "@/components/LanguageSelector";
import { useSiteConfig, DEFAULT_SITE_CONFIG } from "@/contexts/SiteConfigContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LeafletMap, { type LeafletMapRef } from "@/components/LeafletMap";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, Car, Navigation, DollarSign, Settings,
  Bell, LogOut, Search, Eye, Phone, MessageCircle, UserCheck, UserX,
  BarChart2, TrendingUp, MapPin, AlertTriangle, Star, Send,
  Shield, Edit3, Save, Globe, Palette, Layers, Sliders,
  CheckCircle, XCircle, Clock, Mail, Smartphone, FileText,
  Monitor, ChevronRight, Download, RefreshCw, RotateCcw, ExternalLink, Upload, ImageIcon, Loader2, Database, HelpCircle, Package
} from "lucide-react";
import { Home, Gift, UserCog, Plus, Trash2, ToggleLeft, ToggleRight, Trophy, Lightbulb, Pencil } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

type Tab = "overview" | "godsEye" | "drivers" | "clients" | "trips" | "messages" | "permissions" | "editor" | "analytics" | "payments" | "faq" | "settings" | "referrals" | "dispatchers" | "manualBooking" | "surgePricing" | "broadcast" | "safetyTips" | "parcels" | "auditLogs";
type EditorSection = "hero" | "colors" | "contact" | "footer" | "meta" | "features" | "pricing" | "testimonials" | "email" | "vehicles";
type EditorView = "form" | "preview";

interface Driver { id: string; name: string; phone: string; email: string; vehicle: string; plate: string; status: "active" | "inactive" | "suspended" | "pending"; rating: number; trips: number; earnings: string; joinDate: string; online: boolean; permissions: { canAcceptTrips: boolean; canSetOwnFare: boolean; canViewClientPhone: boolean; canCancelTrip: boolean; }; }
interface Client { id: string; name: string; phone: string; email: string; trips: number; spent: string; rating: number; joinDate: string; status: "active" | "suspended"; }
interface SentMessage { id: string; to: string; subject: string; body: string; channel: string; date: string; }

const MOCK_DRIVERS: Driver[] = [
  { id: "d1", name: "Carlos Mendoza", phone: "+52 55 1234 5678", email: "carlos@email.com", vehicle: "Toyota Corolla 2022", plate: "ABC-123", status: "active", rating: 4.9, trips: 342, earnings: "$8,450", joinDate: "2024-01-15", online: true, permissions: { canAcceptTrips: true, canSetOwnFare: false, canViewClientPhone: true, canCancelTrip: true } },
  { id: "d2", name: "Pedro Ramírez", phone: "+52 55 9876 5432", email: "pedro@email.com", vehicle: "Honda Civic 2021", plate: "XYZ-789", status: "active", rating: 4.7, trips: 218, earnings: "$5,320", joinDate: "2024-03-20", online: true, permissions: { canAcceptTrips: true, canSetOwnFare: false, canViewClientPhone: true, canCancelTrip: true } },
  { id: "d3", name: "Luis Sánchez", phone: "+52 55 5555 4444", email: "luis@email.com", vehicle: "Nissan Sentra 2020", plate: "DEF-456", status: "inactive", rating: 4.5, trips: 156, earnings: "$3,890", joinDate: "2024-06-10", online: false, permissions: { canAcceptTrips: false, canSetOwnFare: false, canViewClientPhone: false, canCancelTrip: false } },
  { id: "d4", name: "Miguel Ángel Torres", phone: "+52 55 3333 2222", email: "miguel@email.com", vehicle: "Volkswagen Jetta 2023", plate: "GHI-012", status: "pending", rating: 0, trips: 0, earnings: "$0", joinDate: "2025-01-05", online: false, permissions: { canAcceptTrips: false, canSetOwnFare: false, canViewClientPhone: false, canCancelTrip: false } },
  { id: "d5", name: "Roberto Díaz", phone: "+52 55 7777 8888", email: "roberto@email.com", vehicle: "Chevrolet Aveo 2019", plate: "JKL-345", status: "suspended", rating: 3.2, trips: 45, earnings: "$1,120", joinDate: "2024-08-22", online: false, permissions: { canAcceptTrips: false, canSetOwnFare: false, canViewClientPhone: false, canCancelTrip: false } },
];

const MOCK_CLIENTS: Client[] = [
  { id: "c1", name: "María García", phone: "+52 55 1111 2222", email: "maria@email.com", trips: 28, spent: "$420", rating: 4.8, joinDate: "2024-02-10", status: "active" },
  { id: "c2", name: "Juan López", phone: "+52 55 3333 4444", email: "juan@email.com", trips: 15, spent: "$225", rating: 4.5, joinDate: "2024-04-15", status: "active" },
  { id: "c3", name: "Ana Martínez", phone: "+52 55 5555 6666", email: "ana@email.com", trips: 42, spent: "$630", rating: 5.0, joinDate: "2024-01-20", status: "active" },
  { id: "c4", name: "Roberto Díaz", phone: "+52 55 7777 8888", email: "roberto2@email.com", trips: 8, spent: "$120", rating: 3.5, joinDate: "2024-09-01", status: "suspended" },
  { id: "c5", name: "Laura Pérez", phone: "+52 55 9999 0000", email: "laura@email.com", trips: 63, spent: "$945", rating: 4.9, joinDate: "2023-12-05", status: "active" },
];

const weeklyData = [
  { day: "Lun", viajes: 38, ingresos: 760 }, { day: "Mar", viajes: 52, ingresos: 1040 },
  { day: "Mié", viajes: 45, ingresos: 900 }, { day: "Jue", viajes: 61, ingresos: 1220 },
  { day: "Vie", viajes: 78, ingresos: 1560 }, { day: "Sáb", viajes: 95, ingresos: 1900 },
  { day: "Dom", viajes: 72, ingresos: 1440 },
];

const monthlyData = [
  { month: "Ene", viajes: 820, ingresos: 16400 }, { month: "Feb", viajes: 950, ingresos: 19000 },
  { month: "Mar", viajes: 1100, ingresos: 22000 }, { month: "Abr", viajes: 980, ingresos: 19600 },
  { month: "May", viajes: 1250, ingresos: 25000 }, { month: "Jun", viajes: 1400, ingresos: 28000 },
  { month: "Jul", viajes: 1350, ingresos: 27000 },
];

const vehicleData = [
  { name: "Económico", value: 45, color: "#25D366" }, { name: "Confort", value: 30, color: "#3B82F6" },
  { name: "Premium", value: 15, color: "#8B5CF6" }, { name: "SUV", value: 10, color: "#F59E0B" },
];

const TRIPS_KEY = "wt_pending_trips";

type MarketPulse = {
  requested: number;
  accepted: number;
  inProgress: number;
  completed: number;
  total: number;
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700", inactive: "bg-slate-100 text-slate-600",
  suspended: "bg-red-100 text-red-700", pending: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700", in_progress: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700", requested: "bg-yellow-100 text-yellow-700",
};
const statusLabels: Record<string, string> = {
  active: "Activo", inactive: "Inactivo", suspended: "Suspendido", pending: "Pendiente",
  completed: "Completado", in_progress: "En progreso", cancelled: "Cancelado", requested: "Solicitado",
};

const LIVE_TRIP_KEY = "wt_live_trip_state";

type LiveTripState = {
  tripId: string;
  phase: string;
  pickup: { lat: number; lng: number; label?: string };
  driverStart: { lat: number; lng: number; label?: string };
  driverName: string;
  updatedAt: number;
};

const defaultSiteConfig = {
  siteTitle: "Passenger Admin", tagline: "Gestiona tu experiencia en la plataforma",
  heroTitle: "Gestiona tu flota desde WhatsApp. Sin apps. Sin complicaciones.",
  heroDesc: "La plataforma SaaS que convierte WhatsApp en tu central de taxis. Recibe pedidos, asigna conductores y gestiona tarifas — todo desde un bot inteligente.",
  ctaText: "Empezar gratis", primaryColor: "#25D366", secondaryColor: "#0d1117",
  accentColor: "#128C7E", fontFamily: "Sora", contactEmail: "soporte@whatsapptaxi.com",
  contactPhone: "+1 800 TAXI BOT", contactAddress: "Ciudad de México, México",
  footerText: "© 2025 Passenger. Todos los derechos reservados.",
  footerLinks: "Privacidad | Términos | Soporte",
  metaDescription: "Plataforma SaaS para empresas de taxi. Recibe pedidos por WhatsApp.",
  metaKeywords: "taxi, whatsapp, saas, flota, conductor",
  showAnimations: true, showPricing: true, showTestimonials: false,
  maintenanceMode: false, allowRegistration: true, requireEmailVerification: false,
  commissionRate: "20", basefare: "2.50", pricePerKm: "1.20",
  surgePricing: true, surgeMultiplier: "1.5",
  logoUrl: "",
  footerPages: DEFAULT_SITE_CONFIG.footerPages,
};

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toEditorHtml(value: string) {
  if (!value) return "";
  if (value.includes("<") && value.includes(">")) return value;
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function RichTextEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    const normalized = toEditorHtml(value || "");
    if (editorRef.current.innerHTML !== normalized) {
      editorRef.current.innerHTML = normalized;
    }
  }, [value]);

  const applyCommand = (command: string) => {
    document.execCommand(command, false);
    onChange(editorRef.current?.innerHTML || "");
    editorRef.current?.focus();
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-slate-50">
        <button type="button" onClick={() => applyCommand("bold")} className="px-2 py-1 rounded text-xs font-bold text-slate-700 hover:bg-slate-200">B</button>
        <button type="button" onClick={() => applyCommand("italic")} className="px-2 py-1 rounded text-xs italic text-slate-700 hover:bg-slate-200">I</button>
        <button type="button" onClick={() => applyCommand("insertUnorderedList")} className="px-2 py-1 rounded text-xs text-slate-700 hover:bg-slate-200">• Lista</button>
        <button type="button" onClick={() => applyCommand("insertOrderedList")} className="px-2 py-1 rounded text-xs text-slate-700 hover:bg-slate-200">1. Lista</button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={() => onChange(editorRef.current?.innerHTML || "")}
        className="min-h-[120px] p-3 text-sm text-slate-800 focus:outline-none"
      />
    </div>
  );
}

export default function AdminDashboard() {
  const { user, isAuthenticated, logout } = useLocalAuth();
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>(MOCK_DRIVERS);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const { config: globalConfig, saveConfig: saveGlobalConfig } = useSiteConfig();
  const { isSaving, lastSaved } = useSiteConfig();
  const [siteConfig, setSiteConfig] = useState(defaultSiteConfig);
  const [editorView, setEditorView] = useState<EditorView>("form");
  const [previewKey, setPreviewKey] = useState(0);

  // Sync local editor state from global config on mount
  useEffect(() => {
    setSiteConfig(prev => ({ ...prev, ...globalConfig }));
  }, []);

  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const testSmtpMutation = trpc.siteSettings.testSmtp.useMutation();

  const handleTestSmtp = async () => {
    const cfg = siteConfig as any;
    if (!cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPass) {
      setSmtpTestResult({ ok: false, msg: "Completa servidor, usuario y contraseña SMTP antes de probar." });
      return;
    }
    if (!cfg.notificationEmail) {
      setSmtpTestResult({ ok: false, msg: "Ingresa el email de notificaciones para recibir el correo de prueba." });
      return;
    }
    setTestingSmtp(true);
    setSmtpTestResult(null);
    testSmtpMutation.mutate(
      { smtpHost: cfg.smtpHost, smtpPort: cfg.smtpPort || "587", smtpUser: cfg.smtpUser, smtpPass: cfg.smtpPass, smtpFrom: cfg.smtpFrom, testEmail: cfg.notificationEmail },
      {
        onSuccess: (data) => { setTestingSmtp(false); setSmtpTestResult({ ok: true, msg: data.message }); },
        onError: (err) => { setTestingSmtp(false); setSmtpTestResult({ ok: false, msg: err.message }); },
      }
    );
  };

  const [messageForm, setMessageForm] = useState({ to: "all_clients", subject: "", body: "", channel: "push" });
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([
    { id: "m1", to: "all_clients", subject: "¡Bienvenido a Passenger!", body: "Gracias por registrarte.", channel: "push", date: "Hoy 09:00" },
    { id: "m2", to: "all_drivers", subject: "Actualización de tarifas", body: "Las tarifas se han actualizado.", channel: "email", date: "Ayer 14:30" },
  ]);
  const [editorSection, setEditorSection] = useState<EditorSection>("hero");
  const [marketPulse, setMarketPulse] = useState<MarketPulse>({ requested: 0, accepted: 0, inProgress: 0, completed: 0, total: 0 });
  const [liveTripState, setLiveTripState] = useState<LiveTripState | null>(null);
  const mapRef = useRef<LeafletMapRef | null>(null);
  const footerImportRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const syncMarketPulse = () => {
      try {
        const trips = JSON.parse(localStorage.getItem(TRIPS_KEY) || "[]") as Array<{ status?: string }>;
        const next = trips.reduce<MarketPulse>((acc, trip) => {
          acc.total += 1;
          if (trip.status === "requested") acc.requested += 1;
          if (trip.status === "accepted") acc.accepted += 1;
          if (trip.status === "in_progress") acc.inProgress += 1;
          if (trip.status === "completed") acc.completed += 1;
          return acc;
        }, { requested: 0, accepted: 0, inProgress: 0, completed: 0, total: 0 });
        setMarketPulse(next);
      } catch {
        setMarketPulse({ requested: 0, accepted: 0, inProgress: 0, completed: 0, total: 0 });
      }
    };

    syncMarketPulse();
    const syncLiveTrip = () => {
      try {
        const raw = localStorage.getItem(LIVE_TRIP_KEY);
        if (!raw) {
          setLiveTripState(null);
          return;
        }
        setLiveTripState(JSON.parse(raw));
      } catch {
        setLiveTripState(null);
      }
    };

    syncLiveTrip();
    const interval = window.setInterval(syncMarketPulse, 2000);
    const liveInterval = window.setInterval(syncLiveTrip, 2000);
    window.addEventListener("storage", syncMarketPulse);
    window.addEventListener("storage", syncLiveTrip);
    return () => {
      window.clearInterval(interval);
      window.clearInterval(liveInterval);
      window.removeEventListener("storage", syncMarketPulse);
      window.removeEventListener("storage", syncLiveTrip);
    };
  }, []);

  const handleExportFooterPages = () => {
    const payload = JSON.stringify((siteConfig as any).footerPages || {}, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "footer-pages.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Exportacion de contenido completada ✅");
  };

  const handleImportFooterPages = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = String(reader.result || "{}");
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          toast.error("JSON invalido. Se esperaba un objeto de paginas.");
          return;
        }

        const normalized = Object.entries(parsed).reduce((acc: Record<string, { title: string; content: string }>, [slug, data]) => {
          const page = data as any;
          acc[slug] = {
            title: String(page?.title || slug),
            content: String(page?.content || ""),
          };
          return acc;
        }, {});

        setSiteConfig(c => ({
          ...c,
          footerPages: {
            ...((c as any).footerPages || {}),
            ...normalized,
          },
        } as any));
        toast.success("Contenido importado. Recuerda guardar cambios.");
      } catch {
        toast.error("No se pudo leer el archivo JSON.");
      } finally {
        if (footerImportRef.current) footerImportRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => { if (!isAuthenticated) navigate("/login"); }, [isAuthenticated]);

  const handleMapReady = useCallback((ref: LeafletMapRef) => {
    mapRef.current = ref;
    // Spawn animated vehicle markers for all drivers via LeafletMap
    ref.spawnVehicles(19.4326, -99.1332);
    try {
      const raw = localStorage.getItem(LIVE_TRIP_KEY);
      if (raw) {
        const liveTrip = JSON.parse(raw) as LiveTripState;
        if (liveTrip?.driverStart && liveTrip?.pickup) {
          ref.setRouteBetween(
            { lat: liveTrip.driverStart.lat, lng: liveTrip.driverStart.lng, label: liveTrip.driverName },
            { lat: liveTrip.pickup.lat, lng: liveTrip.pickup.lng, label: liveTrip.pickup.label || "Cliente" },
            { vehicleEmoji: "🚕", vehicleLabel: liveTrip.driverName, animate: true }
          );
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (activeTab !== "godsEye" || !mapRef.current || !liveTripState?.driverStart || !liveTripState?.pickup) return;
    mapRef.current.setRouteBetween(
      { lat: liveTripState.driverStart.lat, lng: liveTripState.driverStart.lng, label: liveTripState.driverName },
      { lat: liveTripState.pickup.lat, lng: liveTripState.pickup.lng, label: liveTripState.pickup.label || "Cliente" },
      { vehicleEmoji: "🚕", vehicleLabel: liveTripState.driverName, animate: true }
    );
  }, [activeTab, liveTripState]);

  const handleDriverAction = (driverId: string, action: "approve" | "suspend" | "activate" | "delete") => {
    setDrivers(prev => prev.map(d => {
      if (d.id !== driverId) return d;
      if (action === "approve") return { ...d, status: "active" as const };
      if (action === "suspend") return { ...d, status: "suspended" as const, online: false };
      if (action === "activate") return { ...d, status: "active" as const };
      return d;
    }).filter(d => action === "delete" ? d.id !== driverId : true));
    toast.success({ approve: "Conductor aprobado ✅", suspend: "Conductor suspendido", activate: "Conductor activado ✅", delete: "Conductor eliminado" }[action]);
  };

  const handlePermissionToggle = (driverId: string, perm: keyof Driver["permissions"]) => {
    setDrivers(prev => prev.map(d => d.id !== driverId ? d : { ...d, permissions: { ...d.permissions, [perm]: !d.permissions[perm] } }));
    toast.success("Permiso actualizado");
  };

  const handleClientAction = (clientId: string, action: "suspend" | "activate") => {
    setClients(prev => prev.map(c => c.id !== clientId ? c : { ...c, status: action === "suspend" ? "suspended" as const : "active" as const }));
    toast.success(action === "suspend" ? "Cliente suspendido" : "Cliente activado ✅");
  };

  const handleSendMessage = () => {
    if (!messageForm.subject || !messageForm.body) { toast.error("Completa el asunto y el mensaje"); return; }
    setSentMessages(prev => [{ id: `m${Date.now()}`, to: messageForm.to, subject: messageForm.subject, body: messageForm.body, channel: messageForm.channel, date: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) }, ...prev]);
    setMessageForm({ to: "all_clients", subject: "", body: "", channel: "push" });
    toast.success("Mensaje enviado ✅");
  };

  const handleSaveConfig = () => {
    saveGlobalConfig(siteConfig as any);
    setPreviewKey(k => k + 1);
    toast.success("Guardando en base de datos...");
  };

  const handleResetConfig = () => {
    setSiteConfig(defaultSiteConfig);
    saveGlobalConfig(defaultSiteConfig as any);
    toast.success("Configuración restablecida a valores por defecto ✅");
  };

  const tabs: { id: Tab; label: string; icon: any; badge?: number; dot?: boolean }[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "godsEye", label: "God's Eye", icon: Eye, dot: true },
    { id: "drivers", label: "Conductores", icon: Car, badge: drivers.filter(d => d.status === "pending").length },
    { id: "clients", label: "Clientes", icon: Users },
    { id: "trips", label: "Viajes", icon: Navigation },
    { id: "messages", label: "Mensajes", icon: MessageCircle },
    { id: "permissions", label: "Permisos", icon: Shield },
    { id: "editor", label: "Editor Web", icon: Edit3 },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
    { id: "payments", label: "Pagos / API", icon: DollarSign },
    { id: "faq", label: "Editor FAQ", icon: HelpCircle },
    { id: "settings", label: "Configuración", icon: Settings },
    { id: "referrals", label: "Referidos", icon: Gift },
    { id: "dispatchers", label: "Dispatchers", icon: UserCog },
    { id: "manualBooking", label: "Reserva Manual", icon: Phone },
    { id: "surgePricing", label: "Precio Surge", icon: TrendingUp },
    { id: "broadcast", label: "Broadcast", icon: Send },
    { id: "safetyTips", label: "Consejos 💡", icon: Lightbulb },
    { id: "parcels", label: "Paquetes 📦", icon: Package },
    { id: "auditLogs", label: "Auditoria", icon: FileText },
  ];

  const pendingApprovals = drivers.filter((d) => d.status === "pending").length;
  const adminMascotMood = pendingApprovals > 0 ? "searching" : marketPulse.inProgress > 0 ? "ready" : "happy";
  const adminMascotMessages = pendingApprovals > 0
    ? [
        `Tienes ${pendingApprovals} conductor(es) pendientes por revisar.`,
        "Primero valida permisos y documentos criticos.",
        "Con eso mantienes calidad y cumplimiento legal.",
      ]
    : marketPulse.inProgress > 0
    ? [
        `Hay ${marketPulse.inProgress} viaje(s) en curso ahora mismo.`,
        "Monitorea ETA y eventos de seguridad en vivo.",
        "El panel ya refleja la operacion real de conductores.",
      ]
    : [
        "Tablero estable. Buen momento para optimizar conversion.",
        "Revisa analytics y ajustes de pricing para crecer margen.",
        "Estoy listo para guiar la demo con tus clientes.",
      ];

  const demoOptions = [
    { href: "/client-dashboard", label: "Cliente", icon: Users },
    { href: "/driver-dashboard", label: "Conductor", icon: Car },
    { href: "/fleet-dashboard", label: "Flotilla", icon: Navigation },
    { href: "/admin", label: "Super Admin", icon: Shield },
  ];

  if (!isAuthenticated) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(165deg,_oklch(0.16_0.02_248)_0%,_oklch(0.1_0.018_252)_55%,_oklch(0.085_0.014_255)_100%)] flex">
      <div className="pointer-events-none absolute inset-0 opacity-75">
        <div className="absolute -left-28 top-20 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,_oklch(0.76_0.18_148/0.2),_transparent_66%)] blur-3xl" />
        <div className="absolute right-[-180px] top-44 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,_oklch(0.68_0.07_210/0.16),_transparent_68%)] blur-3xl" />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.028)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.024)_1px,transparent_1px)] bg-[size:52px_52px] opacity-15" />

      {/* Sidebar */}
      <aside className="relative z-10 h-screen w-64 flex-shrink-0 sticky top-0 border-r border-white/12 bg-slate-950/78 text-white backdrop-blur-xl">
        <div className="p-5 border-b border-white/12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-xl">🛡️</div>
            <div><p className="font-bold text-sm text-white">Super Admin</p><p className="text-xs text-green-400">Acceso total al sistema</p></div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? "bg-[linear-gradient(145deg,rgba(16,185,129,0.34),rgba(16,185,129,0.2))] text-white border border-green-300/45 shadow-[0_14px_30px_-20px_rgba(16,185,129,0.95)]" : "text-slate-300 hover:bg-white/8 hover:text-white"}`}>
              <tab.icon size={16} />
              <span className="flex-1 text-left">{tab.label}</span>
              {(tab.badge ?? 0) > 0 && <span className="bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{tab.badge}</span>}
              {tab.dot && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">{user?.name?.[0] || "A"}</div>
            <div><p className="text-sm font-medium text-white">{user?.name || "Heyliger"}</p><p className="text-xs text-green-400">Super Admin</p></div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { logout(); navigate("/"); }} className="w-full gap-2 text-slate-200 border-white/20 bg-white/5 hover:bg-white/12 hover:text-white text-xs">
            <LogOut size={13} /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="relative z-10 flex-1 overflow-auto bg-slate-50/96 backdrop-blur-sm">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-white/85 px-6 py-4 backdrop-blur-xl">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{tabs.find(t => t.id === activeTab)?.label}</h1>
            <p className="text-sm text-slate-500">Panel de Super Administrador</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 p-1 shadow-sm">
              {demoOptions.map((option) => {
                const Icon = option.icon;
                const active = location === option.href;
                return (
                  <button
                    key={option.href}
                    type="button"
                    onClick={() => navigate(option.href)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${active ? "bg-[oklch(0.76_0.18_148)] text-[oklch(0.08_0.02_148)] shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}
                  >
                    <Icon size={13} />
                    {option.label}
                  </button>
                );
              })}
            </div>
            <LanguageSelectorLight />
            <AdminNotificationBell />
            <Button variant="outline" size="sm" className="gap-2 text-sm" onClick={() => navigate("/")}><Home size={14} /> Inicio</Button>
            <Button variant="outline" size="sm" className="gap-2 text-sm"><RefreshCw size={14} /> Actualizar</Button>
          </div>
        </header>

        <div className="p-6">

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <Card className="border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Passenger en vivo</p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">Solicitudes, aceptaciones y viajes activos</h3>
                    <p className="text-sm text-emerald-900/75">La misma cola que ve el conductor alimenta este panel en tiempo real.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                    {[
                      { label: "Solicitados", value: marketPulse.requested, color: "text-yellow-700" },
                      { label: "Aceptados", value: marketPulse.accepted, color: "text-blue-700" },
                      { label: "En curso", value: marketPulse.inProgress, color: "text-emerald-700" },
                      { label: "Completados", value: marketPulse.completed, color: "text-slate-700" },
                      { label: "Total", value: marketPulse.total, color: "text-emerald-900" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-center shadow-sm">
                        <p className={`text-xl font-extrabold ${item.color}`}>{item.value}</p>
                        <p className="text-xs text-slate-500">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Conductores Activos", value: `${drivers.filter(d => d.status === "active").length}/${drivers.length}`, sub: `${drivers.filter(d => d.online).length} en línea`, icon: Car, color: "text-green-600", bg: "bg-green-50" },
                  { label: "Clientes Totales", value: clients.length, sub: `${clients.filter(c => c.status === "active").length} activos`, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Viajes Este Mes", value: "1,350", sub: "+8% vs mes anterior", icon: Navigation, color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "Ingresos Mes", value: "$27,000", sub: "+12% vs mes anterior", icon: DollarSign, color: "text-yellow-600", bg: "bg-yellow-50" },
                ].map((kpi, i) => (
                  <Card key={i} className="p-4">
                    <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center mb-2`}><kpi.icon size={20} className={kpi.color} /></div>
                    <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
                    <p className="text-sm font-medium text-slate-700">{kpi.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{kpi.sub}</p>
                  </Card>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-5">
                  <h3 className="font-semibold text-slate-900 mb-4">Ingresos Mensuales</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={monthlyData}>
                      <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#25D366" stopOpacity={0.3} /><stop offset="95%" stopColor="#25D366" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip />
                      <Area type="monotone" dataKey="ingresos" stroke="#25D366" strokeWidth={2.5} fill="url(#grad)" name="Ingresos $" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-4">Por Tipo de Vehículo</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart><Pie data={vehicleData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">{vehicleData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip formatter={(v) => `${v}%`} /></PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 mt-2">{vehicleData.map(v => (<div key={v.name} className="flex items-center justify-between text-xs"><div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: v.color }} /><span className="text-slate-600">{v.name}</span></div><span className="font-semibold">{v.value}%</span></div>))}</div>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Acciones Rápidas Operativas</h3>
                    <p className="text-xs text-slate-500">Atajos para soporte y control</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button onClick={() => setActiveTab("drivers")} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:bg-slate-100">
                      <p className="text-sm font-semibold text-slate-900">Revisar conductores</p>
                      <p className="mt-1 text-xs text-slate-500">Aprobaciones, estado y permisos individuales.</p>
                    </button>
                    <button onClick={() => setActiveTab("messages")} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:bg-slate-100">
                      <p className="text-sm font-semibold text-slate-900">Abrir inbox central</p>
                      <p className="mt-1 text-xs text-slate-500">Responder incidencias y feedback en minutos.</p>
                    </button>
                    <button onClick={() => setActiveTab("broadcast")} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:bg-slate-100">
                      <p className="text-sm font-semibold text-slate-900">Enviar comunicado</p>
                      <p className="mt-1 text-xs text-slate-500">Push a pasajeros, conductores o flotillas.</p>
                    </button>
                    <button onClick={() => setActiveTab("settings")} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:bg-slate-100">
                      <p className="text-sm font-semibold text-slate-900">Ajustar configuración</p>
                      <p className="mt-1 text-xs text-slate-500">Comisión, seguridad, registros y mantenimiento.</p>
                    </button>
                  </div>
                </Card>

                <Card className="p-5">
                  <h3 className="font-semibold text-slate-900">Salud del Sistema</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <span className="text-emerald-800">Cola de viajes</span>
                      <span className="font-bold text-emerald-700">Estable</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                      <span className="text-blue-800">Panel en vivo</span>
                      <span className="font-bold text-blue-700">Activo</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                      <span className="text-amber-800">Riesgo operativo</span>
                      <span className="font-bold text-amber-700">Moderado</span>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    Recomendación: prioriza aprobación de conductores pendientes y revisa señales SOS en la pestaña de mensajes.
                  </div>
                </Card>
              </div>

              {drivers.filter(d => d.status === "pending").length > 0 && (
                <Card className="p-4 border-yellow-200 bg-yellow-50">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-yellow-600" />
                    <p className="text-sm font-semibold text-yellow-800">{drivers.filter(d => d.status === "pending").length} conductor(es) esperando aprobación</p>
                    <Button size="sm" onClick={() => setActiveTab("drivers")} className="ml-auto bg-yellow-500 hover:bg-yellow-600 text-white text-xs gap-1">Ver <ChevronRight size={12} /></Button>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── GOD'S EYE ── */}
          {activeTab === "godsEye" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div><h2 className="text-lg font-bold text-slate-900">God's Eye — Mapa en Tiempo Real</h2><p className="text-sm text-slate-500">Todos los conductores activos en tiempo real</p></div>
                <div className="flex gap-3 text-xs">
                  {[{ color: "bg-green-500", label: "Disponible" }, { color: "bg-blue-500", label: "En viaje" }, { color: "bg-slate-400", label: "Inactivo" }, { color: "bg-red-500", label: "Suspendido" }].map(s => (
                    <div key={s.label} className="flex items-center gap-1.5"><div className={`w-2.5 h-2.5 rounded-full ${s.color}`} /><span className="text-slate-600">{s.label}</span></div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3">
                  <Card className="overflow-hidden" style={{ height: "500px", position: "relative" }}>
                    <LeafletMap height="100%" onMapReady={handleMapReady} className="absolute inset-0 w-full h-full" />
                  </Card>
                </div>
                <div className="space-y-3">
                  <Card className="p-4">
                    <h3 className="font-semibold text-slate-900 text-sm mb-3">Conductores</h3>
                    <div className="space-y-2">
                      {drivers.map(d => (
                        <div key={d.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50">
                          <div className="relative"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold">{d.name[0]}</div>{d.online && <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 border border-white rounded-full" />}</div>
                          <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-slate-900 truncate">{d.name.split(" ")[0]}</p><p className="text-xs text-slate-500 truncate">{d.vehicle.split(" ")[0]}</p></div>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColors[d.status]}`}>{d.online ? "●" : "○"}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <h3 className="font-semibold text-slate-900 text-sm mb-2">Estadísticas Live</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">En línea</span><span className="font-bold text-green-600">{drivers.filter(d => d.online).length}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Pendientes</span><span className="font-bold text-yellow-600">{drivers.filter(d => d.status === "pending").length}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Suspendidos</span><span className="font-bold text-red-600">{drivers.filter(d => d.status === "suspended").length}</span></div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* ── CONDUCTORES ── */}
          {activeTab === "drivers" && (
            <div className="space-y-4">
              {drivers.filter(d => d.status === "pending").length > 0 && (
                <Card className="p-4 border-yellow-200 bg-yellow-50">
                  <div className="flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-yellow-600" /><h3 className="font-semibold text-yellow-800">Pendientes de aprobación</h3></div>
                  {drivers.filter(d => d.status === "pending").map(d => (
                    <div key={d.id} className="flex items-center justify-between py-2 border-t border-yellow-200">
                      <div><p className="font-medium text-slate-900 text-sm">{d.name}</p><p className="text-xs text-slate-500">{d.vehicle} · {d.phone}</p></div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleDriverAction(d.id, "approve")} className="bg-green-500 hover:bg-green-600 text-white text-xs gap-1"><UserCheck size={12} /> Aprobar</Button>
                        <Button size="sm" variant="outline" onClick={() => handleDriverAction(d.id, "delete")} className="text-red-500 border-red-200 text-xs gap-1"><UserX size={12} /> Rechazar</Button>
                      </div>
                    </div>
                  ))}
                </Card>
              )}
              <div className="flex gap-3">
                <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Buscar conductor..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" /></div>
                <Button variant="outline" className="gap-2 text-sm"><Download size={15} /> Exportar</Button>
              </div>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200"><tr>{["Conductor", "Vehículo", "Estado", "Rating", "Viajes", "Ganancias", "Acciones"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {drivers.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase())).map(d => (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="relative"><div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm">{d.name[0]}</div>{d.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />}</div><div><p className="font-semibold text-slate-900">{d.name}</p><p className="text-xs text-slate-500">{d.phone}</p></div></div></td>
                          <td className="px-4 py-3"><p className="text-slate-900">{d.vehicle}</p><p className="text-xs text-slate-500 font-mono">{d.plate}</p></td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[d.status]}`}>{statusLabels[d.status]}</span></td>
                          <td className="px-4 py-3"><div className="flex items-center gap-1"><Star size={13} className="text-yellow-500 fill-yellow-500" /><span className="font-semibold">{d.rating || "—"}</span></div></td>
                          <td className="px-4 py-3 font-medium">{d.trips}</td>
                          <td className="px-4 py-3 font-semibold text-green-600">{d.earnings}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => setEditingDriver(d)} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500" title="Permisos"><Shield size={14} /></button>
                              <button onClick={() => { setActiveTab("messages"); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="Enviar mensaje"><MessageCircle size={14} /></button>
                              {d.status === "active" && <button onClick={() => handleDriverAction(d.id, "suspend")} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Suspender"><UserX size={14} /></button>}
                              {(d.status === "suspended" || d.status === "inactive") && <button onClick={() => handleDriverAction(d.id, "activate")} className="p-1.5 rounded-lg hover:bg-green-50 text-green-500" title="Activar"><UserCheck size={14} /></button>}
                              {d.status === "pending" && <button onClick={() => handleDriverAction(d.id, "approve")} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Aprobar"><CheckCircle size={14} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ── CLIENTES ── */}
          {activeTab === "clients" && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" /></div>
                <Button variant="outline" className="gap-2 text-sm"><Download size={15} /> Exportar CSV</Button>
              </div>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200"><tr>{["Cliente", "Contacto", "Viajes", "Gastado", "Rating", "Estado", "Acciones"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {clients.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())).map(c => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">{c.name[0]}</div><div><p className="font-semibold text-slate-900">{c.name}</p><p className="text-xs text-slate-500">Desde {c.joinDate}</p></div></div></td>
                          <td className="px-4 py-3"><p className="text-slate-900">{c.phone}</p><p className="text-xs text-slate-500">{c.email}</p></td>
                          <td className="px-4 py-3 font-medium">{c.trips}</td>
                          <td className="px-4 py-3 font-semibold text-green-600">{c.spent}</td>
                          <td className="px-4 py-3"><div className="flex items-center gap-1"><Star size={13} className="text-yellow-500 fill-yellow-500" /><span className="font-semibold">{c.rating}</span></div></td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{c.status === "active" ? "Activo" : "Suspendido"}</span></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setActiveTab("messages"); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="Enviar mensaje"><MessageCircle size={14} /></button>
                              <button onClick={() => { setActiveTab("messages"); setMessageForm(f => ({ ...f, to: "specific", subject: `Mensaje para ${c.name}` })); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="Mensaje"><MessageCircle size={14} /></button>
                              {c.status === "active" ? <button onClick={() => handleClientAction(c.id, "suspend")} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Suspender"><UserX size={14} /></button> : <button onClick={() => handleClientAction(c.id, "activate")} className="p-1.5 rounded-lg hover:bg-green-50 text-green-500" title="Activar"><UserCheck size={14} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ── VIAJES ── */}
          {activeTab === "trips" && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[{ label: "Total Hoy", value: "47", color: "text-slate-700" }, { label: "Completados", value: "38", color: "text-green-600" }, { label: "En progreso", value: "6", color: "text-blue-600" }, { label: "Cancelados", value: "3", color: "text-red-600" }].map((s, i) => (
                  <Card key={i} className="p-4 text-center"><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p><p className="text-xs text-slate-500 mt-1">{s.label}</p></Card>
                ))}
              </div>
              <Card className="p-5">
                <h3 className="font-semibold text-slate-900 mb-4">Viajes en Tiempo Real</h3>
                <div className="space-y-3">
                  {[{ client: "María García", driver: "Carlos M.", from: "Centro", to: "Aeropuerto", fare: "$42", status: "in_progress", time: "10:32" }, { client: "Juan López", driver: "Pedro R.", from: "Metro", to: "Hotel", fare: "$18", status: "completed", time: "10:45" }, { client: "Ana Martínez", driver: "—", from: "Hospital", to: "Centro", fare: "$15", status: "requested", time: "10:51" }].map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${t.status === "in_progress" ? "bg-blue-500 animate-pulse" : t.status === "completed" ? "bg-green-500" : "bg-yellow-500"}`} />
                        <div><p className="text-sm font-semibold text-slate-900">{t.client} → {t.driver}</p><p className="text-xs text-slate-500">{t.from} → {t.to}</p></div>
                      </div>
                      <div className="text-right"><p className="font-bold text-green-600">{t.fare}</p><p className="text-xs text-slate-500">{t.time}</p></div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── MENSAJES RECIBIDOS ── */}
          {activeTab === "messages" && (
            <MessagesInbox />
          )}

          {/* ── PERMISOS ── */}
          {activeTab === "permissions" && (
            <div className="space-y-4">
              <Card className="p-4 bg-blue-50 border-blue-200"><div className="flex items-center gap-2"><Shield size={16} className="text-blue-600" /><p className="text-sm text-blue-800 font-medium">Gestiona los permisos individuales de cada conductor. Los cambios se aplican inmediatamente.</p></div></Card>
              <div className="space-y-3">
                {drivers.filter(d => d.status !== "pending").map(d => (
                  <Card key={d.id} className="p-5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">{d.name[0]}</div>{d.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />}</div>
                      <div className="flex-1"><p className="font-semibold text-slate-900">{d.name}</p><p className="text-xs text-slate-500">{d.vehicle} · <span className={`font-medium ${d.status === "active" ? "text-green-600" : "text-red-600"}`}>{statusLabels[d.status]}</span></p></div>
                      <div className="flex items-center gap-1"><Star size={13} className="text-yellow-500 fill-yellow-500" /><span className="text-sm font-bold text-slate-700">{d.rating || "—"}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: "canAcceptTrips" as const, label: "Aceptar viajes", desc: "Puede recibir solicitudes", icon: Navigation },
                        { key: "canViewClientPhone" as const, label: "Ver teléfono del cliente", desc: "Acceso al número del pasajero", icon: Phone },
                        { key: "canSetOwnFare" as const, label: "Establecer tarifa propia", desc: "Puede modificar el precio", icon: DollarSign },
                        { key: "canCancelTrip" as const, label: "Cancelar viajes", desc: "Puede cancelar viajes aceptados", icon: XCircle },
                      ].map(perm => (
                        <div key={perm.key} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${d.permissions[perm.key] ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${d.permissions[perm.key] ? "bg-green-500" : "bg-slate-300"}`}><perm.icon size={14} className="text-white" /></div>
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-900">{perm.label}</p><p className="text-xs text-slate-500 mt-0.5">{perm.desc}</p></div>
                          <button onClick={() => handlePermissionToggle(d.id, perm.key)} className={`flex-shrink-0 w-10 h-6 rounded-full transition-colors relative ${d.permissions[perm.key] ? "bg-green-500" : "bg-slate-300"}`}>
                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${d.permissions[perm.key] ? "translate-x-4" : "translate-x-0.5"}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── EDITOR WEB ── */}
          {activeTab === "editor" && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button onClick={() => setEditorView("form")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${editorView === "form" ? "bg-green-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    <Edit3 size={14} /> Editor
                  </button>
                  <button onClick={() => { handleSaveConfig(); setEditorView("preview"); setPreviewKey(k => k + 1); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${editorView === "preview" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    <Eye size={14} /> Vista previa
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleResetConfig} className="gap-2 text-sm text-red-500 border-red-200 hover:bg-red-50">
                    <RotateCcw size={14} /> Restablecer
                  </Button>
                  <Button size="sm" onClick={handleSaveConfig} className="gap-2 text-sm bg-green-500 hover:bg-green-600 text-white">
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {isSaving ? "Guardando..." : "Guardar cambios"}
                  </Button>
                  <a href="/" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2 text-sm">
                      <ExternalLink size={14} /> Ver sitio
                    </Button>
                  </a>
                  {lastSaved && (
                    <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                      <Database size={12} />
                      Guardado en BD · {lastSaved.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                </div>
              </div>

              {/* Preview iframe */}
              {editorView === "preview" && (
                <Card className="overflow-hidden" style={{ height: "600px" }}>
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-yellow-400" /><div className="w-3 h-3 rounded-full bg-green-400" /></div>
                      <span className="text-xs text-slate-500 font-mono ml-2">whatsapptaxi.com — Vista previa en vivo</span>
                    </div>
                    <button onClick={() => setPreviewKey(k => k + 1)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-200 transition-colors">
                      <RefreshCw size={12} /> Recargar
                    </button>
                  </div>
                  <iframe
                    key={previewKey}
                    src="/"
                    className="w-full border-0"
                    style={{ height: "calc(100% - 40px)" }}
                    title="Vista previa del landing"
                  />
                </Card>
              )}

              {/* Editor form */}
              {editorView === "form" && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="space-y-1">
                {[
                  { id: "hero" as EditorSection, label: "Hero / Inicio", icon: Monitor },
                  { id: "colors" as EditorSection, label: "Colores y Fuentes", icon: Palette },
                  { id: "contact" as EditorSection, label: "Contacto", icon: Phone },
                  { id: "footer" as EditorSection, label: "Footer", icon: Layers },
                  { id: "meta" as EditorSection, label: "SEO / Meta Tags", icon: Globe },
                  { id: "features" as EditorSection, label: "Funcionalidades", icon: Sliders },
                  { id: "pricing" as EditorSection, label: "Precios y Tarifas", icon: DollarSign },
                  { id: "testimonials" as EditorSection, label: "Testimonios", icon: Star },
                  { id: "vehicles" as EditorSection, label: "Vehículos y Extras", icon: Car },
                  { id: "email" as EditorSection, label: "Email / SMTP", icon: Mail },
                ].map(s => (
                  <button key={s.id} onClick={() => setEditorSection(s.id)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${editorSection === s.id ? "bg-green-500 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                    <s.icon size={15} />{s.label}
                  </button>
                ))}
                <Button onClick={handleSaveConfig} className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white gap-2 text-sm"><Save size={14} /> Guardar cambios</Button>
              </div>
              <Card className="lg:col-span-3 p-5">
                {editorSection === "hero" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Monitor size={16} /> Sección Hero / Inicio</h3>
                    {/* Logo Upload */}
                    <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                      <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2"><ImageIcon size={15} className="text-green-500" /> Logo del sitio</p>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center flex-shrink-0">
                          {siteConfig.logoUrl ? (
                            <img src={siteConfig.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: siteConfig.primaryColor }}>🚕</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors w-fit">
                            <Upload size={14} className="text-green-500" />
                            Subir logo (PNG, JPG, SVG)
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 2 * 1024 * 1024) { toast.error("El archivo debe ser menor a 2MB"); return; }
                                const reader = new FileReader();
                                reader.onload = ev => {
                                  const dataUrl = ev.target?.result as string;
                                  setSiteConfig(c => ({ ...c, logoUrl: dataUrl }));
                                  toast.success("Logo cargado. Haz clic en Guardar para aplicarlo.");
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                          <p className="text-xs text-slate-400 mt-1.5">Recomendado: 512×512px, fondo transparente (PNG)</p>
                          {siteConfig.logoUrl && (
                            <button onClick={() => setSiteConfig(c => ({ ...c, logoUrl: "" }))} className="text-xs text-red-500 hover:text-red-700 mt-1 flex items-center gap-1">
                              <XCircle size={11} /> Eliminar logo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {[{ key: "siteTitle", label: "Título del sitio web", type: "text" }, { key: "tagline", label: "Subtítulo / Tagline", type: "text" }, { key: "heroTitle", label: "Título principal del Hero", type: "textarea" }, { key: "heroDesc", label: "Descripción del Hero", type: "textarea" }, { key: "ctaText", label: "Texto del botón CTA", type: "text" }].map(f => (
                      <div key={f.key}>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                        {f.type === "textarea" ? <textarea value={(siteConfig as any)[f.key]} onChange={e => setSiteConfig(c => ({ ...c, [f.key]: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none" /> : <input type="text" value={(siteConfig as any)[f.key]} onChange={e => setSiteConfig(c => ({ ...c, [f.key]: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" />}
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div><p className="text-sm font-medium text-slate-900">Mostrar animaciones</p><p className="text-xs text-slate-500">Demo de 60 segundos en "Cómo funciona"</p></div>
                      <button onClick={() => setSiteConfig(c => ({ ...c, showAnimations: !c.showAnimations }))} className={`w-10 h-6 rounded-full transition-colors relative ${siteConfig.showAnimations ? "bg-green-500" : "bg-slate-300"}`}><div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${siteConfig.showAnimations ? "translate-x-4" : "translate-x-0.5"}`} /></button>
                    </div>
                  </div>
                )}
                {editorSection === "colors" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Palette size={16} /> Colores y Tipografía</h3>
                    {[{ key: "primaryColor", label: "Color primario (verde WhatsApp)" }, { key: "secondaryColor", label: "Color secundario (fondo oscuro)" }, { key: "accentColor", label: "Color de acento" }].map(f => (
                      <div key={f.key}>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                        <div className="flex items-center gap-3">
                          <input type="color" value={(siteConfig as any)[f.key]} onChange={e => setSiteConfig(c => ({ ...c, [f.key]: e.target.value }))} className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer" />
                          <input type="text" value={(siteConfig as any)[f.key]} onChange={e => setSiteConfig(c => ({ ...c, [f.key]: e.target.value }))} className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-green-500 outline-none" />
                        </div>
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipografía principal</label>
                      <select value={siteConfig.fontFamily} onChange={e => setSiteConfig(c => ({ ...c, fontFamily: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none">
                        {["Sora", "Inter", "Poppins", "Roboto", "Montserrat", "Nunito"].map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <p className="text-xs text-slate-500 mb-2">Vista previa:</p>
                      <div className="flex gap-2">{[siteConfig.primaryColor, siteConfig.secondaryColor, siteConfig.accentColor].map((c, i) => <div key={i} className="w-10 h-10 rounded-lg shadow" style={{ background: c }} />)}</div>
                    </div>
                  </div>
                )}
                {editorSection === "contact" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Phone size={16} /> Información de Contacto</h3>
                    {[{ key: "contactEmail", label: "Email de soporte", type: "email" }, { key: "contactPhone", label: "Teléfono de contacto", type: "tel" }, { key: "contactAddress", label: "Dirección / Ciudad", type: "text" }].map(f => (
                      <div key={f.key}><label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label><input type={f.type} value={(siteConfig as any)[f.key]} onChange={e => setSiteConfig(c => ({ ...c, [f.key]: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" /></div>
                    ))}
                  </div>
                )}
                {editorSection === "footer" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Layers size={16} /> Footer</h3>
                    {[{ key: "footerText", label: "Texto del footer (copyright)" }, { key: "footerLinks", label: "Links del footer (separados por |)" }].map(f => (
                      <div key={f.key}><label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label><input type="text" value={(siteConfig as any)[f.key]} onChange={e => setSiteConfig(c => ({ ...c, [f.key]: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" /></div>
                    ))}
                    <div className="pt-2">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold text-slate-800">Contenido de paginas del Footer</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleExportFooterPages}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
                          >
                            Exportar JSON
                          </button>
                          <button
                            type="button"
                            onClick={() => footerImportRef.current?.click()}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            Importar JSON
                          </button>
                          <input
                            ref={footerImportRef}
                            type="file"
                            accept="application/json"
                            className="hidden"
                            onChange={handleImportFooterPages}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">Estos textos apareceran al entrar en cada enlace del footer.</p>
                      <div className="space-y-4">
                        {Object.entries((siteConfig as any).footerPages || {}).map(([slug, page]: [string, any]) => (
                          <div key={slug} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Titulo ({slug})</label>
                                <input
                                  type="text"
                                  value={page?.title || ""}
                                  onChange={e => {
                                    const current = (siteConfig as any).footerPages || {};
                                    setSiteConfig(c => ({
                                      ...c,
                                      footerPages: {
                                        ...current,
                                        [slug]: { ...(current[slug] || {}), title: e.target.value },
                                      },
                                    } as any));
                                  }}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                />
                              </div>
                              <div className="text-xs text-slate-500 flex items-end pb-2">
                                URL: /info/{slug}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Contenido (editor enriquecido)</label>
                              <RichTextEditor
                                value={page?.content || ""}
                                onChange={(next) => {
                                  const current = (siteConfig as any).footerPages || {};
                                  setSiteConfig(c => ({
                                    ...c,
                                    footerPages: {
                                      ...current,
                                      [slug]: { ...(current[slug] || {}), content: next },
                                    },
                                  } as any));
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-xl">
                      <p className="text-white text-xs">{siteConfig.footerText}</p>
                      <div className="flex gap-3 mt-1">{siteConfig.footerLinks.split("|").map((l, i) => <span key={i} className="text-green-400 text-xs cursor-pointer hover:underline">{l.trim()}</span>)}</div>
                    </div>
                  </div>
                )}
                {editorSection === "meta" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Globe size={16} /> SEO y Meta Tags</h3>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Meta descripción</label><textarea value={siteConfig.metaDescription} onChange={e => setSiteConfig(c => ({ ...c, metaDescription: e.target.value }))} rows={3} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Palabras clave</label><input type="text" value={siteConfig.metaKeywords} onChange={e => setSiteConfig(c => ({ ...c, metaKeywords: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" /></div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">Vista previa en Google:</p>
                      <p className="text-blue-600 text-sm font-medium">{siteConfig.siteTitle}</p>
                      <p className="text-green-700 text-xs">whatsapptaxi.com</p>
                      <p className="text-slate-600 text-xs mt-1">{siteConfig.metaDescription}</p>
                    </div>
                  </div>
                )}
                {editorSection === "features" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Sliders size={16} /> Funcionalidades del Sitio</h3>
                    {[{ key: "showPricing", label: "Mostrar sección de precios", desc: "Visible en el landing page" }, { key: "showTestimonials", label: "Mostrar testimonios", desc: "Sección de reseñas" }, { key: "showAnimations", label: "Demo animada (60 segundos)", desc: "Animación en 'Cómo funciona'" }, { key: "allowRegistration", label: "Permitir nuevos registros", desc: "Habilitar formulario de registro" }, { key: "requireEmailVerification", label: "Verificación de email", desc: "Confirmar email al registrarse" }, { key: "maintenanceMode", label: "Modo mantenimiento", desc: "Mostrar página de mantenimiento" }, { key: "surgePricing", label: "Tarifa dinámica activa", desc: "Precios variables por demanda" }].map(f => (
                      <div key={f.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div><p className="text-sm font-medium text-slate-900">{f.label}</p><p className="text-xs text-slate-500">{f.desc}</p></div>
                        <button onClick={() => setSiteConfig(c => ({ ...c, [f.key]: !(c as any)[f.key] }))} className={`w-10 h-6 rounded-full transition-colors relative ${(siteConfig as any)[f.key] ? "bg-green-500" : "bg-slate-300"}`}><div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(siteConfig as any)[f.key] ? "translate-x-4" : "translate-x-0.5"}`} /></button>
                      </div>
                    ))}
                  </div>
                )}
                {editorSection === "pricing" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2"><DollarSign size={16} /> Precios y Tarifas</h3>
                    {[{ key: "commissionRate", label: "Comisión de la plataforma (%)" }, { key: "basefare", label: "Tarifa base ($)" }, { key: "pricePerKm", label: "Precio por kilómetro ($)" }, { key: "surgeMultiplier", label: "Multiplicador de hora pico (×)" }].map(f => (
                      <div key={f.key}><label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label><input type="number" value={(siteConfig as any)[f.key]} onChange={e => setSiteConfig(c => ({ ...c, [f.key]: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" /></div>
                    ))}
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <p className="text-sm font-semibold text-green-800 mb-2">Ejemplo de tarifa calculada:</p>
                      <p className="text-xs text-green-700">Viaje de 10 km = ${(parseFloat(siteConfig.basefare) + 10 * parseFloat(siteConfig.pricePerKm)).toFixed(2)} (tarifa normal)</p>
                      <p className="text-xs text-green-700">Con surge ×{siteConfig.surgeMultiplier} = ${((parseFloat(siteConfig.basefare) + 10 * parseFloat(siteConfig.pricePerKm)) * parseFloat(siteConfig.surgeMultiplier)).toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </Card>
                {editorSection === "testimonials" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Star size={16} /> Testimonios de Clientes</h3>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div><p className="text-sm font-medium text-slate-900">Mostrar testimonios en el landing</p><p className="text-xs text-slate-500">Activa para que sean visibles</p></div>
                      <button onClick={() => setSiteConfig(c => ({ ...c, showTestimonials: !c.showTestimonials }))} className={`w-10 h-6 rounded-full transition-colors relative ${siteConfig.showTestimonials ? "bg-green-500" : "bg-slate-300"}`}><div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${siteConfig.showTestimonials ? "translate-x-4" : "translate-x-0.5"}`} /></button>
                    </div>
                    {((siteConfig as any).testimonials || []).map((t: any, idx: number) => (
                      <div key={t.id} className="p-4 border border-slate-200 rounded-xl space-y-3 bg-slate-50">
                        <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-800">Testimonio #{idx + 1}</p><button onClick={() => setSiteConfig(c => ({ ...c, testimonials: (c as any).testimonials.filter((_: any, i: number) => i !== idx) } as any))} className="text-red-400 hover:text-red-600"><XCircle size={16} /></button></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label><input type="text" value={t.name} onChange={e => { const ts = [...(siteConfig as any).testimonials]; ts[idx] = { ...ts[idx], name: e.target.value }; setSiteConfig(c => ({ ...c, testimonials: ts } as any)); }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" /></div>
                          <div><label className="block text-xs font-medium text-slate-600 mb-1">Empresa</label><input type="text" value={t.company} onChange={e => { const ts = [...(siteConfig as any).testimonials]; ts[idx] = { ...ts[idx], company: e.target.value }; setSiteConfig(c => ({ ...c, testimonials: ts } as any)); }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" /></div>
                        </div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Testimonio</label><textarea value={t.text} onChange={e => { const ts = [...(siteConfig as any).testimonials]; ts[idx] = { ...ts[idx], text: e.target.value }; setSiteConfig(c => ({ ...c, testimonials: ts } as any)); }} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none" /></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Calificación</label><div className="flex gap-1">{[1,2,3,4,5].map(star => <button key={star} onClick={() => { const ts = [...(siteConfig as any).testimonials]; ts[idx] = { ...ts[idx], rating: star }; setSiteConfig(c => ({ ...c, testimonials: ts } as any)); }} className={`text-xl transition-transform hover:scale-110 ${star <= t.rating ? "text-yellow-400" : "text-slate-300"}`}>★</button>)}</div></div>
                      </div>
                    ))}
                    <button onClick={() => setSiteConfig(c => ({ ...c, testimonials: [...((c as any).testimonials || []), { id: Date.now().toString(), name: "", company: "", text: "", rating: 5, avatarUrl: "" }] } as any))} className="w-full py-3 border-2 border-dashed border-green-300 rounded-xl text-green-600 text-sm font-medium hover:bg-green-50 transition-colors flex items-center justify-center gap-2">+ Agregar testimonio</button>
                    {((siteConfig as any).testimonials || []).length === 0 && <div className="text-center py-8 text-slate-400"><Star size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm">No hay testimonios. Haz clic en "Agregar testimonio".</p></div>}
                  </div>
                )}
                                {editorSection === "vehicles" && (
                  <VehiclesExtrasEditor />
                )}
                {editorSection === "email" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Mail size={16} /> Configuración de Email</h3>
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200"><p className="text-sm font-semibold text-blue-800 mb-1">📧 Email de notificaciones</p><p className="text-xs text-blue-600">Los mensajes del formulario de contacto y alertas llegarán a este correo.</p></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Email donde recibirás los mensajes <span className="text-red-500">*</span></label><input type="email" value={(siteConfig as any).notificationEmail || ""} onChange={e => setSiteConfig(c => ({ ...c, notificationEmail: e.target.value } as any))} placeholder="tu@correo.com" className="w-full px-3 py-2.5 border-2 border-green-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" /></div>
                    <div className="border-t border-slate-200 pt-4">
                      <p className="text-sm font-semibold text-slate-800 mb-1">Configuración SMTP <span className="text-xs font-normal text-slate-400">(opcional)</span></p>
                      <p className="text-xs text-slate-500 mb-3">Si configuras SMTP, los emails se enviarán desde tu propio servidor. Si lo dejas vacío, se usará el servicio por defecto.</p>
                      {[{ key: "smtpHost", label: "Servidor SMTP", placeholder: "smtp.gmail.com" }, { key: "smtpPort", label: "Puerto", placeholder: "587" }, { key: "smtpUser", label: "Usuario SMTP", placeholder: "tu@gmail.com" }, { key: "smtpFrom", label: "Email remitente (From)", placeholder: "noreply@tudominio.com" }].map(f => (
                        <div key={f.key} className="mb-3"><label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label><input type="text" value={(siteConfig as any)[f.key] || ""} onChange={e => setSiteConfig(c => ({ ...c, [f.key]: e.target.value } as any))} placeholder={f.placeholder} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" /></div>
                      ))}
                      <div className="mb-3"><label className="block text-xs font-medium text-slate-600 mb-1">Contraseña SMTP</label><input type="password" value={(siteConfig as any).smtpPass || ""} onChange={e => setSiteConfig(c => ({ ...c, smtpPass: e.target.value } as any))} placeholder="••••••••" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" /></div>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200"><p className="text-xs text-amber-700"><strong>Gmail:</strong> Usa "Contraseña de aplicación". Ve a Google Account → Seguridad → Contraseñas de aplicación.</p></div>
                    {/* Test SMTP button */}
                    <div className="border-t border-slate-200 pt-4 space-y-3">
                      <button
                        onClick={handleTestSmtp}
                        disabled={testingSmtp}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 text-white"
                        style={{ background: testingSmtp ? "#94a3b8" : "#3B82F6" }}
                      >
                        {testingSmtp ? (
                          <><Loader2 size={15} className="animate-spin" /> Probando conexión...</>
                        ) : (
                          <><Mail size={15} /> Enviar email de prueba al correo configurado</>
                        )}
                      </button>
                      {smtpTestResult && (
                        <div className={`p-3 rounded-xl text-sm flex items-start gap-2 ${smtpTestResult.ok ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                          {smtpTestResult.ok ? <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" /> : <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />}
                          <p>{smtpTestResult.msg}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
            )}
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[{ label: "Tasa de conversión", value: "68%", sub: "Solicitudes → Completados", color: "text-green-600" }, { label: "Tiempo promedio", value: "4.2 min", sub: "Espera hasta asignación", color: "text-blue-600" }, { label: "Ticket promedio", value: "$18.50", sub: "Por viaje completado", color: "text-purple-600" }, { label: "NPS Score", value: "4.7 ⭐", sub: "Satisfacción general", color: "text-yellow-600" }].map((s, i) => (
                  <Card key={i} className="p-4 text-center"><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p><p className="text-sm font-medium text-slate-700 mt-1">{s.label}</p><p className="text-xs text-slate-500">{s.sub}</p></Card>
                ))}
              </div>
              <Card className="p-5">
                <h3 className="font-semibold text-slate-900 mb-4">Tendencia Mensual</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip />
                    <Bar dataKey="viajes" fill="#25D366" radius={[4,4,0,0]} name="Viajes" />
                    <Bar dataKey="ingresos" fill="#3B82F6" radius={[4,4,0,0]} name="Ingresos $" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-3">Top Conductores</h3>
                  {drivers.sort((a, b) => b.trips - a.trips).slice(0, 4).map((d, i) => (
                    <div key={d.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">#{i+1}</span>
                      <div className="flex-1"><p className="text-sm font-medium text-slate-900">{d.name}</p><p className="text-xs text-slate-500">{d.trips} viajes · {d.earnings}</p></div>
                      <div className="flex items-center gap-0.5"><Star size={12} className="text-yellow-500 fill-yellow-500" /><span className="text-xs font-bold">{d.rating}</span></div>
                    </div>
                  ))}
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-3">Top Clientes</h3>
                  {clients.sort((a, b) => b.trips - a.trips).slice(0, 4).map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">#{i+1}</span>
                      <div className="flex-1"><p className="text-sm font-medium text-slate-900">{c.name}</p><p className="text-xs text-slate-500">{c.trips} viajes · {c.spent}</p></div>
                      <div className="flex items-center gap-0.5"><Star size={12} className="text-yellow-500 fill-yellow-500" /><span className="text-xs font-bold">{c.rating}</span></div>
                    </div>
                  ))}
                </Card>
              </div>
            </div>
          )}

          {/* ── PAYMENTS / API ── */}
          {activeTab === "payments" && (
            <div className="space-y-6 max-w-3xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"><DollarSign size={20} className="text-white" /></div>
                <div><h2 className="text-xl font-bold text-slate-900">Configuración de Pagos</h2><p className="text-sm text-slate-500">Configura tus claves API para procesar pagos reales</p></div>
              </div>

              {/* STRIPE */}
              <Card className="p-6 border-2 border-violet-100">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white font-bold text-sm">S</div>
                  <div>
                    <h3 className="font-bold text-slate-900">Stripe</h3>
                    <p className="text-xs text-slate-500">Pagos con tarjeta de crédito/débito</p>
                  </div>
                  <div className="ml-auto">
                    <button
                      onClick={() => setSiteConfig(c => ({ ...c, stripeEnabled: !(c as any).stripeEnabled } as any))}
                      className={`w-12 h-6 rounded-full transition-colors relative ${(siteConfig as any).stripeEnabled ? "bg-violet-500" : "bg-slate-300"}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(siteConfig as any).stripeEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>

                {/* Modo Test/Live */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Modo de operación</label>
                  <div className="flex gap-2">
                    {["test", "live"].map(mode => (
                      <button key={mode} onClick={() => setSiteConfig(c => ({ ...c, stripeMode: mode } as any))}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${(siteConfig as any).stripeMode === mode || (!((siteConfig as any).stripeMode) && mode === "test") ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                        {mode === "test" ? "🧪 Modo Prueba" : "🚀 Modo Live"}
                      </button>
                    ))}
                  </div>
                  {(!(siteConfig as any).stripeMode || (siteConfig as any).stripeMode === "test") && (
                    <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 px-3 py-1.5 rounded-lg">Tarjeta de prueba: <strong>4242 4242 4242 4242</strong> — cualquier fecha futura y CVC</p>
                  )}
                </div>

                <div className="space-y-3">
                  {[
                    { key: "stripePublishableKey", label: "Publishable Key (pk_...)", placeholder: "pk_test_... o pk_live_...", type: "text" },
                    { key: "stripeSecretKey", label: "Secret Key (sk_...)", placeholder: "sk_test_... o sk_live_...", type: "password" },
                    { key: "stripeWebhookSecret", label: "Webhook Secret (whsec_...)", placeholder: "whsec_...", type: "password" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                      <input type={f.type} value={(siteConfig as any)[f.key] || ""} onChange={e => setSiteConfig(c => ({ ...c, [f.key]: e.target.value } as any))}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-violet-500 outline-none" />
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-600 font-semibold mb-1">¿Dónde obtengo mis claves?</p>
                  <ol className="text-xs text-slate-500 space-y-0.5 list-decimal list-inside">
                    <li>Ve a <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener" className="text-violet-600 underline">dashboard.stripe.com/apikeys</a></li>
                    <li>Copia tu Publishable Key y Secret Key</li>
                    <li>Para el Webhook: Developers → Webhooks → Add endpoint</li>
                    <li>URL del webhook: <code className="bg-slate-200 px-1 rounded text-xs">{window.location.origin}/api/stripe/webhook</code></li>
                  </ol>
                </div>
              </Card>

              {/* PAYPAL */}
              <Card className="p-6 border-2 border-blue-100">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm">P</div>
                  <div>
                    <h3 className="font-bold text-slate-900">PayPal</h3>
                    <p className="text-xs text-slate-500">Pagos con cuenta PayPal y tarjeta</p>
                  </div>
                  <div className="ml-auto">
                    <button
                      onClick={() => setSiteConfig(c => ({ ...c, paypalEnabled: !(c as any).paypalEnabled } as any))}
                      className={`w-12 h-6 rounded-full transition-colors relative ${(siteConfig as any).paypalEnabled ? "bg-blue-500" : "bg-slate-300"}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(siteConfig as any).paypalEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>

                {/* Modo Sandbox/Live */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Modo de operación</label>
                  <div className="flex gap-2">
                    {["sandbox", "live"].map(mode => (
                      <button key={mode} onClick={() => setSiteConfig(c => ({ ...c, paypalMode: mode } as any))}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${(siteConfig as any).paypalMode === mode || (!((siteConfig as any).paypalMode) && mode === "sandbox") ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                        {mode === "sandbox" ? "🧪 Sandbox" : "🚀 Producción"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { key: "paypalClientId", label: "Client ID", placeholder: "AYour-PayPal-Client-ID...", type: "text" },
                    { key: "paypalClientSecret", label: "Client Secret", placeholder: "EYour-PayPal-Secret...", type: "password" },
                    { key: "paypalWebhookId", label: "Webhook ID (opcional)", placeholder: "ID del webhook en PayPal", type: "text" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                      <input type={f.type} value={(siteConfig as any)[f.key] || ""} onChange={e => setSiteConfig(c => ({ ...c, [f.key]: e.target.value } as any))}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-600 font-semibold mb-1">¿Dónde obtengo mis credenciales?</p>
                  <ol className="text-xs text-slate-500 space-y-0.5 list-decimal list-inside">
                    <li>Ve a <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noopener" className="text-blue-600 underline">developer.paypal.com</a></li>
                    <li>Crea una nueva app en "My Apps & Credentials"</li>
                    <li>Copia el Client ID y el Secret</li>
                    <li>Para producción, activa tu cuenta de negocio verificada</li>
                  </ol>
                </div>
              </Card>

              {/* Comisiones */}
              <Card className="p-6 border-2 border-green-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center"><TrendingUp size={18} className="text-white" /></div>
                  <div><h3 className="font-bold text-slate-900">Comisiones de la Plataforma</h3><p className="text-xs text-slate-500">Porcentaje que retiene la plataforma por cada viaje</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "commissionRate", label: "Comisión estándar (%)", placeholder: "15" },
                    { key: "commissionPremium", label: "Comisión Premium (%)", placeholder: "20" },
                    { key: "minFare", label: "Tarifa mínima ($)", placeholder: "5.00" },
                    { key: "baseFare", label: "Tarifa base ($)", placeholder: "2.50" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                      <input type="number" value={(siteConfig as any)[f.key] || ""} onChange={e => setSiteConfig(c => ({ ...c, [f.key]: e.target.value } as any))}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-xs text-green-700">💡 <strong>Ejemplo:</strong> Con 15% de comisión y 100 viajes/día de $15 promedio, generas <strong>$225/día</strong> ($6,750/mes) solo de comisiones.</p>
                </div>
              </Card>

              <Button onClick={handleSaveConfig} className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold gap-2 text-base">
                <Save size={18} /> Guardar configuración de pagos
              </Button>
            </div>
          )}


          {/* ── REFERIDOS ── */}
          {activeTab === "referrals" && (
            <ReferralAdminPanel />
          )}

          {/* ── DISPATCHERS ── */}
          {activeTab === "dispatchers" && (
            <DispatcherAdminPanel />
          )}

          {/* ── FAQ EDITOR ── */}
          {/* ── RESERVA MANUAL ── */}
          {activeTab === "manualBooking" && (
            <ManualBookingPanel drivers={drivers} />
          )}

          {/* ── SURGE PRICING ── */}
          {activeTab === "surgePricing" && (
            <SurgePricingPanel />
          )}

          {/* ── FAQ EDITOR ── */}
          {/* ── BROADCAST ── */}
          {activeTab === "broadcast" && (
            <BroadcastPanel />
          )}

          {/* ── SAFETY TIPS ── */}
          {activeTab === "safetyTips" && (
            <SafetyTipsAdminPanel />
          )}

          {/* ── PAQUETES ── */}
          {activeTab === "parcels" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-slate-900">Gestión de Paquetes</h1>
              <AdminParcelStats />
            </div>
          )}

          {/* ── AUDIT LOGS ── */}
          {activeTab === "auditLogs" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Auditoría de Eventos</h1>
                <p className="text-sm text-slate-500">Registro administrativo para trazabilidad y compliance.</p>
              </div>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {['Hora', 'Actor', 'Módulo', 'Acción', 'Estado'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { time: 'Hoy 10:42', actor: 'Super Admin', module: 'Conductores', action: 'Aprobó perfil d4', ok: true },
                        { time: 'Hoy 10:30', actor: 'Sistema', module: 'Broadcast', action: 'Anuncio activo para clientes', ok: true },
                        { time: 'Hoy 10:14', actor: 'Super Admin', module: 'Pagos', action: 'Actualizó comisión a 20%', ok: true },
                        { time: 'Hoy 09:58', actor: 'Sistema', module: 'Seguridad', action: 'Intento de acceso bloqueado', ok: false },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-500">{row.time}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{row.actor}</td>
                          <td className="px-4 py-3 text-slate-700">{row.module}</td>
                          <td className="px-4 py-3 text-slate-700">{row.action}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {row.ok ? 'OK' : 'Alerta'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ── FAQ EDITOR ── */}
          {activeTab === "faq" && (
            <FAQEditor />
          )}

          {/* ── SETTINGS ── */}
          {activeTab === "settings" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Configuración General</h3>
                {[{ key: "siteTitle", label: "Nombre del sitio web", type: "text" }, { key: "contactEmail", label: "Email de soporte", type: "email" }, { key: "contactPhone", label: "Teléfono de contacto", type: "tel" }, { key: "commissionRate", label: "Comisión de la plataforma (%)", type: "number" }].map(f => (
                  <Card key={f.key} className="p-4"><label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label><input type={f.type} value={(siteConfig as any)[f.key]} onChange={e => setSiteConfig(c => ({ ...c, [f.key]: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" /></Card>
                ))}
                <Button onClick={handleSaveConfig} className="w-full bg-green-500 hover:bg-green-600 text-white gap-2"><Save size={15} /> Guardar configuración</Button>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Acceso y Seguridad</h3>
                {[{ key: "allowRegistration", label: "Permitir nuevos registros", desc: "Usuarios pueden crear cuentas" }, { key: "requireEmailVerification", label: "Verificación de email", desc: "Confirmar email al registrarse" }, { key: "maintenanceMode", label: "Modo mantenimiento", desc: "Mostrar página de mantenimiento" }, { key: "surgePricing", label: "Tarifa dinámica activa", desc: "Precios variables por demanda" }].map(f => (
                  <Card key={f.key} className="p-4">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium text-slate-900">{f.label}</p><p className="text-xs text-slate-500">{f.desc}</p></div>
                      <button onClick={() => setSiteConfig(c => ({ ...c, [f.key]: !(c as any)[f.key] }))} className={`w-10 h-6 rounded-full transition-colors relative ${(siteConfig as any)[f.key] ? "bg-green-500" : "bg-slate-300"}`}><div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(siteConfig as any)[f.key] ? "translate-x-4" : "translate-x-0.5"}`} /></button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      <GlobalMascotAssistant
        storageKey="wt_mascot_admin"
        title="Asistente Super Admin"
        mood={adminMascotMood}
        messages={adminMascotMessages}
      />

      {/* Modal permisos conductor */}
      {editingDriver && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingDriver(null)}>
          <Card className="w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold text-slate-900">Permisos — {editingDriver.name}</h2>
              <button onClick={() => setEditingDriver(null)} className="text-slate-400 hover:text-slate-600"><XCircle size={20} /></button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[{ key: "canAcceptTrips" as const, label: "Aceptar viajes", icon: Navigation }, { key: "canViewClientPhone" as const, label: "Ver teléfono del cliente", icon: Phone }, { key: "canSetOwnFare" as const, label: "Establecer tarifa propia", icon: DollarSign }, { key: "canCancelTrip" as const, label: "Cancelar viajes", icon: XCircle }].map(perm => (
                <div key={perm.key} className={`flex items-center justify-between p-3 rounded-xl border ${editingDriver.permissions[perm.key] ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${editingDriver.permissions[perm.key] ? "bg-green-500" : "bg-slate-300"}`}><perm.icon size={14} className="text-white" /></div>
                    <p className="text-sm font-medium text-slate-900">{perm.label}</p>
                  </div>
                  <button onClick={() => { handlePermissionToggle(editingDriver.id, perm.key); setEditingDriver(d => d ? { ...d, permissions: { ...d.permissions, [perm.key]: !d.permissions[perm.key] } } : null); }} className={`w-10 h-6 rounded-full transition-colors relative ${editingDriver.permissions[perm.key] ? "bg-green-500" : "bg-slate-300"}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editingDriver.permissions[perm.key] ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
            <Button onClick={() => setEditingDriver(null)} className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white">Cerrar</Button>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Inline admin sub-components ───────────────────────────────────────────────

function ReferralAdminPanel() {
  const { data: allRewards, refetch } = trpc.referrals.getAllRewardsAdmin.useQuery();
  const saveReward = trpc.referrals.saveReward.useMutation({ onSuccess: () => { refetch(); toast.success("Recompensa guardada"); } });
  const deleteReward = trpc.referrals.deleteReward.useMutation({ onSuccess: () => { refetch(); toast.success("Recompensa eliminada"); } });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ userRole: "client" as "client" | "driver", eventType: "", eventLabel: "", rewardType: "credit" as any, rewardValue: 0, rewardLabel: "", rewardDescription: "", triggerCount: 1, isActive: true, sortOrder: 0 });
  const [showForm, setShowForm] = useState(false);
  const [filterRole, setFilterRole] = useState<"all" | "client" | "driver">("all");
  const [subTab, setSubTab] = useState<"stats" | "rewards">("stats");
  const { data: stats } = trpc.referrals.getReferralStats.useQuery();

  const clientRewards = allRewards?.filter((r: any) => r.userRole === "client") || [];
  const driverRewards = allRewards?.filter((r: any) => r.userRole === "driver") || [];
  const filtered = filterRole === "all" ? (allRewards || []) : (filterRole === "client" ? clientRewards : driverRewards);

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ userRole: r.userRole, eventType: r.eventType, eventLabel: r.eventLabel, rewardType: r.rewardType, rewardValue: Number(r.rewardValue), rewardLabel: r.rewardLabel, rewardDescription: r.rewardDescription || "", triggerCount: r.triggerCount, isActive: Boolean(r.isActive), sortOrder: r.sortOrder });
    setShowForm(true);
  };

  const handleSave = () => {
    saveReward.mutate(editingId ? { ...form, id: editingId } : form);
    setShowForm(false);
    setEditingId(null);
    setForm({ userRole: "client", eventType: "", eventLabel: "", rewardType: "credit", rewardValue: 0, rewardLabel: "", rewardDescription: "", triggerCount: 1, isActive: true, sortOrder: 0 });
  };

  const rewardTypeColors: Record<string, string> = { credit: "bg-green-100 text-green-700", free_trip: "bg-blue-100 text-blue-700", discount: "bg-purple-100 text-purple-700", badge: "bg-yellow-100 text-yellow-700", cash_bonus: "bg-emerald-100 text-emerald-700" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Programa de Referidos</h2>
          <p className="text-sm text-slate-500">Estadísticas del programa y configuración de recompensas</p>
        </div>
        {subTab === "rewards" && (
          <Button onClick={() => { setShowForm(true); setEditingId(null); }} className="bg-green-500 hover:bg-green-600 text-white gap-2">
            <Plus size={16} /> Nueva Recompensa
          </Button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {[{ id: "stats" as const, label: "📊 Estadísticas" }, { id: "rewards" as const, label: "🎁 Recompensas" }].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${subTab === t.id ? "border-green-500 text-green-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* STATS TAB */}
      {subTab === "stats" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Total referidos", value: stats?.totalReferrals || 0, color: "text-slate-900", sub: "histórico" },
              { label: "Completados", value: stats?.completedReferrals || 0, color: "text-green-600", sub: "con recompensa" },
              { label: "Conversión", value: `${stats?.conversionRate || 0}%`, color: "text-blue-600", sub: "tasa de éxito" },
              { label: "Créditos dist.", value: `$${Number(stats?.totalCreditsDistributed || 0).toFixed(2)}`, color: "text-purple-600", sub: "total entregado" },
              { label: "Códigos activos", value: stats?.activeCodes || 0, color: "text-orange-600", sub: "usuarios con código" },
            ].map(kpi => (
              <Card key={kpi.label} className="p-4 text-center">
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5">{kpi.label}</p>
                <p className="text-xs text-slate-400">{kpi.sub}</p>
              </Card>
            ))}
          </div>

          {/* Top Referrers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Clients */}
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Trophy size={16} className="text-yellow-500" /> Top Clientes Referidores
              </h3>
              {(!stats?.topClients || stats.topClients.length === 0) ? (
                <p className="text-sm text-slate-400 text-center py-4">Sin datos aún</p>
              ) : (
                <div className="space-y-2">
                  {stats.topClients.map((u: any, i: number) => (
                    <div key={u.userId} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-orange-400 text-white" : "bg-slate-100 text-slate-500"}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{u.name || u.email}</p>
                        <p className="text-xs text-slate-500 font-mono">{u.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">{u.totalReferrals} ref.</p>
                        <p className="text-xs text-slate-400">${Number(u.totalRewardsEarned || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Top Drivers */}
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Trophy size={16} className="text-blue-500" /> Top Choferes Referidores
              </h3>
              {(!stats?.topDrivers || stats.topDrivers.length === 0) ? (
                <p className="text-sm text-slate-400 text-center py-4">Sin datos aún</p>
              ) : (
                <div className="space-y-2">
                  {stats.topDrivers.map((u: any, i: number) => (
                    <div key={u.userId} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-orange-400 text-white" : "bg-slate-100 text-slate-500"}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{u.name || u.email}</p>
                        <p className="text-xs text-slate-500 font-mono">{u.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-600">{u.totalReferrals} ref.</p>
                        <p className="text-xs text-slate-400">${Number(u.totalRewardsEarned || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Reward breakdown */}
          {stats?.rewardBreakdown && stats.rewardBreakdown.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Recompensas Entregadas por Tipo</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.rewardBreakdown.map((rb: any) => (
                  <div key={rb.rewardType} className="p-3 bg-slate-50 rounded-xl text-center">
                    <p className="text-lg font-bold text-slate-900">{rb.count}</p>
                    <p className="text-xs font-medium text-slate-600 capitalize">{rb.rewardType?.replace("_", " ")}</p>
                    <p className="text-xs text-slate-400">${Number(rb.totalValue || 0).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* REWARDS TAB */}
      {subTab === "rewards" && (
        <>
          {/* Original reward cards stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center"><p className="text-2xl font-bold text-slate-900">{allRewards?.length || 0}</p><p className="text-sm text-slate-500">Total recompensas</p></Card>
            <Card className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{clientRewards.length}</p><p className="text-sm text-slate-500">Clientes</p></Card>
            <Card className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{driverRewards.length}</p><p className="text-sm text-slate-500">Conductores</p></Card>
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            {(["all", "client", "driver"] as const).map(role => (
              <button key={role} onClick={() => setFilterRole(role)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterRole === role ? "bg-green-500 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {role === "all" ? "Todos" : role === "client" ? "Clientes" : "Choferes"}
              </button>
            ))}
          </div>

          {/* Rewards list */}
          <div className="space-y-3">
            {filtered.map((r: any) => (
              <Card key={r.id} className={`p-4 ${!r.isActive ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rewardTypeColors[r.rewardType] || "bg-slate-100 text-slate-600"}`}>{r.rewardType}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.userRole === "client" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{r.userRole === "client" ? "Cliente" : "Chofer"}</span>
                      {!r.isActive && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inactivo</span>}
                    </div>
                    <p className="font-semibold text-slate-900">{r.rewardLabel}</p>
                    <p className="text-sm text-slate-500">{r.eventLabel}</p>
                    {r.rewardDescription && <p className="text-xs text-slate-400 mt-0.5">{r.rewardDescription}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>Valor: <strong className="text-slate-700">{r.rewardType === "badge" ? "Badge" : `$${Number(r.rewardValue).toFixed(2)}`}</strong></span>
                      <span>Trigger: <strong className="text-slate-700">{r.triggerCount} referido(s)</strong></span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleEdit(r)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><Edit3 size={14} /></button>
                    <button onClick={() => deleteReward.mutate({ id: r.id })} className="p-2 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

        {/* Form modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-slate-900 mb-4">{editingId ? "Editar Recompensa" : "Nueva Recompensa"}</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-slate-600 mb-1 block">Para quién</label>
                    <select value={form.userRole} onChange={e => setForm(f => ({ ...f, userRole: e.target.value as any }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500">
                      <option value="client">Cliente</option><option value="driver">Chofer</option>
                    </select>
                  </div>
                  <div><label className="text-xs font-medium text-slate-600 mb-1 block">Tipo de recompensa</label>
                    <select value={form.rewardType} onChange={e => setForm(f => ({ ...f, rewardType: e.target.value as any }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500">
                      <option value="credit">Crédito ($)</option><option value="free_trip">Viaje gratis</option><option value="discount">Descuento %</option><option value="badge">Badge</option><option value="cash_bonus">Bono efectivo</option>
                    </select>
                  </div>
                </div>
                {[
                  { key: "eventType", label: "Tipo de evento (código)", placeholder: "ej: referral_registered" },
                  { key: "eventLabel", label: "Descripción del evento", placeholder: "ej: Referido se registra" },
                  { key: "rewardLabel", label: "Nombre de la recompensa", placeholder: "ej: $2 crédito en wallet" },
                  { key: "rewardDescription", label: "Descripción (opcional)", placeholder: "ej: Tu amigo se registró..." },
                ].map(f => (
                  <div key={f.key}><label className="text-xs font-medium text-slate-600 mb-1 block">{f.label}</label>
                    <input value={(form as any)[f.key]} onChange={e => setForm(ff => ({ ...ff, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-xs font-medium text-slate-600 mb-1 block">Valor ($)</label>
                    <input type="number" value={form.rewardValue} onChange={e => setForm(f => ({ ...f, rewardValue: Number(e.target.value) }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div><label className="text-xs font-medium text-slate-600 mb-1 block">Trigger (referidos)</label>
                    <input type="number" value={form.triggerCount} onChange={e => setForm(f => ({ ...f, triggerCount: Number(e.target.value) }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div><label className="text-xs font-medium text-slate-600 mb-1 block">Orden</label>
                    <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))} className={`w-10 h-6 rounded-full transition-colors relative ${form.isActive ? "bg-green-500" : "bg-slate-300"}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                  <span className="text-sm text-slate-600">Recompensa activa</span>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <Button variant="outline" className="flex-1" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancelar</Button>
                <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white" onClick={handleSave}>Guardar</Button>
              </div>
            </Card>
          </div>
        )}
        </>
      )}
    </div>
  );
}

function DispatcherAdminPanel() {
  const { data: dispatchers, refetch } = trpc.referrals.getDispatchers.useQuery();
  const saveDispatcher = trpc.referrals.saveDispatcher.useMutation({ onSuccess: () => { refetch(); toast.success("Dispatcher guardado"); } });
  const deleteDispatcher = trpc.referrals.deleteDispatcher.useMutation({ onSuccess: () => { refetch(); toast.success("Dispatcher eliminado"); } });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", status: "active" as "active" | "inactive" | "suspended", assignedZone: "", permissions: { viewMap: true, assignTrips: true, viewDrivers: true, contactUsers: true, viewTripHistory: true, cancelTrips: false, viewFinancials: false, editPrices: false, editSite: false } });

  const handleEdit = (d: any) => {
    setEditingId(d.id);
    setForm({ name: d.name, email: d.email, phone: d.phone || "", status: d.status, assignedZone: d.assignedZone || "", permissions: { ...{ viewMap: true, assignTrips: true, viewDrivers: true, contactUsers: true, viewTripHistory: true, cancelTrips: false, viewFinancials: false, editPrices: false, editSite: false }, ...d.permissions } });
    setShowForm(true);
  };

  const handleSave = () => {
    saveDispatcher.mutate(editingId ? { ...form, id: editingId, createdBy: 1 } : { ...form, createdBy: 1 });
    setShowForm(false);
    setEditingId(null);
  };

  const permLabels: Record<string, string> = { viewMap: "Ver mapa", assignTrips: "Asignar viajes", viewDrivers: "Ver conductores", contactUsers: "Contactar usuarios", viewTripHistory: "Ver historial", cancelTrips: "Cancelar viajes", viewFinancials: "Ver finanzas", editPrices: "Editar precios", editSite: "Editar sitio" };
  const permColors: Record<string, string> = { viewMap: "green", assignTrips: "green", viewDrivers: "green", contactUsers: "green", viewTripHistory: "green", cancelTrips: "yellow", viewFinancials: "red", editPrices: "red", editSite: "red" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Gestión de Dispatchers</h2>
          <p className="text-sm text-slate-500">Crea operadores con permisos limitados para gestionar viajes</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus size={16} /> Nuevo Dispatcher
        </Button>
      </div>

      {/* Dispatcher list */}
      {(!dispatchers || dispatchers.length === 0) ? (
        <Card className="p-8 text-center">
          <UserCog size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">No hay dispatchers creados</p>
          <p className="text-sm text-slate-400 mt-1">Crea el primer dispatcher para delegar la gestión de viajes</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dispatchers.map((d: any) => (
            <Card key={d.id} className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">{d.name[0]}</div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{d.name}</p>
                  <p className="text-xs text-slate-500">{d.email}</p>
                  {d.assignedZone && <p className="text-xs text-slate-400">Zona: {d.assignedZone}</p>}
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${d.status === "active" ? "bg-green-100 text-green-700" : d.status === "suspended" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                  {d.status === "active" ? "Activo" : d.status === "suspended" ? "Suspendido" : "Inactivo"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {Object.entries(d.permissions || {}).filter(([, v]) => v).map(([k]) => (
                  <span key={k} className={`text-xs px-2 py-0.5 rounded-full ${permColors[k] === "red" ? "bg-red-100 text-red-600" : permColors[k] === "yellow" ? "bg-yellow-100 text-yellow-600" : "bg-green-100 text-green-700"}`}>
                    {permLabels[k] || k}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs gap-1" onClick={() => handleEdit(d)}><Edit3 size={12} /> Editar</Button>
                <Button size="sm" variant="outline" className="text-xs text-red-500 border-red-200 hover:bg-red-50" onClick={() => deleteDispatcher.mutate({ id: d.id })}><Trash2 size={12} /></Button>
                <Button size="sm" className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1" onClick={() => window.open("/dispatcher", "_blank")}><Eye size={12} /> Ver panel</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editingId ? "Editar Dispatcher" : "Nuevo Dispatcher"}</h3>
            <div className="space-y-3">
              {[{ key: "name", label: "Nombre completo", type: "text" }, { key: "email", label: "Email", type: "email" }, { key: "phone", label: "Teléfono", type: "tel" }, { key: "assignedZone", label: "Zona asignada (opcional)", type: "text" }].map(f => (
                <div key={f.key}><label className="text-xs font-medium text-slate-600 mb-1 block">{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(ff => ({ ...ff, [f.key]: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div><label className="text-xs font-medium text-slate-600 mb-1 block">Estado</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="active">Activo</option><option value="inactive">Inactivo</option><option value="suspended">Suspendido</option>
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">Permisos</p>
                <div className="space-y-2">
                  {Object.entries(form.permissions).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                      <span className="text-sm text-slate-700">{permLabels[key] || key}</span>
                      <button onClick={() => setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !val } }))}
                        className={`w-10 h-6 rounded-full transition-colors relative ${val ? "bg-blue-500" : "bg-slate-300"}`}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${val ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancelar</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave}>Guardar</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── MANUAL BOOKING PANEL ─────────────────────────────────────────────────────
function ManualBookingPanel({ drivers }: { drivers: any[] }) {
  const [form, setForm] = useState({
    clientName: "", clientPhone: "", pickup: "", dropoff: "",
    vehicleType: "economy", scheduledAt: "", notes: "", driverId: "",
  });
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const vehicleTypes = [
    { id: "economy", label: "🚗 Económico", price: "$8–$15" },
    { id: "comfort", label: "🚙 Confort", price: "$12–$22" },
    { id: "premium", label: "🏎️ Premium", price: "$20–$40" },
    { id: "suv", label: "🚐 SUV", price: "$25–$50" },
  ];

  const handleSubmit = () => {
    if (!form.clientName || !form.clientPhone || !form.pickup || !form.dropoff) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const newBooking = {
        id: `MB-${Date.now()}`,
        ...form,
        status: form.driverId ? "assigned" : "pending",
        createdAt: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
        driver: form.driverId ? drivers.find(d => d.id === form.driverId)?.name || "—" : "Sin asignar",
      };
      setBookings(prev => [newBooking, ...prev]);
      setForm({ clientName: "", clientPhone: "", pickup: "", dropoff: "", vehicleType: "economy", scheduledAt: "", notes: "", driverId: "" });
      setLoading(false);
      toast.success(`✅ Reserva ${newBooking.id} creada${form.driverId ? " y asignada" : " — pendiente de conductor"}`);
    }, 800);
  };

  const statusColors: Record<string, string> = { pending: "bg-yellow-100 text-yellow-700", assigned: "bg-blue-100 text-blue-700", completed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };
  const statusLabels: Record<string, string> = { pending: "Pendiente", assigned: "Asignado", completed: "Completado", cancelled: "Cancelado" };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Reserva Manual de Viaje</h2>
        <p className="text-sm text-slate-500 mt-1">Crea viajes manualmente para clientes que llaman por teléfono o no pueden usar la app</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Phone size={16} className="text-green-600" /> Datos del viaje</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nombre del cliente *</label>
              <input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Ej: María García" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Teléfono *</label>
              <input value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))} placeholder="+1 407 000 0000" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Dirección de recogida *</label>
            <input value={form.pickup} onChange={e => setForm(f => ({ ...f, pickup: e.target.value }))} placeholder="Ej: Calle 5 #123, Centro" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Destino *</label>
            <input value={form.dropoff} onChange={e => setForm(f => ({ ...f, dropoff: e.target.value }))} placeholder="Ej: Aeropuerto Internacional" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo de vehículo</label>
            <div className="grid grid-cols-2 gap-2">
              {vehicleTypes.map(v => (
                <button key={v.id} onClick={() => setForm(f => ({ ...f, vehicleType: v.id }))}
                  className={`p-2.5 rounded-xl border text-left transition-colors ${form.vehicleType === v.id ? "border-green-500 bg-green-50" : "border-slate-200 hover:bg-slate-50"}`}>
                  <p className="text-sm font-medium text-slate-900">{v.label}</p>
                  <p className="text-xs text-slate-500">{v.price}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Programar para (opcional)</label>
              <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Asignar conductor (opcional)</label>
              <select value={form.driverId} onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none">
                <option value="">Auto-asignar</option>
                {drivers.filter(d => d.status === "active" && d.online).map(d => (
                  <option key={d.id} value={d.id}>{d.name} — {d.vehicle}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Notas internas</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ej: Cliente con silla de ruedas, necesita ayuda..." rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none" />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Creando reserva...</> : <><Phone size={16} /> Crear Reserva Manual</>}
          </Button>
        </Card>

        {/* Recent bookings */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900">Reservas Manuales Recientes</h3>
          {bookings.length === 0 ? (
            <Card className="p-8 text-center">
              <Phone size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm">No hay reservas manuales aún</p>
              <p className="text-slate-400 text-xs mt-1">Las reservas creadas aquí aparecerán en esta lista</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {bookings.map(b => (
                <Card key={b.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{b.clientName}</p>
                      <p className="text-xs text-slate-500">{b.clientPhone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[b.status]}`}>{statusLabels[b.status]}</span>
                      <span className="text-xs text-slate-400">{b.createdAt}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>📍 <strong>Recogida:</strong> {b.pickup}</p>
                    <p>🏁 <strong>Destino:</strong> {b.dropoff}</p>
                    <p>🚗 <strong>Vehículo:</strong> {vehicleTypes.find(v => v.id === b.vehicleType)?.label} · <strong>Conductor:</strong> {b.driver}</p>
                    {b.notes && <p>📝 {b.notes}</p>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status: "completed" } : x))} className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 font-medium hover:bg-green-200">✅ Completar</button>
                    <button onClick={() => setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status: "cancelled" } : x))} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 font-medium hover:bg-red-200">❌ Cancelar</button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SURGE PRICING PANEL ──────────────────────────────────────────────────────
function SurgePricingPanel() {
  const [surgeEnabled, setSurgeEnabled] = useState(false);
  const [rules, setRules] = useState([
    { id: 1, name: "Hora pico mañana", days: ["Lun", "Mar", "Mié", "Jue", "Vie"], startTime: "07:00", endTime: "09:30", multiplier: 1.5, active: true },
    { id: 2, name: "Hora pico tarde", days: ["Lun", "Mar", "Mié", "Jue", "Vie"], startTime: "17:00", endTime: "20:00", multiplier: 1.5, active: true },
    { id: 3, name: "Viernes y sábado noche", days: ["Vie", "Sáb"], startTime: "22:00", endTime: "03:00", multiplier: 2.0, active: true },
    { id: 4, name: "Domingo madrugada", days: ["Dom"], startTime: "00:00", endTime: "06:00", multiplier: 1.3, active: false },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [newRule, setNewRule] = useState({ name: "", startTime: "08:00", endTime: "10:00", multiplier: 1.5, days: [] as string[] });
  const allDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const multiplierColor = (m: number) => m >= 2 ? "text-red-600 bg-red-50" : m >= 1.5 ? "text-orange-600 bg-orange-50" : "text-yellow-600 bg-yellow-50";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Precio Surge / Tarifa Dinámica</h2>
          <p className="text-sm text-slate-500 mt-1">Aumenta automáticamente las tarifas en horas de alta demanda</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">{surgeEnabled ? "Activo" : "Inactivo"}</span>
          <button onClick={() => { setSurgeEnabled(!surgeEnabled); toast.success(surgeEnabled ? "Precio surge desactivado" : "Precio surge activado"); }}
            className={`w-14 h-7 rounded-full transition-colors relative ${surgeEnabled ? "bg-green-500" : "bg-slate-300"}`}>
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${surgeEnabled ? "translate-x-7" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Info banner */}
      <Card className={`p-4 border-2 ${surgeEnabled ? "border-green-300 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
        <div className="flex items-start gap-3">
          <TrendingUp size={20} className={surgeEnabled ? "text-green-600 mt-0.5" : "text-slate-400 mt-0.5"} />
          <div>
            <p className="font-semibold text-slate-900 text-sm">{surgeEnabled ? "✅ Precio surge activo" : "⏸️ Precio surge pausado"}</p>
            <p className="text-xs text-slate-500 mt-0.5">{surgeEnabled ? "Las tarifas se multiplican automáticamente según las reglas configuradas abajo." : "Activa el interruptor para aplicar tarifas dinámicas en los horarios definidos."}</p>
          </div>
        </div>
      </Card>

      {/* Rules list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Reglas de Precio Surge</h3>
          <Button onClick={() => setShowForm(true)} className="bg-green-500 hover:bg-green-600 text-white gap-2 text-sm" size="sm">
            <Plus size={14} /> Nueva Regla
          </Button>
        </div>

        {rules.map(rule => (
          <Card key={rule.id} className={`p-4 ${!rule.active ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-900 text-sm">{rule.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${multiplierColor(rule.multiplier)}`}>×{rule.multiplier}</span>
                  {!rule.active && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inactivo</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>🕐 {rule.startTime} – {rule.endTime}</span>
                  <span>📅 {rule.days.join(", ")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: !r.active } : r))}
                  className={`w-10 h-6 rounded-full transition-colors relative ${rule.active ? "bg-green-500" : "bg-slate-300"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${rule.active ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <button onClick={() => { setRules(prev => prev.filter(r => r.id !== rule.id)); toast.success("Regla eliminada"); }}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* New rule form */}
      {showForm && (
        <Card className="p-5 border-2 border-green-200 bg-green-50/50">
          <h4 className="font-semibold text-slate-900 mb-4">Nueva Regla de Surge</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nombre de la regla</label>
              <input value={newRule.name} onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))} placeholder="Ej: Viernes noche" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Hora inicio</label>
                <input type="time" value={newRule.startTime} onChange={e => setNewRule(r => ({ ...r, startTime: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Hora fin</label>
                <input type="time" value={newRule.endTime} onChange={e => setNewRule(r => ({ ...r, endTime: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Multiplicador</label>
                <select value={newRule.multiplier} onChange={e => setNewRule(r => ({ ...r, multiplier: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white">
                  {[1.2, 1.3, 1.5, 1.75, 2.0, 2.5, 3.0].map(m => <option key={m} value={m}>×{m} ({Math.round((m-1)*100)}% más)</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-2 block">Días de la semana</label>
              <div className="flex gap-2 flex-wrap">
                {allDays.map(day => (
                  <button key={day} onClick={() => setNewRule(r => ({ ...r, days: r.days.includes(day) ? r.days.filter(d => d !== day) : [...r.days, day] }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${newRule.days.includes(day) ? "bg-green-500 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white" onClick={() => {
                if (!newRule.name || newRule.days.length === 0) { toast.error("Completa el nombre y selecciona al menos un día"); return; }
                setRules(prev => [...prev, { id: Date.now(), ...newRule, active: true }]);
                setNewRule({ name: "", startTime: "08:00", endTime: "10:00", multiplier: 1.5, days: [] });
                setShowForm(false);
                toast.success("Regla de surge creada");
              }}>Guardar Regla</Button>
            </div>
          </div>
        </Card>
      )}

      {/* How it works */}
      <Card className="p-5 bg-slate-50">
        <h4 className="font-semibold text-slate-900 mb-3">¿Cómo funciona el Precio Surge?</h4>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-slate-600">
          <div className="flex gap-2"><span className="text-lg">🕐</span><p><strong>Horario activo:</strong> El sistema detecta si la hora actual coincide con alguna regla activa.</p></div>
          <div className="flex gap-2"><span className="text-lg">💰</span><p><strong>Precio multiplicado:</strong> La tarifa base se multiplica automáticamente. Ej: $10 × 1.5 = $15.</p></div>
          <div className="flex gap-2"><span className="text-lg">📱</span><p><strong>Visible al cliente:</strong> El cliente ve el precio surge antes de confirmar su viaje con un aviso claro.</p></div>
        </div>
      </Card>
    </div>
  );
}

// ── BROADCAST PANEL ──────────────────────────────────────────────────────────
function BroadcastPanel() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "info" as "info" | "warning" | "success" | "urgent",
    target: "all" as "all" | "drivers" | "clients" | "fleet",
    pinned: false,
    expiresHours: "",
  });

  const createMutation = trpc.announcements.create.useMutation();
  const toggleMutation = trpc.announcements.toggleActive.useMutation();
  const deleteMutation = trpc.announcements.delete.useMutation();
  const { data: allAnnouncements, refetch } = trpc.announcements.getAll.useQuery();

  const displayList = allAnnouncements ?? announcements;

  const typeConfig: Record<string, { color: string; bg: string; label: string; icon: string }> = {
    info:    { color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",   label: "Información", icon: "ℹ️" },
    warning: { color: "text-amber-700",  bg: "bg-amber-50 border-amber-200", label: "Advertencia", icon: "⚠️" },
    success: { color: "text-green-700",  bg: "bg-green-50 border-green-200", label: "Éxito",       icon: "✅" },
    urgent:  { color: "text-red-700",    bg: "bg-red-50 border-red-200",     label: "Urgente",     icon: "🚨" },
  };

  const targetConfig: Record<string, { label: string; icon: string }> = {
    all:     { label: "Todos",      icon: "👥" },
    clients: { label: "Clientes",   icon: "🧑" },
    drivers: { label: "Conductores", icon: "🚗" },
    fleet:   { label: "Flotillas",  icon: "🏢" },
  };

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Completa el título y el mensaje");
      return;
    }
    setSending(true);
    const expiresAt = form.expiresHours ? Date.now() + parseInt(form.expiresHours) * 3600000 : undefined;
    const result = await createMutation.mutateAsync({ ...form, expiresAt });
    setSending(false);
    if (result.success) {
      toast.success(`📢 Anuncio enviado a ${targetConfig[form.target].label}`);
      setForm({ title: "", message: "", type: "info", target: "all", pinned: false, expiresHours: "" });
      setShowForm(false);
      refetch();
    } else {
      toast.error("Error al enviar el anuncio");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Broadcast Announcements</h2>
          <p className="text-sm text-slate-500 mt-1">Envía anuncios directamente a los paneles de conductores, clientes o flotillas</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-green-500 hover:bg-green-600 text-white gap-2">
          <Send size={16} /> Nuevo Anuncio
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: displayList.length, color: "text-slate-700" },
          { label: "Activos", value: displayList.filter((a: any) => a.active).length, color: "text-green-600" },
          { label: "Fijados", value: displayList.filter((a: any) => a.pinned).length, color: "text-blue-600" },
          { label: "Inactivos", value: displayList.filter((a: any) => !a.active).length, color: "text-slate-400" },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* New announcement form */}
      {showForm && (
        <Card className="p-5 border-2 border-green-200 bg-green-50/30">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Send size={16} className="text-green-600" /> Crear Anuncio</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Título del anuncio *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: ¡Bonos de fin de semana!" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Mensaje *</label>
              <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Escribe el mensaje completo del anuncio..." rows={3} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["info", "warning", "success", "urgent"] as const).map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.type === t ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      {typeConfig[t].icon} {typeConfig[t].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Destinatarios</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["all", "clients", "drivers", "fleet"] as const).map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, target: t }))}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.target === t ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      {targetConfig[t].icon} {targetConfig[t].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Expira en (horas, opcional)</label>
                <input type="number" min="1" max="720" value={form.expiresHours} onChange={e => setForm(f => ({ ...f, expiresHours: e.target.value }))} placeholder="Ej: 24 (1 día)" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button onClick={() => setForm(f => ({ ...f, pinned: !f.pinned }))}
                    className={`w-10 h-6 rounded-full transition-colors relative ${form.pinned ? "bg-green-500" : "bg-slate-300"}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.pinned ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                  <span className="text-sm text-slate-700">Fijar anuncio</span>
                </label>
              </div>
            </div>

            {/* Preview */}
            {form.title && (
              <div className={`p-3 rounded-xl border ${typeConfig[form.type].bg}`}>
                <p className="text-xs font-semibold text-slate-500 mb-1">Vista previa:</p>
                <p className={`font-bold text-sm ${typeConfig[form.type].color}`}>{typeConfig[form.type].icon} {form.title}</p>
                {form.message && <p className="text-xs text-slate-600 mt-1">{form.message}</p>}
                <p className="text-xs text-slate-400 mt-1">Para: {targetConfig[form.target].icon} {targetConfig[form.target].label}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2" onClick={handleSend} disabled={sending}>
                {sending ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : <><Send size={14} /> Enviar Anuncio</>}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Announcements list */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900">Anuncios ({displayList.length})</h3>
        {displayList.length === 0 ? (
          <Card className="p-8 text-center">
            <Send size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No hay anuncios aún</p>
            <p className="text-slate-400 text-xs mt-1">Crea tu primer anuncio para enviarlo a los paneles</p>
          </Card>
        ) : (
          displayList.map((ann: any) => {
            const tc = typeConfig[ann.type] || typeConfig.info;
            const tgt = targetConfig[ann.target] || targetConfig.all;
            return (
              <Card key={ann.id} className={`p-4 ${!ann.active ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${tc.bg} border`}>{tc.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm">{ann.title}</p>
                      {ann.pinned ? <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">📌 Fijado</span> : null}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ann.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{ann.active ? "Activo" : "Inactivo"}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{tgt.icon} {tgt.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{ann.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{new Date(ann.createdAt).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={async () => { await toggleMutation.mutateAsync({ id: ann.id, active: !ann.active }); refetch(); }}
                      className={`w-10 h-6 rounded-full transition-colors relative ${ann.active ? "bg-green-500" : "bg-slate-300"}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${ann.active ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                    <button onClick={async () => { await deleteMutation.mutateAsync({ id: ann.id }); refetch(); toast.success("Anuncio eliminado"); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── SAFETY TIPS ADMIN PANEL ───────────────────────────────────────────────────
function SafetyTipsAdminPanel() {
  const [audience, setAudience] = useState<"clients" | "drivers" | "fleet">("clients");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ category: "", title: "", tip: "", icon: "💡", priority: 5 });

  const { data: allTips = [], refetch } = trpc.safetyTips.getAll.useQuery();
  const createMutation = trpc.safetyTips.create.useMutation();
  const updateMutation = trpc.safetyTips.update.useMutation();
  const deleteMutation = trpc.safetyTips.delete.useMutation();

  const filtered = (allTips as any[]).filter((t: any) => t.audience === audience);
  const categories = Array.from(new Set(filtered.map((t: any) => String(t.category))));

  const audienceConfig = {
    clients:  { label: "Clientes",    icon: "🧑", color: "bg-blue-500" },
    drivers:  { label: "Conductores", icon: "🚗", color: "bg-green-500" },
    fleet:    { label: "Flotillas",   icon: "🏢", color: "bg-purple-500" },
  };

  const resetForm = () => { setForm({ category: "", title: "", tip: "", icon: "💡", priority: 5 }); setEditingId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!form.category.trim() || !form.title.trim() || !form.tip.trim()) { toast.error("Completa todos los campos"); return; }
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...form });
      toast.success("Consejo actualizado ✅");
    } else {
      await createMutation.mutateAsync({ audience, ...form });
      toast.success("Consejo creado ✅");
    }
    refetch(); resetForm();
  };

  const handleEdit = (tip: any) => {
    setForm({ category: tip.category, title: tip.title, tip: tip.tip, icon: tip.icon, priority: tip.priority });
    setEditingId(tip.id); setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync({ id });
    toast.success("Consejo eliminado"); refetch();
  };

  const handleToggle = async (tip: any) => {
    await updateMutation.mutateAsync({ id: tip.id, active: !tip.active });
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Lightbulb size={20} className="text-amber-500" /> Consejos de Seguridad</h2>
          <p className="text-sm text-slate-500 mt-1">Edita los consejos que aparecen en la bombilla 💡 de cada panel</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
          <Plus size={16} /> Nuevo Consejo
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["clients", "drivers", "fleet"] as const).map(a => (
          <button key={a} onClick={() => setAudience(a)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${audience === a ? `${audienceConfig[a].color} text-white` : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {audienceConfig[a].icon} {audienceConfig[a].label} ({(allTips as any[]).filter((t: any) => t.audience === a).length})
          </button>
        ))}
      </div>

      {showForm && (
        <Card className="p-5 border-2 border-amber-200 bg-amber-50/30">
          <h3 className="font-semibold text-slate-900 mb-4">{editingId ? "Editar" : "Nuevo"} Consejo — {audienceConfig[audience].icon} {audienceConfig[audience].label}</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Categoría *</label>
                <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="Ej: Antes del viaje" list="cat-list"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white" />
                <datalist id="cat-list">{(categories as string[]).map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Ícono (emoji)</label>
                <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                  placeholder="💡" maxLength={4}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white text-center text-xl" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Título *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Verifica el vehículo y conductor"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Consejo completo *</label>
              <textarea value={form.tip} onChange={e => setForm(f => ({ ...f, tip: e.target.value }))}
                placeholder="Escribe el consejo detallado aquí..." rows={3}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Prioridad (1-10)</label>
              <input type="number" min={1} max={10} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 5 }))}
                className="w-32 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white" />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={resetForm}>Cancelar</Button>
              <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={handleSave}>
                {editingId ? "Guardar cambios" : "Crear consejo"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {categories.length === 0 ? (
        <Card className="p-8 text-center">
          <Lightbulb size={32} className="mx-auto text-amber-300 mb-3" />
          <p className="text-slate-500 text-sm">No hay consejos para este grupo aún</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {(categories as string[]).map(cat => (
            <div key={cat}>
              <h3 className="font-semibold text-slate-700 text-sm mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> {cat} ({filtered.filter((t: any) => t.category === cat).length})
              </h3>
              <div className="space-y-2">
                {filtered.filter((t: any) => t.category === cat).map((tip: any) => (
                  <Card key={tip.id} className={`p-4 ${!tip.active ? "opacity-60" : ""}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{tip.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">{tip.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{tip.tip}</p>
                        <p className="text-xs text-slate-400 mt-1">Prioridad: {tip.priority} · {tip.active ? "✅ Activo" : "⛔ Inactivo"}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => handleToggle(tip)}
                          className={`w-9 h-5 rounded-full transition-colors relative ${tip.active ? "bg-green-500" : "bg-slate-300"}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${tip.active ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                        <button onClick={() => handleEdit(tip)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(tip.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ADMIN NOTIFICATION BELL ───────────────────────────────────────────────────
function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAllRead, clearAll } = useNotificationHistory("admin");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open) markAllRead();
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={handleOpen} className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
        <Bell size={20} className="text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl" style={{ zIndex: 9999 }}>
          <div className="p-3 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Notificaciones</h3>
              <p className="text-xs text-slate-400">Últimas 24 horas</p>
            </div>
            <button onClick={clearAll} className="text-xs text-slate-500 hover:text-red-500 transition-colors">Limpiar</button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell size={28} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">Sin notificaciones</p>
                <p className="text-xs text-slate-300 mt-1">Las alertas del sistema aparecerán aquí</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`p-3 border-b border-slate-100 flex gap-3 items-start ${!n.read ? "bg-green-50/60" : ""}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.type === "success" ? "bg-green-500" : n.type === "warning" ? "bg-yellow-500" : n.type === "error" ? "bg-red-500" : "bg-blue-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 leading-snug">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(n.timestamp).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-1.5" />}
                </div>
              ))
            )}
          </div>
          <div className="p-2 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">Se reinicia automáticamente cada 24 h</p>
          </div>
        </div>
      )}
    </div>
  );
}
