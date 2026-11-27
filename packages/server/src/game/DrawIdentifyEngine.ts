import type {
  Room,
  Player,
  DrawIdentifySettings,
  DrawIdentifyPublicState,
  DrawIdentifyPhase,
  DrawIdentifyObjectItem,
  SubmittedDrawing,
} from '@chitram/shared';
import { getRandomObjects } from './DrawIdentifyBank';
import type { GameServer } from '../socket/index';

export const MIN_DRAWING_SECONDS = 5;
export const MAX_DRAWING_SECONDS = 60;
export const DEFAULT_DRAWING_SECONDS = 15;

export const MIN_IDENTIFY_SECONDS = 30;
export const MAX_IDENTIFY_SECONDS = 180;
export const DEFAULT_IDENTIFY_SECONDS = 60;

export function clampDrawingDuration(seconds?: number): number {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    return DEFAULT_DRAWING_SECONDS;
  }
  return Math.max(MIN_DRAWING_SECONDS, Math.min(MAX_DRAWING_SECONDS, Math.round(seconds)));
}

export function clampIdentifyDuration(seconds?: number): number {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    return DEFAULT_IDENTIFY_SECONDS;
  }
  return Math.max(MIN_IDENTIFY_SECONDS, Math.min(MAX_IDENTIFY_SECONDS, Math.round(seconds)));
}

export class DrawIdentifyEngine {
  private room: Room;
  private io: GameServer;
  private settings: DrawIdentifySettings;

  private roundId: string = '';
  private currentRound: number = 0;
  private roundPhase: DrawIdentifyPhase = 'drawing';
  private currentDrawerId: string = '';
  private drawerRotationQueue: string[] = [];

  private drawings: (SubmittedDrawing | null)[] = [];
  private objectList: DrawIdentifyObjectItem[] = [];
  private usedObjectIds = new Set<string>();
  private roundScore: number = 0;

  private timerRemaining: number = 0;
  private timerInterval: NodeJS.Timeout | null = null;

