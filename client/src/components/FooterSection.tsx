/**
 * FooterSection — WhatsApp Taxi SaaS
 * Design: Verde Operacional — dark footer con links y branding
 */
import { useI18n } from "@/contexts/I18nContext";
import { Github, Twitter, Linkedin, Heart } from "lucide-react";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { Link } from "wouter";

const footerLinks = {
  Producto: ["Características", "Precios", "Changelog", "Roadmap"],
  Empresa: ["Sobre nosotros", "Blog", "Carreras", "Prensa"],
  Recursos: ["Documentación", "FAQ", "Guías", "Soporte"],
  Legal: ["Privacidad", "Términos de uso", "Cookies", "GDPR"],
};

const legalRoutes: Record<string, string> = {
  "Privacidad": "/privacy",
  "Términos de uso": "/terms",
  "Cookies": "/cookies",
  "GDPR": "/disclaimer",
};

const anchorLinks: Record<string, string> = {
  "FAQ": "#faq",
  "Características": "#features",
  "Precios": "#pricing",
  "Soporte": "#contact",
};

export default function FooterSection() {
  const { t } = useI18n();
  const { config } = useSiteConfig();

  return (
    <footer
      className="border-t"
      style={{
        background: "oklch(0.10 0.01 250)",
        borderColor: "oklch(1 0 0 / 0.08)",
      }}
    >
      <div className="container py-14">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0"
                style={{ background: config.logoUrl ? "transparent" : config.primaryColor }}
              >
                <img
                  src={config.logoUrl || "/manus-storage/logo-icon_34950e08.png"}
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
            <p className="text-white/40 text-sm leading-relaxed mb-5">
              {config.tagline}
            </p>
            <div className="flex gap-3">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <button
                  key={i}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ border: "1px solid oklch(1 0 0 / 0.1)" }}
                >
                  <Icon size={14} className="text-white/50" />
                </button>
              ))}
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
                    {legalRoutes[link] ? (
                      <Link
                        href={legalRoutes[link]}
                        className="text-white/40 hover:text-white/80 text-sm transition-colors"
                      >
                        {link}
                      </Link>
                    ) : (
                      <a
                        href={anchorLinks[link] ?? "#"}
                        onClick={anchorLinks[link] ? (e) => { e.preventDefault(); document.getElementById(anchorLinks[link].slice(1))?.scrollIntoView({ behavior: "smooth" }); } : undefined}
                        className="text-white/40 hover:text-white/80 text-sm transition-colors text-left cursor-pointer"
                      >
                        {link}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t"
          style={{ borderColor: "oklch(1 0 0 / 0.08)" }}
        >
          <p className="text-white/30 text-xs">
            {config.footerText}
          </p>
          <p className="text-white/30 text-xs flex items-center gap-1.5">
            Hecho con <Heart size={11} className="text-red-400 fill-red-400" /> para empresas de taxi en Latinoamérica
          </p>
        </div>
      </div>
    </footer>
  );
}
