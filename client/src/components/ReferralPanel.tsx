/**
 * ReferralPanel — Sistema de referidos estilo Temu
 * Para clientes: código, recompensas, historial, wallet de créditos
 * Para choferes: código, bonos, choferes referidos
 */
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Gift, Copy, Share2, Users, Star, DollarSign, Trophy,
  CheckCircle, Clock, ChevronRight, Zap, Award, Ticket
} from "lucide-react";
import { useNotificationHistory } from "@/hooks/useNotificationHistory";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface ReferralPanelProps {
  userId: number;
  userName: string;
  userRole: "client" | "driver";
}

const rewardTypeConfig = {
  credit: { icon: DollarSign, color: "text-green-600", bg: "bg-green-50", label: "Crédito" },
  free_trip: { icon: Ticket, color: "text-blue-600", bg: "bg-blue-50", label: "Viaje gratis" },
  discount: { icon: Zap, color: "text-purple-600", bg: "bg-purple-50", label: "Descuento" },
  badge: { icon: Award, color: "text-yellow-600", bg: "bg-yellow-50", label: "Badge" },
  cash_bonus: { icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", label: "Bono" },
};

export default function ReferralPanel({ userId, userName, userRole }: ReferralPanelProps) {
  const [copied, setCopied] = useState(false);
  const { addNotification } = useNotificationHistory(userRole);
  const { permission: pushPermission, sendNotification } = usePushNotifications();

  const [activeTab, setActiveTab] = useState<"overview" | "rewards" | "history">("overview");

  const { data: myCode, refetch: refetchCode } = trpc.referrals.getMyCode.useQuery(
    { userId, userRole, name: userName },
    { enabled: !!userId }
  );

  const { data: myCredits } = trpc.referrals.getMyCredits.useQuery(
    { userId, userRole },
    { enabled: !!userId }
  );

  const { data: rewards } = trpc.referrals.getRewards.useQuery(
    { userRole },
    { enabled: !!userId }
  );

  const { data: history } = trpc.referrals.getMyHistory.useQuery(
    { userId, userRole },
    { enabled: !!userId }
  );

  const referralLink = myCode
    ? `${window.location.origin}/register?ref=${myCode.code}`
    : "";

  // Listen for referral events from other tabs (BroadcastChannel) or same tab (localStorage polling)
  useEffect(() => {
    if (!myCode?.code) return;

    const handleReferralEvent = (ev: { code: string; newUserName: string; newUserRole: string; timestamp: number }) => {
      if (ev.code !== myCode.code) return;
      const lastKey = `wt_last_referral_notif_${myCode.code}`;
      const last = Number(localStorage.getItem(lastKey) || 0);
      if (Date.now() - last < 5000) return;
      localStorage.setItem(lastKey, String(Date.now()));

      const msg = `🎉 ¡${ev.newUserName} usó tu código! Ya tienes una nueva recompensa pendiente.`;
      addNotification(msg, { title: "¡Nuevo referido!", type: "success", sound: "new_trip" });
      if (pushPermission === "granted") {
        sendNotification("¡Nuevo referido!", { body: msg, icon: "/icon-192.png", url: userRole === "driver" ? "/driver-dashboard" : "/client-dashboard" });
      }
    };

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("wt_referral_notifications");
      bc.onmessage = (e) => handleReferralEvent(e.data);
    } catch { /* not available */ }

    const pollInterval = setInterval(() => {
      const eventKey = `wt_referral_event_${myCode.code}`;
      const raw = localStorage.getItem(eventKey);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < 30000) {
          handleReferralEvent(parsed);
          localStorage.removeItem(eventKey);
        }
      } catch { /* ignore */ }
    }, 2000);

    return () => { bc?.close(); clearInterval(pollInterval); };
  }, [myCode?.code, addNotification, pushPermission, sendNotification, userRole]);

  const handleCopyCode = () => {
    if (!myCode) return;
    navigator.clipboard.writeText(myCode.code);
    setCopied(true);
    toast.success("¡Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("¡Link copiado!");
  };

  const handleShareWhatsApp = () => {
    const text = userRole === "client"
      ? `¡Únete a Passenger con mi código *${myCode?.code}* y obtén un descuento en tu primer viaje! 🚕\n${referralLink}`
      : `¡Únete como conductor en Passenger con mi código *${myCode?.code}* y gana un bono de bienvenida! 🚗\n${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleShareGeneral = () => {
    if (navigator.share) {
      navigator.share({
        title: "Passenger",
        text: `Usa mi código ${myCode?.code} y obtén recompensas`,
        url: referralLink,
      });
    } else {
      handleCopyLink();
    }
  };

  const balance = Number(myCredits?.balance || 0);
  const totalEarned = Number(myCredits?.totalEarned || 0);
  const freeTrips = Number(myCredits?.freeTripsCoupon || 0);
  const totalReferrals = Number(myCode?.totalReferrals || 0);

  // Progress to next milestone
  const nextMilestone = rewards?.find((r: any) => Number(r.triggerCount) > totalReferrals);
  const progress = nextMilestone
    ? Math.min((totalReferrals / Number(nextMilestone.triggerCount)) * 100, 100)
    : 100;

  return (
    <div className="space-y-4">

      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <p className="text-2xl font-bold text-green-700">${balance.toFixed(2)}</p>
          <p className="text-xs text-green-600 font-medium">Créditos</p>
        </Card>
        <Card className="p-3 text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <p className="text-2xl font-bold text-blue-700">{totalReferrals}</p>
          <p className="text-xs text-blue-600 font-medium">Referidos</p>
        </Card>
        <Card className="p-3 text-center bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <p className="text-2xl font-bold text-purple-700">{freeTrips}</p>
          <p className="text-xs text-purple-600 font-medium">{userRole === "client" ? "Viajes gratis" : "Bonos"}</p>
        </Card>
      </div>

      {/* Referral code card */}
      <Card className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
        <div className="flex items-center gap-2 mb-3">
          <Gift size={18} className="text-green-400" />
          <span className="text-sm font-semibold text-white/80">
            {userRole === "client" ? "Tu código de referido" : "Tu código para reclutar conductores"}
          </span>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 bg-white/10 rounded-xl px-4 py-3 text-center">
            <span className="text-2xl font-extrabold tracking-widest text-green-400">
              {myCode?.code || "Cargando..."}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className={`p-3 rounded-xl transition-all ${copied ? "bg-green-500" : "bg-white/10 hover:bg-white/20"}`}
          >
            {copied ? <CheckCircle size={20} className="text-white" /> : <Copy size={20} className="text-white" />}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            <span>💬</span> WhatsApp
          </button>
          <button
            onClick={handleShareGeneral}
            className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            <Share2 size={15} /> Compartir
          </button>
        </div>
      </Card>

      {/* Progress to next reward */}
      {nextMilestone && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">Próxima recompensa</span>
            </div>
            <span className="text-xs text-amber-600 font-medium">
              {totalReferrals}/{nextMilestone.triggerCount} referidos
            </span>
          </div>
          <div className="w-full bg-amber-200 rounded-full h-2.5 mb-2">
            <div
              className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-amber-700 font-medium">
            🎁 {nextMilestone.rewardLabel}
          </p>
          <p className="text-xs text-amber-600 mt-0.5">{nextMilestone.rewardDescription}</p>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { id: "overview" as const, label: "Resumen" },
          { id: "rewards" as const, label: "Premios" },
          { id: "history" as const, label: "Historial" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id ? "border-green-500 text-green-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">¿Cómo funciona?</h3>
            {[
              { step: "1", text: userRole === "client" ? "Comparte tu código con amigos" : "Comparte tu código con otros conductores", icon: Share2 },
              { step: "2", text: "Se registran con tu código", icon: Users },
              { step: "3", text: "¡Ambos ganan recompensas automáticamente!", icon: Gift },
            ].map(item => (
              <div key={item.step} className="flex items-center gap-3 mb-2.5">
                <div className="w-7 h-7 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {item.step}
                </div>
                <p className="text-sm text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
          {totalEarned > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <Star size={20} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Total ganado en recompensas</p>
                <p className="text-lg font-bold text-green-700">${totalEarned.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Rewards */}
      {activeTab === "rewards" && (
        <div className="space-y-2">
          {rewards?.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-6">No hay premios configurados</p>
          )}
          {rewards?.map((reward: any) => {
            const config = rewardTypeConfig[reward.rewardType as keyof typeof rewardTypeConfig] || rewardTypeConfig.credit;
            const Icon = config.icon;
            const isUnlocked = totalReferrals >= Number(reward.triggerCount);
            return (
              <div
                key={reward.id}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                  isUnlocked ? "border-green-200 bg-green-50" : "border-slate-200 bg-white opacity-70"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{reward.rewardLabel}</p>
                  <p className="text-xs text-slate-500">{reward.eventLabel}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {isUnlocked ? (
                    <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                      <CheckCircle size={12} /> Desbloqueado
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">{reward.triggerCount} ref.</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: History */}
      {activeTab === "history" && (
        <div className="space-y-2">
          {(!history || history.length === 0) && (
            <div className="text-center py-8">
              <Users size={32} className="mx-auto text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">Aún no tienes referidos</p>
              <p className="text-xs text-slate-400 mt-1">Comparte tu código para empezar a ganar</p>
            </div>
          )}
          {history?.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                item.status === "completed" ? "bg-green-100" : "bg-yellow-100"
              }`}>
                {item.status === "completed"
                  ? <CheckCircle size={14} className="text-green-600" />
                  : <Clock size={14} className="text-yellow-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {item.status === "completed" ? "Recompensa ganada" : "Referido pendiente"}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              {item.rewardEarned > 0 && (
                <span className="text-sm font-bold text-green-600">+${Number(item.rewardEarned).toFixed(2)}</span>
              )}
              {item.rewardLabel && item.rewardEarned == 0 && (
                <span className="text-xs font-semibold text-purple-600">{item.rewardLabel}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
