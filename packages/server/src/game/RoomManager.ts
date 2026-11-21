import type { Room, Player, RoomSettings, RoomPublicState, GameType, CharadesSettings, ImposterSettings, EmojiSettings } from '@chitram/shared';
import type { GameServer } from '../socket/index';
import { GameEngine } from './GameEngine';
import { WordBank } from './WordBank';
import { CharadesEngine } from './CharadesEngine';
import { ImposterEngine } from './ImposterEngine';
import { EmojiEngine } from './EmojiEngine';

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private playerToRoom = new Map<string, string>(); // socketId → roomCode
  private engines = new Map<string, GameEngine>();
  private charadesEngines = new Map<string, CharadesEngine>();
  private imposterEngines = new Map<string, ImposterEngine>();
  private emojiEngines = new Map<string, EmojiEngine>();
  private disconnectTimeouts = new Map<string, NodeJS.Timeout>();

  // ─── Create / Join ──────────────────────────────────────────────────────

  createRoom(socketId: string, playerName: string, gameType: GameType = 'pictionary', clientHostToken?: string): { room: Room; player: Player } {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();

    const hostToken = clientHostToken || ('ht_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10));

    const safeName = (playerName && playerName.trim()) ? playerName.trim() : 'TV Host';

    const player: Player = {
      id: socketId,
      name: safeName,
      score: 0,
      isHost: true,
      isDrawing: false,
      team: null,
      isOnline: true,
    };

    const room: Room = {
      code,
      gameType,
      phase: 'lobby',
      players: [player],
      hostToken,
      sessionId: null,
      settings: { roundDurationSeconds: 60, totalRounds: 3 },
      charadesSettings: gameType === 'charades' ? {
        roundDurationSeconds: 90,
        totalRoundsPerTeam: 5,
        difficulty: 'mixed',
        actorSelection: 'random',
        teamAName: 'മിന്നൽ മുരളി',
        teamBName: 'പ്രേമം ഗ്യാങ്',
      } : undefined,
      imposterSettings: gameType === 'imposter' ? {
        totalRounds: 5,
        imposterCount: 1,
        difficulty: 'mixed',
        category: 'mixed',
        discussionDurationSeconds: 60,
        votingDurationSeconds: 30,
      } : undefined,
      emojiSettings: gameType === 'emoji' ? {
        mode: 'race',
        totalQuestions: 10,
        difficulty: 'mixed',
        timerSeconds: 30,
      } : undefined,
      currentRound: 0,
      currentDrawerId: null,
      currentWord: null,
    };

    this.rooms.set(code, room);
    this.playerToRoom.set(socketId, code);
    return { room, player };
  }

  reclaimHost(socketId: string, code: string, hostToken: string): { room: Room; player: Player } {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');
    if (!room.hostToken || room.hostToken !== hostToken) {
      throw new Error('Invalid host credentials');
    }

    let hostPlayer = room.players.find(p => p.isHost);
    if (!hostPlayer) {
      hostPlayer = {
        id: socketId,
        name: 'Host',
        score: 0,
        isHost: true,
        isDrawing: false,
        team: null,
        isOnline: true,
      };
      room.players.unshift(hostPlayer);
    } else {
      const oldSocketId = hostPlayer.id;
      this.playerToRoom.delete(oldSocketId);
      hostPlayer.id = socketId;
      hostPlayer.isOnline = true;
    }

    this.playerToRoom.set(socketId, code);

    // Cancel host disconnect timer if any
    const timeoutKey = `${code}:host`;
    if (this.disconnectTimeouts.has(timeoutKey)) {
      clearTimeout(this.disconnectTimeouts.get(timeoutKey));
      this.disconnectTimeouts.delete(timeoutKey);
    }

    // Recover imposter session if abandoned
    const imposterEngine = this.imposterEngines.get(code);
    if (imposterEngine) {
      imposterEngine.recoverFromAbandonment();
    }

    console.log(`[room] TV host successfully reclaimed room ${code}`);
    return { room, player: hostPlayer };
  }

  joinRoom(socketId: string, code: string, playerName: string): { room: Room; player: Player } {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');

    const cleanName = playerName.trim();

    // Check if player with this name was already in the room (reconnecting after screen lock / sleep)
    const existingPlayer = room.players.find(
      p => p.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (existingPlayer) {
      const oldSocketId = existingPlayer.id;
      this.playerToRoom.delete(oldSocketId);
      existingPlayer.id = socketId;
      existingPlayer.isOnline = true;
      this.playerToRoom.set(socketId, code);

      // Cancel disconnect timer for this player
      const timeoutKey = `${code}:${existingPlayer.name.toLowerCase()}`;
      if (this.disconnectTimeouts.has(timeoutKey)) {
        clearTimeout(this.disconnectTimeouts.get(timeoutKey));
        this.disconnectTimeouts.delete(timeoutKey);
      }

      // Notify Charades engine of reconnection
      const charadesEngine = this.charadesEngines.get(code);
      if (charadesEngine) {
        charadesEngine.handlePlayerReconnect(oldSocketId, socketId, existingPlayer);
      }

      // Notify Imposter engine of reconnection
      const imposterEngine = this.imposterEngines.get(code);
      if (imposterEngine) {
        imposterEngine.handlePlayerReconnect(oldSocketId, socketId, existingPlayer);
      }

      // Notify Emoji engine of reconnection
      const emojiEngine = this.emojiEngines.get(code);
      if (emojiEngine) {
        emojiEngine.handlePlayerReconnect(oldSocketId, socketId, existingPlayer);
      }

      return { room, player: existingPlayer };
    }

    // New player joining (even mid-game)
    const maxPlayers = room.gameType === 'charades' ? 24 : room.gameType === 'imposter' ? 12 : 8;
    if (room.players.length >= maxPlayers) throw new Error('Room is full');

    const player: Player = {
      id: socketId,
      name: cleanName,
      score: 0,
      isHost: false,
      isDrawing: false,
      team: null,
      isOnline: true,
    };

    room.players.push(player);
    this.playerToRoom.set(socketId, code);

    const charadesEngine = this.charadesEngines.get(code);
    if (charadesEngine) {
      charadesEngine.handlePlayerJoined(player);
    }

    const imposterEngine = this.imposterEngines.get(code);
    if (imposterEngine) {
      imposterEngine.handlePlayerJoined(player);
    }

    return { room, player };
  }

  // ─── Charades Engine Integration ─────────────────────────────────────────

  getCharadesEngine(code: string): CharadesEngine | undefined {
    return this.charadesEngines.get(code);
  }

  ensureCharadesEngine(code: string, io: GameServer): CharadesEngine {
    let engine = this.charadesEngines.get(code);
    if (!engine) {
      const room = this.rooms.get(code);
      if (!room) throw new Error('Room not found');
      const settings = room.charadesSettings ?? {
        roundDurationSeconds: 90,
        totalRoundsPerTeam: 5,
        difficulty: 'mixed',
        actorSelection: 'random',
        teamAName: 'മിന്നൽ മുരളി',
        teamBName: 'പ്രേമം ഗ്യാങ്',
      };
      engine = new CharadesEngine(room, io, settings);
      this.charadesEngines.set(code, engine);
    }
    return engine;
  }

  // ─── Imposter Engine Integration ─────────────────────────────────────────

  getImposterEngine(code: string): ImposterEngine | undefined {
    return this.imposterEngines.get(code);
  }

  ensureImposterEngine(code: string, io: GameServer): ImposterEngine {
    let engine = this.imposterEngines.get(code);
    if (!engine) {
      const room = this.rooms.get(code);
      if (!room) throw new Error('Room not found');
      const settings = room.imposterSettings ?? {
        totalRounds: 5,
        imposterCount: 1,
        difficulty: 'mixed',
        category: 'mixed',
        discussionDurationSeconds: 60,
        votingDurationSeconds: 30,
      };
      engine = new ImposterEngine(room, io, settings);
      this.imposterEngines.set(code, engine);
    }
    return engine;
  }

  // ─── Emoji Movie Challenge Integration ───────────────────────────────────

  getEmojiEngine(code: string): EmojiEngine | undefined {
    return this.emojiEngines.get(code);
  }

  ensureEmojiEngine(code: string, io: GameServer): EmojiEngine {
    let engine = this.emojiEngines.get(code);
    if (!engine) {
      const room = this.rooms.get(code);
      if (!room) throw new Error('Room not found');
      const settings = room.emojiSettings ?? {
        mode: 'race',
        totalQuestions: 10,
        difficulty: 'mixed',
        timerSeconds: 30,
      };
      engine = new EmojiEngine(room, io, settings);
      this.emojiEngines.set(code, engine);
    }
    return engine;
  }

  // ─── Settings ───────────────────────────────────────────────────────────

  updateSettings(code: string, settings: RoomSettings) {
    const room = this.rooms.get(code);
    if (!room) return;
    room.settings = settings;
  }

  // ─── Game Start ─────────────────────────────────────────────────────────

  startGame(code: string, io: GameServer) {
    const room = this.rooms.get(code);
    if (!room || room.players.length < 2) throw new Error('Need at least 2 players');

    // Reset scores
    room.players.forEach(p => { p.score = 0; p.isDrawing = false; });
    room.currentRound = 0;
    room.phase = 'playing';

    const engine = new GameEngine(room, io, WordBank);
    this.engines.set(code, engine);
    engine.startNextRound();
  }

  // ─── Award Point ────────────────────────────────────────────────────────

  awardPoint(code: string, winnerId: string): number {
    const room = this.rooms.get(code);
    if (!room) return 0;
    const winner = room.players.find(p => p.id === winnerId);
    if (!winner) return 0;
    const points = 100;
    winner.score += points;
    // Drawer gets equal points as the guesser
    const drawer = room.players.find(p => p.isDrawing);
    if (drawer) drawer.score += points;
    return points;
  }

  endRound(code: string) {
    this.engines.get(code)?.endRound();
  }

  // ─── Disconnect & Reconnect ─────────────────────────────────────────────

  handleDisconnect(socketId: string, io: GameServer, explicitLeave = false) {
    const code = this.playerToRoom.get(socketId);
    if (!code) return;

    const room = this.rooms.get(code);
    if (!room) return;

    const player = room.players.find(p => p.id === socketId);
    if (!player) return;

    if (player.isHost) {
      if (explicitLeave) {
        // Host deliberately exited: cleanly terminate room and all active sessions
        console.log(`[room] Host explicitly left room ${code}. Terminating room.`);
        this.terminateRoom(code, socketId, io, 'Host exited the room');
        return;
      }

      // Host unintentional disconnect (refresh, network drop):
      console.log(`[room] Host disconnected from room ${code}. Starting 90s grace period.`);
      player.isOnline = false;
      this.imposterEngines.get(code)?.markAbandoned();
      io?.to(code).emit('room:updated', this.publicState(code));

      const timeoutKey = `${code}:host`;
      if (this.disconnectTimeouts.has(timeoutKey)) {
        clearTimeout(this.disconnectTimeouts.get(timeoutKey));
      }

      const timer = setTimeout(() => {
        this.disconnectTimeouts.delete(timeoutKey);
        const currentRoom = this.rooms.get(code);
        if (!currentRoom) return;

        const hPlayer = currentRoom.players.find(p => p.isHost);
        if (hPlayer && !hPlayer.isOnline) {
          console.log(`[room] Host grace period expired for room ${code}. Terminating room.`);
          this.terminateRoom(code, hPlayer.id, io, 'Host disconnected and grace period expired');
          return;
        }
      }, 90000); // 90 seconds grace period for TV host

      this.disconnectTimeouts.set(timeoutKey, timer);
      return;
    }

    // ── Non-host regular player disconnect ──
    if (explicitLeave) {
      // Deliberate exit: remove immediately
      room.players = room.players.filter(p => p.id !== socketId);
      this.playerToRoom.delete(socketId);

      if (room.players.length === 0 || !room.players.some(x => x.isOnline)) {
        this.destroyRoom(code);
        return;
      }

      io?.to(code).emit('room:updated', this.publicState(code));
      return;
    }

    // Unintentional mobile player disconnect (screen lock, app switch):
    player.isOnline = false;
    this.imposterEngines.get(code)?.handlePlayerDisconnect(socketId);
    io?.to(code).emit('room:updated', this.publicState(code));

    // 2-minute grace period to unlock phone and re-attach
    const timeoutKey = `${code}:${player.name.toLowerCase()}`;
    if (this.disconnectTimeouts.has(timeoutKey)) {
      clearTimeout(this.disconnectTimeouts.get(timeoutKey));
    }

    const timer = setTimeout(() => {
      this.disconnectTimeouts.delete(timeoutKey);
      const currentRoom = this.rooms.get(code);
      if (!currentRoom) return;

      const p = currentRoom.players.find(x => x.name.toLowerCase() === player.name.toLowerCase());
      if (p && !p.isOnline) {
        currentRoom.players = currentRoom.players.filter(x => x !== p);
        this.playerToRoom.delete(p.id);

        if (currentRoom.players.length === 0 || !currentRoom.players.some(x => x.isOnline)) {
          this.destroyRoom(code);
          return;
        }

        io?.to(code).emit('room:updated', currentRoom ? this.publicState(code) : undefined!);
      }
    }, 120000); // 2 minutes grace period

    this.disconnectTimeouts.set(timeoutKey, timer);
  }

  terminateRoom(code: string, requesterSocketId: string, io?: GameServer, reason = 'Room terminated by host'): boolean {
    const room = this.rooms.get(code);
    if (!room) return false;

    const player = room.players.find(p => p.id === requesterSocketId);
    if (player && !player.isHost) {
      console.warn(`[room] Non-host ${requesterSocketId} attempted to terminate room ${code}`);
      return false;
    }

    console.log(`[room] Terminating room ${code} and all active game sessions. Reason: ${reason}`);

    // Invalidate active session ID
    room.sessionId = null;

    // Reset and stop Imposter engine if present
    const imposterEngine = this.imposterEngines.get(code);
    if (imposterEngine) {
      imposterEngine.forceReset(reason);
      imposterEngine.stop();
    }

    // Stop other game engines
    this.engines.get(code)?.stop();
    this.charadesEngines.get(code)?.stop();
    this.emojiEngines.get(code)?.destroy();

    // Cancel all disconnect timers for this room
    for (const [key, timer] of this.disconnectTimeouts.entries()) {
      if (key.startsWith(`${code}:`)) {
        clearTimeout(timer);
        this.disconnectTimeouts.delete(key);
      }
    }

    // Broadcast room:terminated and imposter:session-terminated to all players in the room
    io?.to(code).emit('room:terminated', { reason });
    io?.to(code).emit('imposter:session-terminated', { reason });

    // Remove player mappings
    for (const p of room.players) {
      this.playerToRoom.delete(p.id);
    }
    this.playerToRoom.delete(requesterSocketId);

    // Destroy room entity
    this.destroyRoom(code);

    // Eject sockets from the socket.io room
    try {
      io?.in(code).socketsLeave(code);
    } catch (e) {}

    return true;
  }

  destroyRoom(code: string) {
    this.rooms.delete(code);
    this.engines.get(code)?.stop();
    this.engines.delete(code);
    this.charadesEngines.get(code)?.stop();
    this.charadesEngines.delete(code);
    this.imposterEngines.get(code)?.stop();
    this.imposterEngines.delete(code);
    this.emojiEngines.get(code)?.destroy();
    this.emojiEngines.delete(code);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  getPlayerRoom(socketId: string): string | undefined {
    return this.playerToRoom.get(socketId);
  }

  getRoomByPlayer(socketId: string): Room | undefined {
    const code = this.playerToRoom.get(socketId);
    return code ? this.rooms.get(code) : undefined;
  }

  publicState(code: string): RoomPublicState {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');
    // Strip the secret word before broadcasting
    const { currentWord, ...pub } = room;
    return pub;
  }
}
