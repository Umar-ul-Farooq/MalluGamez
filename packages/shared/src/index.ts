// ─── Game Platform ──────────────────────────────────────────────────────────

export type GameType = 'pictionary' | 'charades' | 'imposter' | 'emoji';

// ─── Players ────────────────────────────────────────────────────────────────

export interface Player {
  id: string;          // socket id
  name: string;
  score: number;
  isHost: boolean;
  isDrawing: boolean;
  team?: 'A' | 'B' | null; // used in team games like Charades
  isOnline?: boolean;      // true if currently connected, false if screen locked
}

// ─── Room ───────────────────────────────────────────────────────────────────

export type GamePhase =
  | 'lobby'       // waiting for players, host adjusting settings
  | 'playing'     // active round
  | 'round-end'   // showing who won the round
  | 'game-end';   // final leaderboard

export interface RoomSettings {
  roundDurationSeconds: number;   // 30 | 60 | 90 | 120
  totalRounds: number;
}

export interface Room {
  code: string;
  gameType: GameType;             // 'pictionary', 'charades', or 'imposter'
  phase: GamePhase;
  players: Player[];
  settings: RoomSettings;
  charadesSettings?: CharadesSettings;
  imposterSettings?: ImposterSettings;
  emojiSettings?: EmojiSettings;
  currentRound: number;
  currentDrawerId: string | null;
  currentWord: string | null;       // only sent to drawer
  currentCategory?: string;         // public category hint (e.g. 🎬 സിനിമ, 🍲 ഭക്ഷണം)
  charadesState?: CharadesPublicState;
  imposterState?: ImposterPublicState;
  emojiState?: EmojiPublicState;
  sessionId?: string | null;
  hostToken?: string;
}

// ─── Dumb Charades Types ────────────────────────────────────────────────────

export type CharadesDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type ActorSelectionMode = 'random' | 'manual';

export interface CharadesSettings {
  roundDurationSeconds: number;     // 60 | 90 | 120 (default 90)
  totalRoundsPerTeam: number;       // default 5
  difficulty: CharadesDifficulty;   // default 'mixed'
  actorSelection: ActorSelectionMode; // default 'random'
  teamAName: string;                // default 'മിന്നൽ മുരളി' / 'Team A'
  teamBName: string;                // default 'പ്രേമം ഗ്യാങ്' / 'Team B'
}

export type CharadesRoundPhase =
  | 'actor-selection' // actor is being chosen
  | 'actor-ready'     // actor sees movie & hits ready
  | 'acting'          // timer running, actor performing, teammates guessing
  | 'round-end'       // movie revealed, scores updated
  | 'game-end';       // final podium

export interface MovieReveal {
  title: string;
  manglish: string;
  year?: number;
  difficulty: string;
}

export interface TeamSwitchRequest {
  id: string;
  playerId: string;
  playerName: string;
  fromTeam: 'A' | 'B' | null;
  toTeam: 'A' | 'B';
  timestamp: number;
}

export interface CharadesPublicState {
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  actingTeam: 'A' | 'B';
  judgingTeam: 'A' | 'B';
  currentActorId: string | null;
  currentActorName: string | null;
  roundPhase: CharadesRoundPhase;
  currentRoundNumber: number;       // overall round index
  totalRounds: number;
  roundsPlayed: { A: number; B: number };
  revealedMovie: MovieReveal | null; // NULL during active acting, populated ONLY on round-end
  lastRoundResult?: {
    type: 'correct' | 'timeout';
    pointsAwardedTo: 'A' | 'B';
    points: number;
  } | null;
  teamsLocked: boolean;
  pendingSwitchRequest?: TeamSwitchRequest | null;
}

export interface SecretMoviePayload {
  title: string;
  manglish: string;
  year?: number;
  difficulty: string;
}

// ─── The Imposter Types ──────────────────────────────────────────────────────

export type ImposterCategory =
  | 'cinema'        // 🎬 സിനിമ (Malayalam Cinema)
  | 'celebrities'   // 🌟 താരങ്ങൾ (Malayalam Celebrities)
  | 'kerala'        // 🌴 കേരളം (Traditions & Culture)
  | 'food'          // 🍲 ഭക്ഷണം (Kerala Food)
  | 'places'        // 📍 സ്ഥലങ്ങൾ (Kerala Places)
  | 'objects'       // 📦 നിത്യോപയോഗ വസ്തുക്കൾ (Everyday Objects)
  | 'mixed';        // 🎲 എല്ലാം ചേർന്നത് (Mixed)

export const IMPOSTER_CATEGORY_LABELS: Record<ImposterCategory, string> = {
  mixed: '🎲 എല്ലാം ചേർന്നത് / Mixed Categories',
  cinema: '🎬 സിനിമ / Malayalam Cinema',
  celebrities: '🌟 താരങ്ങൾ / Celebrities',
  kerala: '🌴 കേരള സംസ്കാരം / Kerala Traditions',
  food: '🍲 ഭക്ഷണം / Kerala Food',
  places: '📍 സ്ഥലങ്ങൾ / Kerala Places',
  objects: '📦 നിത്യോപയോഗ വസ്തുക്കൾ / Everyday Objects',
};

