import type {
  Room,
  Player,
  CinemaClueSettings,
  CinemaCluePublicState,
  CinemaClueMode,
  CinemaClueDifficulty,
  CinemaClueGuessedItem,
} from '@chitram/shared';
import {
  CINEMA_CLUE_MOVIES,
  validateCinemaClueAnswer,
  canonicalMovieGuessKey,
  type CinemaClueMovieItem,
} from './CinemaClueBank';
import type { GameServer } from '../socket/index';

const VALID_CLUE_DURATIONS = [10, 15, 20, 25, 30, 35, 40];
const VALID_MODES: CinemaClueMode[] = ['buzz-in', 'alternate-question', 'alternate-clue'];
const VALID_DIFFICULTIES: CinemaClueDifficulty[] = ['mixed', 'easy', 'medium', 'hard'];
const CLUE_POINTS: readonly [10, 7, 5, 3] = [10, 7, 5, 3];
const BUZZ_RESPONSE_WINDOW_SECONDS = 20;
const DEFAULT_REVEAL_DELAY_MS = 3000;
const DEFAULT_TICK_INTERVAL_MS = 1000;

export interface CinemaClueGuessResult {
  questionId: string;
  clueIndex: number;
  isCorrect: boolean;
  isDuplicate?: boolean;
  message: string;
  points?: number;
}

export interface CinemaClueEngineOptions {
  revealDelayMs?: number;
  tickIntervalMs?: number;
  buzzResponseSeconds?: number;
}

export class CinemaClueEngine {
  private timerInterval: NodeJS.Timeout | null = null;
  private autoAdvanceTimer: NodeJS.Timeout | null = null;
  private remainingSeconds = 0;

  private sessionId = '';
  private questionId = '';
  private moviePool: CinemaClueMovieItem[] = [];
  private recentlyUsedIds = new Set<string>();
  private currentQuestionIndex = 0;
  private currentMovie: CinemaClueMovieItem | null = null;
  private currentClueIndex: 0 | 1 | 2 | 3 = 0;

  private teamAScore = 0;
  private teamBScore = 0;
  private teamsLocked = false;
  private activeTeam: 'A' | 'B' | null = null;
  private startingTeamForQuestion: 'A' | 'B' = 'A';
  private buzzResponseWindowActive = false;

  private teamAGuessedThisClue = false;
  private teamBGuessedThisClue = false;
  private guessedMovies: CinemaClueGuessedItem[] = [];
  private guessedCanonicalKeys = new Set<string>();
  private isResolvingClue = false;
  private stopped = false;

  private revealDelayMs: number;
  private tickIntervalMs: number;
  private buzzResponseSeconds: number;

  constructor(
    private room: Room,
    private io: GameServer,
    private settings: CinemaClueSettings,
    options?: CinemaClueEngineOptions,
  ) {
    this.settings = {
      mode: VALID_MODES.includes(settings.mode) ? settings.mode : 'buzz-in',
      clueDurationSeconds: VALID_CLUE_DURATIONS.includes(settings.clueDurationSeconds)
        ? settings.clueDurationSeconds
        : 20,
      totalQuestions: Math.max(2, Math.min(CINEMA_CLUE_MOVIES.length, settings.totalQuestions || 10)),
      difficulty: VALID_DIFFICULTIES.includes(settings.difficulty) ? settings.difficulty : 'mixed',
      teamAName: (settings.teamAName || 'Team A').trim() || 'Team A',
      teamBName: (settings.teamBName || 'Team B').trim() || 'Team B',
    };
    this.room.cinemaClueSettings = this.settings;
    this.revealDelayMs = options?.revealDelayMs ?? DEFAULT_REVEAL_DELAY_MS;
    this.tickIntervalMs = options?.tickIntervalMs ?? DEFAULT_TICK_INTERVAL_MS;
    this.buzzResponseSeconds = options?.buzzResponseSeconds ?? BUZZ_RESPONSE_WINDOW_SECONDS;
  }

