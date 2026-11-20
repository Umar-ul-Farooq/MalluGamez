import type { Room, Player, RoomSettings, RoomPublicState, GameType, CharadesSettings } from '@chitram/shared';
import type { GameServer } from '../socket/index';
import { GameEngine } from './GameEngine';
import { WordBank } from './WordBank';
import { CharadesEngine } from './CharadesEngine';

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private playerToRoom = new Map<string, string>(); // socketId → roomCode
  private engines = new Map<string, GameEngine>();
  private charadesEngines = new Map<string, CharadesEngine>();

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
    if (room.phase !== 'lobby') throw new Error('Game already in progress');

    const maxPlayers = room.gameType === 'charades' ? 24 : 8;
    if (room.players.length >= maxPlayers) throw new Error('Room is full');

    const player: Player = {
      id: socketId,
      name: playerName.trim(),
      score: 0,
      isHost: false,
      isDrawing: false,
      team: null,
    };

    room.players.push(player);
    this.playerToRoom.set(socketId, code);
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

  // ─── Disconnect ─────────────────────────────────────────────────────────

  handleDisconnect(socketId: string, io: GameServer) {
    const code = this.playerToRoom.get(socketId);
    if (!code) return;

    const room = this.rooms.get(code);
    if (!room) return;

    room.players = room.players.filter(p => p.id !== socketId);
    this.playerToRoom.delete(socketId);

    if (room.players.length === 0) {
      this.rooms.delete(code);
      this.engines.get(code)?.stop();
      this.engines.delete(code);
      this.charadesEngines.get(code)?.stop();
      this.charadesEngines.delete(code);
      return;
    }

    // Transfer host if needed
    if (!room.players.some(p => p.isHost)) {
      room.players[0].isHost = true;
    }

    io.to(code).emit('room:updated', this.publicState(code));
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
