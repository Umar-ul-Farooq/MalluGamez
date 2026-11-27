import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';

export default function LastWordMobileScreen() {
  const {
    room,
    myId,
    connected,
    lastWordState,
    lastWordFeedback,
    setLastWordFeedback,
    timerRemaining,
  } = useGameStore();

  const [answer, setAnswer] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const currentQuestionId = lastWordState?.questionId ?? '';
  const roundPhase = lastWordState?.roundPhase ?? 'active';
  const isMyTurn = Boolean(
    lastWordState &&
      roundPhase === 'active' &&
      lastWordState.currentTurnPlayerId === myId,
  );
  const isEliminated = Boolean(lastWordState?.eliminatedPlayerIds.includes(myId));

  // Clear input & feedback whenever the question changes
  useEffect(() => {
    setAnswer('');
    setLastWordFeedback(null);
  }, [currentQuestionId, setLastWordFeedback]);

  // Focus input when it becomes my turn
  useEffect(() => {
    if (isMyTurn && !lastWordState?.isValidating) {
      inputRef.current?.focus();
    }
  }, [isMyTurn, lastWordState?.isValidating]);

  // Clear input on VALID answer; keep user's text intact on INVALID/UNCERTAIN/API_ERROR for quick retry
  useEffect(() => {
    if (!lastWordFeedback) return;
    if (lastWordFeedback.status === 'VALID' || lastWordFeedback.status === 'TARGET_HIT') {
      setAnswer('');
    } else {
      inputRef.current?.focus();
    }
  }, [lastWordFeedback]);

  if (!room) return null;

  const me = room.players.find((p) => p.id === myId);
  const myScore = me?.score ?? 0;

  // ── LOBBY VIEW ────────────────────────────────────────────────────────────
  if (room.phase === 'lobby' || !lastWordState) {
    const settings = room.lastWordSettings ?? { turnDurationSeconds: 15, difficulty: 'mixed' };
    const players = room.players.filter((p) => !p.isHost);

    return (
      <div className="h-full flex flex-col justify-between p-6 bg-gradient-to-b from-gray-950 via-rose-950/20 to-gray-950 text-white select-none overflow-y-auto">
        <div className="text-center space-y-2 pt-4">
          <div className="text-5xl">💣🗣️</div>
          <h2 className="text-2xl font-black text-white">Last Word Standing</h2>
          <p className="text-rose-300 text-xs font-bold">
            Room {room.code} • Playing as {me?.name}
          </p>
        </div>

        <div className="my-6 space-y-4 max-w-sm w-full mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-3 text-center">
            <p className="text-xs uppercase tracking-widest font-bold text-white/50">Game Settings</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-2xl p-3">
                <span className="text-[10px] uppercase text-white/40 block">Turn Timer</span>
                <span className="text-2xl font-mono font-black text-rose-300">{settings.turnDurationSeconds}s</span>
              </div>
              <div className="bg-white/5 rounded-2xl p-3">
                <span className="text-[10px] uppercase text-white/40 block">Difficulty</span>
                <span className="text-xl font-black text-amber-300 capitalize">{settings.difficulty}</span>
              </div>
            </div>
            <p className="text-xs text-white/60 pt-2">
              Answer the prompt on your turn without hitting the secret target word!
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-xs text-white/60">
              {players.length} player{players.length !== 1 ? 's' : ''} joined
            </p>
            <p className="text-rose-300 text-xs font-semibold mt-1 animate-pulse">
              Waiting for host to start the game…
            </p>
          </div>
        </div>

        <div className="text-center text-white/30 text-xs pb-2">
          Need at least 2 players to start
        </div>
      </div>
    );
  }

  // ── GAME END VIEW ─────────────────────────────────────────────────────────
  if (room.phase === 'game-end' || roundPhase === 'game-end') {
    const iWon = lastWordState.winnerId === myId;
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-950 via-rose-950/25 to-gray-950 text-white text-center space-y-6 select-none">
        <div className="text-7xl">{iWon ? '🏆' : '🎉'}</div>
        <div>
          <p className="text-xs uppercase tracking-widest font-bold text-amber-300">
            {iWon ? 'Victory!' : 'Game Over'}
          </p>
          <h2 className="text-3xl font-black mt-1">
            {iWon
              ? 'You Are the Last Word Standing!'
              : `${lastWordState.winnerName ?? 'Winner'} Wins!`}
          </h2>
          <p className="text-white/60 text-sm mt-2">
            Final Score: <span className="font-mono font-bold text-amber-300">{myScore} pts</span>
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white/60 max-w-xs">
          Look at the TV screen for the full standings or wait for the host to start another match.
        </div>
      </div>
    );
  }

  // ── ELIMINATED SPECTATOR VIEW ─────────────────────────────────────────────
  if (isEliminated) {
    const eliminatedJustNow = lastWordState.eliminatedThisTurn?.playerId === myId;
    return (
      <div className="h-full flex flex-col justify-between p-6 bg-gradient-to-b from-gray-950 via-red-950/30 to-gray-950 text-white select-none">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>{me?.name}</span>
          <span className="font-mono font-bold text-amber-300">{myScore} pts</span>
        </div>

        <div className="max-w-sm w-full mx-auto text-center space-y-5">
          <div className="text-6xl">💀</div>
          <div>
            <h2 className="text-3xl font-black text-red-400">Eliminated!</h2>
            <p className="text-white/75 text-sm mt-2">
              {eliminatedJustNow && lastWordState.eliminatedThisTurn
                ? lastWordState.eliminatedThisTurn.reason === 'target-hit'
                  ? `You hit the secret target word (${lastWordState.eliminatedThisTurn.revealedTarget ?? ''})!`
                  : 'You ran out of time on your turn.'
                : 'You are out for the rest of this match. Watch the remaining players battle on the TV!'}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5">
            <p className="text-[11px] uppercase tracking-widest text-white/40 font-bold">Current Prompt</p>
            <p className="text-base font-bold text-white">{lastWordState.prompt}</p>
            <p className="text-xs text-white/50 pt-1">
              {lastWordState.survivorIds.length} survivor{lastWordState.survivorIds.length !== 1 ? 's' : ''} left
            </p>
          </div>
        </div>

        <div className="text-center text-xs text-red-300/60 pb-2">
          Spectator mode • Wait for the next match
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lastWordState || !isMyTurn || lastWordState.isValidating || !connected) return;
    const trimmed = answer.trim();
    if (!trimmed) return;

    getSocket().emit('last-word:submit-answer', {
      answer: trimmed,
      sessionId: lastWordState.sessionId,
      questionId: lastWordState.questionId,
    });
  }

  const activeFeedback =
    lastWordFeedback && lastWordFeedback.questionId === currentQuestionId
      ? lastWordFeedback
      : null;

  const feedbackStyle =
    activeFeedback?.status === 'VALID'
      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
      : activeFeedback?.status === 'API_ERROR'
        ? 'bg-red-500/20 border-red-400/60 text-red-200'
        : 'bg-amber-500/20 border-amber-400/60 text-amber-200';

  // ── ELIMINATED ROUND INTERMISSION (SURVIVOR) ──────────────────────────────
  if (roundPhase === 'eliminated' && lastWordState.eliminatedThisTurn) {
    return (
      <div className="h-full flex flex-col justify-between p-6 bg-gradient-to-b from-gray-950 via-rose-950/20 to-gray-950 text-white select-none">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>{me?.name} • Round {lastWordState.roundNumber}</span>
          <span className="font-mono font-bold text-amber-300">{myScore} pts</span>
        </div>

        <div className="max-w-sm w-full mx-auto bg-white/5 border border-white/15 rounded-3xl p-6 text-center space-y-4">
          <div className="text-5xl">
            {lastWordState.eliminatedThisTurn.reason === 'target-hit' ? '💥' : '⏰'}
          </div>
          <h2 className="text-2xl font-black text-red-300">
            {lastWordState.eliminatedThisTurn.playerName} Eliminated!
          </h2>
          {lastWordState.eliminatedThisTurn.revealedTarget && (
            <p className="text-sm text-white/80">
              Secret Target was{' '}
              <strong className="text-amber-300">{lastWordState.eliminatedThisTurn.revealedTarget}</strong>
            </p>
          )}
          <p className="text-emerald-300 text-xs font-bold animate-pulse">
            You survived! Next question loading…
          </p>
        </div>

        <div className="text-center text-xs text-white/40 pb-2">
          {lastWordState.survivorIds.length} survivors remaining
        </div>
      </div>
    );
  }

  // ── ACTIVE GAMEPLAY (MY TURN OR WAITING FOR ANOTHER SURVIVOR) ─────────────
  return (
    <div className="h-full flex flex-col justify-between p-5 bg-gradient-to-b from-gray-950 via-rose-950/20 to-gray-950 text-white select-none overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-white/40 font-bold">
            Round {lastWordState.roundNumber} • {lastWordState.category}
          </p>
          <p className="text-xs font-bold text-white/80">{me?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-white/10 font-mono text-xs font-bold text-amber-300">
            {myScore} pts
          </span>
          <span
            className={`px-3 py-1 rounded-full font-mono text-sm font-black border ${
              lastWordState.isValidating
                ? 'bg-violet-500/25 border-violet-400 text-violet-200'
                : timerRemaining <= 5
                  ? 'bg-red-500/25 border-red-400 text-red-200 animate-pulse'
                  : 'bg-white/10 border-white/15 text-white'
            }`}
          >
            {lastWordState.isValidating ? 'Paused' : `${timerRemaining}s`}
          </span>
        </div>
      </div>

      {/* Main Turn Card */}
      <div className="my-4 max-w-sm w-full mx-auto space-y-4">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 text-center space-y-2">
          <p className="text-[11px] uppercase tracking-widest font-bold text-rose-300">Prompt</p>
          <h2 className="text-xl font-black text-white leading-snug">{lastWordState.prompt}</h2>
        </div>

        {isMyTurn ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="bg-rose-500/15 border border-rose-400/50 rounded-2xl px-4 py-2.5 text-center">
              <p className="text-xs font-black uppercase tracking-widest text-rose-200">
                🎯 Your Turn — Avoid the Secret Word!
              </p>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={lastWordState.isValidating}
              placeholder="Type your answer…"
              autoComplete="off"
              autoCapitalize="words"
              className="w-full px-4 py-4 rounded-2xl bg-white/10 border-2 border-white/20 focus:border-rose-400 focus:outline-none text-white text-lg font-bold placeholder:text-white/30 disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={!answer.trim() || lastWordState.isValidating || !connected}
              className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-lg ${
                lastWordState.isValidating
                  ? 'bg-violet-600/70 text-white cursor-wait animate-pulse'
                  : !answer.trim() || !connected
                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white active:scale-[0.98]'
              }`}
            >
              {lastWordState.isValidating ? '🤖 Validating Answer…' : 'Submit Answer'}
            </button>

            {activeFeedback && (
              <div className={`border rounded-2xl px-4 py-3 text-sm font-semibold text-center ${feedbackStyle}`}>
                {activeFeedback.message}
              </div>
            )}
          </form>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center space-y-3">
            {activeFeedback && activeFeedback.status === 'VALID' && (
              <div className="bg-emerald-500/20 border border-emerald-400/50 rounded-2xl px-4 py-2.5 text-sm font-bold text-emerald-200 mb-2">
                {activeFeedback.message}
              </div>
            )}
            <p className="text-xs uppercase tracking-widest text-white/40 font-bold">Waiting Turn</p>
            <p className="text-xl font-black text-white">
              ⏳ {lastWordState.currentTurnPlayerName ?? 'Next player'}’s turn
            </p>
            {lastWordState.isValidating && (
              <p className="text-xs text-violet-300 font-semibold animate-pulse">
                🤖 Verifying their answer…
              </p>
            )}
          </div>
        )}

        {/* Used words summary */}
        {lastWordState.usedAnswers.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
              Already Used ({lastWordState.usedAnswers.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {lastWordState.usedAnswers.map((ans, idx) => (
                <span
                  key={`${ans}-${idx}`}
                  className="px-2.5 py-1 rounded-xl bg-white/10 text-xs font-semibold text-white/80"
                >
                  {ans}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-white/35 pb-1">
        {lastWordState.survivorIds.length} survivor{lastWordState.survivorIds.length !== 1 ? 's' : ''} remaining
      </div>
    </div>
  );
}
