/**
 * Política de Cookies — SayTaxi
 */
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

export default function CookiesPolicy() {
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
          Política de Cookies
        </h1>
        <p className="text-sm mb-8" style={{ color: "oklch(0.50 0.01 80)" }}>
          Última actualización: agosto 2025
        </p>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: "oklch(0.35 0.01 80)" }}>
          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>1. ¿Qué son las cookies?</h2>
            <p>
              Las cookies son pequeños archivos de texto que un sitio web almacena en tu dispositivo cuando lo visitas. Permiten que el sitio recuerde tus preferencias y mejore tu experiencia de navegación.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>2. Cookies que utilizamos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse mt-2">
                <thead>
                  <tr style={{ background: "oklch(0.92 0.01 148 / 0.4)" }}>
                    <th className="text-left p-2 font-semibold border" style={{ borderColor: "oklch(0.85 0.01 148 / 0.4)", color: "oklch(0.14 0.01 250)" }}>Nombre</th>
                    <th className="text-left p-2 font-semibold border" style={{ borderColor: "oklch(0.85 0.01 148 / 0.4)", color: "oklch(0.14 0.01 250)" }}>Tipo</th>
                    <th className="text-left p-2 font-semibold border" style={{ borderColor: "oklch(0.85 0.01 148 / 0.4)", color: "oklch(0.14 0.01 250)" }}>Finalidad</th>
                    <th className="text-left p-2 font-semibold border" style={{ borderColor: "oklch(0.85 0.01 148 / 0.4)", color: "oklch(0.14 0.01 250)" }}>Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "session_token", type: "Esencial", purpose: "Mantener la sesión de usuario autenticado", duration: "Sesión" },
                    { name: "theme_pref", type: "Preferencia", purpose: "Recordar el tema visual seleccionado", duration: "1 año" },
                    { name: "lang_pref", type: "Preferencia", purpose: "Recordar el idioma seleccionado", duration: "1 año" },
                    { name: "_ga", type: "Analítica", purpose: "Análisis de tráfico con Google Analytics (si aplica)", duration: "2 años" },
                  ].map((row) => (
                    <tr key={row.name}>
                      <td className="p-2 border font-mono" style={{ borderColor: "oklch(0.88 0.01 148 / 0.3)" }}>{row.name}</td>
                      <td className="p-2 border" style={{ borderColor: "oklch(0.88 0.01 148 / 0.3)" }}>{row.type}</td>
                      <td className="p-2 border" style={{ borderColor: "oklch(0.88 0.01 148 / 0.3)" }}>{row.purpose}</td>
                      <td className="p-2 border" style={{ borderColor: "oklch(0.88 0.01 148 / 0.3)" }}>{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>3. Cookies esenciales</h2>
            <p>
              Las cookies esenciales son imprescindibles para el funcionamiento de la Plataforma (por ejemplo, mantener tu sesión iniciada). No requieren tu consentimiento previo.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>4. Cookies de preferencia y analítica</h2>
            <p>
              Las cookies de preferencia y analítica se instalan únicamente si otorgas tu consentimiento. Puedes revocar este consentimiento en cualquier momento desde la configuración de tu navegador o escribiendo a {config.contactEmail || "privacidad@saytaxi.com"}.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>5. Cómo gestionar o eliminar cookies</h2>
            <p>
              Puedes configurar tu navegador para bloquear o eliminar cookies. Ten en cuenta que deshabilitar las cookies esenciales puede afectar el funcionamiento de la Plataforma. A continuación encontrarás instrucciones para los principales navegadores:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "oklch(0.52 0.12 148)" }}>Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "oklch(0.52 0.12 148)" }}>Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "oklch(0.52 0.12 148)" }}>Apple Safari</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>6. Contacto</h2>
            <p>Si tienes preguntas sobre el uso de cookies, escríbenos a: <span className="font-medium">{config.contactEmail || "privacidad@saytaxi.com"}</span></p>
          </section>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
