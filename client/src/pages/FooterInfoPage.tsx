import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { DEFAULT_SITE_CONFIG, useSiteConfig } from "@/contexts/SiteConfigContext";
import { ArrowLeft, FileText, ShieldCheck, Building2, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

function getSlug(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

type FooterMeta = {
  category: string;
  lead: string;
  highlights: string[];
  accent: string;
};

const footerMeta: Record<string, FooterMeta> = {
  about: {
    category: "Empresa",
    lead: "Conoce nuestra historia, enfoque operativo y compromiso con empresas de taxi en crecimiento.",
    highlights: ["Operacion estable", "Enfoque SaaS", "Equipo especializado"],
    accent: "oklch(0.74 0.16 148)",
  },
  changelog: {
    category: "Producto",
    lead: "Transparencia total sobre mejoras, ajustes y nuevas capacidades de la plataforma.",
    highlights: ["Nuevas funciones", "Rendimiento", "Correcciones"],
    accent: "oklch(0.7 0.13 210)",
  },
  roadmap: {
    category: "Producto",
    lead: "La direccion estrategica del producto para crecer tu operacion con menos friccion.",
    highlights: ["Escalabilidad", "Automatizacion", "Integraciones"],
    accent: "oklch(0.68 0.15 260)",
  },
  blog: {
    category: "Recursos",
    lead: "Ideas practicas para mejorar conversion, retention y eficiencia de tu flotilla.",
    highlights: ["Contenido practico", "Casos reales", "Playbooks"],
    accent: "oklch(0.72 0.14 190)",
  },
  careers: {
    category: "Empresa",
    lead: "Buscamos talento que quiera construir tecnologia util para movilidad real en LATAM.",
    highlights: ["Impacto real", "Cultura de ownership", "Trabajo orientado a resultados"],
    accent: "oklch(0.73 0.16 140)",
  },
  press: {
    category: "Empresa",
    lead: "Informacion para medios, prensa y aliados estrategicos.",
    highlights: ["Kit de marca", "Contacto directo", "Datos institucionales"],
    accent: "oklch(0.74 0.11 230)",
  },
  docs: {
    category: "Recursos",
    lead: "Documentacion operativa para poner en marcha y escalar tu plataforma con confianza.",
    highlights: ["Implementacion", "Configuracion", "Buenas practicas"],
    accent: "oklch(0.72 0.13 170)",
  },
  guides: {
    category: "Recursos",
    lead: "Guias accionables para equipos de operacion, administracion y dispatch.",
    highlights: ["Playbooks", "KPIs", "Ejecucion diaria"],
    accent: "oklch(0.71 0.14 120)",
  },
  privacy: {
    category: "Legal",
    lead: "Politica clara sobre datos, privacidad y controles de seguridad para tu operacion.",
    highlights: ["Proteccion de datos", "Uso responsable", "Cumplimiento"],
    accent: "oklch(0.71 0.14 145)",
  },
  terms: {
    category: "Legal",
    lead: "Condiciones de uso para operar con claridad entre empresa, conductores y clientes.",
    highlights: ["Reglas de uso", "Responsabilidades", "Disponibilidad"],
    accent: "oklch(0.72 0.12 260)",
  },
  cookies: {
    category: "Legal",
    lead: "Informacion sobre cookies y tecnologias similares para mejorar experiencia y analitica.",
    highlights: ["Sesion", "Preferencias", "Analitica"],
    accent: "oklch(0.73 0.13 90)",
  },
  gdpr: {
    category: "Legal",
    lead: "Enfoque de cumplimiento para operaciones con usuarios y datos en contextos internacionales.",
    highlights: ["Acceso", "Rectificacion", "Eliminacion"],
    accent: "oklch(0.69 0.15 220)",
  },
  arbitration: {
    category: "Legal",
    lead: "Acuerdo de arbitraje vinculante para resolucion de disputas bajo reglas AAA.",
    highlights: ["Binding arbitration", "Class action waiver", "Orlando, Florida"],
    accent: "oklch(0.72 0.13 250)",
  },
  "zero-tolerance": {
    category: "Legal",
    lead: "Politica de tolerancia cero para seguridad de pasajeros y conductores en la plataforma.",
    highlights: ["No discriminacion", "No acoso", "Cero alcohol/drogas"],
    accent: "oklch(0.74 0.14 25)",
  },
  "insurance-requirements": {
    category: "Legal",
    lead: "Requisitos minimos de seguro para operar como conductor independiente en la plataforma.",
    highlights: ["Poliza vigente", "Rideshare endorsement", "Responsabilidad del conductor"],
    accent: "oklch(0.72 0.11 120)",
  },
  "driver-subscription-agreement": {
    category: "Legal",
    lead: "Contrato de suscripcion SaaS para conductores independientes, sin relacion laboral.",
    highlights: ["Acceso al software", "Renovacion automatica", "Responsabilidad fiscal 1099"],
    accent: "oklch(0.71 0.12 180)",
  },
  support: {
    category: "Recursos",
    lead: "Canales oficiales de soporte para pasajeros, conductores y empresas usuarias del software.",
    highlights: ["Email", "WhatsApp", "SLA prioritario"],
    accent: "oklch(0.73 0.11 205)",
  },
};

function buildBannerDataUri(title: string, accent: string) {
  const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `
<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='700' viewBox='0 0 1200 700'>
  <defs>
    <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#0f172a'/>
      <stop offset='100%' stop-color='#1e293b'/>
    </linearGradient>
    <radialGradient id='orb' cx='50%' cy='50%' r='60%'>
      <stop offset='0%' stop-color='${accent}' stop-opacity='0.55'/>
      <stop offset='100%' stop-color='${accent}' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='1200' height='700' fill='url(#bg)'/>
  <circle cx='930' cy='190' r='240' fill='url(#orb)'/>
  <circle cx='220' cy='590' r='180' fill='url(#orb)'/>
  <rect x='90' y='130' rx='20' ry='20' width='560' height='430' fill='rgba(255,255,255,0.06)' stroke='rgba(255,255,255,0.15)'/>
  <text x='130' y='220' fill='white' font-size='56' font-family='Arial, sans-serif' font-weight='700'>Passenger</text>
  <text x='130' y='300' fill='rgba(255,255,255,0.86)' font-size='38' font-family='Arial, sans-serif'>${safeTitle}</text>
  <text x='130' y='375' fill='rgba(255,255,255,0.68)' font-size='28' font-family='Arial, sans-serif'>Operacion profesional para flotillas modernas</text>
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function sanitizeAllowedHtml(input: string) {
  if (!input) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${input}</div>`, "text/html");
  const allowedTags = new Set(["P", "BR", "STRONG", "EM", "UL", "OL", "LI", "A", "H1", "H2", "H3", "DIV", "SPAN"]);

  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!allowedTags.has(el.tagName)) {
          const text = document.createTextNode(el.textContent || "");
          node.replaceChild(text, el);
          continue;
        }

        // Remove all attributes except safe href on links.
        for (const attr of Array.from(el.attributes)) {
          if (el.tagName === "A" && attr.name === "href") continue;
          el.removeAttribute(attr.name);
        }

        if (el.tagName === "A") {
          const href = el.getAttribute("href") || "";
          if (!/^https?:\/\//i.test(href) && !href.startsWith("/")) {
            el.removeAttribute("href");
          }
          el.setAttribute("rel", "noopener noreferrer");
          if (href.startsWith("http")) el.setAttribute("target", "_blank");
        }

        walk(el);
      }
    }
  };

  walk(doc.body);
  return doc.body.innerHTML;
}

