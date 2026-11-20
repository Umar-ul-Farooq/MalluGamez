import type {
  Room,
  Player,
  CharadesSettings,
  CharadesPublicState,
  MovieReveal,
  SecretMoviePayload,
} from '@chitram/shared';
import type { GameServer } from '../socket/index';
import { MovieSelector, type CharadesMovie } from './CharadesMovieBank';

export class CharadesEngine {
  private timer: NodeJS.Timeout | null = null;
  private remainingSeconds = 0;
  private currentMovie: CharadesMovie | null = null;
  private movieSelector = new MovieSelector();
  private roundResolved = false;

  // Track actor rotation per team so players don't repeat until everyone has acted
  private actedPlayerIdsTeamA = new Set<string>();
  private actedPlayerIdsTeamB = new Set<string>();

  constructor(
    private room: Room,
    private io: GameServer,
    private settings: CharadesSettings,
  ) {
    this.room.charadesSettings = settings;
  }

  getPublicState(): CharadesPublicState {
    const s = this.room.charadesState!;
    return { ...s };
  }

  // ─── Team Management ──────────────────────────────────────────────────────

  setPlayerTeam(playerId: string, team: 'A' | 'B') {
    const player = this.room.players.find(p => p.id === playerId);
    if (!player) return;
    player.team = team;

    const state = this.room.charadesState;
    if (!state) return;

    // Recalculate turns whenever team membership updates
    this.recalculateTurns();

    // If game is already playing:
    if (this.room.phase === 'playing') {
      // 1. If player joined the judging team, deliver the secret movie so they can judge!
      if (team === state.judgingTeam && this.currentMovie && (state.roundPhase === 'actor-ready' || state.roundPhase === 'acting')) {
        const secretPayload: SecretMoviePayload = {
          title: this.currentMovie.title,
          manglish: this.currentMovie.manglish,
          year: this.currentMovie.year,
          difficulty: this.currentMovie.difficulty,
        };
        this.io.to(playerId).emit('charades:secret-movie', secretPayload);
      }

      // 2. If this player was the active actor and switched away, pick a replacement actor
      if (state.currentActorId === playerId && team !== state.actingTeam) {
        this.changeActor();
      }
    }

    this.broadcastState();
  }

  recalculateTurns() {
    const teamAMembers = this.room.players.filter(p => !p.isHost && p.team === 'A');
    const teamBMembers = this.room.players.filter(p => !p.isHost && p.team === 'B');

    const validA = new Set(teamAMembers.map(p => p.id));
    const validB = new Set(teamBMembers.map(p => p.id));

    this.actedPlayerIdsTeamA = new Set([...this.actedPlayerIdsTeamA].filter(id => validA.has(id)));
    this.actedPlayerIdsTeamB = new Set([...this.actedPlayerIdsTeamB].filter(id => validB.has(id)));

    // Reset rotation pool once all available members on a team have acted
    if (this.actedPlayerIdsTeamA.size >= teamAMembers.length) {
      this.actedPlayerIdsTeamA.clear();
    }
    if (this.actedPlayerIdsTeamB.size >= teamBMembers.length) {
      this.actedPlayerIdsTeamB.clear();
    }
  }

  handlePlayerReconnect(oldSocketId: string, newSocketId: string, player: Player) {
    const state = this.room.charadesState;
    if (!state) return;

    // 1. If this player was the active actor, update ID and resend secret movie
    if (state.currentActorId === oldSocketId) {
      state.currentActorId = newSocketId;
      state.currentActorName = player.name;

      if (this.currentMovie) {
        const secretPayload: SecretMoviePayload = {
          title: this.currentMovie.title,
          manglish: this.currentMovie.manglish,
          year: this.currentMovie.year,
          difficulty: this.currentMovie.difficulty,
        };
        this.io.to(newSocketId).emit('charades:secret-movie', secretPayload);
      }
    }

    // 2. If this player is on the judging team, resend secret movie
    if (player.team === state.judgingTeam && this.currentMovie && (state.roundPhase === 'actor-ready' || state.roundPhase === 'acting')) {
      const secretPayload: SecretMoviePayload = {
        title: this.currentMovie.title,
        manglish: this.currentMovie.manglish,
        year: this.currentMovie.year,
        difficulty: this.currentMovie.difficulty,
      };
      this.io.to(newSocketId).emit('charades:secret-movie', secretPayload);
    }

    // 3. Update acted sets with new socket ID
    if (this.actedPlayerIdsTeamA.has(oldSocketId)) {
      this.actedPlayerIdsTeamA.delete(oldSocketId);
      this.actedPlayerIdsTeamA.add(newSocketId);
    }
    if (this.actedPlayerIdsTeamB.has(oldSocketId)) {
      this.actedPlayerIdsTeamB.delete(oldSocketId);
      this.actedPlayerIdsTeamB.add(newSocketId);
    }

    this.recalculateTurns();
    this.broadcastState();
  }

  handlePlayerJoined(_player: Player) {
    this.recalculateTurns();
    this.broadcastState();
  }

