import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';

export default function FastestFingerMobileScreen() {
  const {
    room,
    myId,
    fastestFingerState,
    fastestFingerGuessFeedback,
    setFastestFingerGuessFeedback,
    timerRemaining,
  } = useGameStore();

  const [guess, setGuess] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const currentQuestionId = fastestFingerState?.questionId ?? '';
  const roundPhase = fastestFingerState?.roundPhase ?? 'question';

  // Reset input & feedback whenever a new picture starts
  useEffect(() => {
    setGuess('');
    setFastestFingerGuessFeedback(null);
    if (roundPhase === 'question') {
      inputRef.current?.focus();
    }
  }, [currentQuestionId, roundPhase, setFastestFingerGuessFeedback]);

  // Clear the text input when an incorrect answer feedback arrives so player can immediately retry
  useEffect(() => {
    if (
      fastestFingerGuessFeedback &&
      fastestFingerGuessFeedback.questionId === currentQuestionId &&
      !fastestFingerGuessFeedback.isCorrect
    ) {
      setGuess('');
      inputRef.current?.focus();
    }
  }, [fastestFingerGuessFeedback, currentQuestionId]);

  if (!room) return null;

  const me = room.players.find(p => p.id === myId);
  const myScore = me?.score ?? 0;

  // ── LOBBY VIEW ────────────────────────────────────────────────────────────
  if (room.phase === 'lobby' || !fastestFingerState) {
    const settings = room.fastestFingerSettings ?? { timerSeconds: 15, totalQuestions: 20 };
    const players = room.players.filter(p => !p.isHost);

    return (
      <div className="h-full flex flex-col justify-between p-6 bg-gradient-to-b from-gray-950 via-orange-950/20 to-gray-950 text-white select-none overflow-y-auto">
        <div className="text-center space-y-2 pt-4">
          <div className="text-5xl">⚡📸</div>
          <h2 className="text-2xl font-black text-white">Fastest Finger – Picture Rush</h2>
          <p className="text-orange-300 text-xs font-bold">
            Room {room.code} • Playing as {me?.name}
          </p>
        </div>

        <div className="my-6 space-y-4 max-w-sm w-full mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-3 text-center">
            <p className="text-xs uppercase tracking-widest font-bold text-white/50">Game Settings</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-2xl p-3">
                <span className="text-[10px] uppercase text-white/40 block">Time / Picture</span>
                <span className="text-2xl font-mono font-black text-orange-300">{settings.timerSeconds}s</span>
              </div>
              <div className="bg-white/5 rounded-2xl p-3">
                <span className="text-[10px] uppercase text-white/40 block">Pictures</span>
                <span className="text-2xl font-mono font-black text-white">{settings.totalQuestions}</span>
              </div>
            </div>
            <p className="text-xs text-white/60 pt-2">
              Watch the TV screen, type the object name, and tap <strong className="text-orange-300">DONE</strong>!
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-xs text-white/60">
              {players.length} player{players.length !== 1 ? 's' : ''} joined
            </p>
            <p className="text-orange-300 text-xs font-semibold mt-1 animate-pulse">
              Waiting for host to start the game…
            </p>
          </div>
        </div>

        <div className="text-center text-white/30 text-xs pb-2">
          First correct answer wins 10 points!
        </div>
      </div>
    );
  }

  // ── GAME-END LEADERBOARD VIEW ─────────────────────────────────────────────
  if (room.phase === 'game-end' || roundPhase === 'game-end') {
    const players = room.players.filter(p => !p.isHost);
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const myRank = sorted.findIndex(p => p.id === myId) + 1;
    const counts = fastestFingerState.correctCounts ?? {};
    const mySolved = counts[myId] ?? 0;

    return (
      <div className="h-full flex flex-col p-6 bg-gradient-to-b from-gray-950 via-orange-950/30 to-gray-950 text-white select-none overflow-y-auto">
        <div className="text-center space-y-2 pt-2 mb-6">
          <div className="text-5xl">🏆</div>
          <h2 className="text-2xl font-black text-white">Game Over!</h2>
          <p className="text-orange-300 font-bold text-sm">
            Rank #{myRank > 0 ? myRank : '—'} • {myScore} pts • {mySolved} correct
          </p>
        </div>

        <div className="flex-1 space-y-2.5 max-w-sm w-full mx-auto">
          {sorted.map((p, idx) => (
            <div
              key={p.id}
              className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                p.id === myId
                  ? 'bg-orange-500/25 border-orange-400 text-white font-bold'
                  : 'bg-white/5 border-white/10 text-white/85'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <span className="text-lg">{['🥇', '🥈', '🥉'][idx] ?? `#${idx + 1}`}</span>
                <div className="truncate">
                  <p className="text-sm truncate">{p.name}{p.id === myId ? ' (You)' : ''}</p>
                  <p className="text-[11px] text-white/50">{counts[p.id] ?? 0} pictures solved</p>
                </div>
              </div>
              <span className="text-base font-black text-orange-300 tabular-nums">{p.score} pts</span>
            </div>
          ))}
        </div>

        <p className="text-center text-white/40 text-xs pt-4 pb-2">
          Waiting for host to Play Again or return Home…
        </p>
      </div>
    );
  }

  // ── ACTIVE QUESTION / WON / SKIPPED VIEW ──────────────────────────────────
  const {
    sessionId,
    currentQuestionIndex,
    totalQuestions,
    winnerId,
    winnerName,
    pointsAwarded,
    revealedAnswer,
  } = fastestFingerState;

  const isQuestionActive = roundPhase === 'question';
  const activeFeedback =
    fastestFingerGuessFeedback && fastestFingerGuessFeedback.questionId === currentQuestionId
      ? fastestFingerGuessFeedback
      : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isQuestionActive) return;
    const trimmed = guess.trim();
    if (!trimmed) return;

    getSocket().emit('fastest-finger:submit-guess', {
      guess: trimmed,
      sessionId,
      questionId: currentQuestionId,
    });
  }

  return (
    <div className="h-full flex flex-col justify-between bg-gray-950 text-white select-none overflow-hidden">
      {/* Top Header */}
      <div className="px-5 py-3.5 border-b border-white/10 bg-black/50 flex items-center justify-between shrink-0">
        <div>
          <p className="text-[10px] uppercase font-bold text-orange-300 tracking-wider">
            Picture {currentQuestionIndex + 1} of {totalQuestions}
          </p>
          <p className="text-sm font-black text-white">
            Score: <span className="text-orange-400 tabular-nums">{myScore} pts</span>
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/5 border border-white/15 px-3.5 py-1.5 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-white/50">Time</span>
          <span className={`text-xl font-mono font-black tabular-nums ${
            timerRemaining <= 5 && isQuestionActive ? 'text-red-400 animate-pulse' : 'text-orange-300'
          }`}>
            {timerRemaining}s
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center p-5 max-w-md w-full mx-auto space-y-5">
        {isQuestionActive ? (
          <>
            <div className="text-center space-y-1">
              <p className="text-white/60 text-xs uppercase tracking-widest font-bold">
                Look at the TV screen
              </p>
              <h2 className="text-xl font-black text-white">What is in the picture?</h2>
            </div>

            {/* Feedback banner when incorrect (stays non-blocking, input remains active) */}
            {activeFeedback && !activeFeedback.isCorrect && (
              <div className="bg-red-500/20 border border-red-400/50 text-red-200 rounded-2xl px-4 py-3 text-center text-sm font-bold animate-fade-in">
                ❌ {activeFeedback.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                ref={inputRef}
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Type your answer…"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={!isQuestionActive}
                className="w-full px-5 py-4 rounded-2xl bg-white text-gray-950 font-bold text-lg placeholder:text-gray-400 border-2 border-orange-400/60 focus:outline-none focus:border-orange-500 shadow-lg"
              />

              <button
                type="submit"
                disabled={!isQuestionActive}
                className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white font-black text-xl tracking-wide shadow-xl shadow-orange-950/60 transition-all"
              >
                DONE
              </button>
            </form>
          </>
        ) : roundPhase === 'won' ? (
          <div className={`rounded-3xl p-6 text-center space-y-3 border-2 animate-fade-in ${
            winnerId === myId
              ? 'bg-emerald-600/25 border-emerald-400'
              : 'bg-white/5 border-white/15'
          }`}>
            <div className="text-5xl">{winnerId === myId ? '🎉' : '⚡'}</div>
            <h3 className="text-2xl font-black text-white">
              {winnerId === myId
                ? `You won +${pointsAwarded} points!`
                : `${winnerName} answered first!`}
            </h3>
            <p className="text-emerald-300 font-bold text-base">
              Answer: <span className="text-white">{revealedAnswer}</span>
            </p>
            <p className="text-white/50 text-xs animate-pulse pt-2">
              Get ready for the next picture…
            </p>
          </div>
        ) : (
          <div className="rounded-3xl p-6 text-center space-y-3 bg-red-950/30 border-2 border-red-500/40 animate-fade-in">
            <div className="text-5xl">⏰</div>
            <h3 className="text-2xl font-black text-white">Time's Up!</h3>
            <p className="text-red-200 text-sm">Nobody answered correctly.</p>
            <p className="text-white font-bold text-lg">
              Answer: <span className="text-orange-300">{revealedAnswer}</span>
            </p>
            <p className="text-white/50 text-xs animate-pulse pt-2">
              Next picture coming up…
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/10 text-center text-white/40 text-xs shrink-0">
        {isQuestionActive
          ? 'Incorrect guesses can be retried immediately!'
          : 'Input unlocks on the next picture'}
      </div>
    </div>
  );
}
