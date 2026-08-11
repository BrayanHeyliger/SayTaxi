/**
 * Términos de Uso — SayTaxi
 */
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

export default function TermsOfUse() {
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
          Términos de Uso
        </h1>
        <p className="text-sm mb-8" style={{ color: "oklch(0.50 0.01 80)" }}>
          Última actualización: agosto 2025
        </p>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: "oklch(0.35 0.01 80)" }}>
          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>1. Naturaleza del servicio</h2>
            <p>
              {config.siteTitle} es un software de reservas (SaaS / booking engine) que actúa exclusivamente como canal tecnológico de comunicación entre usuarios finales y empresas o conductores de taxi independientes. {config.siteTitle} <strong>no presta servicios de transporte</strong>, no opera como empresa de red de transporte (TNC) ni como agencia de taxis, y no emplea ni supervisa a ningún conductor.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>2. Aceptación</h2>
            <p>
              Al acceder o utilizar la Plataforma, el usuario acepta en su totalidad estos Términos de Uso. Si no estás de acuerdo, debes abstenerte de usar la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>3. Independencia de los conductores</h2>
            <p>
              Los conductores y empresas de taxi que utilizan la Plataforma son contratistas independientes. No son empleados, agentes ni socios de {config.siteTitle}. Cada conductor o empresa de taxi es el único responsable de:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Contar con licencias vigentes de vehículo de alquiler (Vehicle for Hire) y permisos municipales o estatales aplicables.</li>
              <li>Mantener seguros comerciales adecuados.</li>
              <li>Cumplir con las leyes de tránsito y transporte de pasajeros.</li>
              <li>Fijar y cobrar sus propias tarifas directamente al pasajero.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>4. Reservas y confirmaciones</h2>
            <p>
              La Plataforma transmite la solicitud de reserva al conductor o empresa de taxi disponible. El conductor es libre de aceptar o rechazar cualquier solicitud. La confirmación de un viaje se produce únicamente cuando el conductor acepta expresamente la solicitud.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>5. Cobros y pagos</h2>
            <p>
              El pago de la tarifa del viaje se realiza directamente entre el usuario y el conductor o empresa de taxi. {config.siteTitle} únicamente factura al conductor o empresa de taxi una suscripción o tarifa por el uso del software. {config.siteTitle} no interviene en la fijación obligatoria de precios de viaje ni actúa como intermediario de pagos, salvo en los módulos opcionales expresamente contratados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>6. Limitación de responsabilidad</h2>
            <p>
              En la máxima medida permitida por la ley aplicable, {config.siteTitle} no será responsable de:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Accidentes, lesiones o daños materiales ocurridos durante un viaje.</li>
              <li>Demoras, cancelaciones o incumplimientos por parte del conductor.</li>
              <li>Pérdida o daño de equipaje u objetos personales.</li>
              <li>Cobros no autorizados realizados por el conductor.</li>
              <li>Interrupciones del servicio debidas a fallos de conectividad o mantenimiento.</li>
            </ul>
            <p className="mt-2">
              El usuario y el conductor eximen expresamente a {config.siteTitle} de cualquier reclamación derivada de lo anterior.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>7. Uso aceptable</h2>
            <p>
              El usuario se compromete a utilizar la Plataforma de forma lícita, a no suplantar identidades, a no interferir con el funcionamiento del sistema y a no proporcionar información falsa al realizar una reserva.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>8. Propiedad intelectual</h2>
            <p>
              Todo el contenido, diseño, código y marca de la Plataforma son propiedad de {config.siteTitle} o sus licenciantes. Queda prohibida su reproducción o uso sin autorización expresa.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>9. Modificaciones</h2>
            <p>
              {config.siteTitle} se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios serán notificados con al menos 15 días de antelación. El uso continuado de la Plataforma implica la aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>10. Ley aplicable y jurisdicción</h2>
            <p>
              Estos Términos se rigen por las leyes del Estado de Florida, EE. UU., sin perjuicio de las normas de protección al consumidor aplicables en el país de residencia del usuario. Las partes se someten a la jurisdicción de los tribunales de Orlando, Florida.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.14 0.01 250)" }}>11. Contacto</h2>
            <p>Para consultas sobre estos Términos, escribe a: <span className="font-medium">{config.contactEmail || "legal@saytaxi.com"}</span></p>
          </section>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
