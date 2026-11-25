import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@chitram/shared';
import type { GameServer } from './index';
import type { RoomManager } from '../game/RoomManager';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerDrawIdentifyHandlers(io: GameServer, socket: GameSocket, rm: RoomManager) {

  // Host or lobby player updates game settings (locked once game starts)
  socket.on('draw-identify:update-settings', (settings) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'draw-identify') return;
      if (room.phase !== 'lobby') return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      const engine = rm.ensureDrawIdentifyEngine(room.code, io);
      engine.updateSettings(settings);

      io.to(room.code).emit('room:updated', rm.publicState(room.code));
      io.to(room.code).emit('draw-identify:state', engine.getPublicState());
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host starts the game
  socket.on('draw-identify:start-game', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'draw-identify') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.ensureDrawIdentifyEngine(room.code, io);
      engine.startGame();

      io.to(room.code).emit('room:updated', rm.publicState(room.code));
      io.to(room.code).emit('draw-identify:state', engine.getPublicState());
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Drawer submits a drawing for the next empty cell
  socket.on('draw-identify:submit-drawing', ({ roundId, drawingIndex, dataUrl }) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'draw-identify') return;

      const engine = rm.getDrawIdentifyEngine(room.code);
      if (!engine) return;

      engine.submitDrawing(socket.id, { roundId, drawingIndex, dataUrl });
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Opposing player ticks an object as correctly identified
  socket.on('draw-identify:tick-object', ({ roundId, objectIndex }) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'draw-identify') return;

      const engine = rm.getDrawIdentifyEngine(room.code);
      if (!engine) return;

      engine.tickObject(socket.id, { roundId, objectIndex });
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host advances to next round
  socket.on('draw-identify:next-round', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'draw-identify') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.getDrawIdentifyEngine(room.code);
      if (!engine) return;

      engine.nextRound();
      io.to(room.code).emit('room:updated', rm.publicState(room.code));
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host finishes the game early or after rotations
  socket.on('draw-identify:finish-game', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'draw-identify') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.getDrawIdentifyEngine(room.code);
      if (!engine) return;

      engine.finishGame();
      io.to(room.code).emit('room:updated', rm.publicState(room.code));
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  // Host restarts the game from round 1
  socket.on('draw-identify:restart-game', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room || room.gameType !== 'draw-identify') return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host?.isHost) return;

      const engine = rm.getDrawIdentifyEngine(room.code);
      if (!engine) return;

      engine.restartGame();
      io.to(room.code).emit('room:updated', rm.publicState(room.code));
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });
}
