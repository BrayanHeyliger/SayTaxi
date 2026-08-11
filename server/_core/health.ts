import type { Express } from "express";
import { getRawPool } from "../db";

async function checkDatabase() {
  if (!process.env.DATABASE_URL) {
    return { status: "not_configured" as const };
  }

  const pool = await getRawPool();
  if (!pool) {
    return { status: "down" as const };
  }

  try {
    await pool.query("SELECT 1");
    return { status: "up" as const };
  } catch {
    return { status: "down" as const };
  }
}

function checkExternalServices() {
  return {
    stripe: process.env.STRIPE_SECRET_KEY ? "configured" : "missing",
    whatsapp: process.env.WHATSAPP_ACCESS_TOKEN ? "configured" : "missing",
    maps: process.env.GOOGLE_MAPS_API_KEY ? "configured" : "missing",
  };
}

export function registerHealthRoute(app: Express) {
  app.get("/health", async (_req, res) => {
    const db = await checkDatabase();
    const services = checkExternalServices();
    const isHealthy = db.status === "up" || db.status === "not_configured";

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: db,
      services,
    });
  });
}
