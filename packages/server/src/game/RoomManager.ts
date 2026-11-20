import type { Room, Player, RoomSettings, RoomPublicState, GameType, CharadesSettings, ImposterSettings } from '@chitram/shared';
import type { GameServer } from '../socket/index';
import { GameEngine } from './GameEngine';
import { WordBank } from './WordBank';
import { CharadesEngine } from './CharadesEngine';
import { ImposterEngine } from './ImposterEngine';

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private playerToRoom = new Map<string, string>(); // socketId → roomCode
  private engines = new Map<string, GameEngine>();
  private charadesEngines = new Map<string, CharadesEngine>();
  private imposterEngines = new Map<string, ImposterEngine>();
  private disconnectTimeouts = new Map<string, NodeJS.Timeout>();

  // ─── Create / Join ──────────────────────────────────────────────────────

  createRoom(socketId: string, playerName: string, gameType: GameType = 'pictionary'): { room: Room; player: Player } {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();

    const player: Player = {
      id: socketId,
      name: playerName.trim(),
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
      currentRound: 0,
      currentDrawerId: null,
      currentWord: null,
    };

    this.rooms.set(code, room);
    this.playerToRoom.set(socketId, code);
    return { room, player };
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

    if (explicitLeave) {
      // Deliberate exit: remove immediately
      room.players = room.players.filter(p => p.id !== socketId);
      this.playerToRoom.delete(socketId);

      if (room.players.length === 0) {
        this.destroyRoom(code);
        return;
      }

      if (!room.players.some(p => p.isHost)) {
        room.players[0].isHost = true;
      }

      io.to(code).emit('room:updated', this.publicState(code));
      return;
    }

    // Unintentional disconnect (e.g. mobile screen locked, sleeping, switching apps):
    player.isOnline = false;
    this.imposterEngines.get(code)?.handlePlayerDisconnect(socketId);
    io.to(code).emit('room:updated', this.publicState(code));

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

        if (!currentRoom.players.some(x => x.isHost)) {
          const firstOnline = currentRoom.players.find(x => x.isOnline);
          if (firstOnline) firstOnline.isHost = true;
        }

        io.to(code).emit('room:updated', this.publicState(code));
      }
    }, 120000); // 2 minutes grace period

    this.disconnectTimeouts.set(timeoutKey, timer);
  }

  destroyRoom(code: string) {
    this.rooms.delete(code);
    this.engines.get(code)?.stop();
    this.engines.delete(code);
    this.charadesEngines.get(code)?.stop();
    this.charadesEngines.delete(code);
    this.imposterEngines.get(code)?.stop();
    this.imposterEngines.delete(code);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

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
