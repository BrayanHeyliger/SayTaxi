/**
 * Política de Privacidad — SayTaxi
 */
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

export default function PrivacyPolicy() {
  const { config } = useSiteConfig();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.97 0.005 148 / 0.3)" }}>
      <Navbar />
      <main className="flex-1 container py-16 max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white/90 mb-8 transition-colors" style={{ color: "oklch(0.45 0.01 80)" }}>
          <ArrowLeft size={15} />
          Volver al inicio
        </Link>

        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>
          Política de Privacidad
        </h1>
        <p className="text-sm mb-8" style={{ color: "oklch(0.50 0.01 80)" }}>
          Última actualización: agosto 2025
        </p>

        <div className="prose prose-sm max-w-none space-y-6" style={{ color: "oklch(0.35 0.01 80)" }}>
          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>1. Responsable del tratamiento</h2>
            <p>
              {config.siteTitle} («la Plataforma») opera únicamente como proveedor de software de reservas (SaaS). El responsable del tratamiento de datos es el operador o empresa de taxi que contrata la licencia de la Plataforma, no {config.siteTitle} directamente, salvo en lo que respecta a los datos de registro de cuenta en la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>2. Datos que recopilamos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nombre y dirección de correo electrónico al crear una cuenta.</li>
              <li>Número de teléfono para comunicaciones por WhatsApp.</li>
              <li>Dirección de recogida y destino al realizar una reserva.</li>
              <li>Historial de viajes y transacciones.</li>
              <li>Datos de navegación (cookies técnicas y analíticas — ver Política de Cookies).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>3. Finalidad del tratamiento</h2>
            <p>Los datos se utilizan para:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Gestionar el acceso y funcionamiento de la cuenta de usuario.</li>
              <li>Transmitir la solicitud de reserva al conductor o empresa de taxi correspondiente.</li>
              <li>Enviar notificaciones de estado del viaje por WhatsApp u otros canales.</li>
              <li>Mejorar y mantener la Plataforma.</li>
              <li>Cumplir obligaciones legales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>4. Base legal</h2>
            <p>
              El tratamiento se basa en la ejecución del contrato de uso del software (art. 6.1.b RGPD), el cumplimiento de obligaciones legales (art. 6.1.c) y, en su caso, el consentimiento explícito del usuario (art. 6.1.a).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>5. Compartición de datos</h2>
            <p>
              Los datos de reserva son compartidos exclusivamente con el conductor o empresa de taxi seleccionada para ejecutar el servicio de transporte. {config.siteTitle} no vende ni cede datos personales a terceros con fines comerciales.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>6. Conservación de datos</h2>
            <p>
              Los datos de cuenta se conservan mientras la cuenta esté activa. Los datos de reserva se conservan durante el plazo exigido por la legislación fiscal aplicable (generalmente 5 a 7 años). Puedes solicitar la eliminación de tu cuenta en cualquier momento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>7. Tus derechos</h2>
            <p>Puedes ejercer en cualquier momento los derechos de acceso, rectificación, supresión, portabilidad, oposición y limitación del tratamiento escribiendo a:</p>
            <p className="font-medium mt-1">{config.contactEmail || "privacidad@saytaxi.com"}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>8. Seguridad</h2>
            <p>
              Aplicamos medidas técnicas y organizativas adecuadas para proteger tus datos frente a acceso no autorizado, pérdida o alteración, incluyendo cifrado en tránsito (TLS) y en reposo.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>9. Cambios en esta política</h2>
            <p>
              Podemos actualizar esta política periódicamente. Te notificaremos los cambios relevantes mediante un aviso en la Plataforma o por correo electrónico.
            </p>
          </section>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
