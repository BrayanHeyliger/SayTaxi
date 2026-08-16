import { useEffect } from "react";
import { useLocation } from "wouter";
import { Building2, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocalAuth } from "@/contexts/LocalAuthContext";

/**
 * A fleet account is intentionally prevented from seeing the global operational
 * dataset until a company/tenant relationship is enforced on users, drivers,
 * vehicles and trips. This replaces the previous mock dashboard, which could
 * otherwise be mistaken for real operational data.
 */
export default function FleetDashboard() {
  const { user, isAuthenticated, logout } = useLocalAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
    else if (user?.role !== "fleet" && user?.role !== "admin") navigate("/");
  }, [isAuthenticated, navigate, user?.role]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500 text-slate-950"><Building2 /></div><div><p className="font-semibold">{user?.name}</p><p className="text-sm text-slate-400">Cuenta de flota</p></div></div>
          <Button variant="outline" className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800" onClick={() => { logout(); navigate("/"); }}><LogOut size={15} /> Salir</Button>
        </div>
        <Card className="border-amber-300/20 bg-slate-900 p-7 text-slate-100 shadow-2xl">
          <div className="flex gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-400/15 text-amber-300"><LockKeyhole /></div><div><h1 className="text-xl font-semibold">Panel de flota protegido</h1><p className="mt-2 leading-7 text-slate-300">La gestión de una flotilla no se habilita con datos globales ni simulados. Antes de activarla, cada conductor, vehículo y viaje debe pertenecer a una empresa concreta para impedir que una flota vea o modifique datos de otra.</p></div></div>
          <div className="mt-6 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-4"><div className="flex gap-3"><ShieldCheck className="mt-0.5 text-emerald-300" size={19} /><p className="text-sm leading-6 text-emerald-100">La cuenta se conserva, pero las funciones de administración de flota permanecen bloqueadas de forma intencional hasta que el modelo multiempresa y sus controles de acceso estén desplegados y probados.</p></div></div>
          <Button className="mt-6" onClick={() => navigate("/")}>Volver al inicio</Button>
        </Card>
      </div>
    </div>
  );
}
