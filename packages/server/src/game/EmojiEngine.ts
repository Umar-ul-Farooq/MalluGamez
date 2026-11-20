import type {
  Room,
  Player,
  EmojiSettings,
  EmojiPublicState,
  EmojiPlayerAnswer,
  EmojiRoundPhase,
} from '@chitram/shared';
import {
  EMOJI_MOVIES,
  validateMovieAnswer,
  type EmojiMovieItem,
} from '@chitram/shared';
import type { GameServer } from '../socket/index';

export class EmojiEngine {
  private timer: NodeJS.Timeout | null = null;
  private remainingSeconds = 0;
  private currentMovie: EmojiMovieItem | null = null;
  private questionPool: EmojiMovieItem[] = [];
  private questionStartTimeMs = 0;

  // Round tracking
  private answeredPlayerIds = new Set<string>();
  private correctPlayerIds: string[] = [];
  private roundAnswers: EmojiPlayerAnswer[] = [];
  private currentTurnPlayerIndex = 0;

  constructor(
    private room: Room,
    private io: GameServer,
    private settings: EmojiSettings,
  ) {
    this.room.emojiSettings = settings;
  }

  getPublicState(): EmojiPublicState {
    const s = this.room.emojiState!;
    return { ...s };
  }

  updateSettings(patch: Partial<EmojiSettings>) {
    this.settings = { ...this.settings, ...patch };
    this.room.emojiSettings = this.settings;
    if (this.room.emojiState) {
      this.room.emojiState.totalQuestions = this.settings.totalQuestions;
      this.room.emojiState.mode = this.settings.mode;
    }
  }

  // ─── Game Lifecycle ─────────────────────────────────────────────────────────

  startGame() {
    const nonHostPlayers = this.room.players.filter(p => !p.isHost);
    if (nonHostPlayers.length < 1) {
      throw new Error('At least 1 player is required to start Emoji Movie Challenge');
    }

    this.room.phase = 'playing';

    // Reset scores
    for (const p of this.room.players) {
      p.score = 0;
    }

    // Build question pool
    this.prepareQuestions();
    this.currentTurnPlayerIndex = 0;

    this.initGameState();
    this.startQuestion(0);
  }

  private prepareQuestions() {
    let pool = [...EMOJI_MOVIES];

    // Filter by difficulty if not mixed
    if (this.settings.difficulty !== 'mixed') {
      pool = pool.filter(m => m.difficulty === this.settings.difficulty);
      // Fallback if not enough
      if (pool.length < this.settings.totalQuestions) {
        pool = [...EMOJI_MOVIES];
      }
    }

    // Shuffle pool
    this.questionPool = pool.sort(() => Math.random() - 0.5).slice(0, this.settings.totalQuestions);
  }

  private initGameState() {
    this.room.emojiState = {
      currentQuestionIndex: 0,
      totalQuestions: this.settings.totalQuestions,
      roundPhase: 'question',
      emojis: '',
      category: '',
      difficulty: '',
      revealedHint: null,
      mode: this.settings.mode,
      currentTurnPlayerId: null,
      currentTurnPlayerName: null,
      answeredPlayerIds: [],
      correctPlayerIds: [],
      revealedMovie: null,
      roundAnswers: [],
    };
  }

  startQuestion(index: number) {
    this.stopTimer();

    const nonHostPlayers = this.room.players.filter(p => !p.isHost);
    if (nonHostPlayers.length === 0) {
      this.endGame();
      return;
    }

    if (index >= this.questionPool.length) {
      this.endGame();
      return;
    }

    this.currentMovie = this.questionPool[index];
    this.answeredPlayerIds.clear();
    this.correctPlayerIds = [];
    this.roundAnswers = [];
    this.questionStartTimeMs = Date.now();

    // Turn-based assignment
    let turnPlayerId: string | null = null;
    let turnPlayerName: string | null = null;
    if (this.settings.mode === 'turn') {
      const turnPlayer = nonHostPlayers[this.currentTurnPlayerIndex % nonHostPlayers.length];
      this.currentTurnPlayerIndex++;
      turnPlayerId = turnPlayer.id;
      turnPlayerName = turnPlayer.name;
    }

    this.room.emojiState = {
      currentQuestionIndex: index,
      totalQuestions: this.settings.totalQuestions,
      roundPhase: 'question',
      emojis: this.currentMovie.emojis,
      category: this.currentMovie.category,
      difficulty: this.currentMovie.difficulty,
      revealedHint: null,
      mode: this.settings.mode,
      currentTurnPlayerId: turnPlayerId,
      currentTurnPlayerName: turnPlayerName,
      answeredPlayerIds: [],
      correctPlayerIds: [],
      revealedMovie: null,
      roundAnswers: [],
    };

    this.broadcastState();
    this.io.to(this.room.code).emit('room:updated', this.room);

    // Start timer
    const duration = this.settings.timerSeconds || 30;
    this.startTimer(duration, () => {
      this.revealAnswer();
    });
  }

  // ─── Guess Submission ───────────────────────────────────────────────────────

