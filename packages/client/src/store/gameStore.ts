import { create } from 'zustand';
import type { RoomPublicState, Player } from '@chitram/shared';

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

  // ─── In-game ──────────────────────────────────────────────────────────────
  secretWord: string | null;
  secretManglish: string | null;
  timerRemaining: number;
  lastAward: { winnerId: string; winnerName: string; points: number } | null;
  roundEndWord: string | null;
  leaderboard: Player[];

  // ─── UI ───────────────────────────────────────────────────────────────────
  toasts: Toast[];

  // ─── Actions ──────────────────────────────────────────────────────────────
  setMyId:      (id: string) => void;
  setConnected: (v: boolean) => void;
  setRoom:      (room: RoomPublicState) => void;
  handleGameStarted: (room: RoomPublicState) => void;
  setSecretWord:(word: string, manglish: string) => void;
  setTimer:     (remaining: number) => void;
  handleAward:  (p: { winnerId: string; winnerName: string; points: number }) => void;
  handleRoundEnd: (p: { word: string; scores: Player[] }) => void;
  handleGameEnd:  (p: { leaderboard: Player[] }) => void;
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
  timerRemaining: 0,
  lastAward: null,
  roundEndWord: null,
  leaderboard: [],
  toasts: [],

  setMyId:      (id) => set({ myId: id }),
  setConnected: (v)  => set({ connected: v }),
  setRoom:      (room) => set({ room }),

  handleGameStarted: (room) => set({
    room,
    roundEndWord: null,
    lastAward: null,
  }),

  setSecretWord: (word, manglish) =>
    set({ secretWord: word, secretManglish: manglish }),

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

  addToast: (message, type) => {
    const id = Math.random().toString(36).slice(2);
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 3500);
  },

  removeToast: (id) =>
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  reset: () => set({
    room: null, secretWord: null, secretManglish: null,
    timerRemaining: 0, lastAward: null, roundEndWord: null,
    leaderboard: [], toasts: [],
  }),
}));

// ─── Selector helpers (use in components) ─────────────────────────────────
export const selectMyPlayer = (s: GameState) =>
  s.room?.players.find(p => p.id === s.myId);

export const selectAmHost = (s: GameState) =>
  s.room?.players.find(p => p.id === s.myId)?.isHost ?? false;

export const selectAmDrawing = (s: GameState) =>
  s.room?.players.find(p => p.id === s.myId)?.isDrawing ?? false;
