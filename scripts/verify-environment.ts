type EnvironmentMode = "staging" | "production";

const mode = (process.argv[2] ?? process.env.NODE_ENV ?? "staging") as EnvironmentMode;
const errors: string[] = [];
const warnings: string[] = [];

function value(name: string) {
  return process.env[name]?.trim() ?? "";
}

function requireVariable(name: string) {
  if (!value(name)) errors.push(`Falta ${name}.`);
}

function requireHttpsUrl(name: string) {
  const candidate = value(name);
  if (!candidate) return errors.push(`Falta ${name}.`);
  try {
    const url = new URL(candidate);
    if (mode === "production" && url.protocol !== "https:") errors.push(`${name} debe usar HTTPS en producción.`);
  } catch {
    errors.push(`${name} no contiene una URL válida.`);
  }
}

function pairedVariables(label: string, names: string[]) {
  const configured = names.filter(name => Boolean(value(name)));
  if (configured.length > 0 && configured.length !== names.length) {
    errors.push(`${label} está incompleto: se requieren ${names.join(", ")}.`);
  }
}

if (mode !== "staging" && mode !== "production") {
  errors.push("Usa 'staging' o 'production' como argumento.");
}

["DATABASE_URL", "JWT_SECRET", "APP_URL", "ALLOWED_ORIGINS", "SUPER_ADMIN_EMAIL", "SUPER_ADMIN_PASSWORD"].forEach(requireVariable);
requireHttpsUrl("APP_URL");

const telemetryEnabled = value("TELEMETRY_ENABLED").toLowerCase() === "true";
if (telemetryEnabled) requireVariable("REDIS_URL");
pairedVariables("Stripe", ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]);
pairedVariables("Correo SMTP", ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"]);
pairedVariables("Twilio", ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM"]);

if (!value("GOOGLE_MAPS_API_KEY")) warnings.push("GOOGLE_MAPS_API_KEY no está configurada: geocodificación/rutas de proveedor no estarán disponibles.");
if (!value("STRIPE_SECRET_KEY")) warnings.push("Stripe no está configurado: los cobros con tarjeta permanecerán deshabilitados.");
if (!value("SMTP_HOST") && !value("TWILIO_ACCOUNT_SID")) warnings.push("No hay proveedor de mensajería configurado: las notificaciones transaccionales permanecerán deshabilitadas.");
if (mode === "production" && !telemetryEnabled) warnings.push("TELEMETRY_ENABLED no está activo: God’s Eye no recibirá ubicación GPS en tiempo real.");

console.log(`\nValidación de entorno: ${mode}`);
console.log(`Telemetría: ${telemetryEnabled ? "activada" : "desactivada"}`);
for (const warning of warnings) console.warn(`ADVERTENCIA: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);

if (errors.length > 0) {
  console.error(`\nEntorno no apto: ${errors.length} error(es) de configuración.`);
  process.exit(1);
}

console.log(`\nEntorno apto para ${mode}. Las integraciones opcionales deben validarse con pruebas reales antes de abrir acceso público.`);
