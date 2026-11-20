import { useGameStore, selectMyPlayer } from '../store/gameStore';
import Timer from '../components/Timer';
import RoundEndOverlay from '../components/RoundEndOverlay';

export default function GuessingScreen() {
  const { room, timerRemaining } = useGameStore();
  const myPlayer = useGameStore(selectMyPlayer);

  const totalSecs = room?.settings.roundDurationSeconds ?? 60;
  const drawer = room?.players.find(p => p.isDrawing);

  if (!room) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="text-5xl animate-bounce">🎨</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-950 via-brand-950/40 to-gray-950 select-none overflow-hidden px-6 py-6">

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
        <div className="flex flex-col">
          <span className="text-white/40 text-xs uppercase tracking-wider font-semibold">Round</span>
          <span className="text-white font-extrabold text-lg">
            {room.currentRound} / {room.settings.totalRounds}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-white/40 text-xs uppercase tracking-wider font-semibold">Time</span>
          <Timer remaining={timerRemaining} total={totalSecs} />
        </div>

        <div className="flex flex-col items-end">
          <span className="text-white/40 text-xs uppercase tracking-wider font-semibold">Your Score</span>
          <span className="text-brand-300 font-extrabold text-lg">
            {myPlayer?.score ?? 0} <span className="text-xs text-white/50">pts</span>
          </span>
        </div>
      </div>

      {/* ── Main Prompt Content ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 my-auto">

        {/* TV Icon with Pulse */}
        <div className="relative">
          <div className="w-28 h-28 bg-brand-600/20 border-2 border-brand-500/40 rounded-3xl flex items-center justify-center text-6xl shadow-2xl shadow-brand-900/60 animate-bounce-in">
            📺
          </div>
          <span className="absolute -top-2 -right-2 text-2xl animate-pulse">👀</span>
        </div>

        {/* Main Headlines */}
        <div className="space-y-2">
          {room.currentCategory && (
            <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/40 px-4 py-1 rounded-full shadow-md">
              <span className="text-white/60 text-xs uppercase tracking-wider font-bold">Category:</span>
              <span className="text-yellow-300 font-extrabold text-sm">{room.currentCategory}</span>
            </div>
          )}
          <h1 className="ml-text text-3xl font-black text-white tracking-tight">
            ടിവിയിൽ നോക്കൂ!
          </h1>
          <p className="text-brand-300 text-lg font-bold">
            Look at the TV Screen!
          </p>
        </div>

        {/* Drawer Highlight Card */}
        <div className="card w-full max-w-sm bg-white/5 border border-white/10 py-5 px-6 rounded-3xl backdrop-blur-md shadow-xl">
          <p className="text-white/50 text-xs uppercase tracking-widest font-semibold mb-2">
            Currently Drawing / ഇപ്പോൾ വരയ്ക്കുന്നത്
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl animate-bounce">✏️</span>
            <span className="text-2xl font-black text-brand-300">
              {drawer?.name ?? 'Player'}
            </span>
          </div>
        </div>

        {/* Action Prompt */}
        <div className="card w-full max-w-sm bg-brand-900/30 border border-brand-500/30 py-4 px-5 rounded-2xl">
          <div className="flex items-center justify-center gap-2 text-yellow-300 font-extrabold text-lg mb-1">
            <span>📢</span>
            <span className="ml-text">ഉത്തരം ഉറക്കെ പറയൂ!</span>
          </div>
          <p className="text-white/70 text-xs leading-relaxed">
            Shout your guess out loud! When you get it right, {drawer?.name ?? 'the drawer'} will tap your name to award you 100 points!
          </p>
        </div>

      </div>

      {/* ── Footer Info ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 pt-2 text-center text-white/30 text-xs">
        Room: <span className="font-mono text-white/50">{room.code}</span>
      </div>

      <RoundEndOverlay />
    </div>
  );
}
