import type {
  Room,
  Player,
  FastestFingerSettings,
  FastestFingerPublicState,
  FastestFingerQuestionItem,
  FastestFingerTimerOption,
} from '@chitram/shared';
import { FASTEST_FINGER_BANK, validateFastestFingerAnswer } from './FastestFingerBank';
import type { GameServer } from '../socket/index';

const VALID_TIMER_OPTIONS: FastestFingerTimerOption[] = [5, 10, 15, 20, 30];
const POINTS_PER_CORRECT = 10;
const REVEAL_DELAY_MS = 3000;

export class FastestFingerEngine {
  private timerInterval: NodeJS.Timeout | null = null;
  private autoAdvanceTimer: NodeJS.Timeout | null = null;
  private remainingSeconds = 0;

  private sessionId = '';
  private questionId = '';
  private questionPool: FastestFingerQuestionItem[] = [];
  private recentlyUsedIds = new Set<string>();
  private currentItem: FastestFingerQuestionItem | null = null;
  private questionResolved = false;

  private correctCounts: Record<string, number> = {};

  constructor(
    private room: Room,
    private io: GameServer,
    private settings: FastestFingerSettings,
  ) {
    this.settings = {
      timerSeconds: VALID_TIMER_OPTIONS.includes(settings.timerSeconds) ? settings.timerSeconds : 15,
      totalQuestions: Math.max(1, Math.min(FASTEST_FINGER_BANK.length, settings.totalQuestions || 20)),
    };
    this.room.fastestFingerSettings = this.settings;
  }

