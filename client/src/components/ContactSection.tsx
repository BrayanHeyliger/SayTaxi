/**
 * ContactSection — Passenger
 * Design: Verde Operacional — dark bg, formulario de contacto + info
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, MessageCircle, Send, CheckCircle2, Loader2, AlertCircle, XCircle } from "lucide-react";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { trpc } from "@/lib/trpc";

export default function ContactSection() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string>("");
  const { config } = useSiteConfig();
  const [sending, setSending] = useState(false);
  const sendEmailMutation = trpc.siteSettings.saveAndSendContact.useMutation();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "El nombre es obligatorio";
    if (!form.email.trim()) newErrors.email = "El email es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Ingresa un email válido";
    if (!form.message.trim()) newErrors.message = "Por favor escribe tu mensaje";
    else if (form.message.trim().length < 10) newErrors.message = "El mensaje debe tener al menos 10 caracteres";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    // Clear field error on change
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n; });
    if (submitError) setSubmitError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setSending(true);
    sendEmailMutation.mutate(
      { name: form.name, email: form.email, company: form.company || undefined, message: form.message },
      {
        onSuccess: (data) => {
          setSubmitted(true);
          setSending(false);
          setSentTo(data.sentTo);
        },
        onError: (err) => {
          setSending(false);
          setSubmitError(err.message || "No se pudo enviar el mensaje. Por favor intenta de nuevo.");
        },
      }
    );
  };

  return (
    <section
      id="contact"
      className="py-20 lg:py-28 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, oklch(0.13 0.01 250) 0%, oklch(0.10 0.01 250) 100%)" }}
    >
      {/* Glow */}
      <div
        className="absolute bottom-0 right-0 w-96 h-96 opacity-10 blur-3xl pointer-events-none"
        style={{ background: "oklch(0.76 0.18 148)" }}
      />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* Left — Info */}
          <div className="space-y-8">
            <div>
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border"
                style={{
                  background: "oklch(0.76 0.18 148 / 0.12)",
                  borderColor: "oklch(0.76 0.18 148 / 0.3)",
                  color: "oklch(0.76 0.18 148)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                Contacto
              </div>
              <h2
                className="text-3xl lg:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: `'${config.fontFamily}', sans-serif` }}
              >
                ¿Listo para{" "}
                <span style={{ color: "oklch(0.76 0.18 148)" }}>transformar</span>{" "}
                tu flota?
              </h2>
              <p className="text-white/60 text-lg leading-relaxed">
                Solicita una demo gratuita. Nuestro equipo te contactará en menos de 24 horas para activar tu plataforma.
              </p>
            </div>

            {/* Contact Info Cards */}
            <div className="space-y-3">
              {[
                { icon: Mail, label: "Email", value: config.contactEmail || "hola@whatsapptaxi.com" },
                { icon: Phone, label: "Teléfono", value: config.contactPhone || "+1 (555) 000-0000" },
                { icon: MapPin, label: "Ubicación", value: config.contactAddress || "Ciudad de México, México" },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-4 p-4 rounded-2xl"
                  style={{ background: "oklch(0.18 0.01 250)", border: "1px solid oklch(1 0 0 / 0.08)" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "oklch(0.76 0.18 148 / 0.15)" }}
                  >
                    <Icon size={18} style={{ color: "oklch(0.76 0.18 148)" }} />
                  </div>
                  <div>
                    <p className="text-white/40 text-xs">{label}</p>
                    <p className="text-white font-medium text-sm">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* WhatsApp CTA */}
            <a
              href="https://wa.me/15550000000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "oklch(0.76 0.18 148 / 0.15)",
                border: "1px solid oklch(0.76 0.18 148 / 0.3)",
              }}
            >
              <MessageCircle size={22} style={{ color: "oklch(0.76 0.18 148)" }} />
              <div>
                <p className="text-white font-semibold text-sm">Chatea con nosotros en WhatsApp</p>
                <p className="text-white/50 text-xs">Respuesta inmediata en horario laboral</p>
              </div>
            </a>
          </div>

          {/* Form */}
          <div
            className="rounded-3xl p-7"
            style={{ background: "oklch(0.18 0.01 250)", border: "1px solid oklch(1 0 0 / 0.1)" }}
          >
            {submitted ? (
              /* ── SUCCESS STATE ── */
              <div
                className="flex flex-col items-center justify-center gap-5 py-12 text-center"
                style={{ animation: "fadeInUp 0.4s cubic-bezier(0.23,1,0.32,1) both" }}
              >
                {/* Animated checkmark ring */}
                <div className="relative">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background: "oklch(0.76 0.18 148 / 0.15)",
                      border: "2px solid oklch(0.76 0.18 148 / 0.4)",
                      animation: "scaleIn 0.5s cubic-bezier(0.23,1,0.32,1) both",
                    }}
                  >
                    <CheckCircle2 size={40} style={{ color: "oklch(0.76 0.18 148)" }} />
                  </div>
                  {/* Pulse ring */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      border: "2px solid oklch(0.76 0.18 148 / 0.3)",
                      animation: "pingOnce 1s cubic-bezier(0,0,0.2,1) 0.3s both",
                    }}
                  />
                </div>

                <div>
                  <h3 className="text-white font-bold text-2xl mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>
                    ¡Mensaje enviado!
                  </h3>
                  <p className="text-white/60 text-sm max-w-xs leading-relaxed">
                    Tu mensaje fue enviado correctamente.{" "}
                    {sentTo && (
                      <span>
                        Una copia fue registrada en{" "}
                        <span className="text-green-400 font-medium">{sentTo}</span>.
                      </span>
                    )}
                  </p>
                </div>

                {/* What happens next */}
                <div
                  className="w-full p-4 rounded-2xl text-left space-y-2"
                  style={{ background: "oklch(0.76 0.18 148 / 0.08)", border: "1px solid oklch(0.76 0.18 148 / 0.2)" }}
                >
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-2">¿Qué sigue?</p>
                  {[
                    "Recibirás un email de confirmación en breve",
                    "Nuestro equipo te contactará en menos de 24 horas",
                    "Activaremos tu demo personalizada sin costo",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                        style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}
                      >
                        {i + 1}
                      </div>
                      <p className="text-white/60 text-xs leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  className="text-white/50 hover:text-white text-sm mt-1"
                  onClick={() => { setSubmitted(false); setForm({ name: "", email: "", company: "", message: "" }); setSentTo(""); }}
                >
                  Enviar otro mensaje
                </Button>
              </div>
            ) : (
              /* ── FORM STATE ── */
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <h3
                  className="text-white font-bold text-lg mb-2"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Solicitar demo gratuita
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="flex flex-col gap-1.5">
                    <Label className={`text-xs font-medium ${errors.name ? "text-red-400" : "text-white/70"}`}>
                      Nombre <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      placeholder="Tu nombre"
                      value={form.name}
                      onChange={(e) => handleFieldChange("name", e.target.value)}
                      className={`text-white placeholder:text-white/30 transition-colors ${
                        errors.name
                          ? "bg-red-950/30 border-red-500/60 focus:border-red-400"
                          : "bg-[oklch(0.22_0.01_250)] border-[oklch(1_0_0/0.1)] focus:border-[oklch(0.76_0.18_148/0.5)]"
                      }`}
                    />
                    {errors.name && (
                      <p className="text-red-400 text-xs flex items-center gap-1 mt-0.5">
                        <AlertCircle size={11} /> {errors.name}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <Label className={`text-xs font-medium ${errors.email ? "text-red-400" : "text-white/70"}`}>
                      Email <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      type="email"
                      placeholder="tu@empresa.com"
                      value={form.email}
                      onChange={(e) => handleFieldChange("email", e.target.value)}
                      className={`text-white placeholder:text-white/30 transition-colors ${
                        errors.email
                          ? "bg-red-950/30 border-red-500/60 focus:border-red-400"
                          : "bg-[oklch(0.22_0.01_250)] border-[oklch(1_0_0/0.1)] focus:border-[oklch(0.76_0.18_148/0.5)]"
                      }`}
                    />
                    {errors.email && (
                      <p className="text-red-400 text-xs flex items-center gap-1 mt-0.5">
                        <AlertCircle size={11} /> {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Company */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-white/70 text-xs font-medium">Empresa / Flota <span className="text-white/30">(opcional)</span></Label>
                  <Input
                    placeholder="Nombre de tu empresa de taxi"
                    value={form.company}
                    onChange={(e) => handleFieldChange("company", e.target.value)}
                    className="bg-[oklch(0.22_0.01_250)] border-[oklch(1_0_0/0.1)] text-white placeholder:text-white/30 focus:border-[oklch(0.76_0.18_148/0.5)]"
                  />
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <Label className={`text-xs font-medium ${errors.message ? "text-red-400" : "text-white/70"}`}>
                    Mensaje <span className="text-red-400">*</span>
                  </Label>
                  <Textarea
                    placeholder="Cuéntanos sobre tu flota y necesidades..."
                    rows={4}
                    value={form.message}
                    onChange={(e) => handleFieldChange("message", e.target.value)}
                    className={`text-white placeholder:text-white/30 resize-none transition-colors ${
                      errors.message
                        ? "bg-red-950/30 border-red-500/60 focus:border-red-400"
                        : "bg-[oklch(0.22_0.01_250)] border-[oklch(1_0_0/0.1)] focus:border-[oklch(0.76_0.18_148/0.5)]"
                    }`}
                  />
                  {errors.message && (
                    <p className="text-red-400 text-xs flex items-center gap-1 mt-0.5">
                      <AlertCircle size={11} /> {errors.message}
                    </p>
                  )}
                </div>

                {/* Submit error banner */}
                {submitError && (
                  <div
                    className="flex items-start gap-3 p-3.5 rounded-xl"
                    style={{
                      background: "oklch(0.35 0.15 25 / 0.2)",
                      border: "1px solid oklch(0.65 0.2 25 / 0.4)",
                      animation: "fadeInUp 0.3s cubic-bezier(0.23,1,0.32,1) both",
                    }}
                  >
                    <XCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-red-300 text-sm font-medium">Error al enviar</p>
                      <p className="text-red-400/80 text-xs mt-0.5">{submitError}</p>
                    </div>
                    <button type="button" onClick={() => setSubmitError(null)} className="text-red-400/60 hover:text-red-300 transition-colors">
                      <XCircle size={14} />
                    </button>
                  </div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  size="lg"
                  disabled={sending}
                  className="w-full font-bold h-12 mt-2 active:scale-[0.97] transition-all shadow-lg shadow-green-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}
                >
                  {sending ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" />Enviando mensaje...</>
                  ) : (
                    <><Send size={16} className="mr-2" />Solicitar demo gratuita</>
                  )}
                </Button>

                <p className="text-white/30 text-xs text-center">
                  Al enviar aceptas nuestra política de privacidad. Sin spam.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.7); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pingOnce {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
