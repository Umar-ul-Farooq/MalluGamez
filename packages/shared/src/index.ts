// ─── Game Platform ──────────────────────────────────────────────────────────

export type GameType = 'pictionary' | 'charades' | 'imposter' | 'emoji' | 'draw-identify' | 'fastest-finger';

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
  gameType: GameType;             // 'pictionary', 'charades', 'imposter', 'emoji', 'draw-identify'
  phase: GamePhase;
  players: Player[];
  settings: RoomSettings;
  charadesSettings?: CharadesSettings;
  imposterSettings?: ImposterSettings;
  emojiSettings?: EmojiSettings;
  drawIdentifySettings?: DrawIdentifySettings;
  fastestFingerSettings?: FastestFingerSettings;
  currentRound: number;
  currentDrawerId: string | null;
  currentWord: string | null;       // only sent to drawer
  currentCategory?: string;         // public category hint (e.g. 🎬 സിനിമ, 🍲 ഭക്ഷണം)
  charadesState?: CharadesPublicState;
  imposterState?: ImposterPublicState;
  emojiState?: EmojiPublicState;
  drawIdentifyState?: DrawIdentifyPublicState;
  fastestFingerState?: FastestFingerPublicState;
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

// ─── Draw & Identify Types ──────────────────────────────────────────────────

export type DrawIdentifyLanguage = 'english' | 'malayalam';

export interface DrawIdentifySettings {
  objectCount: 6 | 9 | 12 | 15;
  language: DrawIdentifyLanguage;
  drawingDurationSeconds?: number;
  identificationDurationSeconds: number;
}

export type DrawIdentifyPhase =
  | 'drawing'        // drawer draws against clock (8/12/15/20s)
  | 'identification' // opposing players call out & tick objects (60s)
  | 'round-end'      // round summary & next round option
  | 'game-end';      // final podium

export interface SubmittedDrawing {
  index: number; // 0-based grid index
  dataUrl: string; // PNG base64
  submittedAt: number;
}

export interface DrawIdentifyObjectItem {
  index: number;
  name: string;
  englishName: string;
  malayalamName: string;
  isIdentified: boolean;
  identifiedByPlayerId?: string | null;
  identifiedByPlayerName?: string | null;
  identifiedAt?: number | null;
}

export interface DrawIdentifyPublicState {
  roundId: string;
  currentRound: number;
  totalRounds?: number;
  currentDrawerId: string;
  currentDrawerName: string;
  roundPhase: DrawIdentifyPhase;
  objectCount: 6 | 9 | 12 | 15;
  language: DrawIdentifyLanguage;
  drawingDurationSeconds: number;
  identificationDurationSeconds: number;
  drawings: (SubmittedDrawing | null)[];
  submittedCount: number;
  identifiedCount: number;
  roundScore: number;
  // NOTE: On TV and Drawer's phone, names are omitted/masked to ensure drawer never sees them!
  objectList: DrawIdentifyObjectItem[];
}

// ─── Fastest Finger – Picture Rush Types ────────────────────────────────────

export type FastestFingerTimerOption = 5 | 10 | 15 | 20 | 30;
export type FastestFingerDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface FastestFingerQuestionItem {
  id: string;
  image: string;
  answer: string;
  acceptedAnswers: string[];
  category: string;
  difficulty: FastestFingerDifficulty;
  attribution?: string;
}

export interface FastestFingerSettings {
  timerSeconds: FastestFingerTimerOption; // 5 | 10 | 15 | 20 | 30 (default 15)
  totalQuestions: number;                 // configurable, capped by available bank size
}

export type FastestFingerRoundPhase =
  | 'question'   // picture active, players submitting answers
  | 'won'        // first correct answer accepted, showing winner & 10 pts
  | 'skipped'    // timer expired with no correct answer, revealing answer
  | 'game-end';  // all questions completed

export interface FastestFingerPublicState {
  sessionId: string;
  questionId: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  roundPhase: FastestFingerRoundPhase;
  imageUrl: string;
  category: string;
  difficulty: FastestFingerDifficulty;
  timerSeconds: number;
  winnerId: string | null;
  winnerName: string | null;
  winningAnswer: string | null;
  pointsAwarded: number;
  revealedAnswer: string | null;
  correctCounts: Record<string, number>;
}

// ─── Socket.IO Events (Client → Server) ─────────────────────────────────────

export interface ClientToServerEvents {
  'room:create': (payload: { playerName: string; gameType?: GameType; hostToken?: string }) => void;
  'room:join':   (payload: { roomCode: string; playerName: string }) => void;
  'room:reclaim-host': (payload: { roomCode: string; hostToken: string }) => void;
  'room:leave':  () => void;
  'room:terminate': () => void; // host terminates room and returns all to home
  'room:force-reset': () => void; // host force-resets room and all sessions

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

  // ── Draw & Identify Challenge Events ──
  'draw-identify:update-settings': (payload: Partial<DrawIdentifySettings>) => void; // host only
  'draw-identify:start-game': () => void; // host only
  'draw-identify:submit-drawing': (payload: { roundId: string; drawingIndex: number; dataUrl: string }) => void; // drawer only
  'draw-identify:tick-object': (payload: { roundId: string; objectIndex: number }) => void; // opposing players only
  'draw-identify:next-round': () => void; // host only
  'draw-identify:finish-game': () => void; // host only
  'draw-identify:restart-game': () => void; // host only

  // ── Fastest Finger – Picture Rush Events ──
  'fastest-finger:update-settings': (payload: Partial<FastestFingerSettings>) => void; // host only
  'fastest-finger:start-game': () => void; // host only
  'fastest-finger:submit-guess': (payload: { guess: string; sessionId: string; questionId: string }) => void;
  'fastest-finger:restart-game': () => void; // host only
}

// ─── Socket.IO Events (Server → Client) ─────────────────────────────────────

export interface ServerToClientEvents {
  'room:joined':  (room: RoomPublicState) => void;
  'room:updated': (room: RoomPublicState) => void;
  'room:error':   (message: string) => void;
  'room:host-token': (payload: { hostToken: string }) => void;
  'room:terminated': (payload: { reason: string }) => void;
  'room:reset': (payload: { reason: string }) => void;

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

  // Draw & Identify Challenge
  'draw-identify:state': (state: DrawIdentifyPublicState) => void;
  'draw-identify:secret-list': (payload: { roundId: string; objectList: DrawIdentifyObjectItem[] }) => void; // Opposing players only!
  'draw-identify:object-ticked': (payload: { objectIndex: number; identifiedBy: string; identifiedCount: number }) => void;
  'draw-identify:drawing-added': (drawing: SubmittedDrawing) => void;

  // Fastest Finger – Picture Rush
  'fastest-finger:state': (state: FastestFingerPublicState) => void;
  'fastest-finger:guess-result': (payload: {
    questionId: string;
    isCorrect: boolean;
    message: string;
    points?: number;
  }) => void;
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

// ─── Export Emoji Bank ──────────────────────────────────────────────────────
export * from './emojiMovieBank';
