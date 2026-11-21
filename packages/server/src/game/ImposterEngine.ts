import type {
  Room,
  Player,
  ImposterSettings,
  ImposterPublicState,
  ImposterSecretPayload,
} from '@chitram/shared';
import type { GameServer } from '../socket/index';
import { ImposterWordSelector, type ImposterWord } from './ImposterWordBank';

export class ImposterEngine {
  private sessionId: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private remainingSeconds = 0;
  private currentWord: ImposterWord | null = null;
  private wordSelector = new ImposterWordSelector();

  // Round state
  private currentImposterIds = new Set<string>();
  private votes = new Map<string, string>(); // voterId -> candidateId
  private tieBreakVotes = new Map<string, string>();
  private isTieBreak = false;
  private roundScored = false;

  constructor(
    private room: Room,
    private io: GameServer,
    private settings: ImposterSettings,
  ) {
    this.room.imposterSettings = settings;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  validateSession(incomingSessionId?: string): boolean {
    if (incomingSessionId) {
      if (!this.sessionId || this.sessionId !== incomingSessionId) {
        console.warn(`[ImposterEngine:${this.room.code}] Stale event rejected. Incoming: ${incomingSessionId}, Active: ${this.sessionId}`);
        return false;
      }
    }
    return true;
  }

  getPublicState(): ImposterPublicState {
    const s = this.room.imposterState!;
    return { ...s, sessionId: this.sessionId };
  }

  updateSettings(patch: Partial<ImposterSettings>) {
    this.settings = { ...this.settings, ...patch };
    this.room.imposterSettings = this.settings;
    if (this.room.imposterState) {
      this.room.imposterState.totalRounds = this.settings.totalRounds;
    }
  }

  // ─── Game Lifecycle ───────────────────────────────────────────────────────

  startGame() {
    this.stopTimer();

    const nonHostPlayers = this.room.players.filter(p => !p.isHost && p.isOnline);
    if (nonHostPlayers.length < 3) {
      throw new Error('At least 3 online players are required to start The Imposter');
    }

    // Generate unique session ID for isolation
    this.sessionId = 'imp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    this.room.sessionId = this.sessionId;
    this.room.phase = 'playing';
    this.wordSelector.reset();

    // Reset scores
    for (const p of this.room.players) {
      p.score = 0;
    }

    this.initGameState();
    console.log(`[ImposterEngine:${this.room.code}] Started fresh session ${this.sessionId} with ${nonHostPlayers.length} online players`);
    this.startRound(1);
  }

  private initGameState() {
    this.room.imposterState = {
      sessionId: this.sessionId,
      isAbandoned: false,
      currentRound: 0,
      totalRounds: this.settings.totalRounds,
      roundPhase: 'role-reveal',
      category: '',
      categoryKey: this.settings.category,
      clueOrder: [],
      currentCluePlayerId: null,
      currentCluePlayerName: null,
      clueTurnIndex: 0,
      votedPlayerIds: [],
      tiedCandidateIds: [],
      eliminatedPlayerId: null,
      eliminatedPlayerName: null,
      eliminatedPlayerWasImposter: false,
      caughtImposterId: null,
      caughtImposterName: null,
      revealedWord: null,
      imposterIds: [],
      roundResult: null,
    };
  }

  private startRound(roundNumber: number) {
    this.stopTimer();
    this.roundScored = false;
    this.isTieBreak = false;
    this.votes.clear();
    this.tieBreakVotes.clear();
    this.currentImposterIds.clear();

    const nonHostPlayers = this.room.players.filter(p => !p.isHost && p.isOnline);
    if (nonHostPlayers.length < 3) {
      console.warn(`[ImposterEngine:${this.room.code}] Fewer than 3 online players (${nonHostPlayers.length}). Ending game.`);
      this.endGame();
      return;
    }

    // 1. Pick secret word
    this.currentWord = this.wordSelector.pickWord(this.settings.category, this.settings.difficulty);

    // 2. Select imposters
    const actualImposterCount = Math.min(this.settings.imposterCount, Math.floor(nonHostPlayers.length / 2));
    const shuffled = [...nonHostPlayers].sort(() => Math.random() - 0.5);
    const imposters = shuffled.slice(0, actualImposterCount);
    for (const imp of imposters) {
      this.currentImposterIds.add(imp.id);
    }

    // 3. Establish clue order (shuffled turn list)
    const clueOrder = [...nonHostPlayers].sort(() => Math.random() - 0.5).map(p => p.id);

    // 4. Update public state
    const state = this.room.imposterState!;
    state.currentRound = roundNumber;
    state.roundPhase = 'role-reveal';
    state.category = this.currentWord.categoryLabel;
    state.categoryKey = this.currentWord.category;
    state.clueOrder = clueOrder;
    state.clueTurnIndex = 0;
    state.currentCluePlayerId = clueOrder[0];
    const firstPlayer = this.room.players.find(p => p.id === clueOrder[0]);
    state.currentCluePlayerName = firstPlayer ? firstPlayer.name : null;
    state.votedPlayerIds = [];
    state.tiedCandidateIds = [];
    state.eliminatedPlayerId = null;
    state.eliminatedPlayerName = null;
    state.eliminatedPlayerWasImposter = false;
    state.caughtImposterId = null;
    state.caughtImposterName = null;
    state.revealedWord = null;
    state.imposterIds = [];
    state.roundResult = null;

    // 5. Deliver private secrets to individual players
    this.deliverSecretsToPlayers();

    this.broadcastState();
    this.broadcastRoom();

    // 6. 5-second countdown on role reveal before automatically advancing to clues
    this.startTimer(6, () => {
      this.startCluePhase();
    });
  }

  private deliverSecretsToPlayers() {
    if (!this.currentWord) return;
    const nonHostPlayers = this.room.players.filter(p => !p.isHost);
    const imposterNames = nonHostPlayers.filter(p => this.currentImposterIds.has(p.id)).map(p => p.name);

    for (const player of nonHostPlayers) {
      const isImposter = this.currentImposterIds.has(player.id);
      const otherImposters = imposterNames.filter(name => name !== player.name);

      const payload: ImposterSecretPayload = {
        isImposter,
        category: this.currentWord.categoryLabel,
        categoryKey: this.currentWord.category,
        otherImposters: otherImposters.length > 0 ? otherImposters : undefined,
        // Secret word is delivered ONLY to non-imposters!
        secretWord: isImposter ? undefined : this.currentWord.word,
        secretManglish: isImposter ? undefined : this.currentWord.manglish,
      };

      this.io.to(player.id).emit('imposter:secret', payload);
    }
  }

  // ─── Phase 1: Clue Giving ─────────────────────────────────────────────────

  startCluePhase() {
    this.stopTimer();
    const state = this.room.imposterState!;
    state.roundPhase = 'clues';
    state.clueTurnIndex = 0;
    state.currentCluePlayerId = state.clueOrder[0];
    const activePlayer = this.room.players.find(p => p.id === state.currentCluePlayerId);
    state.currentCluePlayerName = activePlayer ? activePlayer.name : null;

    this.broadcastState();
  }

  nextClue(callerId: string) {
    const state = this.room.imposterState;
    if (!state || state.roundPhase !== 'clues') return;

    // Only active clue giver or host can advance
    const caller = this.room.players.find(p => p.id === callerId);
    if (!caller) return;
    if (!caller.isHost && callerId !== state.currentCluePlayerId) return;

    state.clueTurnIndex++;

    if (state.clueTurnIndex >= state.clueOrder.length) {
      // All players have given a clue! Advance to discussion
      this.startDiscussionPhase();
      return;
    }

    state.currentCluePlayerId = state.clueOrder[state.clueTurnIndex];
    const activePlayer = this.room.players.find(p => p.id === state.currentCluePlayerId);
    state.currentCluePlayerName = activePlayer ? activePlayer.name : null;

    this.broadcastState();
  }

  // ─── Phase 2: Discussion ──────────────────────────────────────────────────

  startDiscussionPhase() {
    this.stopTimer();
    const state = this.room.imposterState!;
    state.roundPhase = 'discussion';
    state.currentCluePlayerId = null;
    state.currentCluePlayerName = null;

    this.broadcastState();

    const duration = this.settings.discussionDurationSeconds || 60;
    this.startTimer(duration, () => {
      this.startVotingPhase();
    });
  }

  endDiscussion(callerId: string) {
    const caller = this.room.players.find(p => p.id === callerId);
    if (!caller?.isHost) return;

    const state = this.room.imposterState;
    if (state?.roundPhase === 'discussion') {
      this.startVotingPhase();
    }
  }

  // ─── Phase 3: Voting ──────────────────────────────────────────────────────

  startVotingPhase(isTieBreak = false) {
    this.stopTimer();
    const state = this.room.imposterState!;
    this.isTieBreak = isTieBreak;
    state.roundPhase = isTieBreak ? 'tie-break' : 'voting';
    state.votedPlayerIds = [];

    if (!isTieBreak) {
      this.votes.clear();
      state.tiedCandidateIds = [];
    } else {
      this.tieBreakVotes.clear();
    }

    this.broadcastState();

    const duration = this.settings.votingDurationSeconds || 30;
    this.startTimer(duration, () => {
      this.resolveVotes();
    });
  }

  vote(voterId: string, candidateId: string) {
    const state = this.room.imposterState;
    if (!state || (state.roundPhase !== 'voting' && state.roundPhase !== 'tie-break')) return;

    // Voter cannot vote for themselves
    if (voterId === candidateId) return;

    const voter = this.room.players.find(p => p.id === voterId);
    if (!voter || voter.isHost) return;

    const candidate = this.room.players.find(p => p.id === candidateId);
    if (!candidate || candidate.isHost) return;

    // In tie-break phase, candidate must be one of the tied candidates
    if (this.isTieBreak && state.tiedCandidateIds && !state.tiedCandidateIds.includes(candidateId)) {
      return;
    }

    const voteMap = this.isTieBreak ? this.tieBreakVotes : this.votes;
    if (voteMap.has(voterId)) return; // already voted

    voteMap.set(voterId, candidateId);
    state.votedPlayerIds.push(voterId);

    this.io.to(voterId).emit('imposter:vote-registered');
    this.broadcastState();

    // If all eligible non-host players voted, resolve immediately!
    const nonHostCount = this.room.players.filter(p => !p.isHost && p.isOnline !== false).length;
    if (state.votedPlayerIds.length >= nonHostCount) {
      this.resolveVotes();
    }
  }

  private resolveVotes() {
    this.stopTimer();
    const state = this.room.imposterState!;
    const voteMap = this.isTieBreak ? this.tieBreakVotes : this.votes;

    // Tally votes
    const tally: Record<string, number> = {};
    for (const candidateId of voteMap.values()) {
      tally[candidateId] = (tally[candidateId] || 0) + 1;
    }

    // Find candidate(s) with max votes
    let maxVotes = 0;
    let topCandidates: string[] = [];

    for (const [candidateId, count] of Object.entries(tally)) {
      if (count > maxVotes) {
        maxVotes = count;
        topCandidates = [candidateId];
      } else if (count === maxVotes) {
        topCandidates.push(candidateId);
      }
    }

    // Handle no votes cast at all
    if (topCandidates.length === 0) {
      // Imposter escapes!
      this.finishRoundWithoutElimination('No votes cast! The imposter escaped detection.');
      return;
    }

    // Handle Ties
    if (topCandidates.length > 1) {
      if (!this.isTieBreak) {
        // Conduct second vote (tie-break) between tied candidates
        state.tiedCandidateIds = topCandidates;
        this.startVotingPhase(true);
        return;
      } else {
        // Second tie: imposter escapes detection and wins!
        this.finishRoundWithoutElimination('Tie vote! The imposter escaped detection.');
        return;
      }
    }

    // Single candidate eliminated
    const eliminatedId = topCandidates[0];
    const eliminatedPlayer = this.room.players.find(p => p.id === eliminatedId);
    const eliminatedName = eliminatedPlayer ? eliminatedPlayer.name : 'Unknown';
    const isImposter = this.currentImposterIds.has(eliminatedId);

    state.eliminatedPlayerId = eliminatedId;
    state.eliminatedPlayerName = eliminatedName;
    state.eliminatedPlayerWasImposter = isImposter;

    if (!isImposter) {
      // Normal player was eliminated — Imposter team wins!
      this.handleInnocentEliminated(eliminatedName);
    } else {
      // Imposter caught! Immediately end the round — normal players win.
      state.caughtImposterId = eliminatedId;
      state.caughtImposterName = eliminatedName;
      this.handleImposterCaught(eliminatedName);
    }
  }

  // ─── Scoring & Outcomes ───────────────────────────────────────────────────

  private handleImposterCaught(imposterName: string) {
    this.awardRoundPoints('normal', `${imposterName} was the Imposter and was caught!`);
  }

  private handleInnocentEliminated(eliminatedName: string) {
    this.awardRoundPoints('imposter', `${eliminatedName} was innocent! The imposter wins.`);
  }

  private finishRoundWithoutElimination(reason: string) {
    this.awardRoundPoints('imposter', reason);
  }

  private awardRoundPoints(
    winner: 'normal' | 'imposter',
    customReason?: string,
  ) {
    if (this.roundScored) return;
    this.roundScored = true;

    const state = this.room.imposterState!;
    const pointsAwarded: Record<string, number> = {};

    for (const p of this.room.players) {
      if (p.isHost) continue;
      pointsAwarded[p.id] = 0;
    }

    // 1. Team win points
    if (winner === 'normal') {
      // Normal players receive 2 points each
      for (const p of this.room.players) {
        if (!p.isHost && !this.currentImposterIds.has(p.id)) {
          pointsAwarded[p.id] = (pointsAwarded[p.id] || 0) + 2;
        }
      }
    } else {
      // Imposter(s) receive 3 points each
      for (const impId of this.currentImposterIds) {
        pointsAwarded[impId] = (pointsAwarded[impId] || 0) + 3;
      }
    }

    // 2. Voting bonus: each normal player who correctly voted for an imposter gets +1 pt
    const voteMap = this.isTieBreak ? this.tieBreakVotes : this.votes;
    for (const [voterId, candidateId] of voteMap.entries()) {
      if (!this.currentImposterIds.has(voterId) && this.currentImposterIds.has(candidateId)) {
        pointsAwarded[voterId] = (pointsAwarded[voterId] || 0) + 1;
      }
    }

    // Apply points to player entities
    for (const [pid, pts] of Object.entries(pointsAwarded)) {
      const p = this.room.players.find(pl => pl.id === pid);
      if (p) p.score += pts;
    }

    // Set round end results
    state.roundPhase = 'round-end';
    state.revealedWord = this.currentWord ? {
      word: this.currentWord.word,
      manglish: this.currentWord.manglish,
      category: this.currentWord.categoryLabel,
    } : null;
    state.imposterIds = Array.from(this.currentImposterIds);

    const imposterNames = this.room.players
      .filter(p => this.currentImposterIds.has(p.id))
      .map(p => p.name)
      .join(', ');

    const reason = customReason ?? (
      winner === 'normal'
        ? `${imposterNames} was the Imposter and was caught!`
        : `Imposter (${imposterNames}) successfully fooled the players!`
    );

    state.roundResult = {
      winner,
      reason,
      eliminatedPlayerName: state.eliminatedPlayerName || 'None',
      wasImposter: state.eliminatedPlayerWasImposter || false,
      pointsAwarded,
    };

    this.broadcastState();
    this.broadcastRoom();

    // Auto-advance to next round or game-end after 7 seconds (or host clicks Next Round)
    this.startTimer(7, () => {
      this.nextRound();
    });
  }

  // ─── Advancement ──────────────────────────────────────────────────────────

  nextRound() {
    this.stopTimer();
    const state = this.room.imposterState;
    if (!state || state.roundPhase !== 'round-end') return;

    if (state.currentRound >= state.totalRounds) {
      this.endGame();
    } else {
      this.startRound(state.currentRound + 1);
    }
  }

  private endGame() {
    this.stopTimer();
    const state = this.room.imposterState!;
    state.roundPhase = 'game-end';
    this.room.phase = 'game-end';
    this.broadcastState();
    this.broadcastRoom();
  }

  restartGame() {
    this.stopTimer();
    console.log(`[ImposterEngine:${this.room.code}] Restarting game from host...`);
    const onlineNonHost = this.room.players.filter(p => !p.isHost && p.isOnline);
    if (onlineNonHost.length < 3) {
      console.log(`[ImposterEngine:${this.room.code}] Only ${onlineNonHost.length} online players during restart. Resetting to lobby.`);
      this.forceReset('Restart requested, but fewer than 3 players are online. Resetting to lobby.');
      return;
    }
    this.startGame();
  }

  forceReset(reason = 'Host force reset the game session') {
    console.log(`[ImposterEngine:${this.room.code}] Force-resetting session ${this.sessionId}. Reason: ${reason}`);
    this.stopTimer();

    // Invalidate active session
    this.sessionId = null;
    this.room.sessionId = null;
    this.currentWord = null;
    this.currentImposterIds.clear();
    this.votes.clear();
    this.tieBreakVotes.clear();
    this.roundScored = false;
    this.isTieBreak = false;

    // Reset scores
    for (const p of this.room.players) {
      p.score = 0;
    }

    // Reset room phase to lobby
    this.room.phase = 'lobby';

    // Reset imposter state to clean lobby state
    this.initGameState();
    if (this.room.imposterState) {
      this.room.imposterState.sessionId = null;
      this.room.imposterState.currentRound = 0;
      this.room.imposterState.roundPhase = 'role-reveal';
      this.room.imposterState.isAbandoned = false;
    }

    // Notify all clients that session has been reset
    this.io.to(this.room.code).emit('imposter:session-reset');
    // Clear secret payload on all player clients
    this.io.to(this.room.code).emit('imposter:secret', null);

    this.broadcastState();
    this.broadcastRoom();
  }

  markAbandoned() {
    console.log(`[ImposterEngine:${this.room.code}] Host disconnected. Marking session as abandoned.`);
    this.stopTimer();
    if (this.room.imposterState) {
      this.room.imposterState.isAbandoned = true;
      this.broadcastState();
    }
  }

  recoverFromAbandonment() {
    console.log(`[ImposterEngine:${this.room.code}] Host returned. Recovering session.`);
    if (this.room.imposterState) {
      this.room.imposterState.isAbandoned = false;
      this.broadcastState();
    }
  }

  // ─── Reconnection ─────────────────────────────────────────────────────────

  handlePlayerReconnect(oldSocketId: string, newSocketId: string, player: Player) {
    const state = this.room.imposterState;
    if (!state) return;

    // Update clue order array
    const idx = state.clueOrder.indexOf(oldSocketId);
    if (idx !== -1) {
      state.clueOrder[idx] = newSocketId;
    }
    if (state.currentCluePlayerId === oldSocketId) {
      state.currentCluePlayerId = newSocketId;
      state.currentCluePlayerName = player.name;
    }

    // Update imposter set
    if (this.currentImposterIds.has(oldSocketId)) {
      this.currentImposterIds.delete(oldSocketId);
      this.currentImposterIds.add(newSocketId);
    }

    // Update votes
    if (this.votes.has(oldSocketId)) {
      const target = this.votes.get(oldSocketId)!;
      this.votes.delete(oldSocketId);
      this.votes.set(newSocketId, target);
    }
    const vIdx = state.votedPlayerIds.indexOf(oldSocketId);
    if (vIdx !== -1) {
      state.votedPlayerIds[vIdx] = newSocketId;
    }

    // Resend private secret payload ONLY if there is an active session and active round!
    if (
      this.sessionId &&
      this.currentWord &&
      this.room.phase === 'playing' &&
      state.roundPhase !== 'round-end' &&
      state.roundPhase !== 'game-end'
    ) {
      const isImposter = this.currentImposterIds.has(newSocketId);
      const otherImposters = this.room.players
        .filter(p => !p.isHost && p.id !== newSocketId && this.currentImposterIds.has(p.id))
        .map(p => p.name);

      const payload: ImposterSecretPayload = {
        isImposter,
        category: this.currentWord.categoryLabel,
        categoryKey: this.currentWord.category,
        otherImposters: otherImposters.length > 0 ? otherImposters : undefined,
        secretWord: isImposter ? undefined : this.currentWord.word,
        secretManglish: isImposter ? undefined : this.currentWord.manglish,
      };
      this.io.to(newSocketId).emit('imposter:secret', payload);
    } else {
      // Clear secret on client if not in active round
      this.io.to(newSocketId).emit('imposter:secret', null);
    }

    this.broadcastState();
  }

  handlePlayerJoined(_player: Player) {
    this.broadcastState();
  }

  handlePlayerDisconnect(socketId: string) {
    const state = this.room.imposterState;
    if (!state) return;

    // If active clue giver disconnected, auto-advance
    if (state.roundPhase === 'clues' && state.currentCluePlayerId === socketId) {
      state.clueTurnIndex++;
      if (state.clueTurnIndex >= state.clueOrder.length) {
        this.startDiscussionPhase();
      } else {
        state.currentCluePlayerId = state.clueOrder[state.clueTurnIndex];
        const nextP = this.room.players.find(p => p.id === state.currentCluePlayerId);
        state.currentCluePlayerName = nextP ? nextP.name : null;
        this.broadcastState();
      }
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private startTimer(seconds: number, onComplete: () => void) {
    this.stopTimer();
    this.remainingSeconds = seconds;
    this.io.to(this.room.code).emit('timer:tick', { remaining: this.remainingSeconds });

    this.timer = setInterval(() => {
      this.remainingSeconds--;
      this.io.to(this.room.code).emit('timer:tick', { remaining: this.remainingSeconds });

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

  stop() {
    this.stopTimer();
  }

  private broadcastState() {
    const state = this.getPublicState();
    this.io.to(this.room.code).emit('imposter:state', state);
  }

  private broadcastRoom() {
    const pub: any = { ...this.room };
    delete pub.currentWord;
    this.io.to(this.room.code).emit('room:updated', pub);
  }
}
