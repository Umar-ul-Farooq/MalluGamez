import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@chitram/shared';
import type { GameServer } from './index';
import type { RoomManager } from '../game/RoomManager';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerEmojiHandlers(io: GameServer, socket: GameSocket, rm: RoomManager) {

  // Host updates Emoji game settings
  socket.on('emoji:update-settings', (settings) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'emoji') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.ensureEmojiEngine(room.code, io);
      engine.updateSettings(settings);

      io.to(room.code).emit('room:updated', rm.publicState(room.code));
      io.to(room.code).emit('emoji:state', engine.getPublicState());
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host starts the game
  socket.on('emoji:start-game', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'emoji') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.ensureEmojiEngine(room.code, io);
      engine.startGame();

      io.to(room.code).emit('room:updated', rm.publicState(room.code));
      io.to(room.code).emit('emoji:state', engine.getPublicState());
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Player submits a guess
  socket.on('emoji:submit-guess', ({ guess }) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'emoji') return;

      const engine = rm.getEmojiEngine(room.code);
      if (!engine) return;

      const result = engine.submitGuess(socket.id, guess);
      socket.emit('emoji:guess-result', result);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host reveals hint early
  socket.on('emoji:reveal-hint', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'emoji') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.getEmojiEngine(room.code);
      if (!engine) return;

      engine.revealHint();
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host advances to next question
  socket.on('emoji:next-question', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'emoji') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.getEmojiEngine(room.code);
      if (!engine) return;

      engine.nextQuestion();
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host restarts the game
  socket.on('emoji:restart-game', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'emoji') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.getEmojiEngine(room.code);
      if (!engine) return;

      engine.restartGame();
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });
}
