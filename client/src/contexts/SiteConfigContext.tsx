import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface SiteConfig {
  vehicles: Array<{ id: string; label: string; emoji: string; base: number; perKm: number; eta: string; seats: number; active: boolean }>;
  extras: Array<{ id: string; label: string; icon: string; price: number; active: boolean }>;
  siteTitle: string;
  tagline: string;
  heroTitle: string;
  heroDesc: string;
  ctaText: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  footerText: string;
  footerLinks: string;
  metaDescription: string;
  metaKeywords: string;
  showAnimations: boolean;
  showPricing: boolean;
  showTestimonials: boolean;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  commissionRate: string;
  basefare: string;
  pricePerKm: string;
  surgePricing: boolean;
  surgeMultiplier: string;
  logoUrl: string;
  heroBgUrl: string;
  testimonials: Array<{ id: string; name: string; company: string; text: string; rating: number; avatarUrl: string }>;
  notificationEmail: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
}

const PASSENGER_DEFAULT_SITE_CONFIG: SiteConfig = {
  vehicles: [
    { id: "economy", label: "Económico", emoji: "🚗", base: 6,  perKm: 0.9, eta: "3 min", seats: 4, active: true },
    { id: "comfort",  label: "Confort",   emoji: "🚙", base: 9,  perKm: 1.3, eta: "5 min", seats: 4, active: true },
    { id: "premium",  label: "Premium",   emoji: "🚘", base: 14, perKm: 1.8, eta: "7 min", seats: 4, active: true },
    { id: "suv",      label: "SUV",       emoji: "🚐", base: 18, perKm: 2.2, eta: "8 min", seats: 6, active: true },
  ],
  extras: [
    { id: "pet",        label: "Mascota",        icon: "🐾", price: 2, active: true },
    { id: "luggage",    label: "Maletas",         icon: "🧳", price: 1, active: true },
    { id: "child_seat", label: "Silla de niño",   icon: "👶", price: 3, active: true },
    { id: "wheelchair", label: "Silla de ruedas", icon: "♿", price: 0, active: true },
    { id: "music",      label: "Música a gusto",  icon: "🎵", price: 0, active: true },
  ],
  siteTitle: "Passenger",
  tagline: "Tu viaje, tu elección",
  heroTitle: "Tu viaje, tu elección en una sola app.",
  heroDesc: "Reserva tu próxima movilidad con Passenger: conductor cercano, precio claro y viajes sin complicaciones.",
  ctaText: "Pedir un viaje",
  primaryColor: "#1DD1A1",
  secondaryColor: "#0f172a",
  accentColor: "#10b981",
  fontFamily: "Sora",
  contactEmail: "soporte@passenger.app",
  contactPhone: "+1 800 PASSENGER",
  contactAddress: "Ciudad de México, México",
  footerText: "© 2025 Passenger. Todos los derechos reservados.",
  footerLinks: "Privacidad | Términos | Soporte",
  metaDescription: "Passenger — Tu viaje, tu elección.",
  metaKeywords: "passenger, taxi, viajes, movilidad, transporte",
  showAnimations: true,
  showPricing: true,
  showTestimonials: false,
  maintenanceMode: false,
  allowRegistration: true,
  requireEmailVerification: false,
  commissionRate: "20",
  basefare: "2.50",
  pricePerKm: "1.20",
  surgePricing: true,
  surgeMultiplier: "1.5",
  logoUrl: "",
  heroBgUrl: "",
  testimonials: [],
  notificationEmail: "admin@passenger.app",
  smtpHost: "",
  smtpPort: "587",
  smtpUser: "",
  smtpPass: "",
  smtpFrom: "noreply@passenger.app",
};

export const DEFAULT_SITE_CONFIG: SiteConfig = PASSENGER_DEFAULT_SITE_CONFIG;

