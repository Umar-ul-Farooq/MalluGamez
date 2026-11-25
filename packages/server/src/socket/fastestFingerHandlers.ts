import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@chitram/shared';
import type { GameServer } from './index';
import type { RoomManager } from '../game/RoomManager';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerFastestFingerHandlers(io: GameServer, socket: GameSocket, rm: RoomManager) {

  // Host updates Fastest Finger settings (locked once game starts)
  socket.on('fastest-finger:update-settings', (settings) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'fastest-finger') return;
      if (room.phase !== 'lobby') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.ensureFastestFingerEngine(room.code, io);
      engine.updateSettings(settings);

      io.to(room.code).emit('room:updated', rm.publicState(room.code));
      io.to(room.code).emit('fastest-finger:state', engine.getPublicState());
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host starts the game
  socket.on('fastest-finger:start-game', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'fastest-finger') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.ensureFastestFingerEngine(room.code, io);
      engine.startGame();
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Player submits an answer from mobile
  socket.on('fastest-finger:submit-guess', ({ guess, sessionId, questionId }) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'fastest-finger') return;

      const engine = rm.getFastestFingerEngine(room.code);
      if (!engine) return;

      const result = engine.submitGuess(socket.id, guess, sessionId, questionId);
      socket.emit('fastest-finger:guess-result', result);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host restarts the game
  socket.on('fastest-finger:restart-game', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'fastest-finger') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.getFastestFingerEngine(room.code);
      if (!engine) return;

      engine.restartGame();
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });
}
