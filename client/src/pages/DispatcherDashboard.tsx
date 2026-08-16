import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Car, CheckCircle, Clock, LogOut, Navigation, Radio, User, XCircle } from "lucide-react";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type QueueTrip = {
  id: number;
  pickup: string;
  dropoff: string;
  fare: string | number;
  status: "requested" | "accepted" | "in_progress" | "completed" | "cancelled";
  requestedAt: string;
  clientName: string;
  clientPhone: string;
};

type OperationalDriver = {
  id: number;
  name: string;
  vehicle: string | null;
  plate: string | null;
  isOnline: boolean | number;
  currentTrip: number | null;
  trips: number | string;
};

export default function DispatcherDashboard() {
  const { user, isAuthenticated, logout } = useLocalAuth();
  const [, navigate] = useLocation();
  const [selectedTrip, setSelectedTrip] = useState<QueueTrip | null>(null);
  const [selectedDriver, setSelectedDriver] = useState("");

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
    else if (user?.role !== "dispatcher" && user?.role !== "admin") navigate("/");
  }, [isAuthenticated, navigate, user?.role]);

  const profile = trpc.dispatcherOperations.getMyProfile.useQuery(undefined, { enabled: isAuthenticated && (user?.role === "dispatcher" || user?.role === "admin") });
  const queue = trpc.dispatcherOperations.listQueue.useQuery(undefined, { enabled: profile.isSuccess, refetchInterval: 10_000 });
  const drivers = trpc.dispatcherOperations.listAvailableDrivers.useQuery(undefined, { enabled: profile.isSuccess, refetchInterval: 10_000 });
  const assignTrip = trpc.dispatcherOperations.assignTrip.useMutation();
  const cancelTrip = trpc.dispatcherOperations.cancelTrip.useMutation();

  const permissions = profile.data?.permissions;
  const trips = (queue.data ?? []) as QueueTrip[];
  const operationalDrivers = (drivers.data ?? []) as OperationalDriver[];
  const pendingTrips = trips.filter((trip) => trip.status === "requested");
  const availableDrivers = useMemo(() => operationalDrivers.filter((driver) => Boolean(driver.isOnline) && !driver.currentTrip), [operationalDrivers]);
  const busyDrivers = operationalDrivers.filter((driver) => Boolean(driver.currentTrip));

  const refresh = async () => {
    await Promise.all([queue.refetch(), drivers.refetch()]);
  };

  const handleAssign = async () => {
    if (!selectedTrip || !selectedDriver) {
      toast.error("Selecciona un viaje y un conductor disponible.");
      return;
    }
    try {
      await assignTrip.mutateAsync({ tripId: selectedTrip.id, driverId: Number(selectedDriver) });
      toast.success("Viaje asignado y persistido.");
      setSelectedTrip(null);
      setSelectedDriver("");
      await refresh();
    } catch (error: any) {
      toast.error(error?.message || "No se pudo asignar el viaje.");
    }
  };

  const handleCancel = async (trip: QueueTrip) => {
    const reason = window.prompt("Indica el motivo de cancelación (mínimo 3 caracteres):");
    if (!reason) return;
    try {
      await cancelTrip.mutateAsync({ tripId: trip.id, reason });
      toast.success("Viaje cancelado y registrado.");
      await refresh();
    } catch (error: any) {
      toast.error(error?.message || "No se pudo cancelar el viaje.");
    }
  };

  if (!isAuthenticated) return null;
  if (profile.isLoading) return <div className="min-h-screen grid place-items-center text-slate-600">Cargando permisos de despacho…</div>;
  if (profile.isError) return <div className="min-h-screen grid place-items-center p-6 text-center"><Card className="max-w-md p-6"><AlertTriangle className="mx-auto mb-3 text-amber-500" /><h1 className="font-semibold">Acceso de despacho no disponible</h1><p className="mt-2 text-sm text-slate-600">Tu cuenta no tiene un perfil de despachador activo. Contacta a un administrador.</p></Card></div>;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950 px-4 py-3 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 font-bold">{user?.name?.[0] || "D"}</div><div><p className="text-sm font-semibold">{user?.name}</p><p className="text-xs text-slate-400">Despacho operativo · {profile.data?.status}</p></div></div>
          <Button variant="outline" size="sm" onClick={() => { logout(); navigate("/"); }} className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800"><LogOut size={14} /> Salir</Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Solicitudes pendientes", value: pendingTrips.length, icon: Radio, tone: "text-rose-600 bg-rose-50" },
            { label: "Conductores disponibles", value: availableDrivers.length, icon: Car, tone: "text-emerald-600 bg-emerald-50" },
            { label: "Conductores en viaje", value: busyDrivers.length, icon: Navigation, tone: "text-blue-600 bg-blue-50" },
            { label: "Cola operativa", value: trips.length, icon: Clock, tone: "text-violet-600 bg-violet-50" },
          ].map((metric) => <Card key={metric.label} className="p-4"><div className="flex items-center justify-between"><div><p className="text-2xl font-bold text-slate-900">{metric.value}</p><p className="text-sm text-slate-600">{metric.label}</p></div><metric.icon className={`h-9 w-9 rounded-xl p-2 ${metric.tone}`} /></div></Card>)}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="p-5"><div className="mb-4 flex items-center justify-between"><div><h1 className="font-semibold text-slate-900">Cola de viajes</h1><p className="text-sm text-slate-500">Datos persistentes actualizados cada 10 segundos.</p></div><Button variant="outline" size="sm" onClick={refresh}>Actualizar</Button></div>
            {queue.isLoading ? <p className="text-sm text-slate-500">Cargando cola…</p> : trips.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No hay viajes activos.</p> : <div className="space-y-3">{trips.map((trip) => <div key={trip.id} className={`rounded-xl border p-4 ${selectedTrip?.id === trip.id ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium text-slate-900">{trip.pickup} <span className="text-slate-400">→</span> {trip.dropoff}</p><p className="mt-1 text-xs text-slate-500">{trip.clientName} · {trip.clientPhone} · ${Number(trip.fare).toFixed(2)}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{trip.status}</span></div><div className="mt-3 flex gap-2">{trip.status === "requested" && permissions?.assignTrips && <Button size="sm" onClick={() => { setSelectedTrip(trip); setSelectedDriver(""); }}><CheckCircle size={14} /> Asignar</Button>}{["requested", "accepted"].includes(trip.status) && permissions?.cancelTrips && <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => handleCancel(trip)}><XCircle size={14} /> Cancelar</Button>}</div></div>)}</div>}
          </Card>

          <Card className="p-5"><h2 className="font-semibold text-slate-900">Asignación de conductor</h2><p className="mt-1 text-sm text-slate-500">Selecciona una solicitud y un conductor conectado.</p>{selectedTrip ? <div className="mt-4 space-y-4"><div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900"><p className="font-medium">Viaje #{selectedTrip.id}</p><p className="mt-1">{selectedTrip.pickup} → {selectedTrip.dropoff}</p></div><select value={selectedDriver} onChange={(event) => setSelectedDriver(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Selecciona conductor disponible</option>{availableDrivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name} · {driver.vehicle || "Sin vehículo"}</option>)}</select><Button className="w-full" disabled={assignTrip.isPending || availableDrivers.length === 0} onClick={handleAssign}>{assignTrip.isPending ? "Asignando…" : "Confirmar asignación"}</Button></div> : <div className="mt-8 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500"><User className="mx-auto mb-2 h-7 w-7 text-slate-300" />Selecciona un viaje pendiente para asignarlo.</div>}</Card>
        </section>
      </main>
    </div>
  );
}