function normalizeSiteConfig(raw?: Partial<SiteConfig> | null): SiteConfig {
  const merged = { ...PASSENGER_DEFAULT_SITE_CONFIG, ...(raw ?? {}) };
  return {
    ...merged,
    siteTitle: "Passenger",
    tagline: "Tu viaje, tu elección",
    heroTitle: "Tu viaje, tu elección en una sola app.",
    heroDesc: "Reserva tu próxima movilidad con Passenger: conductor cercano, precio claro y viajes sin complicaciones.",
    ctaText: "Pedir un viaje",
    contactEmail: "soporte@passenger.app",
    contactPhone: "+1 800 PASSENGER",
    footerText: "© 2025 Passenger. Todos los derechos reservados.",
    metaDescription: "Passenger — Tu viaje, tu elección.",
    notificationEmail: "admin@passenger.app",
    smtpFrom: "noreply@passenger.app",
  };
}

const STORAGE_KEY = "wataxi_site_config";
const LEGACY_STORAGE_KEYS = ["wataxi_site_config", "wataxi_config", "wataxi_lang"];

function resetLegacyStorage() {
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      if (key !== STORAGE_KEY) {
        localStorage.removeItem(key);
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SITE_CONFIG));
  } catch {
    // ignore storage restrictions in private browsers
  }
}

function loadConfig(): SiteConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      resetLegacyStorage();
      return DEFAULT_SITE_CONFIG;
    }
    const parsed = JSON.parse(stored);
    const normalized = normalizeSiteConfig(parsed);
    if (JSON.stringify(normalized) !== stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    resetLegacyStorage();
    return DEFAULT_SITE_CONFIG;
  }
}

async function fetchConfigFromDB(): Promise<Partial<SiteConfig> | null> {
  try {
    const res = await fetch(
      "/api/trpc/siteSettings.getConfig?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D",
      { credentials: "include" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.[0]?.result?.data?.json;
    return normalizeSiteConfig(result ?? null);
  } catch {
    return null;
  }
}

async function saveConfigToDB(cfg: SiteConfig): Promise<boolean> {
  try {
    const res = await fetch("/api/trpc/siteSettings.saveConfig?batch=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ "0": { json: { config: JSON.stringify(cfg) } } }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface SiteConfigContextValue {
  config: SiteConfig;
  updateConfig: (partial: Partial<SiteConfig>) => void;
  saveConfig: (cfg: SiteConfig) => void;
  isSaving: boolean;
  lastSaved: Date | null;
}

const SiteConfigContext = createContext<SiteConfigContextValue>({
  config: DEFAULT_SITE_CONFIG,
  updateConfig: () => {},
  saveConfig: () => {},
  isSaving: false,
  lastSaved: null,
});

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(loadConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load from DB on mount using plain fetch (avoids tRPC hook context issues)
  useEffect(() => {
    fetchConfigFromDB().then(dbConfig => {
      if (dbConfig) {
        const merged = normalizeSiteConfig(dbConfig);
        setConfig(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
    });
  }, []);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setConfig(normalizeSiteConfig(JSON.parse(e.newValue)));
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Poll every 500ms to catch same-tab saves from AdminDashboard
  useEffect(() => {
    const interval = setInterval(() => {
      const fresh = loadConfig();
      setConfig(prev => {
        const prevStr = JSON.stringify(prev);
        const freshStr = JSON.stringify(fresh);
        return prevStr === freshStr ? prev : fresh;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Apply CSS variables whenever config changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--wataxi-primary", config.primaryColor);
    root.style.setProperty("--wataxi-secondary", config.secondaryColor);
    root.style.setProperty("--wataxi-accent", config.accentColor);
    root.style.setProperty("--wataxi-font", config.fontFamily);
    document.title = config.siteTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", config.metaDescription);
  }, [config]);

  const updateConfig = (partial: Partial<SiteConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const saveConfig = (cfg: SiteConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    setConfig(cfg);
    setIsSaving(true);
    saveConfigToDB(cfg).then(ok => {
      if (ok) setLastSaved(new Date());
      else console.error("[SiteConfig] Failed to save to DB");
      setIsSaving(false);
    });
  };

  return (
    <SiteConfigContext.Provider value={{ config, updateConfig, saveConfig, isSaving, lastSaved }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
