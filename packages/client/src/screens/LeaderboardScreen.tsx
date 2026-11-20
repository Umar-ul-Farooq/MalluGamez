import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

export default function LeaderboardScreen() {
  const navigate = useNavigate();
  const { leaderboard, myId, reset } = useGameStore();

  const myRankIndex = leaderboard.findIndex(p => p.id === myId);
  const myPlayer = leaderboard[myRankIndex];

  function handleHome() {
    reset();
    navigate('/');
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-950 via-brand-950 to-gray-950 px-6 py-8 select-none overflow-hidden">
      {/* Header */}
      <div className="text-center mb-6 shrink-0 animate-bounce-in">
        <div className="text-6xl mb-2">🏆</div>
        <h1 className="text-3xl font-black text-white">Final Leaderboard</h1>
        <p className="ml-text text-xl font-bold text-brand-300 mt-1">കളി അവസാനിച്ചു!</p>
      </div>

      {/* My Result Callout */}
      {myPlayer && (
        <div className="card bg-brand-600/25 border-brand-400/40 py-4 px-5 mb-6 text-center shrink-0 animate-fade-in">
          <p className="text-white/60 text-xs uppercase tracking-widest font-semibold">Your Finish</p>
          <p className="text-2xl font-black text-white mt-1">
            {myRankIndex === 0
              ? '🥇 1st Place! Winner! 🎉'
              : myRankIndex === 1
              ? '🥈 2nd Place! Great job!'
              : myRankIndex === 2
              ? '🥉 3rd Place! Well played!'
              : `${myRankIndex + 1}th Place`}
          </p>
          <p className="text-brand-300 font-bold text-lg mt-1">{myPlayer.score} Points</p>
        </div>
      )}

      {/* Roster list */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-3 pr-1 mb-6">
        {leaderboard.map((player, idx) => {
          const isMe = player.id === myId;
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-4 rounded-2xl transition-all
                ${isMe
                  ? 'bg-brand-600/30 border border-brand-400/60 ring-1 ring-brand-400/50'
                  : 'bg-white/5 border border-white/5'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{['🥇', '🥈', '🥉'][idx] ?? '👤'}</span>
                <div>
                  <p className="font-bold text-white text-base">
                    {player.name} {isMe && <span className="text-xs text-brand-400 ml-1 font-semibold">(You)</span>}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-brand-300 tabular-nums">{player.score}</span>
                <span className="text-white/40 text-xs ml-1">pts</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action */}
      <div className="shrink-0">
        <button
          onClick={handleHome}
          className="btn-primary w-full text-lg py-4"
        >
          🏠 Back to Home / പ്രധാന പേജ്
        </button>
      </div>
    </div>
  );
}
