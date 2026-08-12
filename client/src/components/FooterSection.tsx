/**
 * FooterSection — Passenger
 * Design: Verde Operacional — dark footer con links y branding
 */
import { useI18n } from "@/contexts/I18nContext";
import { Github, Twitter, Linkedin, Heart } from "lucide-react";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

const footerLinks = {
  Producto: ["Características", "Precios", "Changelog", "Roadmap"],
  Empresa: ["Sobre nosotros", "Blog", "Carreras", "Prensa"],
  Recursos: ["Documentación", "FAQ", "Guías", "Soporte"],
  Legal: ["Términos de Servicio", "Política de Privacidad", "Acuerdo de Arbitraje", "Política de Tolerancia Cero", "Requisitos de Seguro para Conductores", "Contrato de Suscripción para Conductores"],
};

const footerInfoSlugs: Record<string, string> = {
  "Sobre nosotros": "about",
  Changelog: "changelog",
  Roadmap: "roadmap",
  Blog: "blog",
  Carreras: "careers",
  Prensa: "press",
  Documentación: "docs",
  "Guías": "guides",
  "Política de Privacidad": "privacy",
  "Términos de Servicio": "terms",
  "Acuerdo de Arbitraje": "arbitration",
  "Política de Tolerancia Cero": "zero-tolerance",
  "Requisitos de Seguro para Conductores": "insurance-requirements",
  "Contrato de Suscripción para Conductores": "driver-subscription-agreement",
  Cookies: "cookies",
  GDPR: "gdpr",
  Soporte: "support",
};

function getFooterHref(link: string) {
  if (link === "Características") return "/#features";
  if (link === "Precios") return "/#pricing";
  if (link === "Soporte") return "/support";
  if (link === "FAQ") return "/faq";
  const slug = footerInfoSlugs[link];
  if (slug) return `/${slug}`;
  return "#";
}

export default function FooterSection() {
  const { t } = useI18n();
  const { config } = useSiteConfig();

  return (
    <footer className="mt-12">
      <div className="container py-12">
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: "linear-gradient(180deg, oklch(0.12 0.01 250 / 0.98) 0%, oklch(0.14 0.01 250 / 0.98) 100%)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 mb-6">
          {/* Brand */}
            <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0"
                style={{ background: config.logoUrl ? "transparent" : config.primaryColor }}
              >
                <img
                  src={config.logoUrl || "/assets-storage/logo-icon_34950e08.png"}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <span
                className="text-white font-bold text-base"
                style={{ fontFamily: `'${config.fontFamily}', sans-serif` }}
              >
                {config.siteTitle.split(" ")[0]}
                <span style={{ color: config.primaryColor }}>
                  {config.siteTitle.split(" ").slice(1).join(" ")}
                </span>
              </span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              {config.tagline}
            </p>
            <div className="flex gap-3">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <button
                  key={i}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ border: "1px solid oklch(1 0 0 / 0.1)" }}
                >
                  <Icon size={14} className="text-white/70" />
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              Cumplimiento legal visible: privacidad, arbitraje, seguros y tolerancia cero disponibles en el pie de página.
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4
                className="text-white font-semibold text-sm mb-4"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {category}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href={getFooterHref(link)}
                      className="text-white/65 hover:text-white text-sm transition-colors text-left cursor-pointer"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.10)" }}>
            <p className="text-white/70 text-sm">{config.footerText}</p>
            <p className="text-white/70 text-sm flex items-center gap-2">Hecho con <Heart size={12} className="text-red-400 fill-red-400" /> para empresas de taxi</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