  getSettings(): CinemaClueSettings {
    return { ...this.settings };
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getCurrentMovie(): CinemaClueMovieItem | null {
    return this.currentMovie;
  }

  getRemainingSeconds(): number {
    return this.remainingSeconds;
  }

  getPublicState(): CinemaCluePublicState {
    if (!this.room.cinemaClueState) {
      return {
        sessionId: this.sessionId,
        questionId: this.questionId,
        questionNumber: 0,
        totalQuestions: this.settings.totalQuestions,
        mode: this.settings.mode,
        clueDurationSeconds: this.settings.clueDurationSeconds,
        roundPhase: 'question',
        currentClueIndex: 0,
        clues: [],
        potentialPoints: 10,
        teamAName: this.settings.teamAName,
        teamBName: this.settings.teamBName,
        teamAScore: this.teamAScore,
        teamBScore: this.teamBScore,
        teamsLocked: this.teamsLocked,
        activeTeam: null,
        startingTeamForQuestion: 'A',
        buzzResponseWindowActive: false,
        teamAGuessedThisClue: false,
        teamBGuessedThisClue: false,
        guessedMovies: [],
        revealInfo: null,
      };
    }

    return {
      ...this.room.cinemaClueState,
      clues: [...this.room.cinemaClueState.clues],
      guessedMovies: [...this.room.cinemaClueState.guessedMovies],
    };
  }

  // ─── Setup & Teams (Locked once game starts) ────────────────────────────────

  setPlayerTeam(playerId: string, team: 'A' | 'B') {
    if (this.teamsLocked || this.room.phase !== 'lobby') return;
    const player = this.room.players.find((p) => p.id === playerId && !p.isHost);
    if (!player) return;
    player.team = team;
    this.broadcastRoom();
    this.broadcastState();
  }

  updateSettings(patch: Partial<CinemaClueSettings>) {
    if (this.teamsLocked || this.room.phase !== 'lobby') return;

    const nextMode =
      patch.mode !== undefined && VALID_MODES.includes(patch.mode)
        ? patch.mode
        : this.settings.mode;

    const nextDuration =
      patch.clueDurationSeconds !== undefined && VALID_CLUE_DURATIONS.includes(patch.clueDurationSeconds)
        ? patch.clueDurationSeconds
        : this.settings.clueDurationSeconds;

    const nextTotal =
      patch.totalQuestions !== undefined
        ? Math.max(2, Math.min(CINEMA_CLUE_MOVIES.length, Math.round(patch.totalQuestions)))
        : this.settings.totalQuestions;

    const nextDiff =
      patch.difficulty !== undefined && VALID_DIFFICULTIES.includes(patch.difficulty)
        ? patch.difficulty
        : this.settings.difficulty;

    const nextTeamA =
      patch.teamAName !== undefined && patch.teamAName.trim()
        ? patch.teamAName.trim().slice(0, 24)
        : this.settings.teamAName;

    const nextTeamB =
      patch.teamBName !== undefined && patch.teamBName.trim()
        ? patch.teamBName.trim().slice(0, 24)
        : this.settings.teamBName;

    this.settings = {
      mode: nextMode,
      clueDurationSeconds: nextDuration,
      totalQuestions: nextTotal,
      difficulty: nextDiff,
      teamAName: nextTeamA,
      teamBName: nextTeamB,
    };
    this.room.cinemaClueSettings = this.settings;
  }

  // ─── Game Lifecycle ─────────────────────────────────────────────────────────

  startGame(customMovies?: CinemaClueMovieItem[]) {
    this.stopTimers();
    this.stopped = false;
    this.isResolvingClue = false;

    const nonHost = this.room.players.filter((p) => !p.isHost);
    const teamAPlayers = nonHost.filter((p) => p.team === 'A');
    const teamBPlayers = nonHost.filter((p) => p.team === 'B');

    // Single-player teams are fully supported (minimum 1 player per team)
    if (teamAPlayers.length < 1 || teamBPlayers.length < 1) {
      throw new Error('Each team needs at least 1 player to start Cinema Clue Battle');
    }

    this.teamAScore = 0;
    this.teamBScore = 0;
    for (const p of this.room.players) {
      p.score = 0;
    }

    this.teamsLocked = true;
    this.sessionId = `cc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.room.sessionId = this.sessionId;
    this.room.phase = 'playing';

    if (customMovies && customMovies.length > 0) {
      this.moviePool = [...customMovies];
      this.settings = { ...this.settings, totalQuestions: customMovies.length };
      this.room.cinemaClueSettings = this.settings;
    } else {
      const filtered =
        this.settings.difficulty === 'mixed'
          ? CINEMA_CLUE_MOVIES
          : CINEMA_CLUE_MOVIES.filter((m) => m.difficulty === this.settings.difficulty);
      const source = filtered.length >= 2 ? filtered : CINEMA_CLUE_MOVIES;
      const fresh = source.filter((m) => !this.recentlyUsedIds.has(m.id));
      const base = fresh.length >= this.settings.totalQuestions ? fresh : source;
      if (fresh.length < this.settings.totalQuestions) {
        this.recentlyUsedIds.clear();
      }
      this.moviePool = this.shuffle(base).slice(0, this.settings.totalQuestions);
    }

    this.loadQuestion(0);
    this.broadcastRoom();
    this.io.to(this.room.code).emit('game:started', this.getPublicRoom());
  }

  restartGame(customMovies?: CinemaClueMovieItem[]) {
    this.stopTimers();
    this.teamsLocked = false;
    this.startGame(customMovies);
  }

  private loadQuestion(questionIdx: number) {
    this.stopTimers();
    this.isResolvingClue = false;

    if (questionIdx >= this.moviePool.length) {
      this.endGame();
      return;
    }

    this.currentQuestionIndex = questionIdx;
    const movie = this.moviePool[questionIdx];
    this.recentlyUsedIds.add(movie.id);
    this.currentMovie = movie;
    this.questionId = `ccq-${questionIdx + 1}-${movie.id}-${Date.now()}`;

    // Clear previously guessed movies when reaching next question
    this.guessedMovies = [];
    this.guessedCanonicalKeys.clear();

    // Alternating starting team by question index (Q1: A, Q2: B, Q3: A, ...)
    this.startingTeamForQuestion = questionIdx % 2 === 0 ? 'A' : 'B';

    this.loadClue(0);
  }

  private loadClue(clueIdx: 0 | 1 | 2 | 3) {
    if (!this.currentMovie || this.stopped) return;

    this.stopTimers();
    this.isResolvingClue = false;
    this.currentClueIndex = clueIdx;
    this.teamAGuessedThisClue = false;
    this.teamBGuessedThisClue = false;
    this.buzzResponseWindowActive = false;

    if (this.settings.mode === 'buzz-in') {
      this.activeTeam = null; // Open Buzz In for both teams
    } else if (this.settings.mode === 'alternate-question') {
      this.activeTeam = this.startingTeamForQuestion;
    } else {
      // alternate-clue: reverses starting order every clue AND alternates starting order by question
      const firstIsStartingTeam = clueIdx % 2 === 0;
      this.activeTeam = firstIsStartingTeam
        ? this.startingTeamForQuestion
        : this.startingTeamForQuestion === 'A'
          ? 'B'
          : 'A';
    }

    this.room.cinemaClueState = {
      sessionId: this.sessionId,
      questionId: this.questionId,
      questionNumber: this.currentQuestionIndex + 1,
      totalQuestions: this.moviePool.length,
      mode: this.settings.mode,
      clueDurationSeconds: this.settings.clueDurationSeconds,
      roundPhase: 'question',
      currentClueIndex: this.currentClueIndex,
      clues: this.currentMovie.clues.slice(0, this.currentClueIndex + 1),
      potentialPoints: CLUE_POINTS[this.currentClueIndex],
      teamAName: this.settings.teamAName,
      teamBName: this.settings.teamBName,
      teamAScore: this.teamAScore,
      teamBScore: this.teamBScore,
      teamsLocked: this.teamsLocked,
      activeTeam: this.activeTeam,
      startingTeamForQuestion: this.startingTeamForQuestion,
      buzzResponseWindowActive: false,
      teamAGuessedThisClue: false,
      teamBGuessedThisClue: false,
      guessedMovies: [...this.guessedMovies],
      revealInfo: null,
    };

    this.broadcastState();
    this.startCountdown(this.settings.clueDurationSeconds, () => {
      this.advanceClueOrReveal();
    });
  }

  // ─── Guess Submission ───────────────────────────────────────────────────────

  submitGuess(
    socketId: string,
    rawGuess: string,
    clientSessionId: string,
    clientQuestionId: string,
    clientClueIndex: number,
  ): CinemaClueGuessResult {
    const state = this.room.cinemaClueState;
    if (
      this.stopped ||
      this.isResolvingClue ||
      this.room.phase !== 'playing' ||
      !state ||
      state.roundPhase !== 'question' ||
      !this.currentMovie
    ) {
      return {
        questionId: clientQuestionId,
        clueIndex: clientClueIndex,
        isCorrect: false,
        message: 'No active clue right now.',
      };
    }

    if (
      clientSessionId !== this.sessionId ||
      clientQuestionId !== this.questionId ||
      clientClueIndex !== this.currentClueIndex
    ) {
      return {
        questionId: clientQuestionId,
        clueIndex: clientClueIndex,
        isCorrect: false,
        message: 'That clue has already moved on.',
      };
    }

    const player = this.room.players.find((p) => p.id === socketId && !p.isHost);
    if (!player || (player.team !== 'A' && player.team !== 'B')) {
      return {
        questionId: this.questionId,
        clueIndex: this.currentClueIndex,
        isCorrect: false,
        message: 'Join Team A or Team B to submit guesses.',
      };
    }

    const myTeam = player.team;

    // Enforce active team eligibility
    if (this.settings.mode === 'buzz-in') {
      if (this.activeTeam !== null && myTeam !== this.activeTeam) {
        return {
          questionId: this.questionId,
          clueIndex: this.currentClueIndex,
          isCorrect: false,
          message: `Only ${this.getTeamName(this.activeTeam)} can answer during their response window!`,
        };
      }
    } else if (myTeam !== this.activeTeam) {
      return {
        questionId: this.questionId,
        clueIndex: this.currentClueIndex,
        isCorrect: false,
        message: `It's ${this.getTeamName(this.activeTeam)}'s turn!`,
      };
    }

    // One guess per team per clue
    const myTeamAlreadyGuessed = myTeam === 'A' ? this.teamAGuessedThisClue : this.teamBGuessedThisClue;
    if (myTeamAlreadyGuessed) {
      return {
        questionId: this.questionId,
        clueIndex: this.currentClueIndex,
        isCorrect: false,
        message: 'Your team already used its guess for this clue!',
      };
    }

    const trimmed = rawGuess.trim();
    const canonicalKey = canonicalMovieGuessKey(trimmed);
    if (!trimmed || !canonicalKey) {
      return {
        questionId: this.questionId,
        clueIndex: this.currentClueIndex,
        isCorrect: false,
        message: 'Please type a movie title.',
      };
    }

    // Duplicate movie check — MUST NOT consume team's guess
    if (this.guessedCanonicalKeys.has(canonicalKey)) {
      return {
        questionId: this.questionId,
        clueIndex: this.currentClueIndex,
        isCorrect: false,
        isDuplicate: true,
        message: 'That movie was already guessed! Try a different title.',
      };
    }

    // Consume team's single guess for this clue
    this.guessedCanonicalKeys.add(canonicalKey);
    if (myTeam === 'A') this.teamAGuessedThisClue = true;
    else this.teamBGuessedThisClue = true;

    const isCorrect = validateCinemaClueAnswer(trimmed, this.currentMovie);

    this.guessedMovies.push({
      id: `${this.questionId}-${this.guessedMovies.length + 1}`,
      team: myTeam,
      playerName: player.name,
      guess: trimmed,
      isCorrect,
      clueNumber: (this.currentClueIndex + 1) as 1 | 2 | 3 | 4,
    });

    if (isCorrect) {
      // Stop all timers immediately and prevent any concurrent winner
      this.isResolvingClue = true;
      this.stopTimers();

      const pts = CLUE_POINTS[this.currentClueIndex];
      if (myTeam === 'A') {
        this.teamAScore += pts;
      } else {
        this.teamBScore += pts;
      }

      // Team score shared by all its members
      this.syncPlayerScores();

      state.roundPhase = 'reveal';
      state.teamAScore = this.teamAScore;
      state.teamBScore = this.teamBScore;
      state.teamAGuessedThisClue = this.teamAGuessedThisClue;
      state.teamBGuessedThisClue = this.teamBGuessedThisClue;
      state.guessedMovies = [...this.guessedMovies];
      state.activeTeam = null;
      state.buzzResponseWindowActive = false;
      state.revealInfo = {
        title: this.currentMovie.title,
        manglish: this.currentMovie.manglish,
        year: this.currentMovie.year,
        winnerTeam: myTeam,
        winnerName: player.name,
        pointsAwarded: pts,
        solvedAtClue: this.currentClueIndex + 1,
      };

      this.broadcastState();
      this.broadcastRoom();

      this.autoAdvanceTimer = setTimeout(() => {
        if (!this.stopped && this.room.phase === 'playing') {
          this.loadQuestion(this.currentQuestionIndex + 1);
        }
      }, this.revealDelayMs);

      return {
        questionId: this.questionId,
        clueIndex: this.currentClueIndex,
        isCorrect: true,
        points: pts,
        message: `Correct! +${pts} pts for ${this.getTeamName(myTeam)}!`,
      };
    }

    // Incorrect guess handling
    const otherTeam: 'A' | 'B' = myTeam === 'A' ? 'B' : 'A';
    const otherTeamAlreadyGuessed =
      otherTeam === 'A' ? this.teamAGuessedThisClue : this.teamBGuessedThisClue;

    state.teamAGuessedThisClue = this.teamAGuessedThisClue;
    state.teamBGuessedThisClue = this.teamBGuessedThisClue;
    state.guessedMovies = [...this.guessedMovies];

    if (this.settings.mode === 'buzz-in') {
      if (!otherTeamAlreadyGuessed) {
        // Grant opposing team the fixed 20-second response window
        this.activeTeam = otherTeam;
        this.buzzResponseWindowActive = true;
        state.activeTeam = otherTeam;
        state.buzzResponseWindowActive = true;
        this.broadcastState();

        this.startCountdown(this.buzzResponseSeconds, () => {
          this.advanceClueOrReveal();
        });
      } else {
        // Both teams answered incorrectly -> reveal next clue for SAME movie (or reveal movie after Clue 4)
        this.advanceClueOrReveal();
      }
    } else {
      // Alternate Teams (Question Based or Clue Based)
      if (!otherTeamAlreadyGuessed) {
        // Switch turn WITHOUT restarting or resetting the clue countdown
        this.activeTeam = otherTeam;
        state.activeTeam = otherTeam;
        this.broadcastState();
      } else {
        // Both teams used their guesses on this clue -> reveal next clue immediately
        this.advanceClueOrReveal();
      }
    }

    return {
      questionId: this.questionId,
      clueIndex: this.currentClueIndex,
      isCorrect: false,
      message: `Not "${trimmed}"! ${this.getTeamName(myTeam)}'s guess used for Clue ${this.currentClueIndex + 1}.`,
    };
  }