  changeActor() {
    const state = this.room.charadesState;
    if (!state || this.room.phase !== 'playing') return;
    if (state.roundPhase !== 'actor-ready' && state.roundPhase !== 'acting') return;

    const actor = this.pickActorForTeam(state.actingTeam);
    state.currentActorId = actor.id;
    state.currentActorName = actor.name;
    state.roundPhase = 'actor-ready';

    if (this.currentMovie) {
      const secretPayload: SecretMoviePayload = {
        title: this.currentMovie.title,
        manglish: this.currentMovie.manglish,
        year: this.currentMovie.year,
        difficulty: this.currentMovie.difficulty,
      };
      this.io.to(actor.id).emit('charades:secret-movie', secretPayload);
    }

    this.broadcastState();
  }

  lockTeams() {
    const teamA = this.room.players.filter(p => !p.isHost && p.team === 'A');
    const teamB = this.room.players.filter(p => !p.isHost && p.team === 'B');

    if (teamA.length < 2 || teamB.length < 2) {
      throw new Error('Each team must have at least 2 players');
    }

    if (!this.room.charadesState) {
      this.initGameState();
    }
    this.room.charadesState!.teamsLocked = true;
  }

  updateSettings(patch: Partial<CharadesSettings>) {
    this.settings = { ...this.settings, ...patch };
    this.room.charadesSettings = this.settings;
    if (this.room.charadesState) {
      this.room.charadesState.teamAName = this.settings.teamAName;
      this.room.charadesState.teamBName = this.settings.teamBName;
      this.room.charadesState.totalRounds = this.settings.totalRoundsPerTeam * 2;
    }
  }

  // ─── Game Initialization ──────────────────────────────────────────────────

  private initGameState() {
    this.room.charadesState = {
      teamAName: this.settings.teamAName,
      teamBName: this.settings.teamBName,
      teamAScore: 0,
      teamBScore: 0,
      actingTeam: 'A',
      judgingTeam: 'B',
      currentActorId: null,
      currentActorName: null,
      roundPhase: 'actor-selection',
      currentRoundNumber: 0,
      totalRounds: this.settings.totalRoundsPerTeam * 2,
      roundsPlayed: { A: 0, B: 0 },
      revealedMovie: null,
      lastRoundResult: null,
      teamsLocked: false,
    };
  }

  startGame() {
    this.lockTeams();
    this.room.phase = 'playing';
    this.movieSelector.reset();
    this.actedPlayerIdsTeamA.clear();
    this.actedPlayerIdsTeamB.clear();

    this.room.charadesState!.teamAScore = 0;
    this.room.charadesState!.teamBScore = 0;
    this.room.charadesState!.roundsPlayed = { A: 0, B: 0 };
    this.room.charadesState!.currentRoundNumber = 0;
    this.room.charadesState!.actingTeam = 'A';
    this.room.charadesState!.judgingTeam = 'B';

    this.startRoundCycle();
  }

  // ─── Round Cycle ──────────────────────────────────────────────────────────

  private startRoundCycle() {
    const state = this.room.charadesState!;
    state.currentRoundNumber += 1;
    this.roundResolved = false;
    this.currentMovie = null;
    state.revealedMovie = null;
    state.lastRoundResult = null;

    // Determine acting team for this round
    // Odd turns (1, 3, 5...) Team A acts; Even turns (2, 4, 6...) Team B acts
    state.actingTeam = (state.currentRoundNumber % 2 === 1) ? 'A' : 'B';
    state.judgingTeam = state.actingTeam === 'A' ? 'B' : 'A';

    // Select actor
    const actor = this.pickActorForTeam(state.actingTeam);
    state.currentActorId = actor.id;
    state.currentActorName = actor.name;
    state.roundPhase = 'actor-ready';

    // Pick secret movie based on difficulty
    const movie = this.movieSelector.selectMovie(this.settings.difficulty);
    this.currentMovie = movie;

    // ⚠️ CRITICAL ROLE-BASED EMISSION:
    // 1. Broadcast the public state to EVERYONE (including TV & teammates).
    // Note: state.revealedMovie is NULL right now!
    this.broadcastState();

    // 2. Secret movie is delivered ONLY to the selected Actor:
    const secretPayload: SecretMoviePayload = {
      title: movie.title,
      manglish: movie.manglish,
      year: movie.year,
      difficulty: movie.difficulty,
    };
    this.io.to(actor.id).emit('charades:secret-movie', secretPayload);

    // 3. Secret movie is delivered ONLY to the Opposing (Judging) Team:
    const opposingMembers = this.room.players.filter(
      p => !p.isHost && p.team === state.judgingTeam
    );
    for (const judge of opposingMembers) {
      this.io.to(judge.id).emit('charades:secret-movie', secretPayload);
    }
  }

