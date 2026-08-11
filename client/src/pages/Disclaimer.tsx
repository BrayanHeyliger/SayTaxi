/**
 * Aviso Legal / Disclaimer — SayTaxi
 */
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

export default function Disclaimer() {
  const { config } = useSiteConfig();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.97 0.005 148 / 0.3)" }}>
      <Navbar />
      <main className="flex-1 container py-16 max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm mb-8 transition-colors" style={{ color: "oklch(0.45 0.01 80)" }}>
          <ArrowLeft size={15} />
          Volver al inicio
        </Link>

        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>
          Aviso Legal (GDPR / Disclaimer)
        </h1>
        <p className="text-sm mb-8" style={{ color: "oklch(0.50 0.01 80)" }}>
          Última actualización: agosto 2025
        </p>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: "oklch(0.35 0.01 80)" }}>
          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>1. Identidad del titular</h2>
            <p>
              La Plataforma <strong>{config.siteTitle}</strong> es operada por su titular registrado. Para consultas legales, puedes contactar a través de: <span className="font-medium">{config.contactEmail || "legal@saytaxi.com"}</span>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>2. Naturaleza de la Plataforma</h2>
            <p>
              {config.siteTitle} es un proveedor de Software como Servicio (SaaS) para empresas de taxi y conductores independientes. <strong>No es una empresa de transporte ni una TNC (Transportation Network Company)</strong>. Toda actividad de transporte es realizada por terceros independientes que utilizan la Plataforma bajo su propia responsabilidad.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>3. Exención de responsabilidad en el transporte</h2>
            <p>
              {config.siteTitle} no es responsable de los servicios de transporte prestados por los conductores o empresas de taxi que utilizan la Plataforma. Cualquier reclamación relacionada con un viaje deberá dirigirse directamente al conductor o empresa de taxi que prestó el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>4. Cumplimiento del RGPD</h2>
            <p>
              En la medida en que {config.siteTitle} trate datos de residentes en el Espacio Económico Europeo (EEE), lo hace en cumplimiento del Reglamento (UE) 2016/679 (RGPD). Puedes ejercer tus derechos de privacidad según lo descrito en nuestra <Link href="/privacy" className="underline" style={{ color: "oklch(0.52 0.12 148)" }}>Política de Privacidad</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>5. Exactitud de la información</h2>
            <p>
              El contenido de la Plataforma (tarifas indicativas, tiempos de espera estimados, etc.) se proporciona «tal cual» con fines informativos. {config.siteTitle} no garantiza que dicha información sea completa, exacta o actualizada en todo momento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>6. Propiedad intelectual</h2>
            <p>
              Todos los derechos de propiedad intelectual sobre el software, diseño, logotipos y contenidos de la Plataforma son propiedad de {config.siteTitle} o de sus licenciantes. Queda prohibida su reproducción total o parcial sin autorización expresa por escrito.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>7. Legislación aplicable</h2>
            <p>
              Este aviso se rige por las leyes del Estado de Florida, EE. UU., y, donde corresponda, por la legislación europea de protección de datos. Las controversias se resolverán ante los tribunales de Orlando, Florida.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>8. Contacto</h2>
            <p>Para cualquier consulta legal: <span className="font-medium">{config.contactEmail || "legal@saytaxi.com"}</span></p>
          </section>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