export type ImposterDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';

export interface ImposterSettings {
  totalRounds: number;            // 3 | 5 | 7 | 10 (default 5)
  imposterCount: number;          // 1 | 2 (default 1)
  difficulty: ImposterDifficulty; // default 'mixed'
  category: ImposterCategory;     // default 'mixed'
  discussionDurationSeconds: number; // 30 | 60 | 90 (default 60)
  votingDurationSeconds: number;     // 20 | 30 (default 30)
}

export type ImposterRoundPhase =
  | 'role-reveal'   // players review their secret role / word on phone
  | 'clues'         // turn-by-turn verbal clue giving
  | 'discussion'    // verbal discussion countdown
  | 'voting'        // private voting on phone
  | 'tie-break'     // second vote if top candidates tied
  | 'imposter-guess'// caught imposter's final chance to guess the secret word
  | 'round-end'     // outcome reveal, role reveals, score updates
  | 'game-end';     // final podium

export interface ImposterPublicState {
  sessionId: string | null;
  isAbandoned?: boolean;
  currentRound: number;
  totalRounds: number;
  roundPhase: ImposterRoundPhase;
  category: string;               // e.g. "🎬 സിനിമ / Malayalam Cinema"
  categoryKey: ImposterCategory;
  clueOrder: string[];            // player IDs in turn order
  currentCluePlayerId: string | null;
  currentCluePlayerName: string | null;
  clueTurnIndex: number;          // 0..clueOrder.length - 1
  votedPlayerIds: string[];       // who has cast their vote (for count display, NOT selections)
  tiedCandidateIds?: string[];    // candidate IDs during tie-break vote
  eliminatedPlayerId?: string | null;
  eliminatedPlayerName?: string | null;
  eliminatedPlayerWasImposter?: boolean;
  caughtImposterId?: string | null;
  caughtImposterName?: string | null;
  imposterFinalGuess?: string | null;
  imposterGuessCorrect?: boolean | null;
  revealedWord?: {
    word: string;
    manglish: string;
    category: string;
  } | null;                       // ONLY revealed when round ends!
  imposterIds?: string[];         // ONLY revealed when round ends!
  roundResult?: {
    winner: 'normal' | 'imposter';
    reason: string;
    eliminatedPlayerName: string;
    wasImposter: boolean;
    imposterGuess?: {
      guess: string;
      correct: boolean;
    };
    pointsAwarded: Record<string, number>; // playerId -> points earned this round
  } | null;
}

export interface ImposterSecretPayload {
  isImposter: boolean;
  secretWord?: string;            // undefined for imposter!
  secretManglish?: string;        // undefined for imposter!
  category: string;
  categoryKey: ImposterCategory;
  otherImposters?: string[];      // names of fellow imposters if imposterCount > 1
}

// ─── Emoji Movie Challenge Types ─────────────────────────────────────────────

export type { EmojiDifficulty, EmojiGameMode, EmojiMovieItem } from './emojiMovieBank';

export interface EmojiSettings {
  mode: 'race' | 'turn';          // 'race' (all guess together) | 'turn' (turn-based guessing)
  totalQuestions: number;         // 5 | 10 | 15 | 20 (default 10)
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  timerSeconds: number;           // 15 | 30 | 45 (default 30)
}

export type EmojiRoundPhase =
  | 'question'                    // live question, timer ticking, players guessing
  | 'reveal'                      // correct movie revealed, scores updated
  | 'game-end';                   // final leaderboard / podium

export interface EmojiPlayerAnswer {
  playerId: string;
  playerName: string;
  guess: string;
  isCorrect: boolean;
  timeTakenMs: number;
  pointsAwarded: number;
}

export interface EmojiPublicState {
  currentQuestionIndex: number;   // 0-based
  totalQuestions: number;
  roundPhase: EmojiRoundPhase;
  emojis: string;
  category?: string;
  difficulty: string;
  revealedHint: string | null;
  mode: 'race' | 'turn';
  currentTurnPlayerId?: string | null;
  currentTurnPlayerName?: string | null;
  answeredPlayerIds: string[];    // IDs of players who submitted correct or max guesses
  correctPlayerIds: string[];     // IDs of players who got it right this question
  revealedMovie: {
    title: string;
    manglish: string;
    year?: number;
    hint?: string;
  } | null;                       // ONLY populated during 'reveal' phase!
  roundAnswers?: EmojiPlayerAnswer[];
}

// ─── Socket.IO Events (Client → Server) ─────────────────────────────────────

export interface ClientToServerEvents {
  'room:create': (payload: { playerName: string; gameType?: GameType; hostToken?: string }) => void;
  'room:join':   (payload: { roomCode: string; playerName: string }) => void;
  'room:reclaim-host': (payload: { roomCode: string; hostToken: string }) => void;
  'room:leave':  () => void;

  'game:start':  () => void;                        // host only
  'game:settings': (settings: RoomSettings) => void; // host only

  'draw:stroke': (stroke: DrawStroke) => void;
  'draw:clear':  () => void;

  'guess:award': (payload: { winnerId: string }) => void; // drawer picks winner

