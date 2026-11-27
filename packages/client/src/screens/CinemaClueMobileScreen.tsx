import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';

export default function CinemaClueMobileScreen() {
  const {
    room,
    myId,
    connected,
    cinemaClueState,
    cinemaClueGuessFeedback,
    setCinemaClueGuessFeedback,
    timerRemaining,
  } = useGameStore();

  const [guess, setGuess] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const currentQuestionId = cinemaClueState?.questionId ?? '';
  const currentClueIndex = cinemaClueState?.currentClueIndex ?? 0;

  // Clear input & feedback on new question or new clue
  useEffect(() => {
    setGuess('');
    setCinemaClueGuessFeedback(null);
  }, [currentQuestionId, currentClueIndex, setCinemaClueGuessFeedback]);

  if (!room) return null;

  const me = room.players.find((p) => p.id === myId);
  const myTeam = me?.team ?? null;

  const settings = room.cinemaClueSettings ?? {
    mode: 'buzz-in',
    clueDurationSeconds: 20,
    totalQuestions: 10,
    difficulty: 'mixed',
    teamAName: 'Team A',
    teamBName: 'Team B',
  };

  // ── LOBBY VIEW ────────────────────────────────────────────────────────────
  if (room.phase === 'lobby' || !cinemaClueState || !cinemaClueState.questionId) {
    const teamACount = room.players.filter((p) => !p.isHost && p.team === 'A').length;
    const teamBCount = room.players.filter((p) => !p.isHost && p.team === 'B').length;

    const modeLabel =
      settings.mode === 'buzz-in'
        ? 'Buzz In Mode'
        : settings.mode === 'alternate-question'
          ? 'Alternate · Per Movie'
          : 'Alternate · Per Clue';

    return (
      <div className="h-full flex flex-col justify-between p-6 bg-gradient-to-b from-gray-950 via-indigo-950/25 to-gray-950 text-white select-none overflow-y-auto">
        <div className="text-center space-y-2 pt-3">
          <div className="text-5xl">🎬🔍</div>
          <h2 className="text-2xl font-black">Cinema Clue Battle</h2>
          <p className="text-indigo-300 text-xs font-bold">
            Room {room.code} • Playing as {me?.name}
          </p>
        </div>

        <div className="my-5 space-y-4 max-w-sm w-full mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 space-y-3">
            <p className="text-xs uppercase tracking-widest font-bold text-white/50 text-center">
              Choose Your Team (1+ Player Needed)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => getSocket().emit('cinema-clue:select-team', { team: 'A' })}
                className={`py-4 rounded-2xl font-black border-2 transition-all ${
                  myTeam === 'A'
                    ? 'bg-cyan-500/30 border-cyan-400 text-white shadow-lg'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <span className="block text-base">{settings.teamAName}</span>
                <span className="text-[11px] font-normal text-cyan-200">{teamACount} joined</span>
              </button>

              <button
                onClick={() => getSocket().emit('cinema-clue:select-team', { team: 'B' })}
                className={`py-4 rounded-2xl font-black border-2 transition-all ${
                  myTeam === 'B'
                    ? 'bg-pink-500/30 border-pink-400 text-white shadow-lg'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <span className="block text-base">{settings.teamBName}</span>
                <span className="text-[11px] font-normal text-pink-200">{teamBCount} joined</span>
              </button>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 text-center">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>Mode: <strong className="text-indigo-300">{modeLabel}</strong></span>
              <span>Clue Timer: <strong className="text-white">{settings.clueDurationSeconds}s</strong></span>
            </div>
            <p className="text-xs text-indigo-300 font-semibold animate-pulse pt-1">
              {myTeam ? 'Waiting for host to start the battle…' : 'Tap Team A or Team B above to join!'}
            </p>
          </div>
        </div>

        <div className="text-center text-white/30 text-xs pb-2">
          Single-player and multi-player teams both supported
        </div>
      </div>
    );
  }

  // ── GAME END VIEW ─────────────────────────────────────────────────────────
  if (room.phase === 'game-end' || cinemaClueState.roundPhase === 'game-end') {
    const aWon = cinemaClueState.teamAScore > cinemaClueState.teamBScore;
    const bWon = cinemaClueState.teamBScore > cinemaClueState.teamAScore;
    const iWon = (myTeam === 'A' && aWon) || (myTeam === 'B' && bWon);
    const tied = cinemaClueState.teamAScore === cinemaClueState.teamBScore;

    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950 text-white text-center space-y-6 select-none">
        <div className="text-7xl">{tied ? '🤝' : iWon ? '🏆' : '🎬'}</div>
        <div>
          <h2 className="text-3xl font-black">
            {tied
              ? "It's a Tie!"
              : aWon
                ? `${cinemaClueState.teamAName} Wins!`
                : `${cinemaClueState.teamBName} Wins!`}
          </h2>
          <p className="text-white/60 text-sm mt-2">
            {cinemaClueState.teamAName}: {cinemaClueState.teamAScore} pts •{' '}
            {cinemaClueState.teamBName}: {cinemaClueState.teamBScore} pts
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-xs text-white/60">
          Host can tap Play Again on the TV screen.
        </div>
      </div>
    );
  }

  // ── ACTIVE GAMEPLAY / REVEAL VIEW ─────────────────────────────────────────
  const myTeamName = myTeam === 'A' ? cinemaClueState.teamAName : cinemaClueState.teamBName;
  const myTeamGuessed =
    myTeam === 'A'
      ? cinemaClueState.teamAGuessedThisClue
      : myTeam === 'B'
        ? cinemaClueState.teamBGuessedThisClue
        : false;

  const isMyTeamEligible =
    cinemaClueState.roundPhase === 'question' &&
    (myTeam === 'A' || myTeam === 'B') &&
    !myTeamGuessed &&
    (cinemaClueState.activeTeam === null || cinemaClueState.activeTeam === myTeam);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cinemaClueState || !isMyTeamEligible || !connected) return;
    const trimmed = guess.trim();
    if (!trimmed) return;

    getSocket().emit('cinema-clue:submit-guess', {
      guess: trimmed,
      sessionId: cinemaClueState.sessionId,
      questionId: cinemaClueState.questionId,
      clueIndex: cinemaClueState.currentClueIndex,
    });
  }

  const activeFeedback =
    cinemaClueGuessFeedback &&
    cinemaClueGuessFeedback.questionId === currentQuestionId &&
    cinemaClueGuessFeedback.clueIndex === currentClueIndex
      ? cinemaClueGuessFeedback
      : null;

  return (
    <div className="h-full flex flex-col justify-between p-4 bg-gradient-to-b from-gray-950 via-indigo-950/20 to-gray-950 text-white select-none overflow-y-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
        <div>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              myTeam === 'A' ? 'bg-cyan-500/25 text-cyan-200' : 'bg-pink-500/25 text-pink-200'
            }`}
          >
            {myTeamName}
          </span>
          <p className="text-[11px] text-white/60 mt-0.5">
            Movie {cinemaClueState.questionNumber}/{cinemaClueState.totalQuestions} • Clue{' '}
            {cinemaClueState.currentClueIndex + 1} ({cinemaClueState.potentialPoints} pts)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right text-[11px] font-mono">
            <span className="text-cyan-300 font-bold">A:{cinemaClueState.teamAScore}</span>
            <span className="text-white/30 mx-1">|</span>
            <span className="text-pink-300 font-bold">B:{cinemaClueState.teamBScore}</span>
          </div>
          <span
            className={`px-3 py-1 rounded-full font-mono text-sm font-black border ${
              cinemaClueState.buzzResponseWindowActive
                ? 'bg-orange-500/30 border-orange-400 text-orange-200 animate-pulse'
                : timerRemaining <= 5
                  ? 'bg-red-500/25 border-red-400 text-red-200 animate-pulse'
                  : 'bg-white/10 border-white/15 text-white'
            }`}
          >
            {timerRemaining}s
          </span>
        </div>
      </div>

      {/* Clues + Answer Box */}
      <div className="my-3 space-y-3 max-w-sm w-full mx-auto">
        {cinemaClueState.roundPhase === 'reveal' && cinemaClueState.revealInfo ? (
          <div className="bg-emerald-500/15 border border-emerald-400/50 rounded-3xl p-5 text-center space-y-2">
            <p className="text-xs font-bold uppercase text-emerald-300">
              {cinemaClueState.revealInfo.winnerTeam
                ? `${cinemaClueState.revealInfo.winnerName} guessed it (+${cinemaClueState.revealInfo.pointsAwarded} pts)!`
                : 'Movie Revealed'}
            </p>
            <p className="ml-text text-2xl font-black text-white">{cinemaClueState.revealInfo.title}</p>
            <p className="text-lg font-bold text-amber-300">
              {cinemaClueState.revealInfo.manglish} ({cinemaClueState.revealInfo.year})
            </p>
          </div>
        ) : (
          <>
            {/* Visible Clues */}
            <div className="space-y-1.5">
              {cinemaClueState.clues.map((c, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl p-3 border text-xs leading-snug ${
                    idx === cinemaClueState.currentClueIndex
                      ? 'bg-indigo-500/25 border-indigo-400 text-white font-bold'
                      : 'bg-white/5 border-white/10 text-white/65'
                  }`}
                >
                  <span className="text-[10px] uppercase text-amber-300 font-black mr-1.5">
                    Clue {idx + 1}:
                  </span>
                  {c}
                </div>
              ))}
            </div>

            {/* Guess Form (NO Pass Button) */}
            {isMyTeamEligible ? (
              <form onSubmit={handleSubmit} className="space-y-2.5 pt-1">
                {cinemaClueState.buzzResponseWindowActive && (
                  <div className="bg-orange-500/20 border border-orange-400 rounded-xl px-3 py-2 text-center text-xs font-black text-orange-200 animate-pulse">
                    🔥 20s Steal Window — Your team can answer!
                  </div>
                )}

                <input
                  ref={inputRef}
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Type Malayalam or English title…"
                  autoComplete="off"
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/10 border-2 border-white/20 focus:border-indigo-400 focus:outline-none text-white text-base font-bold placeholder:text-white/30"
                />

                <button
                  type="submit"
                  disabled={!guess.trim() || !connected}
                  className={`w-full py-3.5 rounded-2xl font-black text-base transition-all ${
                    !guess.trim() || !connected
                      ? 'bg-white/10 text-white/30 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white shadow-lg active:scale-[0.98]'
                  }`}
                >
                  Guessed
                </button>
              </form>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-1">
                <p className="text-sm font-black text-white">
                  {myTeamGuessed
                    ? `Your team used its guess for Clue ${cinemaClueState.currentClueIndex + 1}`
                    : cinemaClueState.buzzResponseWindowActive
                      ? '🔥 Opposing team has 20s to steal…'
                      : `⏳ Waiting for ${
                          cinemaClueState.activeTeam === 'A'
                            ? cinemaClueState.teamAName
                            : cinemaClueState.teamBName
                        }'s turn…`}
                </p>
                <p className="text-[11px] text-white/50">Next clue unlocks automatically if unanswered.</p>
              </div>
            )}

            {activeFeedback && (
              <div
                className={`border rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-center ${
                  activeFeedback.isCorrect
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : activeFeedback.isDuplicate
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-red-500/20 border-red-400 text-red-200'
                }`}
              >
                {activeFeedback.message}
              </div>
            )}
          </>
        )}

        {/* Previously Guessed Movies Panel */}
        {cinemaClueState.guessedMovies.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-white/45 font-bold">
              Previously Guessed Movies ({cinemaClueState.guessedMovies.length})
            </p>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {cinemaClueState.guessedMovies.map((g) => (
                <div key={g.id} className="flex items-center justify-between text-xs bg-white/5 rounded-xl px-2.5 py-1.5">
                  <span className="truncate">
                    <strong className={g.team === 'A' ? 'text-cyan-300' : 'text-pink-300'}>
                      {g.team === 'A' ? cinemaClueState.teamAName : cinemaClueState.teamBName}:
                    </strong>{' '}
                    {g.guess}
                  </span>
                  <span>{g.isCorrect ? '✅' : '❌'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-[10px] text-white/30 pt-1">
        Clue 1: 10 pts • Clue 2: 7 pts • Clue 3: 5 pts • Clue 4: 3 pts
      </div>
    </div>
  );
}