  private advanceClueOrReveal() {
    const state = this.room.cinemaClueState;
    if (this.stopped || this.isResolvingClue || !state || state.roundPhase !== 'question' || !this.currentMovie) {
      return;
    }

    if (this.currentClueIndex < 3) {
      const nextClue = (this.currentClueIndex + 1) as 0 | 1 | 2 | 3;
      this.loadClue(nextClue);
      return;
    }

    // All 4 clues exhausted without a correct guess -> reveal movie and advance to next question
    this.isResolvingClue = true;
    this.stopTimers();

    state.roundPhase = 'reveal';
    state.activeTeam = null;
    state.buzzResponseWindowActive = false;
    state.revealInfo = {
      title: this.currentMovie.title,
      manglish: this.currentMovie.manglish,
      year: this.currentMovie.year,
      winnerTeam: null,
      winnerName: null,
      pointsAwarded: 0,
      solvedAtClue: null,
    };

    this.broadcastState();

    this.autoAdvanceTimer = setTimeout(() => {
      if (!this.stopped && this.room.phase === 'playing') {
        this.loadQuestion(this.currentQuestionIndex + 1);
      }
    }, this.revealDelayMs);
  }

  private endGame() {
    this.stopTimers();
    this.isResolvingClue = false;
    this.room.phase = 'game-end';
    this.syncPlayerScores();

    if (this.room.cinemaClueState) {
      this.room.cinemaClueState.roundPhase = 'game-end';
      this.room.cinemaClueState.activeTeam = null;
      this.room.cinemaClueState.buzzResponseWindowActive = false;
      this.room.cinemaClueState.teamAScore = this.teamAScore;
      this.room.cinemaClueState.teamBScore = this.teamBScore;
    }

    const leaderboard = [...this.room.players]
      .filter((p) => !p.isHost)
      .sort((a, b) => b.score - a.score);

    this.broadcastState();
    this.io.to(this.room.code).emit('game:end', { leaderboard });
    this.broadcastRoom();
  }

