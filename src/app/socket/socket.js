import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../prisma/client.js";
import { envVars } from "../config/env.js";

let io;

export function initSocket(httpServer) {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: [
        "https://kenneth-mckean-frontend.vercel.app",
        "http://localhost:5173",
      ],
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  io.use(async (socket, next) => {
    try {
      const tokenRaw =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization ||
        "";
      const jwtToken = String(tokenRaw).replace(/^Bearer\s*/i, "");

      if (!jwtToken) return next(new Error("Unauthorized"));

      const decoded = jwt.verify(jwtToken, envVars.JWT_SECRET_TOKEN);
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });

      if (!user) return next(new Error("Unauthorized"));

      socket.user = user;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const role = socket.user?.role;
    if (role) socket.join(role); // "ADMIN" or "USER"

    socket.on("disconnect", () => {});
  });

  return io;
}

export function getIO() {
  return io;
}

export function emitToAdmins(event, payload) {
  if (!io) return false;
  io.to("ADMIN").emit(event, payload);
  return true;
}

