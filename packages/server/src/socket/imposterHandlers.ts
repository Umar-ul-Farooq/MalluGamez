import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@chitram/shared';
import type { GameServer } from './index';
import type { RoomManager } from '../game/RoomManager';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerImposterHandlers(io: GameServer, socket: GameSocket, rm: RoomManager) {

  // Host updates Imposter game settings
  socket.on('imposter:update-settings', (settings) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'imposter') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.ensureImposterEngine(room.code, io);
      engine.updateSettings(settings);

      io.to(room.code).emit('room:updated', rm.publicState(room.code));
      io.to(room.code).emit('imposter:state', engine.getPublicState());
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host starts The Imposter game
  socket.on('imposter:start-game', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'imposter') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.ensureImposterEngine(room.code, io);
      engine.startGame();

      io.to(room.code).emit('room:updated', rm.publicState(room.code));
      io.to(room.code).emit('imposter:state', engine.getPublicState());
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host or player starts clue phase
  socket.on('imposter:start-clues', (payload) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'imposter') return;

      const engine = rm.getImposterEngine(room.code);
      if (!engine || !engine.validateSession(payload?.sessionId)) return;

      engine.startCluePhase();
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Active clue giver (or host) clicks "Done / Next Clue"
  socket.on('imposter:next-clue', (payload) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'imposter') return;

      const engine = rm.getImposterEngine(room.code);
      if (!engine || !engine.validateSession(payload?.sessionId)) return;

      engine.nextClue(socket.id);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host ends discussion early
  socket.on('imposter:end-discussion', (payload) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'imposter') return;

      const engine = rm.getImposterEngine(room.code);
      if (!engine || !engine.validateSession(payload?.sessionId)) return;

      engine.endDiscussion(socket.id);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Player votes privately for a candidate
  socket.on('imposter:vote', ({ candidateId, sessionId }) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'imposter') return;

      const engine = rm.getImposterEngine(room.code);
      if (!engine || !engine.validateSession(sessionId)) return;

      engine.vote(socket.id, candidateId);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host advances to next round
  socket.on('imposter:next-round', (payload) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'imposter') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.getImposterEngine(room.code);
      if (!engine || !engine.validateSession(payload?.sessionId)) return;

      engine.nextRound();
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host restarts game
  socket.on('imposter:restart-game', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'imposter') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.getImposterEngine(room.code);
      if (!engine) return;

      engine.restartGame();
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host force-resets session to clean lobby
  socket.on('imposter:force-reset', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'imposter') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.getImposterEngine(room.code);
      if (!engine) return;

      engine.forceReset('Host clicked Force Reset Session');
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });
}
