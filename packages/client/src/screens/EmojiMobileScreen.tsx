import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';
import { useGameStore, selectMyPlayer } from '../store/gameStore';

export default function EmojiMobileScreen() {
  const { room, emojiState, timerRemaining } = useGameStore();
  const myPlayer = useGameStore(selectMyPlayer);

  const [guess, setGuess] = useState('');
  const [hasAnsweredCorrectly, setHasAnsweredCorrectly] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string; points?: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const state = emojiState;
  const isQuestionPhase = state?.roundPhase === 'question';
  const isRevealPhase = state?.roundPhase === 'reveal';
  const isGameEndPhase = state?.roundPhase === 'game-end' || room?.phase === 'game-end';

  const myId = myPlayer?.id || getSocket().id;
  const isMyTurn = state?.mode === 'turn' ? state?.currentTurnPlayerId === myId : true;

  // Reset input state when question changes
  useEffect(() => {
    setGuess('');
    setHasAnsweredCorrectly(false);
    setFeedback(null);
    setSubmitting(false);
    if (isQuestionPhase && isMyTurn) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [state?.currentQuestionIndex, isQuestionPhase, isMyTurn]);

  // Listen to socket feedback
  useEffect(() => {
    const socket = getSocket();
    const onGuessResult = (res: { isCorrect: boolean; message: string; points?: number }) => {
      setFeedback(res);
      setSubmitting(false);
      if (res.isCorrect) {
        setHasAnsweredCorrectly(true);
      }
    };
    socket.on('emoji:guess-result', onGuessResult);
    return () => {
      socket.off('emoji:guess-result', onGuessResult);
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guess.trim() || hasAnsweredCorrectly || submitting || !isQuestionPhase) return;

    setSubmitting(true);
    getSocket().emit('emoji:submit-guess', { guess: guess.trim() });
  }

  if (!room) return null;

  // ────────────────────────────────────────────────────────────────────────────
  // LOBBY STATE
  // ────────────────────────────────────────────────────────────────────────────
  if (room.phase === 'lobby') {
    const players = room.players.filter(p => !p.isHost);
    return (
      <div className="h-full flex flex-col justify-between p-6 bg-gradient-to-b from-gray-950 via-purple-950/40 to-gray-950 select-none">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest block">Room</span>
            <span className="text-2xl font-black text-amber-400 font-mono tracking-widest">{room.code}</span>
          </div>
          <div className="text-right">
            <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest block">Game</span>
            <span className="text-xs font-black text-purple-300">Emoji Challenge</span>
          </div>
        </div>

        {/* Center Card */}
        <div className="card border-2 border-purple-500/30 p-6 text-center animate-fade-in my-auto">
          <span className="text-5xl mb-2 inline-block">🎬📱</span>
          <p className="text-white/40 text-xs uppercase font-bold tracking-widest">You are playing as</p>
          <h3 className="text-2xl font-black text-white mt-1">{myPlayer?.name || 'Player'}</h3>
          <p className="text-white/60 text-xs mt-2">
            {players.length} players joined • Waiting for host to start…
          </p>
        </div>

        {/* Footer */}
        <div className="text-center pb-4 text-white/30 text-xs">
          Watch TV screen for game start
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GAME END STATE
  // ────────────────────────────────────────────────────────────────────────────
  if (isGameEndPhase) {
    const sorted = [...room.players].filter(p => !p.isHost).sort((a, b) => b.score - a.score);
    const myRank = sorted.findIndex(p => p.id === myId) + 1;

    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-950 to-purple-950/50 text-center select-none">
        <span className="text-6xl mb-2">🏆</span>
        <h2 className="text-2xl font-black text-white">Challenge Ended!</h2>
        <div className="card border border-amber-500/40 p-6 rounded-3xl my-6 w-full max-w-xs">
          <p className="text-white/40 text-xs uppercase font-bold tracking-widest">Your Final Rank</p>
          <p className="text-4xl font-black text-amber-400 my-1">
            {myRank === 1 ? '🥇 1st' : myRank === 2 ? '🥈 2nd' : myRank === 3 ? '🥉 3rd' : `#${myRank}`}
          </p>
          <p className="text-white/80 font-bold text-lg mt-2">{myPlayer?.score || 0} pts</p>
        </div>
        <p className="text-white/40 text-xs">Thank you for playing!</p>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ACTIVE QUESTION & REVEAL STATE
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-b from-gray-950 via-purple-950/40 to-gray-950 select-none">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div>
          <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider block">Question</span>
          <span className="text-sm font-black text-white">
            #{(state?.currentQuestionIndex ?? 0) + 1} of {state?.totalQuestions ?? 10}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black px-3 py-1 rounded-full">
            🏆 {myPlayer?.score ?? 0} pts
          </div>
          <div className="bg-purple-950 border border-purple-500/30 text-white font-mono text-xs font-black px-2.5 py-1 rounded-full">
            ⏱️ {timerRemaining}s
          </div>
        </div>
      </div>

      {/* Main Interactive Center */}
      <div className="my-auto w-full max-w-sm mx-auto">
        {/* Emoji Bubble */}
        <div className="card border-2 border-purple-500/30 p-5 text-center bg-black/40 shadow-xl mb-4">
          <span className="text-4xl sm:text-5xl tracking-widest inline-block animate-fade-in py-1">
            {state?.emojis}
          </span>
          <div className="mt-2 text-[11px] text-white/50 font-semibold flex items-center justify-center gap-2">
            <span>{state?.category}</span>
            <span>•</span>
            <span className="capitalize">{state?.difficulty}</span>
          </div>

          {state?.revealedHint && (
            <div className="mt-3 bg-purple-950/50 border border-purple-500/30 rounded-xl p-2.5 text-xs text-purple-200 text-left">
              <span className="font-bold text-amber-300 block text-[10px] uppercase tracking-wider">💡 Hint:</span>
              {state.revealedHint}
            </div>
          )}
        </div>

        {/* Turn-based message */}
        {state?.mode === 'turn' && !isMyTurn && isQuestionPhase && (
          <div className="card bg-white/5 p-4 text-center border border-white/10 mb-4">
            <span className="text-2xl animate-spin inline-block mb-1">⏳</span>
            <p className="text-white text-sm font-bold">
              Waiting for <strong>{state.currentTurnPlayerName}</strong> to answer…
            </p>
          </div>
        )}

        {/* Input Form or Answered Lock */}
        {isQuestionPhase && isMyTurn ? (
          !hasAnsweredCorrectly ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                ref={inputRef}
                type="text"
                value={guess}
                onChange={e => setGuess(e.target.value)}
                placeholder="സിനിമയുടെ പേര് ടൈപ്പ് ചെയ്യൂ..."
                autoComplete="off"
                className="input-field text-base py-3.5 bg-black/40 border-purple-500/40 focus:border-amber-400 text-center"
              />

              <button
                type="submit"
                disabled={!guess.trim() || submitting}
                className="btn-primary py-3.5 text-base font-black bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-2xl shadow-xl shadow-purple-950/50"
              >
                {submitting ? 'Submitting…' : '🚀 Submit Guess'}
              </button>

              {/* Feedback toast */}
              {feedback && (
                <div className={`p-3 rounded-2xl text-xs text-center font-bold animate-fade-in
                  ${feedback.isCorrect ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'}`}>
                  {feedback.message}
                </div>
              )}
            </form>
          ) : (
            <div className="card bg-green-950/50 border-2 border-green-500/50 p-6 text-center animate-bounce-in">
              <span className="text-4xl inline-block mb-1">🎉</span>
              <h3 className="text-xl font-black text-white">ശരിയുത്തരം!</h3>
              <p className="text-green-300 text-xs font-semibold mt-1">
                You got it right! Waiting for others / next question…
              </p>
            </div>
          )
        ) : null}

        {/* Reveal Phase Display */}
        {isRevealPhase && state?.revealedMovie && (
          <div className="card bg-purple-950/60 border-2 border-amber-500/50 p-5 text-center animate-fade-in">
            <span className="text-amber-400 text-[10px] uppercase font-bold tracking-widest block mb-1">
              The Answer / സിനിമ
            </span>
            <h3 className="text-2xl font-black text-white ml-text">
              {state.revealedMovie.title}
            </h3>
            <p className="text-amber-300 text-sm font-bold">
              {state.revealedMovie.manglish} ({state.revealedMovie.year})
            </p>

            <div className="mt-3 pt-2 border-t border-white/10 text-xs text-white/50">
              Next question starting soon on TV…
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-white/20 text-[10px] pb-1">
        Supports Malayalam Unicode & Manglish
      </div>
    </div>
  );
}
