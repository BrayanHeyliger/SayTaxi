/**
 * Navbar — Passenger
 * Design: Verde Operacional — Sora display, Inter body
 * Transparent on top, transitions to dark on scroll
 * Fully functional: auth, navigation, role-based redirects
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, User, Car, LogOut, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n } from "@/contexts/I18nContext";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import PassengerMascot from "@/components/PassengerMascot";

// navLinks are now built inside the component using t translations

interface NavbarProps {
  user?: any;
  isAuthenticated?: boolean;
  onLogout?: () => void;
  onLogin?: () => void;
}

export default function Navbar({ user, isAuthenticated, onLogout, onLogin }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { lang, t } = useI18n();
  const navLinksTranslated = [
    { label: lang === "en" ? "Passengers" : lang === "fr" ? "Passagers" : "Pasajeros", href: "#clientes" },
    { label: lang === "en" ? "Drivers" : lang === "fr" ? "Chauffeurs" : "Conductores", href: "#conductores" },
    { label: lang === "en" ? "Fleets" : lang === "fr" ? "Flottes" : "Flotillas", href: "#flotilla" },
    { label: t.nav.pricing, href: "#pricing" },
    { label: t.nav.contact, href: "#contact" },
    { label: "Novedades", href: "/novedades" },
    { label: "FAQ", href: "/faq" },
  ];
  const { config } = useSiteConfig();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith("/")) {
      window.location.href = href;
    } else {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-4 left-4 right-4 z-50 transition-all duration-300 rounded-2xl ${
        scrolled
          ? "bg-[oklch(0.12_0.01_250/0.92)] shadow-2xl border border-white/12"
          : "bg-transparent"
      }`}
      style={{ backdropFilter: scrolled ? "blur(12px)" : undefined }}
    >
      <div className="container">
        <div className="flex items-center justify-between h-16 lg:h-20 py-2">
          {/* Logo */}
          <a
            href="/"
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-lg shadow-green-500/20 border border-white/15 bg-white/10">
              <PassengerMascot mood="happy" size="sm" className="scale-[0.62] origin-center -translate-y-1" />
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="text-white font-bold text-base tracking-tight"
                style={{ fontFamily: `'Sora', sans-serif` }}
              >
                {config.siteTitle.split(" ")[0]}<span style={{ color: config.primaryColor }}>{config.siteTitle.split(" ").slice(1).join(" ")}</span>
              </span>
              <span className="text-white/60 text-[11px] font-medium tracking-widest uppercase">
                Plataforma
              </span>
            </div>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinksTranslated.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="text-white/70 hover:text-white text-sm font-medium transition-colors duration-200 hover:text-[oklch(0.76_0.18_148)]"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <LanguageSelector />
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-white/90 hover:text-white bg-white/6 hover:bg-white/12 px-3 py-2 rounded-xl transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold">
                    {user.name?.[0] || "U"}
                  </div>
                  <span className="text-sm font-medium">{user.name || "Usuario"}</span>
                  <ChevronDown size={14} className={`transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl shadow-2xl overflow-hidden z-50 border border-white/10 bg-[oklch(0.16_0.01_250/0.98)] backdrop-blur-xl">
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-white text-sm font-medium">{user.name}</p>
                      <p className="text-white/50 text-xs">{user.email}</p>
                      <p className="text-green-400 text-xs mt-1 capitalize">Rol: {user.role}</p>
                    </div>
                    <div className="py-1">
                      {(user.role === "client" || user.role === "user") && (
                        <Link
                          href="/client-dashboard"
                          className="flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User size={16} />
                          Pasajeros
                        </Link>
                      )}
                      {(user.role === "driver") && (
                        <Link
                          href="/driver-dashboard"
                          className="flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Car size={16} />
                          Conductores
                        </Link>
                      )}
                      {(user.role === "admin") && (
                        <>
                          <Link
                            href="/client-dashboard"
                            className="flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <User size={16} />
                            Pasajeros
                          </Link>
                          <Link
                            href="/driver-dashboard"
                            className="flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Car size={16} />
                            Conductores
                          </Link>
                          <Link
                            href="/fleet-dashboard"
                            className="flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Car size={16} />
                            Flotillas
                          </Link>
                          <Link
                            href="/dispatcher"
                            className="flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Car size={16} />
                            Dispatchers
                          </Link>
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-2.5 text-emerald-300 hover:text-emerald-200 hover:bg-white/10 transition-colors text-sm font-semibold"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <User size={16} />
                            Panel Super Admin
                          </Link>
                        </>
                      )}
                    </div>
                    <div className="border-t border-white/10 py-1">
                      <button
                        onClick={() => { setUserMenuOpen(false); onLogout?.(); }}
                        className="flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors text-sm w-full text-left"
                      >
                        <LogOut size={16} />
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="text-white/80 hover:text-white hover:bg-white/10 text-sm"
                  onClick={() => window.location.href = "/login"}
                >
                  Iniciar sesión
                </Button>
                <Link href="/register">
                  <Button
                    className="text-sm font-semibold px-5 shadow-lg shadow-green-500/25 active:scale-[0.97] transition-transform"
                    style={{
                      background: "oklch(0.76 0.18 148)",
                      color: "oklch(0.08 0.02 148)",
                    }}
                  >
                    Registrarse
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden text-white p-2 rounded-lg hover:bg-white/12 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-[oklch(0.13_0.01_250/0.98)] backdrop-blur-xl border-t border-white/10">
          <div className="container py-4 flex flex-col gap-1">
            {navLinksTranslated.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="text-white/80 hover:text-white text-left py-3 px-4 rounded-lg hover:bg-white/10 transition-colors font-medium"
              >
                {link.label}
              </button>
            ))}
            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/10">
              {isAuthenticated && user ? (
                <>
                  <div className="px-4 py-2 text-white/60 text-sm">
                    Hola, {user.name} ({user.role})
                  </div>
                  {(user.role === "client" || user.role === "user" || user.role === "admin") && (
                    <Link
                      href="/client-dashboard"
                      className="text-white/80 hover:text-white text-left py-3 px-4 rounded-lg hover:bg-white/10 transition-colors font-medium flex items-center gap-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      <User size={16} /> Pasajeros
                    </Link>
                  )}
                  {(user.role === "driver" || user.role === "admin") && (
                    <Link
                      href="/driver-dashboard"
                      className="text-white/80 hover:text-white text-left py-3 px-4 rounded-lg hover:bg-white/10 transition-colors font-medium flex items-center gap-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Car size={16} /> Conductores
                    </Link>
                  )}
                  {(user.role === "admin") && (
                    <>
                      <Link
                        href="/fleet-dashboard"
                        className="text-white/80 hover:text-white text-left py-3 px-4 rounded-lg hover:bg-white/10 transition-colors font-medium flex items-center gap-2"
                        onClick={() => setMobileOpen(false)}
                      >
                        <Car size={16} /> Flotillas
                      </Link>
                      <Link
                        href="/dispatcher"
                        className="text-white/80 hover:text-white text-left py-3 px-4 rounded-lg hover:bg-white/10 transition-colors font-medium flex items-center gap-2"
                        onClick={() => setMobileOpen(false)}
                      >
                        <Car size={16} /> Dispatchers
                      </Link>
                      <Link
                        href="/admin"
                        className="text-emerald-300 hover:text-emerald-200 text-left py-3 px-4 rounded-lg hover:bg-white/10 transition-colors font-medium flex items-center gap-2"
                        onClick={() => setMobileOpen(false)}
                      >
                        <User size={16} /> Panel Super Admin
                      </Link>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 w-full justify-center"
                    onClick={() => { setMobileOpen(false); onLogout?.(); }}
                  >
                    <LogOut size={16} className="mr-2" /> Cerrar Sesión
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="text-white/80 hover:text-white w-full justify-center"
                    onClick={() => { setMobileOpen(false); window.location.href = "/login"; }}
                  >
                    Iniciar sesión
                  </Button>
                  <Link href="/register" onClick={() => setMobileOpen(false)}>
                    <Button
                      className="w-full font-semibold"
                      style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}
                    >
                      Registrarse
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
