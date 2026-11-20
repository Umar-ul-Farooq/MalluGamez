import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@chitram/shared';
import type { GameServer } from './index';
import type { RoomManager } from '../game/RoomManager';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerRoomHandlers(io: GameServer, socket: GameSocket, rm: RoomManager) {

  socket.on('room:create', ({ playerName }) => {
    try {
      const { room, player } = rm.createRoom(socket.id, playerName);
      socket.join(room.code);
      socket.emit('room:joined', rm.publicState(room.code));
      console.log(`[room] ${playerName} created room ${room.code}`);
    } catch (err: any) {
      socket.emit('room:error', err.message);
    }
  });

  socket.on('room:join', ({ roomCode, playerName }) => {
    try {
      const { room, player } = rm.joinRoom(socket.id, roomCode.toUpperCase(), playerName);
      socket.join(room.code);
      socket.emit('room:joined', rm.publicState(room.code));
      io.to(room.code).emit('room:updated', rm.publicState(room.code));
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