  // ── Charades Events ──
  'charades:select-team': (payload: { team: 'A' | 'B' }) => void;
  'charades:move-player': (payload: { playerId: string; team: 'A' | 'B' }) => void; // host only
  'charades:update-settings': (payload: Partial<CharadesSettings>) => void; // host only
  'charades:lock-teams': () => void; // host only
  'charades:select-actor': (payload: { actorId: string }) => void; // host only in manual mode
  'charades:actor-ready': () => void; // actor confirms readiness
  'charades:start-acting': () => void; // host begins round
  'charades:judge-action': (payload: { isCorrect: boolean }) => void; // opposing team judges
  'charades:next-round': () => void; // host advances round
  'charades:change-actor': () => void; // host rerolls actor if current actor left/disconnected
  'charades:adjust-score': (payload: { team: 'A' | 'B'; delta: number }) => void; // host score correction
  'charades:restart-game': () => void; // host restarts with same teams
  'charades:request-switch-team': (payload: { targetTeam: 'A' | 'B' }) => void;
  'charades:respond-switch-team': (payload: { requestId: string; approve: boolean }) => void;
  'charades:cancel-switch-team': () => void;

  // ── Imposter Events ──
  'imposter:update-settings': (payload: Partial<ImposterSettings>) => void; // host only
  'imposter:start-game': () => void; // host only
  'imposter:start-clues': (payload?: { sessionId?: string }) => void; // host or player confirming readiness
  'imposter:next-clue': (payload?: { sessionId?: string }) => void; // active clue giver or host
  'imposter:end-discussion': (payload?: { sessionId?: string }) => void; // host only
  'imposter:vote': (payload: { candidateId: string; sessionId?: string }) => void; // player votes
  'imposter:submit-word-guess': (payload: { guess: string; sessionId?: string }) => void; // caught imposter guesses word
  'imposter:next-round': (payload?: { sessionId?: string }) => void; // host advances round
  'imposter:restart-game': () => void; // host restarts
  'imposter:force-reset': () => void; // host force-resets session to clean lobby

  // ── Emoji Movie Challenge Events ──
  'emoji:update-settings': (payload: Partial<EmojiSettings>) => void; // host only
  'emoji:start-game': () => void; // host only
  'emoji:submit-guess': (payload: { guess: string }) => void; // player submits guess
  'emoji:reveal-hint': () => void; // host reveals hint early
  'emoji:next-question': () => void; // host advances question
  'emoji:restart-game': () => void; // host restarts game
}

// ─── Socket.IO Events (Server → Client) ─────────────────────────────────────

export interface ServerToClientEvents {
  'room:joined':  (room: RoomPublicState) => void;
  'room:updated': (room: RoomPublicState) => void;
  'room:error':   (message: string) => void;
  'room:host-token': (payload: { hostToken: string }) => void;

  // Pictionary
  'game:word':    (payload: { word: string; manglish: string; category?: string }) => void; // drawer only
  'game:started': (room: RoomPublicState) => void;
  'draw:stroke':  (stroke: DrawStroke) => void;
  'draw:cleared': () => void;
  'guess:awarded': (payload: { winnerId: string; winnerName: string; points: number }) => void;

  // Shared
  'timer:tick':   (payload: { remaining: number }) => void;
  'round:end':    (payload: { word: string; scores: Player[] }) => void;
  'game:end':     (payload: { leaderboard: Player[] }) => void;

  // Charades (strictly filtered server-side)
  'charades:state': (state: CharadesPublicState) => void;
  'charades:secret-movie': (payload: SecretMoviePayload) => void; // Delivered ONLY to actor & opposing team!
  'charades:incorrect-feedback': () => void; // notifies room that guess was incorrect (round continues)
  'charades:round-ended': (payload: {
    result: 'correct' | 'timeout';
    pointsAwardedTo: 'A' | 'B';
    points: number;
    movie: MovieReveal;
    teamAScore: number;
    teamBScore: number;
  }) => void;

  // Imposter (strictly filtered server-side)
  'imposter:state': (state: ImposterPublicState) => void;
  'imposter:secret': (payload: ImposterSecretPayload | null) => void; // Delivered ONLY to specific player privately!
  'imposter:vote-registered': () => void;
  'imposter:session-reset': () => void;
  'imposter:session-terminated': (payload: { reason: string }) => void;

  // Emoji Movie Challenge
  'emoji:state': (state: EmojiPublicState) => void;
  'emoji:guess-result': (payload: { isCorrect: boolean; message: string; points?: number }) => void;
}

// ─── Public room state (word hidden) ────────────────────────────────────────

export type RoomPublicState = Omit<Room, 'currentWord'>;

// ─── Drawing ─────────────────────────────────────────────────────────────────

export interface DrawPoint {
  x: number;   // 0–1 normalised (so canvas size doesn't matter)
  y: number;
}

export interface DrawStroke {
  points: DrawPoint[];
  color: string;
  size: number;
  type: 'stroke' | 'start';
}

// ─── Export Emoji Movie Bank & Validation ───────────────────────────────────
export * from './emojiMovieBank';
