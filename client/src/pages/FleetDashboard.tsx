import { useState, useEffect } from "react";
import SafetyTipsButton from "@/components/SafetyTipsButton";
import { useLocation } from "wouter";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TripChat } from "@/components/TripChat";
import {
  Car, Users, DollarSign, Star, LogOut, Plus, Search, Filter,
  CheckCircle, XCircle, Clock, Phone, MessageCircle, Eye,
  TrendingUp, MapPin, AlertTriangle, Settings, Bell, Download,
  UserCheck, UserX, Navigation, Briefcase, BarChart2, ChevronRight
} from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import GlobalMascotAssistant from "@/components/GlobalMascotAssistant";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

type Tab = "overview" | "drivers" | "clients" | "trips" | "payments" | "analytics" | "settings";

interface Driver {
  id: string; name: string; phone: string; email: string; vehicle: string;
  plate: string; status: "active" | "inactive" | "suspended" | "pending";
  rating: number; trips: number; earnings: string; joinDate: string; online: boolean;
}
interface Client {
  id: string; name: string; phone: string; email: string;
  trips: number; spent: string; rating: number; joinDate: string; status: "active" | "suspended";
}
interface Trip {
  id: string; client: string; driver: string; from: string; to: string;
  fare: string; status: "completed" | "in_progress" | "cancelled" | "requested";
  date: string; distance: string;
}

const MOCK_DRIVERS: Driver[] = [
  { id: "d1", name: "Carlos Mendoza", phone: "+52 55 1234 5678", email: "carlos@email.com", vehicle: "Toyota Corolla 2022", plate: "ABC-123", status: "active", rating: 4.9, trips: 342, earnings: "$8,450", joinDate: "2024-01-15", online: true },
  { id: "d2", name: "Pedro Ramírez", phone: "+52 55 9876 5432", email: "pedro@email.com", vehicle: "Honda Civic 2021", plate: "XYZ-789", status: "active", rating: 4.7, trips: 218, earnings: "$5,320", joinDate: "2024-03-20", online: true },
  { id: "d3", name: "Luis Sánchez", phone: "+52 55 5555 4444", email: "luis@email.com", vehicle: "Nissan Sentra 2020", plate: "DEF-456", status: "inactive", rating: 4.5, trips: 156, earnings: "$3,890", joinDate: "2024-06-10", online: false },
  { id: "d4", name: "Miguel Ángel Torres", phone: "+52 55 3333 2222", email: "miguel@email.com", vehicle: "Volkswagen Jetta 2023", plate: "GHI-012", status: "pending", rating: 0, trips: 0, earnings: "$0", joinDate: "2025-01-05", online: false },
  { id: "d5", name: "Roberto Díaz", phone: "+52 55 7777 8888", email: "roberto@email.com", vehicle: "Chevrolet Aveo 2019", plate: "JKL-345", status: "suspended", rating: 3.2, trips: 45, earnings: "$1,120", joinDate: "2024-08-22", online: false },
];

const MOCK_CLIENTS: Client[] = [
  { id: "c1", name: "María García", phone: "+52 55 1111 2222", email: "maria@email.com", trips: 28, spent: "$420", rating: 4.8, joinDate: "2024-02-10", status: "active" },
  { id: "c2", name: "Juan López", phone: "+52 55 3333 4444", email: "juan@email.com", trips: 15, spent: "$225", rating: 4.5, joinDate: "2024-04-15", status: "active" },
  { id: "c3", name: "Ana Martínez", phone: "+52 55 5555 6666", email: "ana@email.com", trips: 42, spent: "$630", rating: 5.0, joinDate: "2024-01-20", status: "active" },
  { id: "c4", name: "Roberto Díaz", phone: "+52 55 7777 8888", email: "roberto2@email.com", trips: 8, spent: "$120", rating: 3.5, joinDate: "2024-09-01", status: "suspended" },
  { id: "c5", name: "Laura Pérez", phone: "+52 55 9999 0000", email: "laura@email.com", trips: 63, spent: "$945", rating: 4.9, joinDate: "2023-12-05", status: "active" },
];

