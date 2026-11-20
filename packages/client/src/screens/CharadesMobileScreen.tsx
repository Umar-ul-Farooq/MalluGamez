import { useState } from 'react';
import { getSocket } from '../lib/socket';
import { useGameStore, selectMyPlayer } from '../store/gameStore';
import Timer from '../components/Timer';

export default function CharadesMobileScreen() {
  const {
    room,
    charadesState,
    secretMovie,
    timerRemaining,
    lastCharadesRoundEnd,
    incorrectFeedbackTrigger,
  } = useGameStore();

  const myPlayer = useGameStore(selectMyPlayer);
  const [readyClicked, setReadyClicked] = useState(false);
  const [submittingJudge, setSubmittingJudge] = useState(false);

  if (!room) return null;

  const myTeam = myPlayer?.team;
  const teamAName = charadesState?.teamAName ?? room.charadesSettings?.teamAName ?? 'Team A';
  const teamBName = charadesState?.teamBName ?? room.charadesSettings?.teamBName ?? 'Team B';
  const totalSecs = room.charadesSettings?.roundDurationSeconds ?? 90;

  function handleSelectTeam(team: 'A' | 'B') {
    getSocket().emit('charades:select-team', { team });
  }

  function handleActorReady() {
    setReadyClicked(true);
    getSocket().emit('charades:actor-ready');
  }

  function handleJudge(isCorrect: boolean) {
    if (submittingJudge) return;
    if (isCorrect) setSubmittingJudge(true);
    getSocket().emit('charades:judge-action', { isCorrect });
    if (!isCorrect) {
      setTimeout(() => setSubmittingJudge(false), 800);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: LOBBY & TEAM SELECTION
  // ──────────────────────────────────────────────────────────────────────────
  if (room.phase === 'lobby' || !charadesState?.teamsLocked) {
    const teamMembers = room.players.filter(p => !p.isHost && p.team === myTeam);

    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-gray-950 via-purple-950/30 to-gray-950 px-6 py-6 select-none overflow-hidden justify-between">
        {/* Header */}
        <div className="text-center shrink-0">
          <span className="text-4xl animate-bounce">🎭</span>
          <h1 className="text-2xl font-black text-white mt-1">Dumb Charades</h1>
          <p className="ml-text text-amber-300 text-sm font-bold">ടീം തിരഞ്ഞെടുക്കുക</p>
        </div>

        {/* Team Selection Cards */}
        <div className="flex flex-col gap-4 my-auto">
          <p className="text-white/60 text-xs uppercase tracking-widest font-bold text-center">
            Tap a team to join
          </p>

          {/* Team A Button */}
          <button
            onClick={() => handleSelectTeam('A')}
            className={`p-5 rounded-3xl border-2 text-left transition-all relative overflow-hidden
              ${myTeam === 'A'
                ? 'bg-blue-600/30 border-blue-400 ring-2 ring-blue-400 shadow-xl shadow-blue-950/60 scale-[1.02]'
                : 'bg-white/5 border-white/10 opacity-70 hover:opacity-100'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚡</span>
                <div>
                  <h3 className="text-xl font-black text-blue-300">{teamAName}</h3>
                  <p className="text-white/50 text-xs">Team A</p>
                </div>
              </div>
              {myTeam === 'A' && (
                <span className="bg-blue-500 text-white font-black text-xs px-3 py-1 rounded-full">
                  YOUR TEAM
                </span>
              )}
            </div>
          </button>

          {/* Team B Button */}
          <button
            onClick={() => handleSelectTeam('B')}
            className={`p-5 rounded-3xl border-2 text-left transition-all relative overflow-hidden
              ${myTeam === 'B'
                ? 'bg-amber-600/30 border-amber-400 ring-2 ring-amber-400 shadow-xl shadow-amber-950/60 scale-[1.02]'
                : 'bg-white/5 border-white/10 opacity-70 hover:opacity-100'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔥</span>
                <div>
                  <h3 className="text-xl font-black text-amber-300">{teamBName}</h3>
                  <p className="text-white/50 text-xs">Team B</p>
                </div>
              </div>
              {myTeam === 'B' && (
                <span className="bg-amber-500 text-gray-950 font-black text-xs px-3 py-1 rounded-full">
                  YOUR TEAM
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Footer info */}
        <div className="card bg-white/5 border border-white/10 p-4 text-center shrink-0">
          {myTeam ? (
            <div>
              <p className="text-white font-bold text-sm">
                Joined {myTeam === 'A' ? teamAName : teamBName}
              </p>
              <p className="text-white/40 text-xs mt-1">
                {teamMembers.length} teammates • Waiting for host to start…
              </p>
            </div>
          ) : (
            <p className="text-amber-300 text-sm font-semibold animate-pulse">
              Please choose Team A or Team B above!
            </p>
          )}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: GAME OVER / FINAL STANDING
  // ──────────────────────────────────────────────────────────────────────────
  if (charadesState?.roundPhase === 'game-end') {
    const isTeamAWinner = charadesState.teamAScore > charadesState.teamBScore;
    const isTie = charadesState.teamAScore === charadesState.teamBScore;
    const didMyTeamWin = !isTie && ((myTeam === 'A' && isTeamAWinner) || (myTeam === 'B' && !isTeamAWinner));

    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-950 via-purple-950 to-gray-950 text-center select-none">
        <div className="text-7xl mb-3">🏆</div>
        <h1 className="text-3xl font-black text-white">Game Over!</h1>
        <p className="ml-text text-2xl font-bold text-amber-300 mt-2">
          {isTie ? 'സമനിലയിൽ അവസാനിച്ചു!' : didMyTeamWin ? 'നിങ്ങളുടെ ടീം വിജയിച്ചു! 🎉' : 'കളി അവസാനിച്ചു!'}
        </p>

        <div className="card bg-white/5 border border-white/10 p-6 my-6 w-full max-w-xs space-y-3">
          <div className="flex justify-between items-center text-blue-300 font-bold">
            <span>{charadesState.teamAName}</span>
            <span className="text-2xl text-white font-black">{charadesState.teamAScore} pts</span>
          </div>
          <div className="border-t border-white/10 pt-3 flex justify-between items-center text-amber-300 font-bold">
            <span>{charadesState.teamBName}</span>
            <span className="text-2xl text-white font-black">{charadesState.teamBScore} pts</span>
          </div>
        </div>

        <p className="text-white/40 text-xs">Look at the TV for final standings!</p>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 3: IN-GAME ACTIVE ROLES
  // ──────────────────────────────────────────────────────────────────────────
  const isActor = charadesState?.currentActorId === myPlayer?.id;
  const isActingTeam = myTeam === charadesState?.actingTeam;
  const isJudgingTeam = myTeam === charadesState?.judgingTeam;

  const actingTeamName = charadesState?.actingTeam === 'A' ? teamAName : teamBName;
  const judgingTeamName = charadesState?.judgingTeam === 'A' ? teamAName : teamBName;

  return (
    <div className="h-full flex flex-col bg-gray-950 select-none overflow-hidden px-5 py-5 justify-between">

      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div>
          <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Your Team</span>
          <p className={`font-black text-sm ${myTeam === 'A' ? 'text-blue-300' : 'text-amber-300'}`}>
            {myTeam === 'A' ? teamAName : teamBName}
          </p>
        </div>

        <div className="flex flex-col items-center">
          <Timer remaining={timerRemaining} total={totalSecs} />
        </div>

        <div className="text-right">
          <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Turn</span>
          <p className="text-white font-black text-sm">
            {charadesState?.currentRoundNumber} / {charadesState?.totalRounds}
          </p>
        </div>
      </div>

      {/* ── ROUND-END OVERLAY FOR MOBILE ───────────────────────────────────── */}
      {charadesState?.roundPhase === 'round-end' && charadesState.revealedMovie && (
        <div className="my-auto text-center space-y-4 animate-bounce-in">
          <div className="text-6xl">
            {charadesState.lastRoundResult?.type === 'correct' ? '🎉' : '⏰'}
          </div>
          <div>
            <p className="text-white/50 text-xs uppercase tracking-widest font-bold">The Movie Was / സിനിമ</p>
            <h2 className="ml-text text-4xl font-black text-amber-300 mt-1">
              {charadesState.revealedMovie.title}
            </h2>
            <p className="text-white/60 text-lg font-bold mt-1">
              {charadesState.revealedMovie.manglish} ({charadesState.revealedMovie.year})
            </p>
          </div>
          <div className="card bg-white/10 border border-white/20 py-3 px-4 rounded-2xl">
            <p className="text-base font-black text-white">
              {charadesState.lastRoundResult?.type === 'correct'
                ? `✅ ${actingTeamName} got it! (+2 Pts)`
                : `❌ Time Up! ${judgingTeamName} gets points (+2 Pts)`}
            </p>
          </div>
          <p className="text-white/40 text-xs">Next turn starting soon…</p>
        </div>
      )}

      {/* ── ROLE 1: SELECTED ACTOR ─────────────────────────────────────────── */}
      {charadesState?.roundPhase !== 'round-end' && isActor && (
        <div className="my-auto flex flex-col items-center text-center gap-5 animate-fade-in">
          <div className="inline-block bg-amber-500 text-gray-950 font-black text-xs uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
            YOU ARE THE ACTOR! / നിങ്ങൾ അഭിനയിക്കുന്നു!
          </div>

          {/* Secret Movie Card */}
          <div className="card w-full bg-gradient-to-b from-amber-950/40 via-purple-950/30 to-amber-950/40 border-2 border-amber-400 p-6 rounded-3xl shadow-2xl">
            <p className="text-amber-300/80 text-xs uppercase tracking-widest font-bold mb-1">
              Secret Malayalam Movie
            </p>
            <h2 className="ml-text text-4xl font-black text-white leading-tight">
              {secretMovie?.title ?? 'ലോഡിംഗ്…'}
            </h2>
            <p className="text-amber-200 text-lg font-bold mt-2">
              {secretMovie?.manglish} {secretMovie?.year ? `(${secretMovie.year})` : ''}
            </p>
          </div>

          {/* Rules checklist */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full text-left text-xs text-white/70 space-y-1.5">
            <p className="font-bold text-white text-xs mb-1">Acting Rules:</p>
            <p>🚫 No speaking or sounds (ശബ്ദം ഉണ്ടാക്കരുത്)</p>
            <p>✋ Only gestures & body language (ആംഗ്യം മാത്രം)</p>
            <p>❌ No lip movement / spelling letters</p>
          </div>

          {/* Ready Button */}
          {charadesState?.roundPhase === 'actor-ready' && (
            <button
              onClick={handleActorReady}
              disabled={readyClicked}
              className={`btn-primary w-full text-xl py-4 bg-amber-500 hover:bg-amber-600 text-gray-950 font-black shadow-xl
                ${readyClicked ? 'opacity-50' : 'animate-pulse'}`}
            >
              {readyClicked ? '⏳ Starting…' : '✅ I Am Ready! (തുടങ്ങാം)'}
            </button>
          )}

          {charadesState?.roundPhase === 'acting' && (
            <div className="text-white/60 text-xs font-semibold">
              Act it out now! Your teammates are watching and guessing.
            </div>
          )}
        </div>
      )}

      {/* ── ROLE 2: ACTING TEAMMATE (GUESSING) ──────────────────────────────── */}
      {charadesState?.roundPhase !== 'round-end' && !isActor && isActingTeam && (
        <div className="my-auto flex flex-col items-center text-center gap-6 animate-fade-in">
          <div className="w-24 h-24 bg-blue-600/20 border-2 border-blue-400/50 rounded-3xl flex items-center justify-center text-5xl shadow-xl">
            👀
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white">
              Watch & Guess!
            </h2>
            <p className="ml-text text-xl font-bold text-blue-300">
              {charadesState?.currentActorName} അഭിനയിക്കുന്നു!
            </p>
          </div>

          <div className="card w-full bg-blue-950/40 border border-blue-400/30 p-5 rounded-2xl">
            <p className="text-yellow-300 font-extrabold text-lg mb-1">
              📢 ഉത്തരം ഉറക്കെ വിളിച്ചു പറയൂ!
            </p>
            <p className="text-white/70 text-xs leading-relaxed">
              Watch {charadesState?.currentActorName} on the floor. Shout your movie guesses out loud! The opposing team is listening and judging.
            </p>
          </div>

          <div className="text-white/40 text-xs">
            (Do not type! Verbal guesses only!)
          </div>
        </div>
      )}

      {/* ── ROLE 3: OPPOSING JUDGING TEAM ──────────────────────────────────── */}
      {charadesState?.roundPhase !== 'round-end' && isJudgingTeam && (
        <div className="my-auto flex flex-col items-center text-center gap-5 animate-fade-in">
          <div className="inline-block bg-purple-500/30 border border-purple-400/40 text-purple-200 text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full">
            YOU ARE JUDGING! / നിങ്ങൾ ജഡ്ജ് ചെയ്യുന്നു
          </div>

          {/* Secret Movie Reveal for Judges */}
          <div className="card w-full bg-purple-950/40 border-2 border-purple-400/50 p-5 rounded-3xl shadow-xl">
            <p className="text-white/50 text-[11px] uppercase tracking-widest font-bold mb-1">
              Secret Movie to Listen For
            </p>
            <h3 className="ml-text text-3xl font-black text-amber-300 leading-tight">
              {secretMovie?.title ?? 'ലോഡിംഗ്…'}
            </h3>
            <p className="text-white/70 text-sm font-semibold mt-1">
              {secretMovie?.manglish} {secretMovie?.year ? `(${secretMovie.year})` : ''}
            </p>
          </div>

          <p className="text-white/70 text-xs font-medium">
            Listen to {actingTeamName}'s verbal guesses. Tap when you hear the answer:
          </p>

          {/* Large Tactile Judging Buttons */}
          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              onClick={() => handleJudge(false)}
              className={`bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-lg py-5 px-3 rounded-2xl shadow-xl border border-red-400/40 active:scale-95 transition-all flex flex-col items-center justify-center gap-1
                ${incorrectFeedbackTrigger ? 'animate-shake' : ''}`}
            >
              <span className="text-2xl">❌</span>
              <span>INCORRECT</span>
              <span className="text-[10px] text-red-200 font-normal">തെറ്റായ ഉത്തരം</span>
            </button>

            <button
              onClick={() => handleJudge(true)}
              disabled={submittingJudge}
              className={`bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-black text-lg py-5 px-3 rounded-2xl shadow-xl border border-green-400/40 active:scale-95 transition-all flex flex-col items-center justify-center gap-1
                ${submittingJudge ? 'opacity-50' : ''}`}
            >
              <span className="text-2xl">✅</span>
              <span>CORRECT!</span>
              <span className="text-[10px] text-green-200 font-normal">ശരിയാണ് (+2 Pts)</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="text-center text-white/30 text-[10px] shrink-0 pt-2 border-t border-white/5">
        Room: <span className="font-mono text-white/50">{room.code}</span> • Malayalam Dumb Charades
      </div>

    </div>
  );
}
