import type {
  Room,
  Player,
  LastWordSettings,
  LastWordPublicState,
  LastWordSubmissionEntry,
} from '@chitram/shared';
import { LAST_WORD_BANK, type LastWordQuestion } from './LastWordBank';
import {
  LastWordValidationService,
  normalizeLastWordAnswer,
  type ValidationOutcomeStatus,
} from './LastWordValidationService';
import type { GameServer } from '../socket/index';

const VALID_TURN_DURATIONS: Array<10 | 15 | 20 | 30> = [10, 15, 20, 30];
const VALID_DIFFICULTIES: Array<LastWordSettings['difficulty']> = ['mixed', 'Easy', 'Medium', 'Hard'];
const DEFAULT_REVEAL_DELAY_MS = 2500;
const DEFAULT_TICK_INTERVAL_MS = 1000;
const POINTS_PER_SURVIVAL = 10;
const POINTS_FOR_WINNER = 50;

export interface LastWordFeedbackPayload {
  questionId: string;
  status: ValidationOutcomeStatus;
  message: string;
}

export interface LastWordEngineOptions {
  validationService?: LastWordValidationService;
  revealDelayMs?: number;
  tickIntervalMs?: number;
}

export class LastWordEngine {
  private timerInterval: NodeJS.Timeout | null = null;
  private autoAdvanceTimer: NodeJS.Timeout | null = null;
  private remainingSeconds = 0;

  private sessionId = '';
  private questionId = '';
  private roundNumber = 0;
  private questionPool: LastWordQuestion[] = [];
  private recentlyUsedIds = new Set<string>();
  private currentQuestion: LastWordQuestion | null = null;

  private survivorIds: string[] = [];
  private eliminatedPlayerIds: string[] = [];
  private currentTurnPlayerId: string | null = null;
  private isValidating = false;
  private stopped = false;

  private usedAnswers: string[] = [];
  private usedNormalizedAnswers = new Set<string>();
  private recentSubmissions: LastWordSubmissionEntry[] = [];

  private validationService: LastWordValidationService;
  private revealDelayMs: number;
  private tickIntervalMs: number;

  constructor(
    private room: Room,
    private io: GameServer,
    private settings: LastWordSettings,
    options?: LastWordEngineOptions,
  ) {
    this.settings = {
      turnDurationSeconds: VALID_TURN_DURATIONS.includes(settings.turnDurationSeconds)
        ? settings.turnDurationSeconds
        : 15,
      difficulty: VALID_DIFFICULTIES.includes(settings.difficulty) ? settings.difficulty : 'mixed',
    };
    this.room.lastWordSettings = this.settings;
    this.validationService = options?.validationService ?? new LastWordValidationService();
    this.revealDelayMs = options?.revealDelayMs ?? DEFAULT_REVEAL_DELAY_MS;
    this.tickIntervalMs = options?.tickIntervalMs ?? DEFAULT_TICK_INTERVAL_MS;
  }

