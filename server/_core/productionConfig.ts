import { ENV } from "./env";

export function validateProductionEnvironment() {
  if (!ENV.isProduction) return;

  const required = ["DATABASE_URL", "JWT_SECRET", "APP_URL", "ALLOWED_ORIGINS", "SUPER_ADMIN_EMAIL", "SUPER_ADMIN_PASSWORD"];
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Configuración de producción incompleta: ${missing.join(", ")}`);
  }

  if (!ENV.appUrl.startsWith("https://")) {
    throw new Error("APP_URL debe usar HTTPS en producción.");
  }

  if (ENV.telemetryEnabled && !ENV.redisUrl) {
    throw new Error("REDIS_URL es obligatoria cuando TELEMETRY_ENABLED=true.");
  }

  if (process.env.STRIPE_SECRET_KEY || process.env.STRIPE_WEBHOOK_SECRET) {
    const billingMissing = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"].filter((name) => !process.env[name]?.trim());
    if (billingMissing.length > 0) {
      throw new Error(`Configuración de Stripe incompleta: ${billingMissing.join(", ")}`);
    }
  }
}
