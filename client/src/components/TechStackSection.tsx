/**
 * TechStackSection — Passenger
 * Design: Verde Operacional — stack tecnológico con badges y diagrama
 */
import { useRef, useEffect, useState } from "react";
import { Code2, Database, Smartphone, Globe, CreditCard, MapPin } from "lucide-react";

const techStack = [
  {
    category: "Backend / Panel SaaS",
    icon: Code2,
    items: ["PHP 8.x + Laravel", "Node.js / NestJS", "REST API", "Webhooks"],
    color: "oklch(0.65 0.15 250)",
  },
  {
    category: "Base de Datos",
    icon: Database,
    items: ["MySQL 8.x", "Consultas geoespaciales", "ST_Distance", "Redis Cache"],
    color: "oklch(0.65 0.12 30)",
  },
  {
    category: "WhatsApp Integration",
    icon: Smartphone,
    items: ["Meta Cloud API", "Twilio WhatsApp", "Mensajes interactivos", "Webhooks"],
    color: "oklch(0.76 0.18 148)",
  },
  {
    category: "Geolocalización",
    icon: MapPin,
    items: ["Google Maps API", "Distance Matrix", "Places API", "Static Maps"],
    color: "oklch(0.65 0.15 30)",
  },
  {
    category: "Frontend Admin",
    icon: Globe,
    items: ["React / Vue.js", "Tailwind CSS", "PWA Conductores", "Blade Templates"],
    color: "oklch(0.65 0.15 200)",
  },
  {
    category: "Pagos SaaS",
    icon: CreditCard,
    items: ["Stripe", "PayPal", "Suscripciones recurrentes", "Webhooks de pago"],
    color: "oklch(0.65 0.12 280)",
  },
];

const dbTables = [
  { name: "tenants", desc: "Empresas de taxi registradas" },
  { name: "users", desc: "Usuarios del panel admin" },
  { name: "drivers", desc: "Conductores y documentos" },
  { name: "vehicles", desc: "Flota de vehículos" },
  { name: "bookings", desc: "Viajes y estados" },
  { name: "pricing_rules", desc: "Reglas de tarifas" },
  { name: "whatsapp_logs", desc: "Logs de conversaciones" },
];

export default function TechStackSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-20 lg:py-28 bg-[oklch(0.97_0.003_100)]" ref={ref}>
      <div className="container">
        <div
          className="text-center max-w-2xl mx-auto mb-14"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.23,1,0.32,1)",
          }}
        >
          <div
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
            style={{ background: "oklch(0.76 0.18 148 / 0.1)", color: "oklch(0.52 0.12 148)" }}
          >
            <Code2 size={12} />
            Stack tecnológico
          </div>
          <h2
            className="text-3xl lg:text-4xl font-extrabold text-[oklch(0.14_0.01_250)] mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Construido con{" "}
            <span style={{ color: "oklch(0.52 0.12 148)" }}>tecnologías enterprise</span>
          </h2>
          <p className="text-[oklch(0.55_0.01_80)] text-lg">
            Arquitectura robusta y escalable diseñada para manejar miles de viajes simultáneos.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {techStack.map((tech, i) => {
            const Icon = tech.icon;
            return (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white border border-[oklch(0.90_0.005_100)] hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(30px)",
                  transition: `opacity 0.5s ease ${i * 0.08}s, transform 0.5s cubic-bezier(0.23,1,0.32,1) ${i * 0.08}s, box-shadow 0.2s ease`,
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${tech.color}20` }}
                  >
                    <Icon size={18} style={{ color: tech.color }} />
                  </div>
                  <h3
                    className="font-bold text-sm text-[oklch(0.14_0.01_250)]"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    {tech.category}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tech.items.map((item, j) => (
                    <span
                      key={j}
                      className="text-xs px-2.5 py-1 rounded-lg font-mono font-medium"
                      style={{
                        background: `${tech.color}12`,
                        color: tech.color,
                        border: `1px solid ${tech.color}30`,
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* DB Schema */}
        <div
          className="rounded-3xl p-6 lg:p-8"
          style={{
            background: "linear-gradient(135deg, oklch(0.13 0.01 250), oklch(0.18 0.02 200))",
            border: "1px solid oklch(0.76 0.18 148 / 0.2)",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.6s ease 0.4s",
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Database size={20} style={{ color: "oklch(0.76 0.18 148)" }} />
            <h3
              className="text-white font-bold text-lg"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Esquema de Base de Datos
            </h3>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-mono"
              style={{ background: "oklch(0.76 0.18 148 / 0.15)", color: "oklch(0.76 0.18 148)" }}
            >
              MySQL 8.x
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {dbTables.map((table, i) => (
              <div
                key={i}
                className="p-3 rounded-xl"
                style={{ background: "oklch(0.22 0.01 250)", border: "1px solid oklch(1 0 0 / 0.08)" }}
              >
                <p
                  className="font-mono text-xs font-bold mb-1"
                  style={{ color: "oklch(0.76 0.18 148)" }}
                >
                  {table.name}
                </p>
                <p className="text-white/50 text-xs">{table.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
