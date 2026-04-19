import { io, type Socket } from "socket.io-client";

/**
 * Module-level singleton socket cache, keyed by auth token.
 * Shared across all hooks that connect to the /messages namespace so that
 * a single WebSocket connection is reused regardless of how many hooks mount.
 */
const socketCache = new Map<string, Socket>();

/**
 * Returns (or creates) a Socket.IO socket connected to the `/messages`
 * namespace. The socket is cached per token so multiple hook instances share
 * one underlying connection.
 */
export function getOrCreateMessagesSocket(
  token: string,
  backendUrl: string,
): Socket {
  const existing = socketCache.get(token);
  if (existing?.connected) return existing;

  // Tear down stale sockets before creating a new one
  existing?.disconnect();

  const socket = io(`${backendUrl}/messages`, {
    auth: { token },
    transports: ["websocket"],
    autoConnect: true,
  });

  socketCache.set(token, socket);
  return socket;
}
