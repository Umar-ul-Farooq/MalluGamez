import { useGameStore } from '../store/gameStore';
import Canvas from '../components/Canvas';
import Timer from '../components/Timer';
import RoundEndOverlay from '../components/RoundEndOverlay';

export default function GuessingScreen() {
  const { room, timerRemaining } = useGameStore();

  const totalSecs = room?.settings.roundDurationSeconds ?? 60;
  const drawer = room?.players.find(p => p.isDrawing);

  if (!room) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="text-5xl animate-spin">🎨</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-950 overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <span>Round</span>
          <span className="text-white font-bold">{room.currentRound}/{room.settings.totalRounds}</span>
        </div>
        <Timer remaining={timerRemaining} total={totalSecs} />
        <div className="text-white/50 text-sm">
          <span className="text-white font-semibold">{drawer?.name ?? '…'}</span>
          <span className="ml-1">draws</span>
        </div>
      </div>

      {/* ── Canvas (view mode) ──────────────────────────────────────────────── */}
      <div className="flex-1 px-3 py-2 min-h-0">
        <Canvas mode="view" />
      </div>

      {/* ── Guess prompt ────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pb-8 pt-2 text-center">
        <div className="card py-4">
          <p className="text-2xl mb-1">💬</p>
          <p className="text-white font-semibold">Say your guess out loud!</p>
          <p className="ml-text text-brand-400/70 text-sm mt-1">ഉത്തരം ഉറക്കെ പറയൂ!</p>
        </div>
      </div>

      <RoundEndOverlay />
    </div>
  );
}
