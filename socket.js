import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST", "PATCH"],
    },
  });

  // Only authenticated admins can join the live inventory room.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== "admin") {
        return next(new Error("Admin access only"));
      }

      socket.data.adminId = decoded.id;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join("admin-room");
    console.log(`Admin socket connected: ${socket.data.adminId}`);

    socket.on("disconnect", () => {
      console.log(`Admin socket disconnected: ${socket.data.adminId}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.IO has not been initialized");
  return io;
}