  getSettings(): LastWordSettings {
    return { ...this.settings };
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getCurrentQuestion(): LastWordQuestion | null {
    return this.currentQuestion;
  }

  getPublicState(): LastWordPublicState {
    if (!this.room.lastWordState) {
      return {
        sessionId: this.sessionId,
        questionId: this.questionId,
        roundNumber: 0,
        roundPhase: 'active',
        prompt: '',
        category: '',
        difficulty: 'Easy',
        questionType: 'open-ended',
        turnDurationSeconds: this.settings.turnDurationSeconds,
        currentTurnPlayerId: null,
        currentTurnPlayerName: null,
        isValidating: false,
        survivorIds: [],
        eliminatedPlayerIds: [],
        usedAnswers: [],
        recentSubmissions: [],
        eliminatedThisTurn: null,
        lastSafeEvent: null,
        winnerId: null,
        winnerName: null,
      };
    }

    return {
      ...this.room.lastWordState,
      survivorIds: [...this.room.lastWordState.survivorIds],
      eliminatedPlayerIds: [...this.room.lastWordState.eliminatedPlayerIds],
      usedAnswers: [...this.room.lastWordState.usedAnswers],
      recentSubmissions: [...this.room.lastWordState.recentSubmissions],
    };
  }

  updateSettings(patch: Partial<LastWordSettings>) {
    if (this.room.phase !== 'lobby') return;

    const nextDuration =
      patch.turnDurationSeconds !== undefined && VALID_TURN_DURATIONS.includes(patch.turnDurationSeconds)
        ? patch.turnDurationSeconds
        : this.settings.turnDurationSeconds;

    const nextDifficulty =
      patch.difficulty !== undefined && VALID_DIFFICULTIES.includes(patch.difficulty)
        ? patch.difficulty
        : this.settings.difficulty;

    this.settings = {
      turnDurationSeconds: nextDuration,
      difficulty: nextDifficulty,
    };
    this.room.lastWordSettings = this.settings;
  }

  // ─── Game Lifecycle ─────────────────────────────────────────────────────────

  startGame(customQuestions?: LastWordQuestion[]) {
    this.stopTimers();
    this.stopped = false;
    this.isValidating = false;

    const participants = this.room.players.filter((p) => !p.isHost);
    if (participants.length < 2) {
      throw new Error('Need at least 2 players to start Last Word Standing');
    }

    for (const p of this.room.players) {
      p.score = 0;
    }

    this.sessionId = `lw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.room.sessionId = this.sessionId;
    this.roundNumber = 0;
    this.survivorIds = participants.map((p) => p.id);
    this.eliminatedPlayerIds = [];
    this.currentTurnPlayerId = this.survivorIds[0] ?? null;

    if (customQuestions && customQuestions.length > 0) {
      this.questionPool = [...customQuestions];
    } else {
      const filtered =
        this.settings.difficulty === 'mixed'
          ? LAST_WORD_BANK
          : LAST_WORD_BANK.filter((q) => q.difficulty === this.settings.difficulty);
      const source = filtered.length > 0 ? filtered : LAST_WORD_BANK;
      const fresh = source.filter((q) => !this.recentlyUsedIds.has(q.id));
      const base = fresh.length > 0 ? fresh : source;
      if (fresh.length === 0) this.recentlyUsedIds.clear();
      this.questionPool = this.shuffle(base);
    }

    this.room.phase = 'playing';
    this.loadNextQuestion(0);
    this.broadcastRoom();
    this.io.to(this.room.code).emit('game:started', this.getPublicRoom());
  }

  restartGame(customQuestions?: LastWordQuestion[]) {
    this.stopTimers();
    this.startGame(customQuestions);
  }

  private loadNextQuestion(startingTurnIndex: number) {
    this.stopTimers();
    this.isValidating = false;
    this.usedAnswers = [];
    this.usedNormalizedAnswers.clear();
    this.recentSubmissions = [];

    if (this.questionPool.length === 0) {
      const filtered =
        this.settings.difficulty === 'mixed'
          ? LAST_WORD_BANK
          : LAST_WORD_BANK.filter((q) => q.difficulty === this.settings.difficulty);
      this.questionPool = this.shuffle(filtered.length > 0 ? filtered : LAST_WORD_BANK);
    }

    const question = this.questionPool.shift()!;
    this.recentlyUsedIds.add(question.id);
    this.currentQuestion = question;
    this.roundNumber += 1;
    this.questionId = `lwq-${this.roundNumber}-${question.id}-${Date.now()}`;

    const safeIndex =
      this.survivorIds.length > 0 ? startingTurnIndex % this.survivorIds.length : 0;
    this.currentTurnPlayerId = this.survivorIds[safeIndex] ?? null;

    this.room.lastWordState = {
      sessionId: this.sessionId,
      questionId: this.questionId,
      roundNumber: this.roundNumber,
      roundPhase: 'active',
      prompt: question.prompt,
      category: question.category,
      difficulty: question.difficulty,
      questionType: question.questionType,
      turnDurationSeconds: this.settings.turnDurationSeconds,
      currentTurnPlayerId: this.currentTurnPlayerId,
      currentTurnPlayerName: this.getPlayerName(this.currentTurnPlayerId),
      isValidating: false,
      survivorIds: [...this.survivorIds],
      eliminatedPlayerIds: [...this.eliminatedPlayerIds],
      usedAnswers: [],
      recentSubmissions: [],
      eliminatedThisTurn: null,
      lastSafeEvent: null,
      winnerId: null,
      winnerName: null,
    };

    this.broadcastState();
    this.startCountdown(this.settings.turnDurationSeconds, () => {
      this.handleTurnTimeout();
    });
  }

  // ─── Answer Submission & Turn Handling ──────────────────────────────────────

  async submitAnswer(
    socketId: string,
    rawAnswer: string,
    clientSessionId: string,
    clientQuestionId: string,
  ): Promise<LastWordFeedbackPayload> {
    const state = this.room.lastWordState;
    if (
      this.stopped ||
      this.room.phase !== 'playing' ||
      !state ||
      state.roundPhase !== 'active' ||
      !this.currentQuestion
    ) {
      return {
        questionId: clientQuestionId,
        status: 'INVALID',
        message: 'No active question right now.',
      };
    }

    if (clientSessionId !== this.sessionId || clientQuestionId !== this.questionId) {
      return {
        questionId: clientQuestionId,
        status: 'INVALID',
        message: 'That question has already ended.',
      };
    }

    if (this.eliminatedPlayerIds.includes(socketId) || !this.survivorIds.includes(socketId)) {
      return {
        questionId: this.questionId,
        status: 'INVALID',
        message: 'Eliminated players cannot submit answers.',
      };
    }

    if (socketId !== this.currentTurnPlayerId) {
      return {
        questionId: this.questionId,
        status: 'INVALID',
        message: `It's ${state.currentTurnPlayerName ?? 'another player'}'s turn!`,
      };
    }

    if (this.isValidating) {
      return {
        questionId: this.questionId,
        status: 'INVALID',
        message: 'Answer check already in progress…',
      };
    }

    const trimmed = rawAnswer.trim();
    if (!trimmed) {
      return {
        questionId: this.questionId,
        status: 'INVALID',
        message: 'Please type an answer first.',
      };
    }

    // Answers already accepted in this round are guaranteed non-target; reject immediately without calling AI
    const earlyNormalized = normalizeLastWordAnswer(trimmed);
    if (earlyNormalized && this.usedNormalizedAnswers.has(earlyNormalized)) {
      return {
        questionId: this.questionId,
        status: 'INVALID',
        message: 'That answer was already used this round! Try another word.',
      };
    }

    // Pause turn countdown while validating (especially async AI validation)
    const activeQuestion = this.currentQuestion;
    const activeQuestionId = this.questionId;
    const activeSessionId = this.sessionId;

    this.stopTimerInterval();
    const pausedRemaining = Math.max(1, this.remainingSeconds);
    this.isValidating = true;
    state.isValidating = true;
    this.broadcastState();

    try {
      // Run validation first so Stage 1 (secret target) always takes highest precedence
      // before checking whether an answer was already safely used.
      const result = await this.validationService.validateAnswer(activeQuestion, trimmed);

      // Re-verify session/question validity after async await
      if (
        this.stopped ||
        this.room.phase !== 'playing' ||
        this.room.lastWordState !== state ||
        state.roundPhase !== 'active' ||
        this.sessionId !== activeSessionId ||
        this.questionId !== activeQuestionId ||
        this.currentTurnPlayerId !== socketId
      ) {
        return {
          questionId: activeQuestionId,
          status: 'INVALID',
          message: 'Round state changed while checking your answer.',
        };
      }

      this.isValidating = false;
      state.isValidating = false;

      if (result.status === 'TARGET_HIT') {
        this.eliminatePlayer(socketId, 'target-hit', trimmed);
        return {
          questionId: activeQuestionId,
          status: 'TARGET_HIT',
          message: result.message,
        };
      }

      // If non-target answer was already accepted in this question, reject gently so player can try another word
      const normalized = normalizeLastWordAnswer(trimmed);
      if (this.usedNormalizedAnswers.has(normalized)) {
        this.broadcastState();
        this.resumeCountdown(pausedRemaining, () => this.handleTurnTimeout());
        return {
          questionId: activeQuestionId,
          status: 'INVALID',
          message: 'That answer was already used this round! Try another word.',
        };
      }

      if (result.status === 'VALID') {
        const player = this.room.players.find((p) => p.id === socketId);
        const playerName = player?.name ?? 'Player';
        if (player) {
          player.score += POINTS_PER_SURVIVAL;
        }

        this.usedNormalizedAnswers.add(normalized);
        this.usedAnswers.push(trimmed);
        this.recentSubmissions.push({
          playerId: socketId,
          playerName,
          answer: trimmed,
          outcome: 'survived',
        });

        const currentIdx = this.survivorIds.indexOf(socketId);
        const nextIdx = (currentIdx + 1) % this.survivorIds.length;
        const nextPlayerId = this.survivorIds[nextIdx] ?? null;
        this.currentTurnPlayerId = nextPlayerId;

        state.usedAnswers = [...this.usedAnswers];
        state.recentSubmissions = [...this.recentSubmissions];
        state.lastSafeEvent = { playerName, answer: trimmed };
        state.currentTurnPlayerId = nextPlayerId;
        state.currentTurnPlayerName = this.getPlayerName(nextPlayerId);

        this.broadcastState();
        this.broadcastRoom();
        this.startCountdown(this.settings.turnDurationSeconds, () => {
          this.handleTurnTimeout();
        });

        return {
          questionId: activeQuestionId,
          status: 'VALID',
          message: result.message,
        };
      }

      // INVALID, UNCERTAIN, or API_ERROR -> do NOT eliminate; restore remaining timer for retry
      this.broadcastState();
      this.resumeCountdown(pausedRemaining, () => this.handleTurnTimeout());
      return {
        questionId: activeQuestionId,
        status: result.status,
        message: result.message,
      };
    } catch {
      if (this.room.lastWordState === state) {
        this.isValidating = false;
        state.isValidating = false;
        this.broadcastState();
        if (!this.stopped && this.room.phase === 'playing' && state.roundPhase === 'active') {
          this.resumeCountdown(pausedRemaining, () => this.handleTurnTimeout());
        }
      }
      return {
        questionId: activeQuestionId,
        status: 'API_ERROR',
        message: 'Answer verification is temporarily unavailable. Please try again.',
      };
    }
  }

  private handleTurnTimeout() {
    const state = this.room.lastWordState;
    if (
      this.stopped ||
      this.isValidating ||
      this.room.phase !== 'playing' ||
      !state ||
      state.roundPhase !== 'active' ||
      !this.currentTurnPlayerId
    ) {
      return;
    }

    this.eliminatePlayer(this.currentTurnPlayerId, 'timeout');
  }

  private eliminatePlayer(
    playerId: string,
    reason: 'target-hit' | 'timeout',
    submittedAnswer?: string,
  ) {
    this.stopTimers();
    this.isValidating = false;

    const state = this.room.lastWordState;
    if (!state) return;

    const eliminatedIdx = this.survivorIds.indexOf(playerId);
    if (eliminatedIdx === -1) return;

    this.survivorIds.splice(eliminatedIdx, 1);
    if (!this.eliminatedPlayerIds.includes(playerId)) {
      this.eliminatedPlayerIds.push(playerId);
    }

    const playerName = this.getPlayerName(playerId) ?? 'Player';
    this.recentSubmissions.push({
      playerId,
      playerName,
      answer: submittedAnswer ?? '(Timed out)',
      outcome: 'eliminated',
    });

    state.roundPhase = 'eliminated';
    state.isValidating = false;
    state.currentTurnPlayerId = null;
    state.currentTurnPlayerName = null;
    state.survivorIds = [...this.survivorIds];
    state.eliminatedPlayerIds = [...this.eliminatedPlayerIds];
    state.recentSubmissions = [...this.recentSubmissions];
    state.eliminatedThisTurn = {
      playerId,
      playerName,
      reason,
      submittedAnswer,
      revealedTarget: this.currentQuestion?.secretTarget,
    };

    this.broadcastState();

    this.autoAdvanceTimer = setTimeout(() => {
      if (this.stopped || this.room.phase !== 'playing') return;
      if (this.survivorIds.length <= 1) {
        this.endGame(this.survivorIds[0] ?? null);
      } else {
        this.loadNextQuestion(eliminatedIdx);
      }
    }, this.revealDelayMs);
  }

  private endGame(winnerId: string | null) {
    this.stopTimers();
    this.isValidating = false;
    this.room.phase = 'game-end';

    if (winnerId) {
      const winner = this.room.players.find((p) => p.id === winnerId);
      if (winner) {
        winner.score += POINTS_FOR_WINNER;
      }
    }

    const winnerName = this.getPlayerName(winnerId);

    if (this.room.lastWordState) {
      this.room.lastWordState.roundPhase = 'game-end';
      this.room.lastWordState.isValidating = false;
      this.room.lastWordState.currentTurnPlayerId = null;
      this.room.lastWordState.currentTurnPlayerName = null;
      this.room.lastWordState.winnerId = winnerId;
      this.room.lastWordState.winnerName = winnerName;
    }

    const leaderboard = [...this.room.players]
      .filter((p) => !p.isHost)
      .sort((a, b) => b.score - a.score);

    this.broadcastState();
    this.io.to(this.room.code).emit('game:end', { leaderboard });
    this.broadcastRoom();
  }

  // ─── Reconnection & Cleanup ─────────────────────────────────────────────────

  handlePlayerReconnect(oldSocketId: string, newSocketId: string, _player: Player) {
    this.survivorIds = this.survivorIds.map((id) => (id === oldSocketId ? newSocketId : id));
    this.eliminatedPlayerIds = this.eliminatedPlayerIds.map((id) =>
      id === oldSocketId ? newSocketId : id,
    );
    if (this.currentTurnPlayerId === oldSocketId) {
      this.currentTurnPlayerId = newSocketId;
    }
    this.recentSubmissions = this.recentSubmissions.map((entry) =>
      entry.playerId === oldSocketId ? { ...entry, playerId: newSocketId } : entry,
    );

    if (this.room.lastWordState) {
      this.room.lastWordState.survivorIds = [...this.survivorIds];
      this.room.lastWordState.eliminatedPlayerIds = [...this.eliminatedPlayerIds];
      if (this.room.lastWordState.currentTurnPlayerId === oldSocketId) {
        this.room.lastWordState.currentTurnPlayerId = newSocketId;
        this.room.lastWordState.currentTurnPlayerName = this.getPlayerName(newSocketId);
      }
      if (this.room.lastWordState.winnerId === oldSocketId) {
        this.room.lastWordState.winnerId = newSocketId;
      }
      if (this.room.lastWordState.eliminatedThisTurn?.playerId === oldSocketId) {
        this.room.lastWordState.eliminatedThisTurn.playerId = newSocketId;
      }
      this.room.lastWordState.recentSubmissions = [...this.recentSubmissions];
    }

    this.io.to(newSocketId).emit('last-word:state', this.getPublicState());
    this.io.to(newSocketId).emit('timer:tick', { remaining: this.remainingSeconds });
  }

  stop() {
    this.stopped = true;
    this.stopTimers();
  }

  destroy() {
    this.stop();
  }

  // ─── Internal Helpers ───────────────────────────────────────────────────────

  private getPlayerName(playerId: string | null): string | null {
    if (!playerId) return null;
    return this.room.players.find((p) => p.id === playerId)?.name ?? null;
  }

  private broadcastState() {
    if (!this.room.lastWordState) return;
    this.io.to(this.room.code).emit('last-word:state', this.getPublicState());
  }

  private getPublicRoom() {
    const { currentWord: _cw, ...pub } = this.room;
    return pub;
  }

  private broadcastRoom() {
    this.io.to(this.room.code).emit('room:updated', this.getPublicRoom());
  }

  private startCountdown(durationSeconds: number, onComplete: () => void) {
    this.resumeCountdown(durationSeconds, onComplete);
  }

  private resumeCountdown(seconds: number, onComplete: () => void) {
    this.stopTimerInterval();
    this.remainingSeconds = seconds;
    this.io.to(this.room.code).emit('timer:tick', { remaining: this.remainingSeconds });

    this.timerInterval = setInterval(() => {
      if (this.stopped || this.isValidating) return;
      this.remainingSeconds -= 1;
      this.io
        .to(this.room.code)
        .emit('timer:tick', { remaining: Math.max(0, this.remainingSeconds) });

      if (this.remainingSeconds <= 0) {
        this.stopTimerInterval();
        onComplete();
      }
    }, this.tickIntervalMs);
  }

  private stopTimerInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private stopAutoAdvanceTimer() {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }

  private stopTimers() {
    this.stopTimerInterval();
    this.stopAutoAdvanceTimer();
  }

  private shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
