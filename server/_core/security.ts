import type { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

function parseDurationToMs(value: string | undefined, fallbackMs: number): number {
  if (!value) return fallbackMs;

  const trimmed = value.trim();
  const match = /^(\d+)(ms|s|m|h|d)?$/i.exec(trimmed);
  if (!match) return fallbackMs;

  const amount = Number.parseInt(match[1]!, 10);
  const unit = (match[2] ?? "ms").toLowerCase();

  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return amount * (multipliers[unit] ?? 1);
}

function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function applySecurity(app: Express) {
  app.set("trust proxy", 1);

  app.use(helmet());

  const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGIN ?? process.env.VITE_API_URL);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    }),
  );

  const windowMs = parseDurationToMs(process.env.RATE_LIMIT_WINDOW, 15 * 60 * 1000);
  const maxRequests = Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? "100", 10);

  app.use(
    "/api",
    rateLimit({
      windowMs,
      max: Number.isNaN(maxRequests) ? 100 : maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use((req, res, next) => {
    if (
      process.env.NODE_ENV === "production" &&
      req.headers["x-forwarded-proto"] !== "https" &&
      req.method === "GET"
    ) {
      const host = req.headers.host;
      if (host) {
        return res.redirect(301, `https://${host}${req.originalUrl}`);
      }
    }
    next();
  });
}

export { parseDurationToMs };