const MOCK_TRIPS: Trip[] = [
  { id: "t1", client: "María García", driver: "Carlos Mendoza", from: "Centro Histórico", to: "Aeropuerto CDMX", fare: "$42.00", status: "completed", date: "Hoy 10:32", distance: "28.5 km" },
  { id: "t2", client: "Juan López", driver: "Pedro Ramírez", from: "Estación Metro", to: "Hotel Reforma", fare: "$18.50", status: "in_progress", date: "Hoy 10:45", distance: "12.3 km" },
  { id: "t3", client: "Ana Martínez", driver: "Luis Sánchez", from: "Mall Satélite", to: "Residencial Pedregal", fare: "$25.00", status: "completed", date: "Hoy 10:51", distance: "18.7 km" },
  { id: "t4", client: "Roberto Díaz", driver: "—", from: "Hospital General", to: "Centro", fare: "$15.00", status: "requested", date: "Hoy 09:15", distance: "8.2 km" },
  { id: "t5", client: "Laura Pérez", driver: "Carlos Mendoza", from: "Universidad UNAM", to: "Parque Chapultepec", fare: "$12.00", status: "cancelled", date: "Ayer 09:30", distance: "6.1 km" },
];

const weeklyData = [
  { day: "Lun", viajes: 38, ingresos: 760 }, { day: "Mar", viajes: 52, ingresos: 1040 },
  { day: "Mié", viajes: 45, ingresos: 900 }, { day: "Jue", viajes: 61, ingresos: 1220 },
  { day: "Vie", viajes: 78, ingresos: 1560 }, { day: "Sáb", viajes: 95, ingresos: 1900 },
  { day: "Dom", viajes: 72, ingresos: 1440 },
];

const vehicleData = [
  { name: "Económico", value: 45, color: "#25D366" },
  { name: "Confort", value: 30, color: "#3B82F6" },
  { name: "Premium", value: 15, color: "#8B5CF6" },
  { name: "SUV", value: 10, color: "#F59E0B" },
];

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

