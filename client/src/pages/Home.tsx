import { useEffect, useState } from "react";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
 import Navbar from "@/components/Navbar";
 import HeroSection from "@/components/HeroSection";
 import ForClientsSection from "@/components/ForClientsSection";
 import ForDriversSection from "@/components/ForDriversSection";
 import ForFleetSection from "@/components/ForFleetSection";
 import PricingSection from "@/components/PricingSection";
 import ContactSection from "@/components/ContactSection";
 import FooterSection from "@/components/FooterSection";
 import TestimonialsSection from "@/components/TestimonialsSection";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";
import { ParcelPromoBar } from "@/components/ParcelPromoBar";
import PassengerMascot from "@/components/PassengerMascot";

export default function Home() {
  const { user, isAuthenticated, logout } = useLocalAuth();
  const [showEntrySplash, setShowEntrySplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowEntrySplash(false), 2200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(165deg,_oklch(0.16_0.02_248)_0%,_oklch(0.1_0.018_252)_55%,_oklch(0.085_0.014_255)_100%)]">
      {showEntrySplash && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[oklch(0.11_0.014_252/0.94)] backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-emerald-300/25 bg-white/8 px-5 py-6 text-center shadow-[0_24px_60px_-24px_rgba(16,185,129,0.45)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">Passenger esta iniciando</p>
            <div className="mt-4 flex items-center justify-center">
              <PassengerMascot mood="searching" size="lg" animated />
            </div>
            <div className="mt-3 h-9 overflow-hidden rounded-full border border-emerald-300/20 bg-black/25 px-3">
              <div className="flex h-full items-center gap-2 animate-mascot-walk text-sm text-emerald-100/95 whitespace-nowrap">
                <span>🚕</span>
                <span>Buscando el mejor conductor para ti...</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-white/70">Tu asistente te acompana desde el primer segundo.</p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 opacity-75 sm:opacity-80">
        <div className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,_oklch(0.76_0.18_148/0.2),_transparent_66%)] blur-xl sm:h-80 sm:w-80 sm:blur-2xl" />
        <div className="absolute right-[-140px] top-[240px] h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,_oklch(0.68_0.07_210/0.18),_transparent_68%)] blur-2xl sm:h-[420px] sm:w-[420px] sm:blur-3xl" />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.024)_1px,transparent_1px)] bg-[size:52px_52px] opacity-20" />

      <div className="relative z-10">
        <Navbar user={user} isAuthenticated={isAuthenticated} onLogout={logout} onLogin={() => window.location.href = "/login"} />
        <HeroSection />
        <ForClientsSection />
        <ForDriversSection />
        <ForFleetSection />
        <section className="container relative z-10 px-4 py-16 sm:py-20">
          <div className="rounded-[2rem] border border-white/15 bg-white/10 p-8 shadow-[0_20px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:p-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">Cumplimiento y seguridad</p>
                <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                  Diseño claro, operaciones responsables y reglas visibles para todos.
                </h2>
                <p className="mt-4 text-base leading-7 text-white/75">
                  El servicio está pensado como una plataforma de conexión tecnológica, no como un operador de transporte tradicional. El conductor elige, el pasajero elige y cada parte recibe información clara sobre privacidad, arbitraje y requisitos de seguro.
                </p>
              </div>
              <a href="/privacy" className="inline-flex items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20">
                Ver política de privacidad
              </a>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-5">
                <p className="text-sm font-semibold text-white">Transparencia legal</p>
                <p className="mt-2 text-sm leading-6 text-white/70">Términos, arbitraje y política de tolerancia cero accesibles desde la plataforma.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-5">
                <p className="text-sm font-semibold text-white">Seguridad del viaje</p>
                <p className="mt-2 text-sm leading-6 text-white/70">Requisitos de licencia, seguro y verificación reforzados para conductores.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-5">
                <p className="text-sm font-semibold text-white">Privacidad y control</p>
                <p className="mt-2 text-sm leading-6 text-white/70">Protección de datos alineada con estándares de privacidad y derechos del usuario.</p>
              </div>
            </div>
          </div>
        </section>
        <PricingSection />
        <TestimonialsSection />
        <ParcelPromoBar />
        <ContactSection />
        <FooterSection />
        <PWAInstallBanner />
        <WhatsAppFloatingButton />
      </div>
    </div>
  );
}
