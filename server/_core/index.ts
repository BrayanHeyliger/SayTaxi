import "dotenv/config";
import { spawn } from "node:child_process";
import express from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { ENV } from "./env";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { sdk } from "./sdk";
import { rawQuery } from "../db";
import { handleStripeWebhook } from "../routers/payments";
import { validateProductionEnvironment } from "./productionConfig";
import { configureTelemetry } from "../realtime/telemetry";

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const fetchWithTimeout = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const isOllamaHealthy = async (): Promise<boolean> => {
  try {
    const healthUrl = `${ENV.ollamaBaseUrl.replace(/\/$/, "")}/api/tags`;
    const response = await fetchWithTimeout(healthUrl, 4_000);
    return response.ok;
  } catch {
    return false;
  }
};

const startOllamaDetached = () => {
  if (ENV.useCodeium) {
    // If using Codeium, do not attempt to auto-start Ollama
    return;
  }

  if (!ENV.ollamaAutoStart) {
    return;
  }

  try {
    const child = spawn("ollama", ["serve"], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch (error) {
    console.warn("[LLM] Could not auto-start Ollama:", error);
  }
};

const warmOllamaModel = async () => {
  if (ENV.useCodeium) return;
  try {
    const warmupUrl = `${ENV.ollamaBaseUrl.replace(/\/$/, "")}/api/generate`;
    const response = await fetch(warmupUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: ENV.ollamaModel,
        prompt: "ok",
        stream: false,
        keep_alive: "30m",
      }),
      signal: AbortSignal.timeout(Math.max(ENV.llmRequestTimeoutMs, 20_000)),
    });
    if (!response.ok) {
      return;
    }
    await response.body?.cancel();
  } catch {
    // Warmup is best effort.
  }
};