export default function FleetDashboard() {
  const { user, isAuthenticated, logout } = useLocalAuth();
  const [, navigate] = useLocation();
  const { permission: notifPermission, requestPermission, sendNotification } = usePushNotifications();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>(MOCK_DRIVERS);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [activeChatTrip, setActiveChatTrip] = useState<string | null>(null);

  useEffect(() => { if (!isAuthenticated) navigate("/login"); }, [isAuthenticated]);

  // Notificación push al cargar si hay conductores pendientes
  useEffect(() => {
    const pending = MOCK_DRIVERS.filter(d => d.status === "pending").length;
    if (pending > 0) {
      setTimeout(() => {
        sendNotification("👤 Conductor pendiente de aprobación", {
          body: `${pending} conductor(es) esperan tu revisión.`,
          url: "/fleet-dashboard",
          tag: "fleet-pending",
        });
      }, 3000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeDrivers = drivers.filter(d => d.status === "active").length;
  const onlineDrivers = drivers.filter(d => d.online).length;

  const handleDriverAction = (driverId: string, action: "approve" | "suspend" | "activate" | "delete") => {
    setDrivers(prev => prev
      .map(d => {
        if (d.id !== driverId) return d;
        if (action === "approve") return { ...d, status: "active" as const };
        if (action === "suspend") return { ...d, status: "suspended" as const, online: false };
        if (action === "activate") return { ...d, status: "active" as const };
        return d;
      })
      .filter(d => action === "delete" ? d.id !== driverId : true)
    );
    const msgs: Record<string, string> = { approve: "Conductor aprobado ✅", suspend: "Conductor suspendido", activate: "Conductor activado ✅", delete: "Conductor eliminado" };
    toast.success(msgs[action]);
    const pushMsgs: Record<string, string> = { approve: "✅ Conductor aprobado", suspend: "⚠️ Conductor suspendido", activate: "✅ Conductor activado", delete: "🗑️ Conductor eliminado" };
    const d = drivers.find(dr => dr.id === driverId);
    if (d) sendNotification(pushMsgs[action], { body: d.name, url: "/fleet-dashboard", tag: "fleet-action" });
  };

  const handleClientAction = (clientId: string, action: "suspend" | "activate") => {
    setClients(prev => prev.map(c => c.id !== clientId ? c : { ...c, status: action === "suspend" ? "suspended" as const : "active" as const }));
    toast.success(action === "suspend" ? "Cliente suspendido" : "Cliente activado ✅");
  };

  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: "overview", label: "Resumen", icon: BarChart2 },
    { id: "drivers", label: "Conductores", icon: Car, badge: drivers.filter(d => d.status === "pending").length },
    { id: "clients", label: "Clientes", icon: Users },
    { id: "trips", label: "Viajes", icon: Navigation },
    { id: "payments", label: "Pagos", icon: DollarSign },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "settings", label: "Config", icon: Settings },
  ];

  const pendingApprovals = drivers.filter((d) => d.status === "pending").length;
  const fleetMascotMood = pendingApprovals > 0 ? "searching" : activeTab === "overview" ? "happy" : "ready";
  const fleetMascotMessages =
    pendingApprovals > 0
      ? [
          `Tienes ${pendingApprovals} conductor(es) pendientes por aprobar.`,
          "Revisa documentos antes de activar perfiles.",
          "Responder rapido mejora la oferta activa en tu flotilla.",
        ]
      : activeTab === "overview"
      ? [
          "Vista general lista con tus KPIs clave.",
          "Tu operacion se ve saludable y estable.",
          "Vamos por una conversion mas alta hoy.",
        ]
      : [
          "Estoy monitoreando tu operacion en tiempo real.",
          "Cualquier ajuste impacta toda la experiencia.",
          "Te ayudo a mantener estandar premium.",
        ];

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 sticky top-0 h-screen">
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-xl">🚕</div>
            <div>
              <p className="font-bold text-sm text-white">{user?.name || "Mi Flotilla"}</p>
              <p className="text-xs text-slate-400">Panel Flotilla</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-green-500 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
              <tab.icon size={17} />
              <span className="flex-1 text-left">{tab.label}</span>
              {(tab.badge ?? 0) > 0 && (
                <span className="bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{tab.badge}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">{user?.name?.[0] || "F"}</div>
            <div><p className="text-sm font-medium text-white">{user?.name}</p><p className="text-xs text-slate-400">Flotilla Admin</p></div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { logout(); navigate("/"); }}
            className="w-full gap-2 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-white text-xs">
            <LogOut size={13} /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{tabs.find(t => t.id === activeTab)?.label}</h1>
            <p className="text-sm text-slate-500">Gestión de tu flota de taxis</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-slate-100">
              <Bell size={20} className="text-slate-600" />
              {drivers.filter(d => d.status === "pending").length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            {notifPermission !== "granted" && (
              <button onClick={requestPermission} title="Activar notificaciones push" className="p-2 rounded-lg hover:bg-green-50 text-green-600 border border-green-200 text-xs flex items-center gap-1">
                <Bell size={14} /> Push
              </button>
            )}
            <Button size="sm" onClick={() => toast.info("Formulario de nuevo conductor próximamente")}
              className="gap-2 bg-green-500 hover:bg-green-600 text-white">
              <Plus size={15} /> Agregar Conductor
            </Button>
          </div>
        </header>

        <div className="p-6">

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Conductores Activos", value: `${activeDrivers}/${drivers.length}`, sub: `${onlineDrivers} en línea`, icon: Car, color: "text-green-600", bg: "bg-green-50" },
                  { label: "Clientes Totales", value: clients.length, sub: `${clients.filter(c => c.status === "active").length} activos`, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Viajes Hoy", value: MOCK_TRIPS.length, sub: `${MOCK_TRIPS.filter(t => t.status === "completed").length} completados`, icon: Navigation, color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "Ingresos Semana", value: "$8,820", sub: "+18% vs semana anterior", icon: DollarSign, color: "text-yellow-600", bg: "bg-yellow-50" },
                ].map((kpi, i) => (
                  <Card key={i} className="p-4">
                    <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center mb-2`}>
                      <kpi.icon size={20} className={kpi.color} />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
                    <p className="text-sm font-medium text-slate-700">{kpi.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{kpi.sub}</p>
                  </Card>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-5">
                  <h3 className="font-semibold text-slate-900 mb-4">Viajes e Ingresos — Semana</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="viajes" fill="#25D366" radius={[4,4,0,0]} name="Viajes" />
                      <Bar dataKey="ingresos" fill="#3B82F6" radius={[4,4,0,0]} name="Ingresos $" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-4">Por Tipo de Vehículo</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={vehicleData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                        {vehicleData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `${v}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 mt-2">
                    {vehicleData.map(v => (
                      <div key={v.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: v.color }} /><span className="text-slate-600">{v.name}</span></div>
                        <span className="font-semibold text-slate-900">{v.value}%</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
              <Card className="p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-900">Conductores en Línea Ahora</h3>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab("drivers")} className="text-xs gap-1">Ver todos <ChevronRight size={12} /></Button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {drivers.filter(d => d.online).map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">{d.name[0]}</div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{d.name.split(" ")[0]}</p>
                        <p className="text-xs text-slate-500 truncate">{d.vehicle.split(" ")[0]}</p>
                        <div className="flex items-center gap-0.5"><Star size={10} className="text-yellow-500 fill-yellow-500" /><span className="text-xs text-slate-600">{d.rating}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── CONDUCTORES ── */}
          {activeTab === "drivers" && (
            <div className="space-y-4">
              {drivers.filter(d => d.status === "pending").length > 0 && (
                <Card className="p-4 border-yellow-200 bg-yellow-50">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={16} className="text-yellow-600" />
                    <h3 className="font-semibold text-yellow-800">{drivers.filter(d => d.status === "pending").length} conductor(es) pendientes de aprobación</h3>
                  </div>
                  {drivers.filter(d => d.status === "pending").map(d => (
                    <div key={d.id} className="flex items-center justify-between py-2 border-t border-yellow-200">
                      <div><p className="font-medium text-slate-900 text-sm">{d.name}</p><p className="text-xs text-slate-500">{d.vehicle} · {d.phone}</p></div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleDriverAction(d.id, "approve")} className="bg-green-500 hover:bg-green-600 text-white text-xs gap-1"><UserCheck size={12} /> Aprobar</Button>
                        <Button size="sm" variant="outline" onClick={() => handleDriverAction(d.id, "delete")} className="text-red-500 border-red-200 hover:bg-red-50 text-xs gap-1"><UserX size={12} /> Rechazar</Button>
                      </div>
                    </div>
                  ))}
                </Card>
              )}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Buscar conductor..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                </div>
                <Button variant="outline" className="gap-2 text-sm"><Filter size={15} /> Filtrar</Button>
                <Button variant="outline" className="gap-2 text-sm"><Download size={15} /> Exportar</Button>
              </div>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>{["Conductor", "Vehículo", "Estado", "Calificación", "Viajes", "Ganancias", "Acciones"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {drivers.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase())).map(d => (
                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm">{d.name[0]}</div>
                                {d.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />}
                              </div>
                              <div><p className="font-semibold text-slate-900">{d.name}</p><p className="text-xs text-slate-500">{d.vehicle}</p></div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><p className="text-slate-900">{d.vehicle}</p><p className="text-xs text-slate-500 font-mono">{d.plate}</p></td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[d.status]}`}>{statusLabels[d.status]}</span></td>
                          <td className="px-4 py-3"><div className="flex items-center gap-1"><Star size={13} className="text-yellow-500 fill-yellow-500" /><span className="font-semibold text-slate-900">{d.rating || "—"}</span></div></td>
                          <td className="px-4 py-3 font-medium text-slate-900">{d.trips}</td>
                          <td className="px-4 py-3 font-semibold text-green-600">{d.earnings}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => setSelectedDriver(d)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="Ver detalles"><Eye size={14} /></button>
                              <button onClick={() => { setActiveChatTrip(`fleet-driver-${d.id}`); toast.info(`💬 Chat con ${d.name.split(" ")[0]} abierto`); }} className="p-1.5 rounded-lg hover:bg-green-50 text-green-500" title="Contactar por chat"><MessageCircle size={14} /></button>
                              <button onClick={() => { setActiveChatTrip(`fleet-driver-${d.id}`); toast.info(`Chat con ${d.name.split(" ")[0]} abierto`); }} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500" title="Chat"><MessageCircle size={14} /></button>
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
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                </div>
                <Button variant="outline" className="gap-2 text-sm"><Download size={15} /> Exportar</Button>
              </div>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>{["Cliente", "Contacto", "Viajes", "Gastado", "Calificación", "Estado", "Acciones"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clients.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())).map(c => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">{c.name[0]}</div>
                              <div><p className="font-semibold text-slate-900">{c.name}</p><p className="text-xs text-slate-500">Desde {c.joinDate}</p></div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><p className="text-slate-900 text-sm">{c.email}</p><p className="text-xs text-slate-500">Cliente registrado</p></td>
                          <td className="px-4 py-3 font-medium text-slate-900">{c.trips}</td>
                          <td className="px-4 py-3 font-semibold text-green-600">{c.spent}</td>
                          <td className="px-4 py-3"><div className="flex items-center gap-1"><Star size={13} className="text-yellow-500 fill-yellow-500" /><span className="font-semibold text-slate-900">{c.rating}</span></div></td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{c.status === "active" ? "Activo" : "Suspendido"}</span></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => toast.info("💬 Usa el chat interno para contactar al cliente")} className="p-1.5 rounded-lg hover:bg-green-50 text-green-500" title="Contactar"><MessageCircle size={14} /></button>
                              {c.status === "active"
                                ? <button onClick={() => handleClientAction(c.id, "suspend")} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Suspender"><UserX size={14} /></button>
                                : <button onClick={() => handleClientAction(c.id, "activate")} className="p-1.5 rounded-lg hover:bg-green-50 text-green-500" title="Activar"><UserCheck size={14} /></button>
                              }
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
                {[
                  { label: "Total", value: MOCK_TRIPS.length, color: "text-slate-700" },
                  { label: "Completados", value: MOCK_TRIPS.filter(t => t.status === "completed").length, color: "text-green-600" },
                  { label: "En progreso", value: MOCK_TRIPS.filter(t => t.status === "in_progress").length, color: "text-blue-600" },
                  { label: "Cancelados", value: MOCK_TRIPS.filter(t => t.status === "cancelled").length, color: "text-red-600" },
                ].map((s, i) => (
                  <Card key={i} className="p-4 text-center"><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p><p className="text-xs text-slate-500 mt-1">{s.label}</p></Card>
                ))}
              </div>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>{["ID", "Cliente", "Conductor", "Ruta", "Tarifa", "Distancia", "Estado", "Hora"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {MOCK_TRIPS.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">#{t.id}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{t.client}</td>
                          <td className="px-4 py-3 text-slate-700">{t.driver}</td>
                          <td className="px-4 py-3"><p className="text-slate-900 text-xs">{t.from}</p><p className="text-slate-500 text-xs">→ {t.to}</p></td>
                          <td className="px-4 py-3 font-semibold text-green-600">{t.fare}</td>
                          <td className="px-4 py-3 text-slate-600">{t.distance}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[t.status]}`}>{statusLabels[t.status]}</span></td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{t.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ── PAGOS ── */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Ingresos Totales", value: "$8,820", sub: "Esta semana", icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
                  { label: "Comisión Empresa", value: "$1,764", sub: "20% del total", icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Pagos Pendientes", value: "$320", sub: "4 conductores", icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
                ].map((p, i) => (
                  <Card key={i} className="p-5">
                    <div className={`w-10 h-10 rounded-xl ${p.bg} flex items-center justify-center mb-3`}><p.icon size={20} className={p.color} /></div>
                    <p className="text-2xl font-bold text-slate-900">{p.value}</p>
                    <p className="text-sm font-medium text-slate-700">{p.label}</p>
                    <p className="text-xs text-slate-500">{p.sub}</p>
                  </Card>
                ))}
              </div>
              <Card className="p-5">
                <h3 className="font-semibold text-slate-900 mb-4">Ganancias por Conductor</h3>
                <div className="space-y-3">
                  {drivers.filter(d => d.status === "active").map(d => (
                    <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xs">{d.name[0]}</div>
                        <div><p className="font-medium text-slate-900 text-sm">{d.name}</p><p className="text-xs text-slate-500">{d.trips} viajes</p></div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{d.earnings}</p>
                        <Button size="sm" variant="outline" className="text-xs mt-1 h-6 px-2" onClick={() => toast.success(`Pago enviado a ${d.name.split(" ")[0]}`)}>Pagar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <Card className="p-5">
                <h3 className="font-semibold text-slate-900 mb-4">Tendencia — 7 días</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="viajes" stroke="#25D366" strokeWidth={3} dot={{ fill: "#25D366", r: 5 }} name="Viajes" />
                    <Line type="monotone" dataKey="ingresos" stroke="#3B82F6" strokeWidth={3} dot={{ fill: "#3B82F6", r: 5 }} name="Ingresos $" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-3">Top Conductores</h3>
                  {drivers.sort((a, b) => b.trips - a.trips).slice(0, 3).map((d, i) => (
                    <div key={d.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">#{i + 1}</span>
                      <div className="flex-1"><p className="text-sm font-medium text-slate-900">{d.name}</p><p className="text-xs text-slate-500">{d.trips} viajes · {d.earnings}</p></div>
                      <div className="flex items-center gap-0.5"><Star size={12} className="text-yellow-500 fill-yellow-500" /><span className="text-xs font-bold text-slate-700">{d.rating}</span></div>
                    </div>
                  ))}
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-3">Top Clientes</h3>
                  {clients.sort((a, b) => b.trips - a.trips).slice(0, 3).map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">#{i + 1}</span>
                      <div className="flex-1"><p className="text-sm font-medium text-slate-900">{c.name}</p><p className="text-xs text-slate-500">{c.trips} viajes · {c.spent}</p></div>
                      <div className="flex items-center gap-0.5"><Star size={12} className="text-yellow-500 fill-yellow-500" /><span className="text-xs font-bold text-slate-700">{c.rating}</span></div>
                    </div>
                  ))}
                </Card>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {activeTab === "settings" && (
            <div className="space-y-4 max-w-2xl">
              {[
                { label: "Nombre de la empresa", value: user?.name || "Mi Flotilla", type: "text" },
                { label: "Comisión por viaje (%)", value: "20", type: "number" },
                { label: "Tarifa base ($)", value: "2.50", type: "number" },
                { label: "Radio de operación (km)", value: "50", type: "number" },
                { label: "Máximo conductores activos", value: "10", type: "number" },
              ].map((field, i) => (
                <Card key={i} className="p-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{field.label}</label>
                  <input type={field.type} defaultValue={field.value}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                </Card>
              ))}
              <Button className="bg-green-500 hover:bg-green-600 text-white gap-2" onClick={() => toast.success("Configuración guardada ✅")}>
                <CheckCircle size={16} /> Guardar Cambios
              </Button>
            </div>
          )}

        </div>
      </main>

      {/* Chat flotante */}
      {activeChatTrip && (
        <TripChat
          tripId={activeChatTrip}
          userId={user?.id != null ? String(user.id) : "fleet"}
          userName={user?.name || "Flotilla"}
          role="client"
          otherPartyName="Conductor"
        />
      )}

      {/* Modal detalle conductor */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDriver(null)}>
          <Card className="w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold text-slate-900">Detalle del Conductor</h2>
              <button onClick={() => setSelectedDriver(null)} className="text-slate-400 hover:text-slate-600"><XCircle size={20} /></button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-2xl font-bold">{selectedDriver.name[0]}</div>
              <div>
                <p className="text-xl font-bold text-slate-900">{selectedDriver.name}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedDriver.status]}`}>{statusLabels[selectedDriver.status]}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { label: "Teléfono", value: "••••••••" },
                { label: "Email", value: selectedDriver.email },
                { label: "Vehículo", value: selectedDriver.vehicle },
                { label: "Placa", value: selectedDriver.plate },
                { label: "Viajes totales", value: selectedDriver.trips },
                { label: "Ganancias", value: selectedDriver.earnings },
                { label: "Calificación", value: `${selectedDriver.rating || "Sin calificación"} ⭐` },
                { label: "Fecha de ingreso", value: selectedDriver.joinDate },
              ].map((row, i) => (
                <div key={i} className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">{row.label}</span>
                  <span className="font-medium text-slate-900">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2 text-sm" onClick={() => { setActiveChatTrip(`fleet-driver-${selectedDriver.id}`); setSelectedDriver(null); }}><MessageCircle size={14} /> Chat Seguro</Button>
              <Button variant="outline" className="flex-1 gap-2 text-sm" onClick={() => { setActiveChatTrip(`fleet-driver-${selectedDriver.id}`); setSelectedDriver(null); }}><MessageCircle size={14} /> Chat</Button>
            </div>
          </Card>
        </div>
      )}
      <GlobalMascotAssistant
        storageKey="wt_mascot_fleet"
        title="Asistente Flotilla"
        mood={fleetMascotMood}
        messages={fleetMascotMessages}
      />
      <SafetyTipsButton audience="fleet" />
    </div>
  );
}
