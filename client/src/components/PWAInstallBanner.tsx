/**
 * PWAInstallBanner — Banner de instalación PWA mejorado
 * Instalación automática al hacer clic (Chrome/Android/Edge)
 * Instrucciones paso a paso para iOS (Safari)
 * Botón flotante persistente en esquina inferior derecha
 */
import { useState, useEffect } from "react";
import { X, Download, Smartphone, Monitor, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showFloating, setShowFloating] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState<"ios-install" | "open-browser" | null>(null);
  const [browserHint, setBrowserHint] = useState("tu navegador");
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const dismissed = localStorage.getItem("pwa_banner_dismissed");
    const ua = navigator.userAgent || "";
    const lowerUA = ua.toLowerCase();
    const ios = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream;
    const safari = /safari/i.test(ua) && !/crios|fxios|edgios|opr|opios|mercury|gsa|fban|fbav/i.test(ua);
    const inApp = /whatsapp|instagram|fban|fbav|line|micromessenger|twitter|wv\)|; wv\b/i.test(lowerUA);

    if (/whatsapp/i.test(lowerUA)) setBrowserHint("WhatsApp");
    else if (/instagram/i.test(lowerUA)) setBrowserHint("Instagram");
    else if (/fban|fbav/i.test(lowerUA)) setBrowserHint("Facebook");

    setIsIOS(ios);
    setIsSafari(safari);
    setIsInAppBrowser(inApp);

    if (ios) {
      // Show banner after 4s on iOS
      if (!dismissed) setTimeout(() => setShowBanner(true), 4000);
      // Always show floating button on iOS
      setTimeout(() => setShowFloating(true), 2000);
      return;
    }

    // Chrome/Edge/Android: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!dismissed) setTimeout(() => setShowBanner(true), 3000);
      // Show floating button after 8s even if banner dismissed
      setTimeout(() => setShowFloating(true), 8000);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShowBanner(false);
      setShowFloating(false);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      if (!isSafari || isInAppBrowser) {
        setShowHelpModal("open-browser");
      } else {
        setShowHelpModal("ios-install");
      }
      return;
    }

    if (isInAppBrowser && !deferredPrompt) {
      setShowHelpModal("open-browser");
      return;
    }

    if (!deferredPrompt) return;

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShowBanner(false);
        setShowFloating(false);
        setInstalled(true);
      }
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem("pwa_banner_dismissed", "1");
    // Keep floating button visible
    setShowFloating(true);
  };

  if (installed) return null;

  return (
    <>
      {/* Bottom install banner */}
      {showBanner && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
          style={{
            background: "linear-gradient(135deg, oklch(0.13 0.01 250), oklch(0.16 0.02 200))",
            borderTop: "1px solid oklch(0.76 0.18 148 / 0.3)",
            animation: "slideUp 0.4s cubic-bezier(0.23,1,0.32,1)",
          }}
        >
          <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity:0; } to { transform: translateY(0); opacity:1; } }`}</style>
          <div className="max-w-lg mx-auto flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
              style={{ background: "linear-gradient(135deg, oklch(0.52 0.12 148), oklch(0.76 0.18 148))" }}
            >
              <span className="text-2xl">🚕</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm" style={{ fontFamily: "'Sora', sans-serif" }}>
                Instala Passenger
              </p>
              <p className="text-white/60 text-xs mt-0.5">
                {isIOS
                  ? isSafari && !isInAppBrowser
                    ? "Disponible para iPhone y iPad"
                    : "Abre el enlace en Safari para instalar"
                  : isInAppBrowser
                    ? "Abre en Chrome/Edge para instalar en un toque"
                    : "Acceso rápido desde tu pantalla de inicio"}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-white/40 flex items-center gap-1"><Smartphone size={10} /> Sin descargas</span>
                <span className="text-[10px] text-white/40 flex items-center gap-1"><Monitor size={10} /> Funciona offline</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleInstall}
                disabled={installing}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-70"
                style={{ background: "linear-gradient(135deg, oklch(0.52 0.12 148), oklch(0.76 0.18 148))", boxShadow: "0 4px 16px oklch(0.52 0.12 148 / 0.4)" }}
              >
                {isIOS || isInAppBrowser ? <Share size={14} /> : <Download size={14} />}
                {installing ? "..." : isIOS ? "Ver cómo" : isInAppBrowser && !deferredPrompt ? "Abrir navegador" : "Instalar"}
              </button>
              <button
                onClick={handleDismissBanner}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors"
                style={{ background: "oklch(0.25 0.01 250)" }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating install button (always visible after banner dismissed) */}
      {showFloating && !showBanner && (
        <button
          onClick={handleInstall}
          className="fixed bottom-24 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-white text-sm shadow-2xl transition-all active:scale-95 hover:scale-105"
          style={{
            background: "linear-gradient(135deg, oklch(0.52 0.12 148), oklch(0.76 0.18 148))",
            boxShadow: "0 8px 32px oklch(0.52 0.12 148 / 0.5)",
            animation: "fadeIn 0.5s ease",
          }}
          title="Instalar app"
        >
          <style>{`@keyframes fadeIn { from { opacity:0; transform:scale(0.8); } to { opacity:1; transform:scale(1); } }`}</style>
          <Download size={16} />
          <span className="hidden sm:inline">Instalar app</span>
        </button>
      )}

      {/* Help modal: iOS install steps or open external browser steps */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background: "oklch(0 0 0 / 0.75)" }} onClick={() => setShowHelpModal(null)}>
          <div
            className="w-full max-w-sm rounded-3xl p-6"
            style={{ background: "oklch(0.16 0.02 200)", border: "1px solid oklch(0.76 0.18 148 / 0.3)", animation: "slideUp 0.35s cubic-bezier(0.23,1,0.32,1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              {showHelpModal === "ios-install" ? (
                <h3 className="text-white font-bold text-lg" style={{ fontFamily: "'Sora', sans-serif" }}>
                  📱 Instalar en iPhone / iPad
                </h3>
              ) : (
                <h3 className="text-white font-bold text-lg" style={{ fontFamily: "'Sora', sans-serif" }}>
                  🌐 Abrir en navegador compatible
                </h3>
              )}
              <button onClick={() => setShowHelpModal(null)} className="text-white/40 hover:text-white"><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-4 mb-6">
              {showHelpModal === "ios-install"
                ? [
                    { n: "1", icon: "⬆️", text: "Toca el botón Compartir en Safari (cuadrado con flecha hacia arriba)" },
                    { n: "2", icon: "📌", text: "Desplázate y toca \"Agregar a pantalla de inicio\"" },
                    { n: "3", icon: "✅", text: "Toca \"Agregar\" — la app aparecerá en tu pantalla de inicio" },
                  ].map((s) => (
                    <div key={s.n} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: "oklch(0.76 0.18 148 / 0.2)", color: "oklch(0.76 0.18 148)" }}>
                        {s.n}
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed"><span className="text-lg mr-1">{s.icon}</span>{s.text}</p>
                    </div>
                  ))
                : [
                    { n: "1", icon: "⋯", text: `Dentro de ${browserHint}, abre el menú del navegador.` },
                    { n: "2", icon: "🌐", text: "Toca \"Abrir en Safari\" (iPhone) o \"Abrir en Chrome\" (Android)." },
                    { n: "3", icon: "📲", text: "Ya en el navegador, vuelve a tocar \"Instalar\" para completar en un toque." },
                  ].map((s) => (
                    <div key={s.n} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: "oklch(0.76 0.18 148 / 0.2)", color: "oklch(0.76 0.18 148)" }}>
                        {s.n}
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed"><span className="text-lg mr-1">{s.icon}</span>{s.text}</p>
                    </div>
                  ))}
            </div>
            <button
              onClick={() => { setShowHelpModal(null); handleDismissBanner(); }}
              className="w-full py-3 rounded-2xl text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, oklch(0.52 0.12 148), oklch(0.76 0.18 148))" }}
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  );
}