const ensureLocalLlmReady = async () => {
  if (!ENV.localLlmOnly || ENV.useCodeium) {
    return;
  }

  if (!(await isOllamaHealthy())) {
    console.log("[LLM] Ollama no responde. Intentando iniciar servicio local...");
    startOllamaDetached();
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < ENV.ollamaBootTimeoutMs) {
    if (await isOllamaHealthy()) {
      console.log("[LLM] Ollama listo para uso local.");
      await warmOllamaModel();
      return;
    }
    await sleep(1_000);
  }

  console.warn(
    `[LLM] Ollama no quedó listo en ${ENV.ollamaBootTimeoutMs}ms. El chat puede fallar hasta que el servicio suba.`
  );
};

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  validateProductionEnvironment();
  await ensureLocalLlmReady();

  const app = express();
  app.disable("x-powered-by");
  if (ENV.isProduction) app.set("trust proxy", 1);

  const isAllowedOrigin = (origin: string | undefined) => !origin || ENV.allowedOrigins.includes(origin);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      if (!isAllowedOrigin(origin)) {
        return res.status(403).json({ error: "Origin not allowed" });
      }
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") return res.status(204).end();
    return next();
  });

  const server = createServer(app);

  app.get("/healthz", async (_req, res) => {
    try {
      await rawQuery("SELECT 1 AS ok");
      res.status(200).json({ ok: true, service: "saytaxi", database: "ready", timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ ok: false, service: "saytaxi", database: "unavailable", timestamp: new Date().toISOString() });
    }
  });

  // Stripe must receive its original raw body to validate webhook signatures.
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

  // ── Socket.io — authenticated, trip-scoped real-time events ────────────────
  const io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => callback(isAllowedOrigin(origin) ? null : new Error("Origin not allowed"), isAllowedOrigin(origin)),
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io",
  });

  const telemetry = ENV.telemetryEnabled
    ? await configureTelemetry(io, ENV.redisUrl)
    : null;
  if (ENV.telemetryEnabled) console.info("[telemetry] Redis-backed trip tracking enabled");

  type SocketUser = { id: number; role: string; name: string };
  const chatRooms = new Map<string, { id: string; sender: string; senderRole: string; text: string; time: string }[]>();

  const canAccessTripRoom = async (user: SocketUser, roomId: string) => {
    if (!/^\d+$/.test(roomId)) return false;
    if (user.role === "admin") return true;
    const rows = await rawQuery<{ clientUserId: number; driverUserId: number | null }>(
      `SELECT c.userId AS clientUserId, d.userId AS driverUserId
       FROM trips t
       INNER JOIN clients c ON c.id = t.clientId
       LEFT JOIN drivers d ON d.id = t.driverId
       WHERE t.id = ? LIMIT 1`,
      [Number(roomId)],
    );
    const trip = rows[0];
    return Boolean(trip && (trip.clientUserId === user.id || trip.driverUserId === user.id));
  };

  io.use(async (socket, next) => {
    try {
      const user = await sdk.authenticateRequest(socket.request as any);
      if (!user || user.isActive === false) return next(new Error("Unauthorized"));
      socket.data.user = { id: user.id, role: user.role, name: user.name || "Usuario" } satisfies SocketUser;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser;

    const belongsToRoom = (roomId: string) => socket.data.roomId === roomId && socket.rooms.has(roomId);
    const requireRoom = (roomId: string) => {
      if (!belongsToRoom(roomId)) {
        socket.emit("room_error", { message: "No autorizado para esta sala" });
        return false;
      }
      return true;
    };

    socket.on("join_room", async ({ roomId }: { roomId: string }) => {
      if (!(await canAccessTripRoom(user, roomId))) {
        socket.emit("room_error", { message: "No autorizado para este viaje" });
        return;
      }
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.emit("message_history", chatRooms.get(roomId) || []);
      await telemetry?.sendSnapshot(socket, Number(roomId));
    });

    socket.on("send_message", ({ roomId, message }: { roomId: string; message: { id?: string; text?: string } }) => {
      if (!requireRoom(roomId) || !message?.text?.trim()) return;
      const safeMessage = {
        id: message.id || `${Date.now()}-${socket.id}`,
        sender: user.name,
        senderRole: user.role,
        text: message.text.trim().slice(0, 4000),
        time: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
      };
      const room = chatRooms.get(roomId) || [];
      room.push(safeMessage);
      if (room.length > 100) room.splice(0, room.length - 100);
      chatRooms.set(roomId, room);
      io.to(roomId).emit("new_message", safeMessage);
    });

    socket.on("typing", ({ roomId }: { roomId: string }) => {
      if (requireRoom(roomId)) socket.to(roomId).emit("user_typing", { sender: user.name });
    });

    socket.on("trip_status", ({ roomId, status, data }: { roomId: string; status: string; data?: unknown }) => {
      if (!requireRoom(roomId) || !["driver", "admin"].includes(user.role)) return;
      io.to(roomId).emit("trip_status_update", { status, data, time: new Date().toISOString() });
    });

    socket.on("call_offer", ({ roomId, offer }: { roomId: string; offer: RTCSessionDescriptionInit }) => {
      if (requireRoom(roomId)) socket.to(roomId).emit("call_incoming", { offer, from: String(user.id), callerName: user.name });
    });
    socket.on("call_answer", ({ roomId, answer }: { roomId: string; answer: RTCSessionDescriptionInit }) => {
      if (requireRoom(roomId)) socket.to(roomId).emit("call_answered", { answer, from: String(user.id) });
    });
    socket.on("call_ice", ({ roomId, candidate }: { roomId: string; candidate: RTCIceCandidateInit }) => {
      if (requireRoom(roomId)) socket.to(roomId).emit("call_ice_candidate", { candidate, from: String(user.id) });
    });
    socket.on("call_end", ({ roomId }: { roomId: string }) => {
      if (requireRoom(roomId)) socket.to(roomId).emit("call_ended", { from: String(user.id) });
    });
    socket.on("call_reject", ({ roomId }: { roomId: string }) => {
      if (requireRoom(roomId)) socket.to(roomId).emit("call_rejected", { from: String(user.id) });
    });
  });

  // Expose io for use in routes if needed
  (app as any).io = io;
  (app as any).telemetry = telemetry;
  app.locals.telemetry = telemetry;

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Serve uploaded media from server/uploads
  const uploadsPath = path.resolve(process.cwd(), "server/uploads");
  try {
    await fs.mkdir(uploadsPath, { recursive: true });
  } catch (e) {
    console.warn("Could not ensure uploads dir:", e);
  }
  app.use("/uploads", express.static(uploadsPath));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // Lightweight test endpoint to validate LLM provider is reachable/configured.
  app.post("/api/test-llm", async (req, res) => {
    try {
      const { invokeLLM } = await import("./llm");
      const prompt = (req.body && req.body.prompt) || "Prueba rápida: di hola";
      const result = await invokeLLM({
        messages: [{ role: "user", content: prompt }],
        maxTokens: 200,
      });
      res.json({ ok: true, provider: process.env.USE_LOCALAI || process.env.USE_CODEIUM || "unknown", result });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message ?? String(err) });
    }
  });

  // Debug endpoint: return local news posts file (no auth) for quick checks
  app.get("/api/_debug/news", async (req, res) => {
    try {
      const filePath = path.resolve(process.cwd(), "server/_data/news_posts.json");
      const data = await fs.readFile(filePath, "utf-8");
      res.setHeader("content-type", "application/json");
      res.send(data);
    } catch (err) {
      res.status(404).json({ error: "No debug news file" });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  if (ENV.localLlmOnly && !ENV.useCodeium && ENV.ollamaKeepAliveMs > 0) {
    setInterval(async () => {
      if (!(await isOllamaHealthy())) {
        console.warn("[LLM] Ollama dejó de responder. Reintentando iniciar...");
        startOllamaDetached();
      }
    }, ENV.ollamaKeepAliveMs).unref();
  }
}

startServer().catch(console.error);
