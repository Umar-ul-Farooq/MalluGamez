import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@chitram/shared';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Module-level singleton — one connection for the whole app lifetime
let _socket: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (!_socket) {
    _socket = io({
      // Connect to the page's own origin; Vite proxies /socket.io → port 3001
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return _socket;
}