function normalizeContent(content: string) {
  const raw = content || "";
  const hasMarkup = raw.includes("<") && raw.includes(">");
  const html = hasMarkup ? raw : raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  return sanitizeAllowedHtml(html);
}

export default function FooterInfoPage() {
  const { user, isAuthenticated, logout } = useLocalAuth();
  const { config } = useSiteConfig();
  const [location] = useLocation();
  const slug = getSlug(location);
  const configured = config.footerPages?.[slug];
  const fallback = DEFAULT_SITE_CONFIG.footerPages[slug];
  const page = configured && configured.content?.trim()?.length > 30 ? configured : fallback;
  const meta = footerMeta[slug];
  const bannerSrc = page ? buildBannerDataUri(page.title, meta?.accent || "oklch(0.74 0.16 148)") : "";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#05070b] text-white">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div
          className="absolute -top-40 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.75 0.13 220 / 0.32) 0%, oklch(0.75 0.13 220 / 0) 68%)" }}
        />
        <div
          className="absolute top-32 -left-28 h-[24rem] w-[24rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.72 0.14 165 / 0.2) 0%, oklch(0.72 0.14 165 / 0) 70%)" }}
        />
        <div
          className="absolute bottom-0 right-0 h-[26rem] w-[26rem] translate-x-1/4 translate-y-1/4 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.68 0.14 280 / 0.18) 0%, oklch(0.68 0.14 280 / 0) 72%)" }}
        />
      </div>

      <Navbar user={user} isAuthenticated={isAuthenticated} onLogout={logout} onLogin={() => { window.location.href = "/login"; }} />

      <main className="container relative z-10 pt-28 pb-14 max-w-6xl mx-auto">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white hover:underline mb-8"
        >
          <ArrowLeft size={14} />
          Volver al inicio
        </a>

        {page ? (
          <div className="space-y-6">
            <section className="grid lg:grid-cols-2 gap-5">
              <article className="rounded-3xl p-6 lg:p-8 text-white overflow-hidden relative" style={{ background: "linear-gradient(135deg, oklch(0.14 0.01 250), oklch(0.18 0.02 215))" }}>
                <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4" style={{ background: "oklch(1 0 0 / 0.12)" }}>
                  <Sparkles size={12} />
                  {meta?.category || "Informacion"}
                </div>
                <h1 className="text-3xl lg:text-4xl font-extrabold mb-3" style={{ fontFamily: "'Sora', sans-serif" }}>
                  {page.title}
                </h1>
                <p className="text-white/75 leading-relaxed mb-6">
                  {meta?.lead || "Contenido institucional de Passenger."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(meta?.highlights || ["Calidad", "Confianza", "Escala"]).map((item) => (
                    <div key={item} className="px-3 py-2 rounded-xl text-sm font-medium" style={{ background: "oklch(1 0 0 / 0.08)", border: "1px solid oklch(1 0 0 / 0.14)" }}>
                      {item}
                    </div>
                  ))}
                </div>
              </article>

              <div className="rounded-3xl overflow-hidden border border-white/15 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
                <img src={bannerSrc} alt={page.title} className="w-full h-full object-cover min-h-[280px]" />
              </div>
            </section>

            <section className="grid lg:grid-cols-[2fr_1fr] gap-5">
              <article className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-md p-6 lg:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 bg-white/10 text-white/85 border border-white/15">
                  <FileText size={12} />
                  Documento oficial
                </div>
                <div
                  className="prose prose-sm prose-invert max-w-none text-white/85 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: normalizeContent(page.content) }}
                />
              </article>

              <aside className="space-y-4">
                <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-2">Compromiso</p>
                  <div className="flex items-center gap-2.5 mb-3">
                    <ShieldCheck size={18} className="text-[oklch(0.78_0.12_170)]" />
                    <p className="text-sm text-white font-semibold">Operacion segura y consistente</p>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">Diseñamos procesos y producto para que tu servicio de taxi opere con confianza, trazabilidad y buena experiencia de usuario.</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-2">Empresa</p>
                  <div className="flex items-center gap-2.5 mb-3">
                    <Building2 size={18} className="text-[oklch(0.78_0.11_225)]" />
                    <p className="text-sm text-white font-semibold">Passenger</p>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">Plataforma enfocada en crecimiento sostenible para flotillas, con visibilidad operativa y herramientas para escalar sin complejidad.</p>
                </div>
              </aside>
            </section>
          </div>
        ) : (
          <article className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-md p-6 lg:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <h1 className="text-2xl font-extrabold text-white mb-3" style={{ fontFamily: "'Sora', sans-serif" }}>
              Contenido no disponible
            </h1>
            <p className="text-white/70">
              Esta seccion aun no tiene informacion publicada.
            </p>
          </article>
        )}
      </main>

      <FooterSection />
    </div>
  );
}
