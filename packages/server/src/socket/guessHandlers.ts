import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@chitram/shared';
import type { GameServer } from './index';
import type { RoomManager } from '../game/RoomManager';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerGuessHandlers(io: GameServer, socket: GameSocket, rm: RoomManager) {

  // The drawer calls this when they hear the correct answer out loud
  socket.on('guess:award', ({ winnerId }) => {
    const room = rm.getRoomByPlayer(socket.id);
    if (!room || room.phase !== 'playing') return;

    const drawer = room.players.find(p => p.id === socket.id);
    if (!drawer?.isDrawing) return; // only the drawer can award

    const winner = room.players.find(p => p.id === winnerId);
    if (!winner) return;

    const points = rm.awardPoint(room.code, winnerId);
    io.to(room.code).emit('guess:awarded', {
      winnerId,
      winnerName: winner.name,
      points,
    });
    console.log(`[guess] ${winner.name} & drawer ${drawer.name} awarded ${points} points in room ${room.code}`);

    // Immediately conclude the round without waiting for the timer to expire
    rm.endRound(room.code);
  });
}
