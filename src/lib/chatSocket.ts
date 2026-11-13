import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "./env";
import { getToken } from "./api";

let socket: Socket | null = null;

/** Shared authenticated Socket.IO connection for the super-admin dashboard. */
export function getChatSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token: getToken() ?? "" },
      reconnection: true,
    });
  } else {
    socket.connect();
  }
  return socket;
}
