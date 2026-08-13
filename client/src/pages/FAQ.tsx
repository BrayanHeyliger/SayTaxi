/**
 * FAQ Page — Página independiente de Preguntas Frecuentes
 * Cargada desde /faq con Navbar, búsqueda y acordeón animado
 */
import { useState, useEffect } from "react";
import { ChevronDown, Search, MessageCircle, HelpCircle, ArrowLeft } from "lucide-react";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

type FAQItem = { q: string; a: string; category: string };

const defaultFAQs: FAQItem[] = [
  { category: "🚕 Sobre el servicio", q: "¿Cuánto tiempo tarda en llegar el taxi?", a: "En zonas urbanas, el tiempo promedio de llegada es de 3 a 8 minutos. Recibirás una notificación por WhatsApp con el tiempo estimado exacto una vez que el conductor acepte tu viaje." },
  { category: "🚕 Sobre el servicio", q: "¿Hacen viajes al aeropuerto?", a: "Sí, realizamos traslados al aeropuerto las 24 horas, los 7 días de la semana. Recomendamos reservar con al menos 2 horas de anticipación para vuelos. El precio incluye espera de hasta 15 minutos en la terminal." },
  { category: "🚕 Sobre el servicio", q: "¿Puedo reservar un taxi con anticipación?", a: "Sí, puedes programar tu viaje con hasta 72 horas de anticipación. Solo indica la fecha y hora de recogida en el mensaje de WhatsApp y un operador confirmará la reserva." },
  { category: "🚕 Sobre el servicio", q: "¿El servicio está disponible las 24 horas?", a: "Sí, operamos las 24 horas del día, los 365 días del año, incluyendo feriados. En horario nocturno (10pm–6am) puede aplicar un recargo del 20%." },
  { category: "🐾 Mascotas y necesidades especiales", q: "¿Aceptan mascotas en el taxi?", a: "Sí, aceptamos mascotas pequeñas y medianas que viajen en transportín o jaula. Para mascotas grandes, consulta disponibilidad al solicitar el viaje. Por favor indícalo al hacer la reserva para asignar un conductor que lo permita." },
  { category: "🐾 Mascotas y necesidades especiales", q: "¿Tienen sillas para bebés o niños?", a: "Sí, contamos con sillas para bebés (0-13 kg) y sillas elevadoras para niños (15-36 kg). Solicítala al reservar con al menos 1 hora de anticipación. Hay un costo adicional de $2 por uso." },
  { category: "🐾 Mascotas y necesidades especiales", q: "¿Pueden transportar personas con movilidad reducida?", a: "Sí, disponemos de vehículos adaptados para personas con silla de ruedas. Selecciona la opción 'Accesible' al reservar o indícalo en el mensaje de WhatsApp." },
  { category: "💳 Pagos y tarifas", q: "¿Cuáles son los métodos de pago aceptados?", a: "Aceptamos: efectivo, tarjeta de crédito/débito (Visa, Mastercard), Zelle, transferencia bancaria y pago móvil. El conductor siempre confirmará el método antes de iniciar el viaje." },
  { category: "💳 Pagos y tarifas", q: "¿Cómo se calcula la tarifa?", a: "La tarifa se calcula en base a la distancia (costo por km), tiempo estimado del viaje y el tipo de vehículo seleccionado. Recibirás el precio estimado antes de confirmar el viaje, sin sorpresas." },
  { category: "💳 Pagos y tarifas", q: "¿Hay cargos adicionales?", a: "Pueden aplicar recargos por: horario nocturno (+20%), días feriados (+15%), equipaje extra (+$2), espera superior a 5 minutos (+$0.50/min) y peajes (se cobran al costo real)." },
  { category: "💳 Pagos y tarifas", q: "¿Puedo obtener un recibo o factura?", a: "Sí, al finalizar el viaje recibirás automáticamente un resumen por WhatsApp con el detalle del recorrido y el monto cobrado. Para facturas fiscales, contáctanos al correo de soporte." },
  { category: "🔒 Seguridad y confianza", q: "¿Cómo sé que el conductor es de confianza?", a: "Todos nuestros conductores pasan por verificación de antecedentes penales, revisión de licencia de conducir vigente y evaluación de vehículo. Además, recibirás foto, nombre y placa del conductor antes de que llegue." },
  { category: "🔒 Seguridad y confianza", q: "¿Qué pasa si tengo un problema durante el viaje?", a: "Puedes usar el botón SOS en la app o enviar 'EMERGENCIA' por WhatsApp para contactar a nuestro equipo de seguridad 24/7. También puedes compartir tu viaje en tiempo real con un familiar." },
  { category: "🔒 Seguridad y confianza", q: "¿Puedo cancelar mi viaje?", a: "Sí, puedes cancelar sin costo hasta 2 minutos después de confirmar. Si el conductor ya está en camino, puede aplicar un cargo de cancelación de $1. Escribe 'CANCELAR' por WhatsApp para cancelar." },
];

function AccordionItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer"
      style={{
        border: isOpen ? "1px solid oklch(0.76 0.18 148 / 0.4)" : "1px solid oklch(0.90 0.005 100)",
        background: isOpen ? "oklch(0.97 0.005 148 / 0.4)" : "white",
      }}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <span className="font-semibold text-sm text-[oklch(0.14_0.01_250)] leading-snug" style={{ fontFamily: "'Sora', sans-serif" }}>
          {item.q}
        </span>
        <ChevronDown size={18} className="flex-shrink-0 transition-transform duration-300" style={{ color: "oklch(0.52 0.12 148)", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
      </div>
      <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: isOpen ? "400px" : "0px", opacity: isOpen ? 1 : 0 }}>
        <div className="px-5 pb-4">
          <div className="w-full h-px mb-3" style={{ background: "oklch(0.76 0.18 148 / 0.2)" }} />
          <p className="text-[oklch(0.45_0.01_80)] text-sm leading-relaxed">{item.a}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQPage() {
  const { user, isAuthenticated, logout } = useLocalAuth();
  const { config } = useSiteConfig();
  const [search, setSearch] = useState("");
  const [openItem, setOpenItem] = useState<number | null>(0);
  const [faqs, setFaqs] = useState<FAQItem[]>(defaultFAQs);
  const CONFIG_KEY = "passenger_site_config";
  const LEGACY_CONFIG_KEY = "wataxi_config";

  // Load custom FAQs from siteConfig if available
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONFIG_KEY) || localStorage.getItem(LEGACY_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.customFAQs && Array.isArray(parsed.customFAQs) && parsed.customFAQs.length > 0) {
          setFaqs(parsed.customFAQs);
        }
      }
    } catch {}
  }, []);

  const filtered = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase()) ||
      f.category.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const grouped = filtered.reduce<Record<string, FAQItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const categoryColors: Record<string, string> = {
    "🚕 Sobre el servicio": "oklch(0.76 0.18 148)",
    "🐾 Mascotas y necesidades especiales": "oklch(0.65 0.15 80)",
    "💳 Pagos y tarifas": "oklch(0.65 0.15 250)",
    "🔒 Seguridad y confianza": "oklch(0.65 0.15 148)",
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar user={user} isAuthenticated={isAuthenticated} onLogout={logout} onLogin={() => window.location.href = "/login"} />

      {/* Hero */}
      <div
        className="py-16 lg:py-24 text-center"
        style={{ background: "linear-gradient(180deg, oklch(0.13 0.01 250) 0%, oklch(0.16 0.02 200) 100%)" }}
      >
        <div className="container max-w-2xl mx-auto">
          <div
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-5"
            style={{ background: "oklch(0.76 0.18 148 / 0.15)", color: "oklch(0.76 0.18 148)" }}
          >
            <HelpCircle size={12} />
            Centro de ayuda
          </div>
          <h1
            className="text-3xl lg:text-5xl font-extrabold text-white mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Preguntas{" "}
            <span style={{ color: "oklch(0.76 0.18 148)" }}>Frecuentes</span>
          </h1>
          <p className="text-white/60 text-lg mb-8">
            Encuentra respuestas rápidas a las dudas más comunes sobre nuestro servicio.
          </p>
          {/* Search */}
          <div className="relative max-w-lg mx-auto">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pregunta..."
              className="w-full pl-11 pr-4 py-4 rounded-2xl text-white placeholder-white/30 outline-none text-sm"
              style={{ background: "oklch(0.20 0.01 250)", border: "1px solid oklch(1 0 0 / 0.1)" }}
            />
          </div>
          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <span className="text-white/40 text-sm">{faqs.length} preguntas</span>
            <span className="text-white/20">•</span>
            <span className="text-white/40 text-sm">{Object.keys(grouped).length} categorías</span>
            {search && <><span className="text-white/20">•</span><span className="text-white/60 text-sm">{filtered.length} resultados</span></>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-16 max-w-4xl mx-auto">
        {/* Back link */}
        <a href="/" className="inline-flex items-center gap-2 text-sm text-[oklch(0.52_0.12_148)] hover:underline mb-10">
          <ArrowLeft size={14} />
          Volver al inicio
        </a>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-[oklch(0.45_0.01_80)] text-lg">No se encontraron resultados para "{search}"</p>
            <button onClick={() => setSearch("")} className="mt-4 text-sm text-[oklch(0.52_0.12_148)] hover:underline">
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-0.5 w-8 rounded-full" style={{ background: categoryColors[category] || "oklch(0.76 0.18 148)" }} />
                  <h2 className="text-base font-bold text-[oklch(0.14_0.01_250)]" style={{ fontFamily: "'Sora', sans-serif" }}>
                    {category}
                  </h2>
                  <span className="text-xs text-[oklch(0.65_0.01_80)] ml-auto">{items.length} preguntas</span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((item, i) => {
                    const globalIdx = faqs.indexOf(item);
                    return (
                      <AccordionItem
                        key={i}
                        item={item}
                        isOpen={openItem === globalIdx}
                        onToggle={() => setOpenItem(openItem === globalIdx ? null : globalIdx)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div
          className="mt-16 p-8 rounded-3xl text-center"
          style={{ background: "linear-gradient(135deg, oklch(0.13 0.01 250), oklch(0.16 0.02 200))" }}
        >
          <p className="text-white/70 text-sm mb-2">¿No encontraste lo que buscabas?</p>
          <p className="text-white font-bold text-lg mb-5" style={{ fontFamily: "'Sora', sans-serif" }}>
            Escríbenos directamente por WhatsApp
          </p>
          <a
            href={`https://wa.me/${(config.contactPhone || "").replace(/\D/g, "")}?text=Hola%2C%20tengo%20una%20pregunta`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white text-sm transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, oklch(0.52 0.12 148), oklch(0.76 0.18 148))", boxShadow: "0 8px 24px oklch(0.52 0.12 148 / 0.4)" }}
          >
            <MessageCircle size={18} />
            Hacer una pregunta
          </a>
        </div>
      </div>

      <FooterSection />
    </div>
  );
}
