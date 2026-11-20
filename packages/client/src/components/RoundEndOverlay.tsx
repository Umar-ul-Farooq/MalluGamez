import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

export default function RoundEndOverlay() {
  const roundEndWord = useGameStore(s => s.roundEndWord);
  const room         = useGameStore(s => s.room);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!roundEndWord) return;
    setCountdown(5);
    const id = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(id);
  }, [roundEndWord]);

  if (!roundEndWord) return null;

  const sorted = [...(room?.players ?? [])].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm
                    animate-fade-in">
      <div className="card max-w-sm w-full mx-6 text-center flex flex-col gap-5">

        <div>
          <p className="text-white/50 text-sm uppercase tracking-widest mb-1">The word was</p>
          <p className="ml-text text-5xl font-extrabold text-brand-300">{roundEndWord}</p>
        </div>

        {/* Scores */}
        <div className="flex flex-col gap-2">
          {sorted.filter(p => !p.isHost).map((p, i) => (
            <div key={p.id}
              className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2">
              <span className="text-white font-semibold flex items-center gap-2">
                <span>{['🥇','🥈','🥉'][i] ?? '👤'}</span>
                {p.name}
              </span>
              <span className="text-brand-300 font-bold">{p.score}</span>
            </div>
          ))}
        </div>

        <p className="text-white/40 text-sm">
          Next round in <span className="text-white font-bold">{countdown}s</span>…
        </p>
      </div>
    </div>
  );
}
