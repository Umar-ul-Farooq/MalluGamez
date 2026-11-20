import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@chitram/shared';
import type { GameServer } from './index';
import type { RoomManager } from '../game/RoomManager';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerCharadesHandlers(io: GameServer, socket: GameSocket, rm: RoomManager) {

  // Player selects their team (A or B)
  socket.on('charades:select-team', ({ team }) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'charades') return;

      const engine = rm.ensureCharadesEngine(room.code, io);
      if (room.charadesState?.teamsLocked) {
        engine.requestSwitchTeam(socket.id, team);
      } else {
        engine.setPlayerTeam(socket.id, team);
        io.to(room.code).emit('room:updated', rm.publicState(room.code));
      }
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Player requests team switch during active game (requires opposite team approval)
  socket.on('charades:request-switch-team', ({ targetTeam }) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'charades') return;

      const engine = rm.ensureCharadesEngine(room.code, io);
      engine.requestSwitchTeam(socket.id, targetTeam);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Member of opposite team (or host) approves/rejects team switch
  socket.on('charades:respond-switch-team', ({ requestId, approve }) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'charades') return;

      const engine = rm.getCharadesEngine(room.code);
      if (!engine) return;

      engine.respondSwitchTeam(socket.id, requestId, approve);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Requester cancels their team switch request
  socket.on('charades:cancel-switch-team', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'charades') return;

      const engine = rm.getCharadesEngine(room.code);
      if (!engine) return;

      engine.cancelSwitchTeam(socket.id);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host moves a player to a specific team
  socket.on('charades:move-player', ({ playerId, team }) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'charades') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.ensureCharadesEngine(room.code, io);
      engine.setPlayerTeam(playerId, team);

      io.to(room.code).emit('room:updated', rm.publicState(room.code));
      io.to(room.code).emit('charades:state', engine.getPublicState());
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host updates Charades game settings
  socket.on('charades:update-settings', (settings) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'charades') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.ensureCharadesEngine(room.code, io);
      engine.updateSettings(settings);

      io.to(room.code).emit('room:updated', rm.publicState(room.code));
      io.to(room.code).emit('charades:state', engine.getPublicState());
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host locks teams and starts game
  socket.on('charades:lock-teams', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'charades') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.ensureCharadesEngine(room.code, io);
      engine.startGame();

      io.to(room.code).emit('room:updated', rm.publicState(room.code));
      io.to(room.code).emit('charades:state', engine.getPublicState());
      console.log(`[charades] Game started in room ${room.code}`);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Actor signals they have read the secret movie and are ready to act
  socket.on('charades:actor-ready', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'charades') return;

      const engine = rm.getCharadesEngine(room.code);
      if (!engine) return;

      engine.startActing();
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host can also trigger start acting
  socket.on('charades:start-acting', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'charades') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.getCharadesEngine(room.code);
      if (!engine) return;

      engine.startActing();
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Opposing (judging) team clicks CORRECT or INCORRECT
  socket.on('charades:judge-action', ({ isCorrect }) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'charades') return;

      const engine = rm.getCharadesEngine(room.code);
      if (!engine) return;

      engine.handleJudgeAction(socket.id, isCorrect);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host advances to next round or finishes early
  socket.on('charades:next-round', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'charades') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.getCharadesEngine(room.code);
      if (!engine) return;

      engine.nextRound();
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host picks a different actor (if current actor disconnected or needs replacement)
  socket.on('charades:change-actor', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'charades') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.getCharadesEngine(room.code);
      if (!engine) return;

      engine.changeActor();
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host manual score adjustment (+/- 2 or +/- 1)
  socket.on('charades:adjust-score', ({ team, delta }) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'charades') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.getCharadesEngine(room.code);
      if (!engine) return;

      engine.adjustScore(team, delta);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host restarts game with same players and teams
  socket.on('charades:restart-game', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'charades') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.getCharadesEngine(room.code);
      if (!engine) return;

      engine.restartGame();
      io.to(room.code).emit('room:updated', rm.publicState(room.code));
      io.to(room.code).emit('charades:state', engine.getPublicState());
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });
}
