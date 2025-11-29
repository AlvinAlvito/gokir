import { Server } from "socket.io";

let io: Server | null = null;

export const createSocketServer = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
  });
  io.on("connection", (socket) => {
    socket.on("disconnect", () => {});
  });
  return io;
};

export const getIo = () => io;

export const emitOrdersChanged = () => {
  if (io) {
    io.emit("orders:changed");
  }
};
