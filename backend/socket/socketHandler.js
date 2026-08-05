import { Server } from "socket.io";

let io;

export const initSocket = (httpServer) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
    : ["http://localhost:5173", "http://localhost:3000"];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    socket.on("disconnect", () => {});
  });

  return io;
};

// Function to emit events globally
export const emitEvent = (event, data) => {
  if (io) {
    io.emit(event, data);
    // console.log(`📡 Emitted Event: ${event}`);
  }
};