  getSettings(): FastestFingerSettings {
    return { ...this.settings };
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getPublicState(): FastestFingerPublicState {
    if (!this.room.fastestFingerState) {
      return {
        sessionId: this.sessionId,
        questionId: this.questionId,
        currentQuestionIndex: 0,
        totalQuestions: this.settings.totalQuestions,
        roundPhase: 'question',
        imageUrl: '',
        category: '',
        difficulty: 'Easy',
        timerSeconds: this.settings.timerSeconds,
        winnerId: null,
        winnerName: null,
        winningAnswer: null,
        pointsAwarded: 0,
        revealedAnswer: null,
        correctCounts: { ...this.correctCounts },
      };
    }
    return {
      ...this.room.fastestFingerState,
      correctCounts: { ...this.correctCounts },
    };
  }

  updateSettings(patch: Partial<FastestFingerSettings>) {
    if (this.room.phase !== 'lobby') return;

    const nextTimer =
      patch.timerSeconds !== undefined && VALID_TIMER_OPTIONS.includes(patch.timerSeconds)
        ? patch.timerSeconds
        : this.settings.timerSeconds;

    const nextTotal =
      patch.totalQuestions !== undefined
        ? Math.max(1, Math.min(FASTEST_FINGER_BANK.length, Math.round(patch.totalQuestions)))
        : this.settings.totalQuestions;

    this.settings = {
      timerSeconds: nextTimer,
      totalQuestions: nextTotal,
    };
    this.room.fastestFingerSettings = this.settings;
  }

  // ─── Game Lifecycle ─────────────────────────────────────────────────────────

  startGame() {
    this.stopTimers();

    const nonHostPlayers = this.room.players.filter(p => !p.isHost);
    if (nonHostPlayers.length < 1) {
      throw new Error('At least 1 player is required to start Fastest Finger – Picture Rush');
    }

    this.sessionId = `ff_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.room.sessionId = this.sessionId;
    this.room.phase = 'playing';

    // Reset player scores & per-player correct counts
    this.correctCounts = {};
    for (const p of this.room.players) {
      p.score = 0;
      if (!p.isHost) {
        this.correctCounts[p.id] = 0;
      }
    }

    this.prepareQuestions();
    this.startQuestion(0);
  }

  private prepareQuestions() {
    const needed = Math.min(this.settings.totalQuestions, FASTEST_FINGER_BANK.length);

    // Prefer unused pictures first so recently used pictures are not repeated until exhausted
    let unused = FASTEST_FINGER_BANK.filter(item => !this.recentlyUsedIds.has(item.id));
    if (unused.length < needed) {
      // Bank exhausted — reset recently used tracking and fill remaining from reshuffled bank
      this.recentlyUsedIds.clear();
      const alreadyPicked = new Set(unused.map(u => u.id));
      const remainder = this.shuffle(FASTEST_FINGER_BANK.filter(item => !alreadyPicked.has(item.id)));
      this.questionPool = [...this.shuffle(unused), ...remainder].slice(0, needed);
    } else {
      this.questionPool = this.shuffle(unused).slice(0, needed);
    }

    for (const q of this.questionPool) {
      this.recentlyUsedIds.add(q.id);
    }
  }

  private startQuestion(index: number) {
    this.stopTimers();

    if (index >= this.questionPool.length) {
      this.endGame();
      return;
    }

    const item = this.questionPool[index];
    this.currentItem = item;
    this.questionResolved = false;
    this.questionId = `q_${index}_${item.id}_${Math.random().toString(36).substring(2, 6)}`;

    this.room.fastestFingerState = {
      sessionId: this.sessionId,
      questionId: this.questionId,
      currentQuestionIndex: index,
      totalQuestions: this.questionPool.length,
      roundPhase: 'question',
      imageUrl: item.image,
      category: item.category,
      difficulty: item.difficulty,
      timerSeconds: this.settings.timerSeconds,
      winnerId: null,
      winnerName: null,
      winningAnswer: null,
      pointsAwarded: 0,
      revealedAnswer: null,
      correctCounts: { ...this.correctCounts },
    };

    this.broadcastState();
    this.broadcastRoom();

    const activeSessionId = this.sessionId;
    const activeQuestionId = this.questionId;
    this.startCountdown(this.settings.timerSeconds, () => {
      this.handleTimeout(activeSessionId, activeQuestionId);
    });
  }

  // ─── Authoritative Answer Submission ────────────────────────────────────────

  submitGuess(
    playerId: string,
    rawGuess: string,
    clientSessionId?: string,
    clientQuestionId?: string,
  ): { questionId: string; isCorrect: boolean; message: string; points?: number } {
    const state = this.room.fastestFingerState;
    if (!state || !this.currentItem) {
      return { questionId: this.questionId, isCorrect: false, message: 'No active question.' };
    }

    // Reject stale session or question submissions
    if (clientSessionId && clientSessionId !== this.sessionId) {
      return { questionId: this.questionId, isCorrect: false, message: 'Stale game session.' };
    }
    if (clientQuestionId && clientQuestionId !== this.questionId) {
      return { questionId: this.questionId, isCorrect: false, message: 'This picture has already ended.' };
    }

    if (state.roundPhase !== 'question' || this.questionResolved) {
      return { questionId: this.questionId, isCorrect: false, message: 'This picture has already ended.' };
    }

    const player = this.room.players.find(p => p.id === playerId);
    if (!player || player.isHost) {
      return { questionId: this.questionId, isCorrect: false, message: 'Invalid player.' };
    }

    const isMatch = validateFastestFingerAnswer(rawGuess, this.currentItem);
    if (!isMatch) {
      // Incorrect answer: do NOT end the question, do NOT reveal answer, allow immediate retry
      return {
        questionId: this.questionId,
        isCorrect: false,
        message: 'Not quite! Try again!',
      };
    }

    // First valid correct submission wins! Immediately lock submissions for this question.
    this.questionResolved = true;
    this.stopTimers();

    player.score += POINTS_PER_CORRECT;
    this.correctCounts[player.id] = (this.correctCounts[player.id] || 0) + 1;

    state.roundPhase = 'won';
    state.winnerId = player.id;
    state.winnerName = player.name;
    state.winningAnswer = rawGuess.trim();
    state.pointsAwarded = POINTS_PER_CORRECT;
    state.revealedAnswer = this.currentItem.answer;
    state.correctCounts = { ...this.correctCounts };

    this.broadcastState();
    this.broadcastRoom();

    this.scheduleNextQuestion(state.currentQuestionIndex + 1, this.sessionId, this.questionId);

    return {
      questionId: this.questionId,
      isCorrect: true,
      message: `🎉 Correct! +${POINTS_PER_CORRECT} points!`,
      points: POINTS_PER_CORRECT,
    };
  }

  private handleTimeout(expectedSessionId: string, expectedQuestionId: string) {
    if (expectedSessionId !== this.sessionId || expectedQuestionId !== this.questionId) return;
    if (this.questionResolved) return;

    const state = this.room.fastestFingerState;
    if (!state || state.roundPhase !== 'question' || !this.currentItem) return;

    this.questionResolved = true;
    this.stopTimers();

    state.roundPhase = 'skipped';
    state.winnerId = null;
    state.winnerName = null;
    state.winningAnswer = null;
    state.pointsAwarded = 0;
    state.revealedAnswer = this.currentItem.answer;

    this.broadcastState();
    this.broadcastRoom();

    this.scheduleNextQuestion(state.currentQuestionIndex + 1, this.sessionId, this.questionId);
  }

  private scheduleNextQuestion(nextIndex: number, expectedSessionId: string, expectedQuestionId: string) {
    this.stopAutoAdvanceTimer();
    this.autoAdvanceTimer = setTimeout(() => {
      if (expectedSessionId !== this.sessionId || expectedQuestionId !== this.questionId) return;
      if (this.room.phase !== 'playing') return;

      if (nextIndex < this.questionPool.length) {
        this.startQuestion(nextIndex);
      } else {
        this.endGame();
      }
    }, REVEAL_DELAY_MS);
  }

  endGame() {
    this.stopTimers();
    this.room.phase = 'game-end';
    if (this.room.fastestFingerState) {
      this.room.fastestFingerState.roundPhase = 'game-end';
      this.room.fastestFingerState.correctCounts = { ...this.correctCounts };
    }

    const leaderboard = [...this.room.players]
      .filter(p => !p.isHost)
      .sort((a, b) => b.score - a.score);

    this.broadcastState();
    this.io.to(this.room.code).emit('game:end', { leaderboard });
    this.broadcastRoom();
  }

  restartGame() {
    this.stopTimers();
    this.startGame();
  }

  // ─── Reconnection & Cleanup ─────────────────────────────────────────────────

  handlePlayerReconnect(oldSocketId: string, newSocketId: string, _player: Player) {
    if (oldSocketId in this.correctCounts) {
      this.correctCounts[newSocketId] = this.correctCounts[oldSocketId];
      delete this.correctCounts[oldSocketId];
    } else if (!(_player.isHost)) {
      this.correctCounts[newSocketId] = this.correctCounts[newSocketId] ?? 0;
    }

    if (this.room.fastestFingerState) {
      if (this.room.fastestFingerState.winnerId === oldSocketId) {
        this.room.fastestFingerState.winnerId = newSocketId;
      }
      this.room.fastestFingerState.correctCounts = { ...this.correctCounts };
    }

    this.io.to(newSocketId).emit('fastest-finger:state', this.getPublicState());
    this.io.to(newSocketId).emit('timer:tick', { remaining: this.remainingSeconds });
  }

  stop() {
    this.stopTimers();
  }

  destroy() {
    this.stopTimers();
  }

  // ─── Internal Helpers ───────────────────────────────────────────────────────

  private broadcastState() {
    if (!this.room.fastestFingerState) return;
    this.io.to(this.room.code).emit('fastest-finger:state', this.getPublicState());
  }

  private broadcastRoom() {
    const { currentWord: _cw, ...pub } = this.room;
    this.io.to(this.room.code).emit('room:updated', pub);
  }

  private startCountdown(durationSeconds: number, onComplete: () => void) {
    this.stopTimerInterval();
    this.remainingSeconds = durationSeconds;
    this.io.to(this.room.code).emit('timer:tick', { remaining: this.remainingSeconds });

    this.timerInterval = setInterval(() => {
      this.remainingSeconds -= 1;
      this.io.to(this.room.code).emit('timer:tick', { remaining: Math.max(0, this.remainingSeconds) });

      if (this.remainingSeconds <= 0) {
        this.stopTimerInterval();
        onComplete();
      }
    }, 1000);
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
