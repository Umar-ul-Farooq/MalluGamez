import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@chitram/shared';
import type { GameServer } from './index';
import type { RoomManager } from '../game/RoomManager';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerRoomHandlers(io: GameServer, socket: GameSocket, rm: RoomManager) {

  socket.on('room:create', ({ playerName, gameType = 'pictionary', hostToken }) => {
    try {
      const { room, player } = rm.createRoom(socket.id, playerName, gameType, hostToken);
      socket.join(room.code);
      if (gameType === 'charades') {
        rm.ensureCharadesEngine(room.code, io);
      }
      if (gameType === 'imposter') {
        rm.ensureImposterEngine(room.code, io);
      }
      if (gameType === 'emoji') {
        rm.ensureEmojiEngine(room.code, io);
      }
      if (gameType === 'draw-identify') {
        rm.ensureDrawIdentifyEngine(room.code, io);
      }
      if (room.hostToken) {
        socket.emit('room:host-token', { hostToken: room.hostToken });
      }
      socket.emit('room:joined', rm.publicState(room.code));
      console.log(`[room] ${playerName} created ${gameType} room ${room.code} with hostToken ${room.hostToken}`);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  socket.on('room:reclaim-host', ({ roomCode, hostToken }) => {
    try {
      const { room, player } = rm.reclaimHost(socket.id, roomCode.toUpperCase(), hostToken);
      socket.join(room.code);
      socket.emit('room:host-token', { hostToken });
      socket.emit('room:joined', rm.publicState(room.code));
      io.to(room.code).emit('room:updated', rm.publicState(room.code));

      if (room.gameType === 'charades') {
        const engine = rm.ensureCharadesEngine(room.code, io);
        socket.emit('charades:state', engine.getPublicState());
      }
      if (room.gameType === 'imposter') {
        const engine = rm.ensureImposterEngine(room.code, io);
        socket.emit('imposter:state', engine.getPublicState());
      }
      if (room.gameType === 'emoji') {
        const engine = rm.ensureEmojiEngine(room.code, io);
        socket.emit('emoji:state', engine.getPublicState());
      }
      if (room.gameType === 'draw-identify') {
        const engine = rm.ensureDrawIdentifyEngine(room.code, io);
        socket.emit('draw-identify:state', engine.getPublicState());
      }
      console.log(`[room] Host socket reclaimed room ${room.code}`);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  socket.on('room:join', (payload: any) => {
    try {
      const roomCode = (payload.roomCode || payload.code || '').trim();
      const playerName = (payload.playerName || payload.name || '').trim();
      if (!roomCode || !playerName) {
        socket.emit('room:error', 'Room code and player name are required');
        return;
      }
      const { room, player } = rm.joinRoom(socket.id, roomCode.toUpperCase(), playerName);
      socket.join(room.code);
      socket.emit('room:joined', rm.publicState(room.code));
      io.to(room.code).emit('room:updated', rm.publicState(room.code));
      if (room.gameType === 'charades') {
        const engine = rm.ensureCharadesEngine(room.code, io);
        socket.emit('charades:state', engine.getPublicState());
      }
      if (room.gameType === 'imposter') {
        const engine = rm.ensureImposterEngine(room.code, io);
        socket.emit('imposter:state', engine.getPublicState());
      }
      if (room.gameType === 'emoji') {
        const engine = rm.ensureEmojiEngine(room.code, io);
        socket.emit('emoji:state', engine.getPublicState());
      }
      if (room.gameType === 'draw-identify') {
        const engine = rm.ensureDrawIdentifyEngine(room.code, io);
        socket.emit('draw-identify:state', engine.getPublicState());
      }
      console.log(`[room] ${playerName} joined room ${room.code}`);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  socket.on('game:settings', (settings) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room) return;
      const player = room.players.find(p => p.id === socket.id);
      if (!player?.isHost) return;
      rm.updateSettings(room.code, settings);
      io.to(room.code).emit('room:updated', rm.publicState(room.code));
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  socket.on('room:leave', () => {
    try {
      rm.handleDisconnect(socket.id, io, true);
    } catch (err: any) {
      console.error(err);
    }
  });

  socket.on('room:terminate', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room) return;
      rm.terminateRoom(room.code, socket.id, io, 'TV Host exited the game');
    } catch (err: any) {
      console.error('[room:terminate error]', err);
    }
  });

  socket.on('room:force-reset', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room) return;
      rm.terminateRoom(room.code, socket.id, io, 'Host performed Force Reset');
    } catch (err: any) {
      console.error('[room:force-reset error]', err);
    }
  });

  socket.on('game:start', () => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (!room) return;
      const player = room.players.find(p => p.id === socket.id);
      if (!player?.isHost) return;
      rm.startGame(room.code, io);
      console.log(`[game] Room ${room.code} game started`);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });
}
