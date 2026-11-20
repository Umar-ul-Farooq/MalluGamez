// ─── Game Platform ──────────────────────────────────────────────────────────

export type GameType = 'pictionary' | 'charades';

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
  gameType: GameType;             // 'pictionary' (default) or 'charades'
  phase: GamePhase;
  players: Player[];
  settings: RoomSettings;
  charadesSettings?: CharadesSettings;
  currentRound: number;
  currentDrawerId: string | null;
  currentWord: string | null;       // only sent to drawer
  currentCategory?: string;         // public category hint (e.g. 🎬 സിനിമ, 🍲 ഭക്ഷണം)
  charadesState?: CharadesPublicState;
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
}

export interface SecretMoviePayload {
  title: string;
  manglish: string;
  year?: number;
  difficulty: string;
}

// ─── Socket.IO Events (Client → Server) ─────────────────────────────────────

export interface ClientToServerEvents {
  'room:create': (payload: { playerName: string; gameType?: GameType }) => void;
  'room:join':   (payload: { roomCode: string; playerName: string }) => void;
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
}

// ─── Socket.IO Events (Server → Client) ─────────────────────────────────────

export interface ServerToClientEvents {
  'room:joined':  (room: RoomPublicState) => void;
  'room:updated': (room: RoomPublicState) => void;
  'room:error':   (message: string) => void;

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
