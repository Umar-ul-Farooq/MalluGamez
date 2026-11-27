import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@chitram/shared';
import { RoomManager } from '../game/RoomManager';
import { registerRoomHandlers } from './roomHandlers';
import { registerDrawHandlers } from './drawHandlers';
import { registerGuessHandlers } from './guessHandlers';
import { registerCharadesHandlers } from './charadesHandlers';
import { registerImposterHandlers } from './imposterHandlers';
import { registerEmojiHandlers } from './emojiHandlers';
import { registerDrawIdentifyHandlers } from './drawIdentifyHandlers';
import { registerFastestFingerHandlers } from './fastestFingerHandlers';
import { registerLastWordHandlers } from './lastWordHandlers';
import { registerCinemaClueHandlers } from './cinemaClueHandlers';

export type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;

// One shared RoomManager instance for the whole server
const roomManager = new RoomManager();

export function registerSocketHandlers(io: GameServer) {
  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    registerRoomHandlers(io, socket, roomManager);
    registerDrawHandlers(io, socket, roomManager);
    registerGuessHandlers(io, socket, roomManager);
    registerCharadesHandlers(io, socket, roomManager);
    registerImposterHandlers(io, socket, roomManager);
    registerEmojiHandlers(io, socket, roomManager);
    registerDrawIdentifyHandlers(io, socket, roomManager);
    registerFastestFingerHandlers(io, socket, roomManager);
    registerLastWordHandlers(io, socket, roomManager);
    registerCinemaClueHandlers(io, socket, roomManager);

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      roomManager.handleDisconnect(socket.id, io);
    });
  });
}
