import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@chitram/shared';
import type { GameServer } from './index';
import type { RoomManager } from '../game/RoomManager';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

function leaveOtherRooms(socket: GameSocket) {
  for (const r of socket.rooms) {
    if (r !== socket.id) {
      socket.leave(r);
    }
  }
}

export function registerRoomHandlers(io: GameServer, socket: GameSocket, rm: RoomManager) {

  socket.on('room:create', ({ playerName, gameType = 'pictionary', hostToken }) => {
    try {
      // Terminate any previous room still hosted by this socket so stale events never leak
      const existingRoom = rm.getRoomByPlayer(socket.id);
      if (existingRoom) {
        const existingPlayer = existingRoom.players.find(p => p.id === socket.id);
        if (existingPlayer?.isHost) {
          rm.terminateRoom(existingRoom.code, socket.id, io, 'Host started a new game');
        }
      }
      leaveOtherRooms(socket);

      const { room } = rm.createRoom(socket.id, playerName, gameType, hostToken);
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
      if (gameType === 'fastest-finger') {
        rm.ensureFastestFingerEngine(room.code, io);
      }
      if (gameType === 'last-word') {
        rm.ensureLastWordEngine(room.code, io);
      }
      if (room.hostToken) {
        socket.emit('room:host-token', {
          hostToken: room.hostToken,
          roomCode: room.code,
          gameType: room.gameType,
        });
      }
      socket.emit('room:joined', rm.publicState(room.code));
      console.log(`[room] ${playerName} created ${gameType} room ${room.code} with hostToken ${room.hostToken}`);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  socket.on('room:reclaim-host', ({ roomCode, hostToken, gameType }) => {
    try {
      leaveOtherRooms(socket);
      const { room } = rm.reclaimHost(socket.id, roomCode.toUpperCase(), hostToken, gameType);
      socket.join(room.code);
      socket.emit('room:host-token', {
        hostToken,
        roomCode: room.code,
        gameType: room.gameType,
      });
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
      if (room.gameType === 'fastest-finger') {
        const engine = rm.ensureFastestFingerEngine(room.code, io);
        socket.emit('fastest-finger:state', engine.getPublicState());
      }
      if (room.gameType === 'last-word') {
        const engine = rm.ensureLastWordEngine(room.code, io);
        socket.emit('last-word:state', engine.getPublicState());
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
      leaveOtherRooms(socket);
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
        if (room.phase === 'playing') {
          engine.handlePlayerReconnect(socket.id, socket.id, player);
        }
      }
      if (room.gameType === 'fastest-finger') {
        const engine = rm.ensureFastestFingerEngine(room.code, io);
        socket.emit('fastest-finger:state', engine.getPublicState());
      }
      if (room.gameType === 'last-word') {
        const engine = rm.ensureLastWordEngine(room.code, io);
        socket.emit('last-word:state', engine.getPublicState());
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
      if (room) {
        rm.terminateRoom(room.code, socket.id, io, 'TV Host exited the game');
      }
      leaveOtherRooms(socket);
    } catch (err: any) {
      console.error('[room:terminate error]', err);
    }
  });

  socket.on('room:force-reset', (payload?: { roomCode?: string; hostToken?: string }) => {
    try {
      const room = rm.getRoomByPlayer(socket.id);
      if (room) {
        rm.terminateRoom(room.code, socket.id, io, 'Host performed Force Reset');
      } else if (payload?.roomCode) {
        const targetRoom = rm.getRoom(payload.roomCode.toUpperCase());
        if (targetRoom && (!payload.hostToken || targetRoom.hostToken === payload.hostToken)) {
          rm.terminateRoom(targetRoom.code, targetRoom.players.find(p => p.isHost)?.id ?? socket.id, io, 'Host performed Force Reset');
        } else {
          socket.emit('room:reset', { reason: 'Room already cleared' });
        }
      } else {
        socket.emit('room:reset', { reason: 'Session reset' });
      }
      leaveOtherRooms(socket);
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
