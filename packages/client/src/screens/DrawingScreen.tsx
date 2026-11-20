import { useState, useRef } from 'react';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';
import Canvas, { type CanvasHandle } from '../components/Canvas';
import Timer from '../components/Timer';
import RoundEndOverlay from '../components/RoundEndOverlay';
import PlayerAwardSheet from '../components/PlayerAwardSheet';

const COLORS = [
  '#1a1a1a', // near-black
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#78716c', // brown-grey
  '#ffffff',  // white
];

const SIZES = [3, 6, 12, 20];

export default function DrawingScreen() {
  const { room, secretWord, secretManglish, secretCategory, timerRemaining } = useGameStore();
  const [color,     setColor]     = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(SIZES[1]);
  const [showAward, setShowAward] = useState(false);
  const canvasRef = useRef<CanvasHandle>(null);

  const totalSecs = room?.settings.roundDurationSeconds ?? 60;

  function handleClear() {
    canvasRef.current?.clear();
    getSocket().emit('draw:clear');
  }

  if (!room || !secretWord) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="text-5xl animate-spin mb-3">🎨</div>
          <p className="text-white/50">Getting your word…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-950 select-none overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <span>Round</span>
          <span className="text-white font-bold">{room.currentRound}/{room.settings.totalRounds}</span>
        </div>
        <Timer remaining={timerRemaining} total={totalSecs} />
        <div className="text-brand-400 text-sm font-semibold">You draw!</div>
      </div>

      {/* ── Secret word ─────────────────────────────────────────────────────── */}
      <div className="px-4 pb-2 shrink-0 text-center">
        <div className="inline-flex flex-col items-center bg-brand-600/20 border border-brand-500/40
                        rounded-2xl px-6 py-2.5">
          {secretCategory && (
            <span className="text-xs font-bold text-yellow-300 uppercase tracking-wider bg-yellow-500/20 px-3 py-0.5 rounded-full mb-1">
              {secretCategory}
            </span>
          )}
          <p className="ml-text text-3xl font-extrabold text-brand-200 leading-tight">
            {secretWord}
          </p>
          <p className="text-white/50 text-sm font-medium mt-0.5">{secretManglish}</p>
        </div>
      </div>

      {/* ── Canvas ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-3 pb-2 min-h-0">
        <Canvas ref={canvasRef} mode="draw" color={color} brushSize={brushSize} />
      </div>

      {/* ── Tool bar ────────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pb-2 flex flex-col gap-2">

        {/* Colors */}
        <div className="flex justify-between items-center">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`w-8 h-8 rounded-full transition-transform active:scale-90
                ${color === c
                  ? 'ring-2 ring-offset-2 ring-offset-gray-950 ring-white scale-110'
                  : 'opacity-70 hover:opacity-100'}`}
            />
          ))}
        </div>

        {/* Brush sizes + clear */}
        <div className="flex items-center gap-3">
          <div className="flex gap-3 flex-1 items-center justify-around">
            {SIZES.map(sz => (
              <button
                key={sz}
                onClick={() => setBrushSize(sz)}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all
                  ${brushSize === sz
                    ? 'bg-brand-600 ring-2 ring-brand-400'
                    : 'bg-white/10 hover:bg-white/20'}`}
              >
                <div
                  className="bg-white rounded-full"
                  style={{ width: Math.min(sz, 20), height: Math.min(sz, 20) }}
                />
              </button>
            ))}
          </div>

          <button
            onClick={handleClear}
            className="btn-secondary text-sm px-4 py-2"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* ── Award button ────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pb-6">
        <button
          onClick={() => setShowAward(true)}
          className="w-full btn-primary text-lg py-4"
        >
          ✅ Someone got it!
        </button>
      </div>

      {/* ── Award sheet ─────────────────────────────────────────────────────── */}
      {showAward && <PlayerAwardSheet onClose={() => setShowAward(false)} />}

      {/* ── Round end overlay ───────────────────────────────────────────────── */}
      <RoundEndOverlay />
    </div>
  );
}
