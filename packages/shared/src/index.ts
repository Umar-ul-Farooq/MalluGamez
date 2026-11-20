// ─── Players ────────────────────────────────────────────────────────────────

export interface Player {
  id: string;          // socket id
  name: string;
  score: number;
  isHost: boolean;
  isDrawing: boolean;
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
  phase: GamePhase;
  players: Player[];
  settings: RoomSettings;
  currentRound: number;
  currentDrawerId: string | null;
  currentWord: string | null;       // only sent to drawer
}

// ─── Socket.IO Events (Client → Server) ─────────────────────────────────────

export interface ClientToServerEvents {
  'room:create': (payload: { playerName: string }) => void;
  'room:join':   (payload: { roomCode: string; playerName: string }) => void;
  'room:leave':  () => void;

  'game:start':  () => void;                        // host only
  'game:settings': (settings: RoomSettings) => void; // host only

  'draw:stroke': (stroke: DrawStroke) => void;
  'draw:clear':  () => void;

  'guess:award': (payload: { winnerId: string }) => void; // drawer picks winner
}

// ─── Socket.IO Events (Server → Client) ─────────────────────────────────────

export interface ServerToClientEvents {
  'room:joined':  (room: RoomPublicState) => void;
  'room:updated': (room: RoomPublicState) => void;
  'room:error':   (message: string) => void;

  'game:word':    (payload: { word: string; manglish: string }) => void; // drawer only
  'game:started': (room: RoomPublicState) => void;

  'draw:stroke':  (stroke: DrawStroke) => void;
  'draw:cleared': () => void;

  'guess:awarded': (payload: { winnerId: string; winnerName: string; points: number }) => void;

  'timer:tick':   (payload: { remaining: number }) => void;
  'round:end':    (payload: { word: string; scores: Player[] }) => void;
  'game:end':     (payload: { leaderboard: Player[] }) => void;
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
