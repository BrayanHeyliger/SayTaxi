import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CreditCard, CheckCircle, Shield, Zap, Crown, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { toast } from "sonner";

const plans = [
  {
    id: "basic",
    name: "Básico",
    price: 49,
    priceId: "price_basic",
    icon: Zap,
    color: "from-green-400 to-green-600",
    features: [
      "Hasta 10 conductores",
      "Bot WhatsApp básico",
      "Panel de administración",
      "Soporte por email",
      "1 zona operativa",
    ],
    notIncluded: ["God's Eye", "Analytics avanzado", "Pricing dinámico"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 149,
    priceId: "price_pro",
    icon: Crown,
    color: "from-blue-400 to-blue-600",
    highlight: true,
    features: [
      "Hasta 50 conductores",
      "Bot WhatsApp avanzado con IA",
      "God's Eye en tiempo real",
      "Analytics completo",
      "Pricing dinámico",
      "Soporte prioritario 24/7",
      "5 zonas operativas",
    ],
    notIncluded: [],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 399,
    priceId: "price_enterprise",
    icon: Building2,
    color: "from-purple-400 to-purple-600",
    features: [
      "Conductores ilimitados",
      "Bot WhatsApp + IA predictiva",
      "God's Eye + Mapa de calor",
      "Analytics + Reportes personalizados",
      "Pricing dinámico + ML",
      "Soporte dedicado",
      "Zonas ilimitadas",
      "Multi-tenant SaaS",
      "White-label completo",
    ],
    notIncluded: [],
  },
];

export default function Payments() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useLocalAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal">("stripe");

  const createCheckout = trpc.payments.createCheckout.useMutation({
    onSuccess: (data: any) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success("Redirigiendo al checkout...");
      }
      setLoadingPlan(null);
    },
    onError: (err: any) => {
      toast.error("Error al procesar el pago: " + err.message);
      setLoadingPlan(null);
    },
  });

  const handleSelectPlan = async (plan: typeof plans[0]) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setLoadingPlan(plan.id);
    if (paymentMethod === "stripe") {
      createCheckout.mutate({ planId: plan.id, planName: plan.name, amount: plan.price });
    } else {
      // PayPal redirect
      const paypalUrl = `https://www.paypal.com/checkoutnow?amount=${plan.price}&currency=USD&description=WhatsAppTaxi+${plan.name}`;
      window.open(paypalUrl, "_blank");
      toast.success("Redirigiendo a PayPal...");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.13_0.01_250)] to-[oklch(0.08_0.02_250)] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <a href="/" className="inline-flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg">
              <img src="/assets-storage/logo-icon_34950e08.png" alt="Logo" className="w-full h-full object-cover" style={{ background: "oklch(0.76 0.18 148)" }} />
            </div>
            <span className="text-white font-bold text-xl" style={{ fontFamily: "'Sora', sans-serif" }}>
              WhatsApp<span className="text-[oklch(0.76_0.18_148)]">Taxi</span>
            </span>
          </a>
          <h1 className="text-4xl font-extrabold text-white mb-4" style={{ fontFamily: "'Sora', sans-serif" }}>
            Elige tu Plan
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Empieza gratis y escala cuando lo necesites. Sin contratos. Sin sorpresas.
          </p>

          {/* Payment Method Toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className="text-white/60 text-sm">Pagar con:</span>
            <div className="flex bg-white/10 rounded-xl p-1 gap-1">
              <button
                onClick={() => setPaymentMethod("stripe")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${paymentMethod === "stripe" ? "bg-white text-slate-900" : "text-white/60 hover:text-white"}`}
              >
                💳 Stripe
              </button>
              <button
                onClick={() => setPaymentMethod("paypal")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${paymentMethod === "paypal" ? "bg-white text-slate-900" : "text-white/60 hover:text-white"}`}
              >
                🅿️ PayPal
              </button>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 border transition-all duration-300 hover:scale-[1.02] ${
                plan.highlight
                  ? "bg-white border-white/20 shadow-2xl shadow-blue-500/20"
                  : "bg-white/5 border-white/10 hover:border-white/20"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                  ⭐ MÁS POPULAR
                </div>
              )}

              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4 shadow-lg`}>
                <plan.icon size={22} className="text-white" />
              </div>

              <h3 className={`text-xl font-bold mb-1 ${plan.highlight ? "text-slate-900" : "text-white"}`}
                style={{ fontFamily: "'Sora', sans-serif" }}>
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-5">
                <span className={`text-4xl font-extrabold ${plan.highlight ? "text-slate-900" : "text-white"}`}>${plan.price}</span>
                <span className={`text-sm ${plan.highlight ? "text-slate-500" : "text-white/50"}`}>/mes</span>
              </div>

              <div className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle size={15} className="text-green-500 flex-shrink-0" />
                    <span className={`text-sm ${plan.highlight ? "text-slate-700" : "text-white/70"}`}>{f}</span>
                  </div>
                ))}
                {plan.notIncluded.map((f) => (
                  <div key={f} className="flex items-center gap-2 opacity-40">
                    <div className="w-3.5 h-3.5 rounded-full border border-current flex-shrink-0" />
                    <span className={`text-sm line-through ${plan.highlight ? "text-slate-500" : "text-white/50"}`}>{f}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => handleSelectPlan(plan)}
                disabled={loadingPlan === plan.id}
                className={`w-full font-semibold py-3 rounded-xl ${
                  plan.highlight
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30"
                    : ""
                }`}
                style={!plan.highlight ? { background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" } : {}}
              >
                {loadingPlan === plan.id ? "Procesando..." : `Contratar ${plan.name}`}
              </Button>
            </div>
          ))}
        </div>

        {/* Security badges */}
        <div className="flex flex-wrap justify-center gap-6 text-white/40 text-sm">
          <div className="flex items-center gap-2"><Shield size={16} /><span>Pagos 100% seguros</span></div>
          <div className="flex items-center gap-2"><CreditCard size={16} /><span>Stripe & PayPal certificados</span></div>
          <div className="flex items-center gap-2"><CheckCircle size={16} /><span>Cancela cuando quieras</span></div>
        </div>

        {/* Test info */}
        <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-xl text-center">
          <p className="text-white/50 text-xs">
            🧪 Modo de prueba activo. Usa la tarjeta <strong className="text-white/70">4242 4242 4242 4242</strong> para probar pagos con Stripe.
          </p>
        </div>

        <div className="text-center mt-6">
          <a href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors">
            <ArrowLeft size={14} /> Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