  constructor(room: Room, io: GameServer, initialSettings?: Partial<DrawIdentifySettings>) {
    this.room = room;
    this.io = io;
    this.settings = {
      objectCount: 12,
      language: 'english',
      ...initialSettings,
      drawingDurationSeconds: clampDrawingDuration(initialSettings?.drawingDurationSeconds),
      identificationDurationSeconds: clampIdentifyDuration(initialSettings?.identificationDurationSeconds),
    };

    this.room.drawIdentifySettings = this.settings;
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  updateSettings(patch: Partial<DrawIdentifySettings>) {
    // Lock settings once the game has started
    if (this.room.phase !== 'lobby') {
      return;
    }

    const nextDrawingDuration =
      patch.drawingDurationSeconds !== undefined
        ? clampDrawingDuration(patch.drawingDurationSeconds)
        : clampDrawingDuration(this.settings.drawingDurationSeconds);

    const nextIdentifyDuration =
      patch.identificationDurationSeconds !== undefined
        ? clampIdentifyDuration(patch.identificationDurationSeconds)
        : clampIdentifyDuration(this.settings.identificationDurationSeconds);

    this.settings = {
      ...this.settings,
      ...patch,
      drawingDurationSeconds: nextDrawingDuration,
      identificationDurationSeconds: nextIdentifyDuration,
    };
    this.room.drawIdentifySettings = this.settings;
    this.broadcastState();
  }

  getSettings(): DrawIdentifySettings {
    return { ...this.settings };
  }

  getRoundId(): string {
    return this.roundId;
  }

  getPublicState(): DrawIdentifyPublicState {
    const drawer = this.room.players.find(p => p.id === this.currentDrawerId);
    const submittedCount = this.drawings.filter(d => d !== null).length;
    const identifiedCount = this.objectList.filter(o => o.isIdentified).length;

    return {
      roundId: this.roundId,
      currentRound: this.currentRound,
      currentDrawerId: this.currentDrawerId,
      currentDrawerName: drawer?.name ?? '—',
      roundPhase: this.roundPhase,
      objectCount: this.settings.objectCount,
      language: this.settings.language,
      drawingDurationSeconds: this.settings.drawingDurationSeconds ?? DEFAULT_DRAWING_SECONDS,
      identificationDurationSeconds: this.settings.identificationDurationSeconds,
      drawings: [...this.drawings],
      submittedCount,
      identifiedCount,
      roundScore: this.roundScore,
      // For general public state (e.g. TV and drawer), object names are masked
      objectList: this.objectList.map(item => ({
        index: item.index,
        name: item.isIdentified ? item.name : `Object ${item.index + 1}`,
        englishName: item.isIdentified ? item.englishName : `Object ${item.index + 1}`,
        malayalamName: item.isIdentified ? item.malayalamName : `വസ്തു ${item.index + 1}`,
        isIdentified: item.isIdentified,
        identifiedByPlayerId: item.identifiedByPlayerId,
        identifiedByPlayerName: item.identifiedByPlayerName,
        identifiedAt: item.identifiedAt,
      })),
    };
  }

  // ─── Start Game / Round ───────────────────────────────────────────────────

  startGame() {
    this.stopTimer();

    // Reset all player scores
    for (const p of this.room.players) {
      p.score = 0;
      p.isDrawing = false;
    }

    // Initialize fair drawer rotation queue with all non-host online players
    const eligiblePlayers = this.room.players.filter(p => !p.isHost && p.isOnline !== false);
    if (eligiblePlayers.length === 0) {
      // Fallback if TV is playing solo or testing
      this.drawerRotationQueue = this.room.players.map(p => p.id);
    } else {
      this.drawerRotationQueue = this.shuffle([...eligiblePlayers.map(p => p.id)]);
    }

    this.currentRound = 0;
    this.room.phase = 'playing';

    console.log(`[DrawIdentifyEngine:${this.room.code}] Started game with ${eligiblePlayers.length} players`);
    this.startRound();
  }

  startRound() {
    this.stopTimer();
    this.currentRound += 1;
    this.roundId = `di_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.roundScore = 0;

    // Pick next drawer from rotation queue (fair rotation)
    if (this.drawerRotationQueue.length === 0) {
      const eligible = this.room.players.filter(p => !p.isHost && p.isOnline !== false);
      this.drawerRotationQueue = this.shuffle(eligible.map(p => p.id));
    }
    this.currentDrawerId = this.drawerRotationQueue.shift() || this.room.players[0].id;

    // Update player flags
    for (const p of this.room.players) {
      p.isDrawing = p.id === this.currentDrawerId;
    }

    // Generate random objects for this round without repeating until pool exhausted
    const rawObjects = getRandomObjects(this.settings.objectCount, this.settings.language, this.usedObjectIds);
    this.objectList = rawObjects.map(obj => ({
      index: obj.index,
      name: obj.name,
      englishName: obj.englishName,
      malayalamName: obj.malayalamName,
      isIdentified: false,
      identifiedByPlayerId: null,
      identifiedByPlayerName: null,
      identifiedAt: null,
      incorrectCount: 0,
      lastIncorrectBy: null,
    }));

    // Initialize empty drawings grid
    this.drawings = new Array(this.settings.objectCount).fill(null);

    this.roundPhase = 'drawing';
    this.room.drawIdentifyState = this.getPublicState();
    this.room.currentDrawerId = this.currentDrawerId;

    const duration = this.settings.drawingDurationSeconds ?? DEFAULT_DRAWING_SECONDS;
    this.timerRemaining = duration;

    console.log(`[DrawIdentifyEngine:${this.room.code}] Starting Round ${this.currentRound}. Drawer: ${this.currentDrawerId}. Timer: ${duration}s`);

    this.broadcastState();
    this.sendSecretListToOpposingPlayers();

    // Start drawing countdown timer
    this.startTimer(duration, () => {
      console.log(`[DrawIdentifyEngine:${this.room.code}] Drawing timer ended. Transitioning to identification phase.`);
      this.startIdentificationPhase();
    });
  }

  // ─── Drawing Phase Submissions ────────────────────────────────────────────

  submitDrawing(playerId: string, payload: { roundId: string; drawingIndex: number; dataUrl: string }): boolean {
    if (this.roundPhase !== 'drawing') {
      console.warn(`[DrawIdentifyEngine:${this.room.code}] Rejected drawing submission: round is not in drawing phase`);
      return false;
    }
    if (payload.roundId && payload.roundId !== this.roundId) {
      console.warn(`[DrawIdentifyEngine:${this.room.code}] Rejected drawing submission: stale roundId ${payload.roundId}`);
      return false;
    }
    if (playerId !== this.currentDrawerId) {
      console.warn(`[DrawIdentifyEngine:${this.room.code}] Rejected drawing submission: player ${playerId} is not current drawer`);
      return false;
    }
    if (payload.drawingIndex < 0 || payload.drawingIndex >= this.settings.objectCount) {
      console.warn(`[DrawIdentifyEngine:${this.room.code}] Rejected drawing submission: invalid index ${payload.drawingIndex}`);
      return false;
    }
    if (this.drawings[payload.drawingIndex] !== null) {
      console.warn(`[DrawIdentifyEngine:${this.room.code}] Rejected drawing submission: index ${payload.drawingIndex} already submitted`);
      return false;
    }

    const drawing: SubmittedDrawing = {
      index: payload.drawingIndex,
      dataUrl: payload.dataUrl,
      submittedAt: Date.now(),
    };

    this.drawings[payload.drawingIndex] = drawing;
    this.room.drawIdentifyState = this.getPublicState();

    // Emit live drawing-added event to TV and players
    this.io.to(this.room.code).emit('draw-identify:drawing-added', drawing);
    this.broadcastState();

    // If all drawings submitted, immediately transition to identification phase
    const submittedCount = this.drawings.filter(d => d !== null).length;
    if (submittedCount >= this.settings.objectCount) {
      console.log(`[DrawIdentifyEngine:${this.room.code}] All ${this.settings.objectCount} drawings submitted! Transitioning to identification.`);
      this.startIdentificationPhase();
    }

    return true;
  }

  // ─── Identification Phase ─────────────────────────────────────────────────

  startIdentificationPhase() {
    this.stopTimer();
    this.roundPhase = 'identification';
    this.room.drawIdentifyState = this.getPublicState();

    const duration = this.settings.identificationDurationSeconds || 60;
    this.timerRemaining = duration;

    console.log(`[DrawIdentifyEngine:${this.room.code}] Identification phase started. Timer: ${duration}s`);
    this.broadcastState();
    this.sendSecretListToOpposingPlayers();

    this.startTimer(duration, () => {
      console.log(`[DrawIdentifyEngine:${this.room.code}] Identification timer ended.`);
      this.endRound();
    });
  }

  tickObject(playerId: string, payload: { roundId: string; objectIndex: number }): boolean {
    if (this.roundPhase !== 'identification') {
      console.warn(`[DrawIdentifyEngine:${this.room.code}] Rejected tick: not in identification phase`);
      return false;
    }
    if (payload.roundId && payload.roundId !== this.roundId) {
      console.warn(`[DrawIdentifyEngine:${this.room.code}] Rejected tick: stale roundId ${payload.roundId}`);
      return false;
    }
    if (playerId === this.currentDrawerId) {
      console.warn(`[DrawIdentifyEngine:${this.room.code}] Rejected tick: drawer is not permitted to tick objects`);
      return false;
    }
    if (payload.objectIndex < 0 || payload.objectIndex >= this.objectList.length) {
      console.warn(`[DrawIdentifyEngine:${this.room.code}] Rejected tick: invalid index ${payload.objectIndex}`);
      return false;
    }

    const item = this.objectList[payload.objectIndex];
    if (item.isIdentified) {
      console.log(`[DrawIdentifyEngine:${this.room.code}] Object ${payload.objectIndex} already identified. Ignoring duplicate tick.`);
      return false;
    }

    const player = this.room.players.find(p => p.id === playerId);
    item.isIdentified = true;
    item.identifiedByPlayerId = playerId;
    item.identifiedByPlayerName = player?.name ?? 'Opposing Player';
    item.identifiedAt = Date.now();

    // Drawer receives 1 point per identified object
    this.roundScore += 1;
    const drawer = this.room.players.find(p => p.id === this.currentDrawerId);
    if (drawer) {
      drawer.score += 1;
    }

    const identifiedCount = this.objectList.filter(o => o.isIdentified).length;
    console.log(`[DrawIdentifyEngine:${this.room.code}] Object ${payload.objectIndex} (${item.name}) ticked by ${player?.name}. Total identified: ${identifiedCount}`);

    // Broadcast instant visual feedback event
    this.io.to(this.room.code).emit('draw-identify:object-ticked', {
      objectIndex: payload.objectIndex,
      identifiedBy: player?.name ?? 'Opposing Player',
      identifiedCount,
    });

    this.broadcastState();
    this.sendSecretListToOpposingPlayers();

    // Check if all objects have been identified
    if (identifiedCount >= this.settings.objectCount) {
      console.log(`[DrawIdentifyEngine:${this.room.code}] All objects identified! Ending round early.`);
      this.endRound();
    }

    return true;
  }

  markIncorrect(playerId: string, payload: { roundId: string; objectIndex: number }): boolean {
    if (this.roundPhase !== 'identification') {
      return false;
    }
    if (payload.roundId && payload.roundId !== this.roundId) {
      return false;
    }
    if (playerId === this.currentDrawerId) {
      return false;
    }
    if (payload.objectIndex < 0 || payload.objectIndex >= this.objectList.length) {
      return false;
    }

    const item = this.objectList[payload.objectIndex];
    // Finalized Correct objects cannot be marked Incorrect
    if (item.isIdentified) {
      return false;
    }

    const player = this.room.players.find(p => p.id === playerId);
    item.incorrectCount = (item.incorrectCount ?? 0) + 1;
    item.lastIncorrectBy = player?.name ?? 'Opposing Player';

    console.log(`[DrawIdentifyEngine:${this.room.code}] Object ${payload.objectIndex} (${item.name}) marked incorrect by ${item.lastIncorrectBy} (x${item.incorrectCount})`);

    this.io.to(this.room.code).emit('draw-identify:object-incorrect', {
      objectIndex: payload.objectIndex,
      markedBy: item.lastIncorrectBy,
      incorrectCount: item.incorrectCount,
    });

    this.broadcastState();
    this.sendSecretListToOpposingPlayers();
    return true;
  }

  // ─── End Round / Finish Game ──────────────────────────────────────────────

  endRound() {
    this.stopTimer();
    this.roundPhase = 'round-end';
    this.room.phase = 'round-end';
    this.room.drawIdentifyState = this.getPublicState();

    console.log(`[DrawIdentifyEngine:${this.room.code}] Round ${this.currentRound} ended. Round Score: ${this.roundScore}`);
    this.broadcastState();
    this.sendSecretListToOpposingPlayers(); // Opposing players still see full list
  }

  nextRound() {
    if (this.roundPhase !== 'round-end') {
      console.warn(`[DrawIdentifyEngine:${this.room.code}] Cannot advance next round while phase is ${this.roundPhase}`);
      return;
    }
    this.startRound();
  }

  finishGame() {
    this.stopTimer();
    this.roundPhase = 'game-end';
    this.room.phase = 'game-end';
    this.room.drawIdentifyState = this.getPublicState();

    console.log(`[DrawIdentifyEngine:${this.room.code}] Game finished. Leaderboard broadcast.`);
    this.broadcastState();
    this.io.to(this.room.code).emit('game:end', {
      leaderboard: [...this.room.players].sort((a, b) => b.score - a.score),
    });
  }

  restartGame() {
    this.startGame();
  }

  forceReset(reason = 'Host force reset the game session') {
    this.stopTimer();
    this.roundPhase = 'drawing';
    this.currentRound = 0;
    this.drawings = [];
    this.objectList = [];
    this.roundScore = 0;
    this.room.phase = 'lobby';
    this.room.drawIdentifyState = undefined;
    this.room.currentDrawerId = null;

    for (const p of this.room.players) {
      p.score = 0;
      p.isDrawing = false;
    }

    console.log(`[DrawIdentifyEngine:${this.room.code}] Force-resetting session. Reason: ${reason}`);
    this.io.to(this.room.code).emit('room:updated', this.room as any);
  }

  stop() {
    this.stopTimer();
  }

  // ─── Timer Helpers ────────────────────────────────────────────────────────

  private startTimer(durationSeconds: number, onComplete: () => void) {
    this.stopTimer();
    this.timerRemaining = durationSeconds;
    this.io.to(this.room.code).emit('timer:tick', { remaining: this.timerRemaining });

    this.timerInterval = setInterval(() => {
      this.timerRemaining -= 1;
      this.io.to(this.room.code).emit('timer:tick', { remaining: this.timerRemaining });

      if (this.timerRemaining <= 0) {
        this.stopTimer();
        onComplete();
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ─── State Broadcasts ─────────────────────────────────────────────────────

  private broadcastState() {
    const pub = this.getPublicState();
    this.room.drawIdentifyState = pub;
    this.io.to(this.room.code).emit('draw-identify:state', pub);
    this.io.to(this.room.code).emit('room:updated', this.room as any);
  }

  /**
   * Strictly delivers the full object list ONLY to opposing players.
   * Drawer and TV NEVER receive the secret names during active round!
   */
  public sendSecretListToOpposingPlayers() {
    for (const p of this.room.players) {
      if (p.id === this.currentDrawerId) {
        // Drawer gets empty list or masked list
        this.io.to(p.id).emit('draw-identify:secret-list', {
          roundId: this.roundId,
          objectList: [],
        });
      } else {
        // Opposing players receive the actual object list
        this.io.to(p.id).emit('draw-identify:secret-list', {
          roundId: this.roundId,
          objectList: this.objectList,
        });
      }
    }
  }

  public handlePlayerReconnect(oldSocketId: string, newSocketId: string, player: Player) {
    console.log(`[DrawIdentifyEngine:${this.room.code}] Player reconnected: ${player.name} (${newSocketId})`);
    if (this.currentDrawerId === oldSocketId) {
      this.currentDrawerId = newSocketId;
    }
    // Update rotation queue
    const qIdx = this.drawerRotationQueue.indexOf(oldSocketId);
    if (qIdx !== -1) {
      this.drawerRotationQueue[qIdx] = newSocketId;
    }
    // Update identifiedByPlayerId in objectList
    for (const item of this.objectList) {
      if (item.identifiedByPlayerId === oldSocketId) {
        item.identifiedByPlayerId = newSocketId;
      }
    }
    // Send state and secret list if opposing player
    this.io.to(newSocketId).emit('draw-identify:state', this.getPublicState());
    if (newSocketId !== this.currentDrawerId) {
      this.io.to(newSocketId).emit('draw-identify:secret-list', {
        roundId: this.roundId,
        objectList: this.objectList,
      });
    }
  }

  private shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
