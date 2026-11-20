import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@chitram/shared';
import type { GameServer } from './index';
import type { RoomManager } from '../game/RoomManager';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerDrawHandlers(io: GameServer, socket: GameSocket, rm: RoomManager) {

  socket.on('draw:stroke', (stroke) => {
    const room = rm.getRoomByPlayer(socket.id);
    if (!room || room.phase !== 'playing') return;
    // Broadcast stroke to everyone else in the room
    socket.to(room.code).emit('draw:stroke', stroke);
  });

  socket.on('draw:clear', () => {
    const room = rm.getRoomByPlayer(socket.id);
    if (!room || room.phase !== 'playing') return;
    socket.to(room.code).emit('draw:cleared');
  });
}
