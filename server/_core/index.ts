import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { applySecurity } from "./security";
import { logger, requestLogger } from "./logger";
import { registerHealthRoute } from "./health";

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
  const app = express();
  const server = createServer(app);
  applySecurity(app);
  app.use(requestLogger);

  // ── Socket.io — Real-time chat & trip events ────────────────────────────────
  const io = new SocketIOServer(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/socket.io",
  });

  // In-memory store: roomId → messages[]
  const chatRooms = new Map<string, { id: string; sender: string; senderRole: string; text: string; time: string }[]>();

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Socket client connected");

    // Join a trip chat room
    socket.on("join_room", ({ roomId, userId, role }: { roomId: string; userId: string; role: string }) => {
      socket.join(roomId);
      socket.data.userId = userId;
      socket.data.role = role;
      socket.data.roomId = roomId;
      // Send message history to the new joiner
      const history = chatRooms.get(roomId) || [];
      socket.emit("message_history", history);
      logger.info({ role, userId, roomId }, "Socket client joined room");
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
      logger.info({ socketId: socket.id }, "Socket client disconnected");
    });
  });

  // Expose io for use in routes if needed
  (app as any).io = io;

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerHealthRoute(app);
  registerStorageProxy(app);
  registerOAuthRoutes(app);
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
    logger.warn(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch((error) => {
  logger.error(error, "Failed to start server");
});