  submitGuess(playerId: string, rawGuess: string): { isCorrect: boolean; message: string; points?: number } {
    if (!this.currentMovie || !this.room.emojiState || this.room.emojiState.roundPhase !== 'question') {
      return { isCorrect: false, message: 'ചോദ്യം സജീവമല്ല (Question is not active)' };
    }

    const player = this.room.players.find(p => p.id === playerId);
    if (!player || player.isHost) {
      return { isCorrect: false, message: 'Invalid player' };
    }

    // Check if player has already answered correctly this round
    if (this.correctPlayerIds.includes(playerId)) {
      return { isCorrect: true, message: 'താങ്കൾ ഇതിനകം ശരിയുത്തരം നൽകി (Already answered correctly!)' };
    }

    // In turn mode, verify turn
    if (this.settings.mode === 'turn' && this.room.emojiState.currentTurnPlayerId !== playerId) {
      return { isCorrect: false, message: 'ഇപ്പോൾ താങ്കളുടെ ഊഴമല്ല (Not your turn)' };
    }

    const isMatch = validateMovieAnswer(rawGuess, this.currentMovie);
    const timeTakenMs = Date.now() - this.questionStartTimeMs;
    this.answeredPlayerIds.add(playerId);

    if (isMatch) {
      // Calculate score based on speed
      // 1st correct gets 100, 2nd gets 80, 3rd gets 65, 4th gets 50, minimum 40
      const order = this.correctPlayerIds.length;
      let points = Math.max(40, 100 - (order * 20));
      if (this.settings.mode === 'turn') {
        points = 100;
      }

      player.score += points;
      this.correctPlayerIds.push(playerId);

      const answerRecord: EmojiPlayerAnswer = {
        playerId,
        playerName: player.name,
        guess: rawGuess.trim(),
        isCorrect: true,
        timeTakenMs,
        pointsAwarded: points,
      };
      this.roundAnswers.push(answerRecord);

      // Update state
      this.room.emojiState.answeredPlayerIds = Array.from(this.answeredPlayerIds);
      this.room.emojiState.correctPlayerIds = [...this.correctPlayerIds];
      this.room.emojiState.roundAnswers = [...this.roundAnswers];

      this.broadcastState();
      this.io.to(this.room.code).emit('room:updated', this.room);

      // If all non-host players answered correctly, or in turn mode, reveal early
      const nonHostPlayers = this.room.players.filter(p => !p.isHost);
      if (this.correctPlayerIds.length >= nonHostPlayers.length || this.settings.mode === 'turn') {
        this.revealAnswer();
      }

      return {
        isCorrect: true,
        message: `🎉 ശരിയുത്തരം! (${points} points)`,
        points,
      };
    } else {
      // Wrong guess
      return {
        isCorrect: false,
        message: '❌ തെറ്റായ ഉത്തരം! വീണ്ടും ശ്രമിക്കൂ (Try again!)',
      };
    }
  }

  revealHint() {
    if (!this.currentMovie || !this.room.emojiState || this.room.emojiState.roundPhase !== 'question') {
      return;
    }
    this.room.emojiState.revealedHint = this.currentMovie.hint;
    this.broadcastState();
  }

  revealAnswer() {
    this.stopTimer();

    if (!this.currentMovie || !this.room.emojiState) return;

    this.room.emojiState.roundPhase = 'reveal';
    this.room.emojiState.revealedMovie = {
      title: this.currentMovie.title,
      manglish: this.currentMovie.manglish,
      year: this.currentMovie.year,
      hint: this.currentMovie.hint,
    };
    this.room.emojiState.answeredPlayerIds = Array.from(this.answeredPlayerIds);
    this.room.emojiState.correctPlayerIds = [...this.correctPlayerIds];
    this.room.emojiState.roundAnswers = [...this.roundAnswers];

    this.broadcastState();
    this.io.to(this.room.code).emit('room:updated', this.room);
  }

  nextQuestion() {
    if (!this.room.emojiState) return;
    const nextIdx = this.room.emojiState.currentQuestionIndex + 1;
    if (nextIdx < this.settings.totalQuestions) {
      this.startQuestion(nextIdx);
    } else {
      this.endGame();
    }
  }

  endGame() {
    this.stopTimer();
    this.room.phase = 'game-end';

    if (this.room.emojiState) {
      this.room.emojiState.roundPhase = 'game-end';
    }

    const leaderboard = [...this.room.players]
      .filter(p => !p.isHost)
      .sort((a, b) => b.score - a.score);

    this.broadcastState();
    this.io.to(this.room.code).emit('game:end', { leaderboard });
    this.io.to(this.room.code).emit('room:updated', this.room);
  }

  restartGame() {
    this.stopTimer();
    this.startGame();
  }

  // ─── Reconnection & Cleanup ────────────────────────────────────────────────

  handlePlayerReconnect(oldSocketId: string, newSocketId: string, player: Player) {
    if (this.answeredPlayerIds.has(oldSocketId)) {
      this.answeredPlayerIds.delete(oldSocketId);
      this.answeredPlayerIds.add(newSocketId);
    }

    const cIdx = this.correctPlayerIds.indexOf(oldSocketId);
    if (cIdx !== -1) {
      this.correctPlayerIds[cIdx] = newSocketId;
    }

    if (this.room.emojiState?.currentTurnPlayerId === oldSocketId) {
      this.room.emojiState.currentTurnPlayerId = newSocketId;
    }

    this.broadcastState();
  }

  destroy() {
    this.stopTimer();
  }

  // ─── Internal Helpers ───────────────────────────────────────────────────────

  private broadcastState() {
    if (!this.room.emojiState) return;
    this.io.to(this.room.code).emit('emoji:state', this.getPublicState());
  }

  private startTimer(durationSeconds: number, onComplete: () => void) {
    this.stopTimer();
    this.remainingSeconds = durationSeconds;
    this.io.to(this.room.code).emit('timer:tick', { remaining: this.remainingSeconds });

    this.timer = setInterval(() => {
      this.remainingSeconds--;
      this.io.to(this.room.code).emit('timer:tick', { remaining: this.remainingSeconds });

      // Automatically reveal hint when 10 seconds remain
      if (this.remainingSeconds === 10 && this.currentMovie && this.room.emojiState && !this.room.emojiState.revealedHint) {
        this.room.emojiState.revealedHint = this.currentMovie.hint;
        this.broadcastState();
      }

      if (this.remainingSeconds <= 0) {
        this.stopTimer();
        onComplete();
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