  // ─── Reconnection & Cleanup ─────────────────────────────────────────────────

  handlePlayerReconnect(_oldSocketId: string, newSocketId: string, player: Player) {
    // Sync team score cleanly onto reconnecting player
    if (player.team === 'A') player.score = this.teamAScore;
    else if (player.team === 'B') player.score = this.teamBScore;

    this.io.to(newSocketId).emit('cinema-clue:state', this.getPublicState());
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

  private syncPlayerScores() {
    for (const p of this.room.players) {
      if (p.isHost) continue;
      if (p.team === 'A') p.score = this.teamAScore;
      else if (p.team === 'B') p.score = this.teamBScore;
    }
  }

  private getTeamName(team: 'A' | 'B' | null): string {
    if (team === 'A') return this.settings.teamAName;
    if (team === 'B') return this.settings.teamBName;
    return 'Either team';
  }

  private broadcastState() {
    if (!this.room.cinemaClueState) return;
    this.io.to(this.room.code).emit('cinema-clue:state', this.getPublicState());
  }

  private getPublicRoom() {
    const { currentWord: _cw, ...pub } = this.room;
    return pub;
  }

  private broadcastRoom() {
    this.io.to(this.room.code).emit('room:updated', this.getPublicRoom());
  }

  private startCountdown(durationSeconds: number, onComplete: () => void) {
    this.stopTimerInterval();
    this.remainingSeconds = durationSeconds;
    this.io.to(this.room.code).emit('timer:tick', { remaining: this.remainingSeconds });

    this.timerInterval = setInterval(() => {
      if (this.stopped || this.isResolvingClue) return;
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
