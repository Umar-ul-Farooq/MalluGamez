import { create } from 'zustand';
import type {
  RoomPublicState,
  Player,
  CharadesPublicState,
  SecretMoviePayload,
  MovieReveal,
  ImposterPublicState,
  ImposterSecretPayload,
} from '@chitram/shared';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface GameState {
  // ─── Connection ──────────────────────────────────────────────────────────
  myId: string;
  connected: boolean;

  // ─── Room ─────────────────────────────────────────────────────────────────
  room: RoomPublicState | null;

  // ─── Pictionary In-game ───────────────────────────────────────────────────
  secretWord: string | null;
  secretManglish: string | null;
  secretCategory: string | null;
  timerRemaining: number;
  lastAward: { winnerId: string; winnerName: string; points: number } | null;
  roundEndWord: string | null;
  leaderboard: Player[];

  // ─── Charades In-game ─────────────────────────────────────────────────────
  charadesState: CharadesPublicState | null;
  secretMovie: SecretMoviePayload | null;
  lastCharadesRoundEnd: {
    result: 'correct' | 'timeout';
    pointsAwardedTo: 'A' | 'B';
    points: number;
    movie: MovieReveal;
    teamAScore: number;
    teamBScore: number;
  } | null;
  incorrectFeedbackTrigger: number;

  // ─── The Imposter In-game ─────────────────────────────────────────────────
  imposterState: ImposterPublicState | null;
  imposterSecret: ImposterSecretPayload | null;
  hasVotedImposter: boolean;

  // ─── UI ───────────────────────────────────────────────────────────────────
  toasts: Toast[];

  // ─── Actions ──────────────────────────────────────────────────────────────
  setMyId:      (id: string) => void;
  setConnected: (v: boolean) => void;
  setRoom:      (room: RoomPublicState) => void;
  handleGameStarted: (room: RoomPublicState) => void;
  setSecretWord:(word: string, manglish: string, category?: string) => void;
  setTimer:     (remaining: number) => void;
  handleAward:  (p: { winnerId: string; winnerName: string; points: number }) => void;
  handleRoundEnd: (p: { word: string; scores: Player[] }) => void;
  handleGameEnd:  (p: { leaderboard: Player[] }) => void;
  setCharadesState: (s: CharadesPublicState) => void;
  setSecretMovie: (m: SecretMoviePayload | null) => void;
  setImposterState: (s: ImposterPublicState) => void;
  setImposterSecret: (s: ImposterSecretPayload | null) => void;
  setHasVotedImposter: (v: boolean) => void;
  handleCharadesRoundEnd: (p: {
    result: 'correct' | 'timeout';
    pointsAwardedTo: 'A' | 'B';
    points: number;
    movie: MovieReveal;
    teamAScore: number;
    teamBScore: number;
  }) => void;
  handleCharadesIncorrect: () => void;
  addToast:     (message: string, type: Toast['type']) => void;
  removeToast:  (id: string) => void;
  reset:        () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  myId: '',
  connected: false,
  room: null,
  secretWord: null,
  secretManglish: null,
  secretCategory: null,
  timerRemaining: 0,
  lastAward: null,
  roundEndWord: null,
  leaderboard: [],
  charadesState: null,
  secretMovie: null,
  lastCharadesRoundEnd: null,
  incorrectFeedbackTrigger: 0,
  imposterState: null,
  imposterSecret: null,
  hasVotedImposter: false,
  toasts: [],

  setMyId:      (id) => set({ myId: id }),
  setConnected: (v)  => set({ connected: v }),
  setRoom:      (room) => set({ room }),

  handleGameStarted: (room) => set({
    room,
    roundEndWord: null,
    lastAward: null,
  }),

  setSecretWord: (word, manglish, category) =>
    set({ secretWord: word, secretManglish: manglish, secretCategory: category ?? null }),

  setTimer: (remaining) => set({ timerRemaining: remaining }),

  handleAward: (p) => {
    set({ lastAward: p });
    get().addToast(`🎉 ${p.winnerName} gets ${p.points} points!`, 'success');
  },

  handleRoundEnd: ({ word, scores }) => {
    set({ roundEndWord: word, room: get().room ? { ...get().room!, players: scores } : null });
  },

  handleGameEnd: ({ leaderboard }) => {
    set({ leaderboard, room: get().room ? { ...get().room!, phase: 'game-end' } : null });
  },

  setCharadesState: (s) => set({ charadesState: s }),
  setSecretMovie: (m) => set({ secretMovie: m }),
  setImposterState: (s) => set({ imposterState: s }),
  setImposterSecret: (s) => set({ imposterSecret: s }),
  setHasVotedImposter: (v) => set({ hasVotedImposter: v }),
  handleCharadesRoundEnd: (p) => {
    set({ lastCharadesRoundEnd: p, secretMovie: null });
    const teamName = p.pointsAwardedTo === 'A'
      ? (get().charadesState?.teamAName ?? 'Team A')
      : (get().charadesState?.teamBName ?? 'Team B');
    get().addToast(`🎉 ${teamName} scored ${p.points} points! (${p.movie.title})`, 'success');
  },
  handleCharadesIncorrect: () => {
    set(s => ({ incorrectFeedbackTrigger: s.incorrectFeedbackTrigger + 1 }));
    get().addToast('❌ തെറ്റായ ഉത്തരം! കളി തുടരുന്നു…', 'info');
  },

  addToast: (message, type) => {
    const id = Math.random().toString(36).slice(2);
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 3500);
  },

  removeToast: (id) =>
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  reset: () => set({
    room: null, secretWord: null, secretManglish: null, secretCategory: null,
    timerRemaining: 0, lastAward: null, roundEndWord: null,
    leaderboard: [], charadesState: null, secretMovie: null,
    lastCharadesRoundEnd: null, imposterState: null, imposterSecret: null,
    hasVotedImposter: false, toasts: [],
  }),
}));

// ─── Selector helpers (use in components) ─────────────────────────────────
export const selectMyPlayer = (s: GameState) =>
  s.room?.players.find(p => p.id === s.myId);

export const selectAmHost = (s: GameState) =>
  s.room?.players.find(p => p.id === s.myId)?.isHost ?? false;

export const selectAmDrawing = (s: GameState) =>
  s.room?.players.find(p => p.id === s.myId)?.isDrawing ?? false;
