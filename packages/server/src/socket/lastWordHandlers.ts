import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@chitram/shared';
import type { GameServer } from './index';
import type { RoomManager } from '../game/RoomManager';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerLastWordHandlers(io: GameServer, socket: GameSocket, rm: RoomManager) {
  // Host updates Last Word settings (locked once game starts)
  socket.on('last-word:update-settings', (settings) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'last-word') return;
      if (room.phase !== 'lobby') return;

      const host = room.players.find((p) => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.ensureLastWordEngine(room.code, io);
      engine.updateSettings(settings);

      io.to(room.code).emit('room:updated', rm.publicState(room.code));
      io.to(room.code).emit('last-word:state', engine.getPublicState());
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host starts the game
  socket.on('last-word:start-game', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'last-word') return;

      const host = room.players.find((p) => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.ensureLastWordEngine(room.code, io);
      engine.startGame();
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Active turn player submits an answer from mobile
  socket.on('last-word:submit-answer', async ({ answer, sessionId, questionId }) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'last-word') return;

      const engine = rm.getLastWordEngine(room.code);
      if (!engine) return;

      const feedback = await engine.submitAnswer(socket.id, answer, sessionId, questionId);
      socket.emit('last-word:answer-feedback', feedback);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host restarts the game
  socket.on('last-word:restart-game', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'last-word') return;

      const host = room.players.find((p) => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.getLastWordEngine(room.code);
      if (!engine) return;

      engine.restartGame();
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });
}
