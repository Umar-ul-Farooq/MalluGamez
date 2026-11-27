import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@chitram/shared';
import type { GameServer } from './index';
import type { RoomManager } from '../game/RoomManager';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerCinemaClueHandlers(io: GameServer, socket: GameSocket, rm: RoomManager) {
  // Player joins Team A or Team B (lobby only; locked once game starts)
  socket.on('cinema-clue:select-team', ({ team }) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'cinema-clue') return;

      const engine = rm.ensureCinemaClueEngine(room.code, io);
      engine.setPlayerTeam(socket.id, team);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host moves a player between Team A and Team B (lobby only)
  socket.on('cinema-clue:move-player', ({ playerId, team }) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'cinema-clue') return;

      const host = room.players.find((p) => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.ensureCinemaClueEngine(room.code, io);
      engine.setPlayerTeam(playerId, team);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host updates mode, clue timer, question count, difficulty, or team names (locked once started)
  socket.on('cinema-clue:update-settings', (settings) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'cinema-clue') return;
      if (room.phase !== 'lobby') return;

      const host = room.players.find((p) => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.ensureCinemaClueEngine(room.code, io);
      engine.updateSettings(settings);

      io.to(room.code).emit('room:updated', rm.publicState(room.code));
      io.to(room.code).emit('cinema-clue:state', engine.getPublicState());
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host starts Cinema Clue Battle
  socket.on('cinema-clue:start-game', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'cinema-clue') return;

      const host = room.players.find((p) => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.ensureCinemaClueEngine(room.code, io);
      engine.startGame();
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Player submits a movie guess (pressing "Guessed")
  socket.on('cinema-clue:submit-guess', ({ guess, sessionId, questionId, clueIndex }) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'cinema-clue') return;

      const engine = rm.getCinemaClueEngine(room.code);
      if (!engine) return;

      const result = engine.submitGuess(socket.id, guess, sessionId, questionId, clueIndex);
      socket.emit('cinema-clue:guess-result', result);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host restarts the match with current teams/settings
  socket.on('cinema-clue:restart-game', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'cinema-clue') return;

      const host = room.players.find((p) => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.getCinemaClueEngine(room.code);
      if (!engine) return;

      engine.restartGame();
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });
}