  private pickActorForTeam(team: 'A' | 'B'): Player {
    const teamMembers = this.room.players.filter(p => !p.isHost && p.team === team);
    const actedSet = team === 'A' ? this.actedPlayerIdsTeamA : this.actedPlayerIdsTeamB;

    let eligible = teamMembers.filter(p => !actedSet.has(p.id));
    if (eligible.length === 0) {
      actedSet.clear();
      eligible = teamMembers;
    }

    const randomIndex = Math.floor(Math.random() * eligible.length);
    const chosen = eligible[randomIndex];
    actedSet.add(chosen.id);
    return chosen;
  }

  // Called when actor confirms they are ready or host triggers start
  startActing() {
    const state = this.room.charadesState!;
    if (state.roundPhase !== 'actor-ready') return;

    state.roundPhase = 'acting';
    this.remainingSeconds = this.settings.roundDurationSeconds;
    this.broadcastState();
    this.startTimer();
  }

  private startTimer() {
    this.stopTimer();
    this.io.to(this.room.code).emit('timer:tick', { remaining: this.remainingSeconds });

    this.timer = setInterval(() => {
      this.remainingSeconds -= 1;
      this.io.to(this.room.code).emit('timer:tick', { remaining: this.remainingSeconds });

      if (this.remainingSeconds <= 0) {
        this.handleTimeout();
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // ─── Judging & Scoring ────────────────────────────────────────────────────

  handleJudgeAction(socketId: string, isCorrect: boolean) {
    const state = this.room.charadesState!;
    if (state.roundPhase !== 'acting' || this.roundResolved) return;

    // Verify socket belongs to the judging team
    const player = this.room.players.find(p => p.id === socketId);
    if (!player || player.team !== state.judgingTeam) return;

    if (!isCorrect) {
      // Opposing team says incorrect: round continues, audio-visual feedback emitted
      this.io.to(this.room.code).emit('charades:incorrect-feedback');
      return;
    }

    // Correct guess confirmed!
    this.resolveRound('correct');
  }

  private handleTimeout() {
    if (this.roundResolved) return;
    this.resolveRound('timeout');
  }

  private resolveRound(reason: 'correct' | 'timeout') {
    if (this.roundResolved) return;
    this.roundResolved = true;
    this.stopTimer();

    const state = this.room.charadesState!;
    state.roundPhase = 'round-end';

    const points = 2;
    let winningTeam: 'A' | 'B';

    if (reason === 'correct') {
      // Acting team guessed correctly: Acting team +2 points
      winningTeam = state.actingTeam;
    } else {
      // Acting team failed/timed out: Judging team +2 points
      winningTeam = state.judgingTeam;
    }

    if (winningTeam === 'A') {
      state.teamAScore += points;
    } else {
      state.teamBScore += points;
    }

    // Record rounds played
    if (state.actingTeam === 'A') {
      state.roundsPlayed.A += 1;
    } else {
      state.roundsPlayed.B += 1;
    }

    state.lastRoundResult = {
      type: reason,
      pointsAwardedTo: winningTeam,
      points,
    };

    // Now, and ONLY now, reveal the movie to everyone
    const movieReveal: MovieReveal = {
      title: this.currentMovie?.title ?? '—',
      manglish: this.currentMovie?.manglish ?? '',
      year: this.currentMovie?.year,
      difficulty: this.currentMovie?.difficulty ?? 'mixed',
    };
    state.revealedMovie = movieReveal;

    this.broadcastState();

    this.io.to(this.room.code).emit('charades:round-ended', {
      result: reason,
      pointsAwardedTo: winningTeam,
      points,
      movie: movieReveal,
      teamAScore: state.teamAScore,
      teamBScore: state.teamBScore,
    });

    // Check if total rounds completed
    if (state.currentRoundNumber >= state.totalRounds) {
      setTimeout(() => this.endGame(), 4500);
    } else {
      // Auto-advance after 5.5 seconds
      setTimeout(() => {
        if (state.roundPhase === 'round-end') {
          this.startRoundCycle();
        }
      }, 5500);
    }
  }

  // Host manual override/advance
  nextRound() {
    const state = this.room.charadesState!;
    if (state.roundPhase !== 'round-end') return;
    if (state.currentRoundNumber >= state.totalRounds) {
      this.endGame();
    } else {
      this.startRoundCycle();
    }
  }

  adjustScore(team: 'A' | 'B', delta: number) {
    const state = this.room.charadesState!;
    if (team === 'A') {
      state.teamAScore = Math.max(0, state.teamAScore + delta);
    } else {
      state.teamBScore = Math.max(0, state.teamBScore + delta);
    }
    this.broadcastState();
  }

  // ─── Game End ─────────────────────────────────────────────────────────────

  private endGame() {
    this.stopTimer();
    const state = this.room.charadesState!;
    state.roundPhase = 'game-end';
    this.room.phase = 'game-end';
    this.broadcastState();
  }

  restartGame() {
    this.startGame();
  }

  stop() {
    this.stopTimer();
  }

  private broadcastState() {
    const state = this.getPublicState();
    this.io.to(this.room.code).emit('charades:state', state);
  }
}
