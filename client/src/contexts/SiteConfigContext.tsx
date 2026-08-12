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
  footerPages: Record<string, { title: string; content: string }>;
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
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
  heroTitle: "Conecta con conductores locales verificados",
  heroDesc: "Marketplace P2P con modelo SaaS para conductores independientes. El pasajero elige, el conductor acepta y el pago va directo al conductor.",
  ctaText: "Buscar conductor",
  primaryColor: "#25D366",
  secondaryColor: "#0d1117",
  accentColor: "#128C7E",
  fontFamily: "Sora",
  contactEmail: "soporte@passenger.app",
  contactPhone: "+1 800 PASSENGER",
  contactAddress: "Ciudad de México, México",
  footerText: "© 2025 Passenger. Todos los derechos reservados.",
  footerLinks: "Terminos | Privacidad | Arbitraje | Soporte",
  metaDescription: "Marketplace P2P de ridesharing con suscripcion SaaS para conductores independientes.",
  metaKeywords: "marketplace p2p, ridesharing, conductor independiente, suscripcion saas, florida",
  showAnimations: true,
  showPricing: true,
  showTestimonials: true,
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
  testimonials: [
    {
      id: "maria",
      name: "María L.",
      company: "Pasajera frecuente",
      text: "Pude elegir mi conductor en segundos y me dio mucha más confianza que un servicio tradicional.",
      rating: 5,
      avatarUrl: "/assets-storage/avatar1_c813ee08.jpg",
    },
    {
      id: "david",
      name: "David R.",
      company: "Conductor independiente",
      text: "Conseguí clientes más rápido y el proceso se siente mucho más profesional y claro.",
      rating: 5,
      avatarUrl: "/assets-storage/avatar2_b26d0545.jpg",
    },
    {
      id: "sofia",
      name: "Sofía P.",
      company: "Operación de flotilla",
      text: "La parte visual y la claridad legal hacen que el producto se vea serio y confiable para nuestros clientes.",
      rating: 5,
      avatarUrl: "/assets-storage/avatar3_46cc7298.jpg",
    },
  ],
  notificationEmail: "admin@whatsapptaxi.com",
  smtpHost: "",
  smtpPort: "587",
  smtpUser: "",
  smtpPass: "",
  smtpFrom: "noreply@whatsapptaxi.com",
  footerPages: {
    about: {
      title: "Sobre Passenger",
      content: "<h2>Somos la capa premium de movilidad urbana</h2><p>Passenger es una plataforma de movilidad diseñada para conectar pasajeros, conductores y flotillas con una experiencia premium, clara y confiable. Construimos tecnología que hace que cada viaje se sienta más humano, más seguro y mucho más profesional.</p><p>Nosotros no solo ofrecemos software: diseñamos una experiencia operativa completa para empresas que quieren crecer sin perder control. Desde la primera solicitud hasta el cierre del viaje, cada interacción está pensada para ser simple, elegante y útil.</p><h3>Qué nos diferencia</h3><ul><li>Experiencia premium para pasajeros y conductores.</li><li>Operaciones visibles en tiempo real para administradores y flotillas.</li><li>Procesos claros, legales y escalables para crecimiento sostenible.</li><li>Diseño cuidado, soporte humano y tecnología preparada para escalar.</li></ul><p>En Passenger creemos que la movilidad debe sentirse confiable, moderna y cercana. Nuestra misión es ayudar a las empresas de transporte a operar con excelencia mientras los usuarios disfrutan una experiencia que respira calidad desde el primer contacto.</p>",
    },
    changelog: {
      title: "Changelog",
      content: "<h2>Actualizaciones del producto</h2><p>Publicamos mejoras de forma continua para mantener una plataforma estable y competitiva.</p><h3>Versiones recientes</h3><ul><li><strong>v1.4</strong> - Mejoras de rendimiento en panel y carga inicial.</li><li><strong>v1.3</strong> - Nuevo flujo de instalacion PWA guiado por dispositivo.</li><li><strong>v1.2</strong> - Ajustes de legibilidad y navegacion en landing y FAQ.</li><li><strong>v1.1</strong> - Refinamiento del editor web para Super Admin.</li></ul><p>Si deseas el detalle tecnico completo, contacta a soporte para recibir notas extendidas por entorno.</p>",
    },
    roadmap: {
      title: "Roadmap",
      content: "<h2>Direccion del producto</h2><p>Este roadmap representa prioridades activas para mejorar conversion, eficiencia y control operativo.</p><h3>Proximos hitos</h3><ul><li><strong>Automatizacion avanzada de dispatch:</strong> reglas inteligentes por zona, demanda y disponibilidad.</li><li><strong>Integraciones de pago:</strong> mayor cobertura de metodos y conciliacion operativa.</li><li><strong>Centro de reportes:</strong> tableros con KPIs por turno, conductor y canal.</li><li><strong>Experiencia de cliente:</strong> mejoras en seguimiento, confirmaciones y notificaciones.</li></ul><p>El roadmap se ajusta segun feedback de clientes y prioridades de negocio.</p>",
    },
    blog: {
      title: "Blog",
      content: "<h2>Contenido para crecer tu operacion</h2><p>En nuestro blog publicamos estrategias practicas para empresas de taxi que buscan crecer con procesos mas eficientes.</p><ul><li>Como aumentar conversion desde WhatsApp.</li><li>Indicadores clave para mejorar tiempos de asignacion.</li><li>Playbooks para operar horas pico con mayor estabilidad.</li><li>Buenas practicas para fidelizacion de clientes recurrentes.</li></ul><p>Si quieres sugerir un tema, escribenos y lo incluimos en el calendario editorial.</p>",
    },
    careers: {
      title: "Carreras",
      content: "<h2>Trabaja con nosotros</h2><p>Buscamos personas con mentalidad de producto, enfoque en resultados y pasion por resolver problemas reales en movilidad urbana.</p><h3>Perfiles que buscamos</h3><ul><li>Producto y operaciones SaaS.</li><li>Ingenieria frontend/backend.</li><li>Soporte tecnico y exito del cliente.</li><li>Crecimiento y analitica.</li></ul><p>Comparte tu perfil y experiencia a <strong>talento@whatsapptaxi.com</strong>.</p>",
    },
    press: {
      title: "Prensa",
      content: "<h2>Sala de prensa</h2><p>Atendemos solicitudes de medios, entrevistas y material institucional para cobertura periodistica.</p><h3>Solicitudes disponibles</h3><ul><li>Voceria ejecutiva y contexto de mercado.</li><li>Datos de crecimiento y casos de uso.</li><li>Recursos de marca y material visual.</li></ul><p>Contacto oficial: <strong>prensa@whatsapptaxi.com</strong>.</p>",
    },
    docs: {
      title: "Documentacion",
      content: "<h2>Documentacion operativa</h2><p>Nuestra documentacion esta pensada para que tu equipo implemente rapido y opere con consistencia.</p><h3>Inicio rapido</h3><ol><li>Configura identidad de marca y canales.</li><li>Activa conductores, tarifas y zonas.</li><li>Publica landing, revisa flujos y habilita monitoreo.</li></ol><h3>Recursos clave</h3><ul><li>Checklist de lanzamiento.</li><li>Guia de configuracion de roles.</li><li>Buenas practicas de soporte y escalamiento.</li></ul>",
    },
    guides: {
      title: "Guias",
      content: "<h2>Guias para equipos de operacion</h2><p>Accede a guias practicas para ejecutar mejor el dia a dia de tu empresa.</p><ul><li><strong>Guia comercial:</strong> como convertir mas conversaciones en viajes.</li><li><strong>Guia operativa:</strong> protocolos para dispatch y seguimiento.</li><li><strong>Guia financiera:</strong> estructura de tarifas y control de margen.</li><li><strong>Guia de seguridad:</strong> recomendaciones para conductores y usuarios.</li></ul><p>Cada guia incluye pasos, checklists y ejemplos accionables.</p>",
    },
    privacy: {
      title: "Politica de Privacidad",
      content: "<h2>Politica de Privacidad (FDBR)</h2><p>Esta politica se alinea con la Florida Digital Bill of Rights para usuarios elegibles.</p><h3>Datos que recopilamos</h3><ul><li>Identificadores: nombre, email, telefono.</li><li>Ubicacion y datos de viaje.</li><li>Documentacion de conductor (licencia, seguro, verificacion).</li><li>Datos sensibles: SSN cifrado y licencia de conducir.</li></ul><h3>Derechos del usuario</h3><ul><li>Acceder a sus datos.</li><li>Corregir informacion inexacta.</li><li>Solicitar eliminacion conforme a ley aplicable.</li><li>Opt-out de venta o uso ampliado de datos donde aplique.</li></ul><h3>Cookies y rastreo</h3><p>Usamos cookies esenciales y de analitica para operar y mejorar el servicio.</p><p>Solicitudes: <strong>privacy@whatstaxi.com</strong></p>",
    },
    terms: {
      title: "Terminos de Servicio",
      content: "<h2>Terminos de Servicio</h2><p>WhatsTaxi es una plataforma tecnologica de conexion entre pasajeros y conductores independientes. No somos transportista, empresa de taxis ni TNC.</p><p>El contrato de transporte es exclusivamente entre pasajero y conductor. WhatsTaxi no es empleador de conductores ni fija precios obligatorios.</p><h3>Condiciones clave</h3><ul><li>El conductor acepta o rechaza solicitudes libremente.</li><li>El pasajero elige conductor desde un directorio.</li><li>El pago del viaje se realiza directamente al conductor.</li><li>WhatsTaxi provee software bajo modelo SaaS por suscripcion.</li></ul><h3>Limitacion de responsabilidad</h3><p>En la maxima medida permitida por ley, WhatsTaxi no asume responsabilidad por actos u omisiones del conductor durante el servicio de transporte.</p><p>Jurisdiccion aplicable: Estado de Florida, Condado de Orange.</p>",
    },
    cookies: {
      title: "Cookies",
      content: "<h2>Politica de cookies</h2><p>Usamos cookies y tecnologias similares para mejorar experiencia, mantener sesion activa y analizar uso de la plataforma.</p><h3>Tipos de cookies</h3><ul><li><strong>Esenciales:</strong> funcionamiento basico y seguridad.</li><li><strong>Rendimiento:</strong> diagnostico y mejora de tiempos de carga.</li><li><strong>Analitica:</strong> medicion de uso para optimizacion continua.</li></ul><p>Puedes gestionar o eliminar cookies desde la configuracion de tu navegador.</p>",
    },
    gdpr: {
      title: "GDPR",
      content: "<h2>Marco GDPR</h2><p>Para operaciones que involucren datos de usuarios bajo regulacion europea, aplicamos principios de transparencia y control del titular de datos.</p><h3>Derechos del titular</h3><ul><li>Acceso a datos personales.</li><li>Rectificacion de informacion inexacta.</li><li>Eliminacion cuando corresponda por ley.</li><li>Limitacion u oposicion al tratamiento en casos aplicables.</li></ul><p>Solicitudes de cumplimiento: <strong>privacy@whatsapptaxi.com</strong>.</p>",
    },
    arbitration: {
      title: "Acuerdo de Arbitraje",
      content: "<h2>Acuerdo de Arbitraje</h2><p>Toda disputa relacionada con el uso de la plataforma sera resuelta mediante arbitraje vinculante (binding arbitration).</p><ul><li>Foro de arbitraje: Orlando, Florida.</li><li>Reglas aplicables: American Arbitration Association (AAA).</li><li>Renuncia expresa a demandas colectivas (class action waiver).</li></ul><p>Al usar la plataforma, aceptas resolver disputas bajo este mecanismo.</p>",
    },
    "zero-tolerance": {
      title: "Politica de Tolerancia Cero",
      content: "<h2>Politica de Tolerancia Cero</h2><ul><li>No discriminacion por raza, genero, religion, origen o discapacidad.</li><li>No acoso, intimidacion o conducta inapropiada.</li><li>Prohibido consumo de alcohol o drogas durante el servicio.</li><li>Consecuencias: suspension temporal o permanente de la cuenta.</li></ul><p>Esta politica aplica a pasajeros y conductores.</p>",
    },
    "insurance-requirements": {
      title: "Requisitos de Seguro para Conductores",
      content: "<h2>Requisitos de Seguro</h2><ul><li>Seguro personal vigente obligatorio.</li><li>Rideshare Endorsement requerido en la poliza.</li><li>Coberturas minimas deben cumplir normativa local y fases del viaje.</li></ul><p>WhatsTaxi no provee seguro de transporte: es responsabilidad exclusiva del conductor independiente.</p>",
    },
    "driver-subscription-agreement": {
      title: "Contrato de Suscripcion para Conductores",
      content: "<h2>Contrato de Suscripcion SaaS</h2><p>El conductor es cliente de WhatsTaxi y usa el software mediante suscripcion semanal o mensual.</p><ul><li>La suscripcion es por acceso a la plataforma, no por viajes individuales.</li><li>Renovacion automatica hasta cancelacion.</li><li>Cancelacion en cualquier momento desde panel de suscripcion.</li><li>No existe relacion empleador-empleado.</li><li>El conductor es responsable de sus impuestos (1099).</li></ul>",
    },
    support: {
      title: "Soporte",
      content: "<h2>Contacto de Soporte</h2><p>Canales oficiales:</p><ul><li>Email: soporte@whatstaxi.com</li><li>Legal/privacidad: privacy@whatstaxi.com</li><li>Respuesta prioritaria para planes Pro y Premium</li></ul><p>Horario: Lunes a Domingo, 7:00 AM - 11:00 PM (ET).</p>",
    },
  },
};

const STORAGE_KEY = "wataxi_site_config";

function loadConfig(): SiteConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SITE_CONFIG;
    return { ...DEFAULT_SITE_CONFIG, ...JSON.parse(raw) };
  } catch {
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
    return result ?? null;
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
        const merged = { ...DEFAULT_SITE_CONFIG, ...dbConfig };
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
          setConfig({ ...DEFAULT_SITE_CONFIG, ...JSON.parse(e.newValue) });
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
