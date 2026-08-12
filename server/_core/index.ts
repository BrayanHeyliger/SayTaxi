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
  await ensureLocalLlmReady();

  const app = express();
  const server = createServer(app);

  // ── Socket.io — Real-time chat & trip events ────────────────────────────────
  const io = new SocketIOServer(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/socket.io",
  });

  // In-memory store: roomId → messages[]
  const chatRooms = new Map<string, { id: string; sender: string; senderRole: string; text: string; time: string }[]>();

  io.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join a trip chat room
    socket.on("join_room", ({ roomId, userId, role }: { roomId: string; userId: string; role: string }) => {
      socket.join(roomId);
      socket.data.userId = userId;
      socket.data.role = role;
      socket.data.roomId = roomId;
      // Send message history to the new joiner
      const history = chatRooms.get(roomId) || [];
      socket.emit("message_history", history);
      console.log(`[Socket.io] ${role} ${userId} joined room ${roomId}`);
    });

    // Send a chat message
    socket.on("send_message", ({ roomId, message }: { roomId: string; message: { id: string; sender: string; senderRole: string; text: string; time: string } }) => {
      if (!chatRooms.has(roomId)) chatRooms.set(roomId, []);
      const room = chatRooms.get(roomId)!;
      room.push(message);
      // Keep last 100 messages per room
      if (room.length > 100) room.splice(0, room.length - 100);
      // Broadcast to all in room (including sender for confirmation)
      io.to(roomId).emit("new_message", message);
    });

    // Typing indicator
    socket.on("typing", ({ roomId, sender }: { roomId: string; sender: string }) => {
      socket.to(roomId).emit("user_typing", { sender });
    });

    // Trip status updates (driver → client)
    socket.on("trip_status", ({ roomId, status, data }: { roomId: string; status: string; data?: any }) => {
      io.to(roomId).emit("trip_status_update", { status, data, time: new Date().toISOString() });
    });

    // ── WebRTC Voice Call Signaling ────────────────────────────────────────────
    // call_offer: caller sends SDP offer to the other party in the room
    socket.on("call_offer", ({ roomId, offer, from, callerName }: { roomId: string; offer: RTCSessionDescriptionInit; from: string; callerName: string }) => {
      socket.to(roomId).emit("call_incoming", { offer, from, callerName });
    });

    // call_answer: callee sends SDP answer back to caller
    socket.on("call_answer", ({ roomId, answer, from }: { roomId: string; answer: RTCSessionDescriptionInit; from: string }) => {
      socket.to(roomId).emit("call_answered", { answer, from });
    });

    // call_ice: exchange ICE candidates
    socket.on("call_ice", ({ roomId, candidate, from }: { roomId: string; candidate: RTCIceCandidateInit; from: string }) => {
      socket.to(roomId).emit("call_ice_candidate", { candidate, from });
    });

    // call_end: either party hangs up
    socket.on("call_end", ({ roomId, from }: { roomId: string; from: string }) => {
      socket.to(roomId).emit("call_ended", { from });
    });

    // call_reject: callee rejects incoming call
    socket.on("call_reject", ({ roomId, from }: { roomId: string; from: string }) => {
      socket.to(roomId).emit("call_rejected", { from });
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  // Expose io for use in routes if needed
  (app as any).io = io;

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
