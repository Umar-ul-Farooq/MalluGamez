import { useState } from 'react';
import { getSocket } from '../lib/socket';
import { useGameStore, selectMyPlayer } from '../store/gameStore';
import Timer from '../components/Timer';

export default function ImposterMobileScreen() {
  const {
    room,
    imposterState,
    imposterSecret,
    timerRemaining,
    hasVotedImposter,
  } = useGameStore();

  const myPlayer = useGameStore(selectMyPlayer);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [wordGuessInput, setWordGuessInput] = useState('');
  const [guessSubmitted, setGuessSubmitted] = useState(false);

  if (!room) return null;

  const isImposter = imposterSecret?.isImposter ?? false;
  const isMyClueTurn = imposterState?.currentCluePlayerId === myPlayer?.id;
  const isCaughtImposter = imposterState?.caughtImposterId === myPlayer?.id;

  function handleNextClue() {
    getSocket().emit('imposter:next-clue');
  }

  function handleVote(candidateId: string) {
    if (hasVotedImposter) return;
    setSelectedCandidateId(candidateId);
    getSocket().emit('imposter:vote', { candidateId });
  }

  function handleGuessSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wordGuessInput.trim() || guessSubmitted) return;
    setGuessSubmitted(true);
    getSocket().emit('imposter:submit-word-guess', { guess: wordGuessInput.trim() });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: LOBBY / WAITING
  // ──────────────────────────────────────────────────────────────────────────
  if (room.phase === 'lobby' || !imposterState || imposterState.currentRound === 0) {
    const players = room.players.filter(p => !p.isHost);

    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-gray-950 via-red-950/20 to-gray-950 px-6 py-8 select-none justify-between">
        <div className="text-center">
          <span className="text-5xl animate-bounce">🕵️‍♂️</span>
          <h1 className="text-2xl font-black text-white mt-2">The Imposter</h1>
          <p className="ml-text text-red-400 text-base font-bold">ചതിയൻ</p>
        </div>

        <div className="card bg-white/5 border border-white/10 p-5 rounded-3xl text-center space-y-3">
          <p className="text-white/40 text-xs uppercase font-bold tracking-widest">Your Nickname</p>
          <h3 className="text-2xl font-black text-white">{myPlayer?.name || 'Player'}</h3>
          <p className="text-white/60 text-xs">
            {players.length} players joined • {players.length < 3 ? `Need ${3 - players.length} more` : 'Waiting for host to start…'}
          </p>
        </div>

        <div className="text-center text-white/30 text-xs">
          Watch the TV screen for game start!
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: GAME OVER / FINAL STANDINGS
  // ──────────────────────────────────────────────────────────────────────────
  if (imposterState.roundPhase === 'game-end') {
    const players = room.players.filter(p => !p.isHost).sort((a, b) => b.score - a.score);
    const myRank = players.findIndex(p => p.id === myPlayer?.id) + 1;

    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-950 via-red-950 to-gray-950 text-center select-none">
        <div className="text-7xl mb-3">🏆</div>
        <h1 className="text-3xl font-black text-white">Game Over!</h1>
        <p className="ml-text text-2xl font-bold text-red-400 mt-1">കളി അവസാനിച്ചു!</p>

        <div className="card bg-white/5 border border-white/10 p-6 my-6 w-full max-w-xs space-y-2">
          <p className="text-white/40 text-xs uppercase font-bold tracking-wider">Your Final Result</p>
          <p className="text-3xl font-black text-white">Rank #{myRank}</p>
          <p className="text-xl font-bold text-red-300">{myPlayer?.score ?? 0} Points</p>
        </div>

        <p className="text-white/40 text-xs">Look at the TV for the final podium!</p>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 3: ACTIVE GAME PHASES
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-gray-950 select-none overflow-hidden px-5 py-5 justify-between">

      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div>
          <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Category</span>
          <p className="font-black text-xs text-red-300 truncate max-w-[140px]">
            {imposterSecret?.category ?? imposterState.category}
          </p>
        </div>

        <div className="flex flex-col items-center">
          <Timer remaining={timerRemaining} total={60} />
        </div>

        <div className="text-right">
          <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Round</span>
          <p className="text-white font-black text-sm">
            {imposterState.currentRound} / {imposterState.totalRounds}
          </p>
        </div>
      </div>

      {/* ── PHASE 1: ROLE REVEAL ───────────────────────────────────────────── */}
      {imposterState.roundPhase === 'role-reveal' && (
        <div className="my-auto flex flex-col items-center text-center gap-5 animate-fade-in">
          {isImposter ? (
            <div className="card w-full bg-gradient-to-b from-red-950/60 via-purple-950/40 to-red-950/60 border-2 border-red-500 p-6 rounded-3xl shadow-2xl space-y-3">
              <span className="text-6xl animate-pulse block">🚨</span>
              <div className="inline-block bg-red-600 text-white font-black text-xs uppercase tracking-widest px-4 py-1 rounded-full shadow">
                YOU ARE THE IMPOSTER!
              </div>
              <h2 className="ml-text text-3xl font-black text-white">നിങ്ങൾ ചതിയനാണ്!</h2>
              <div className="border-t border-red-500/30 pt-3 text-red-200 text-xs leading-relaxed space-y-1">
                <p>⚠️ <strong>You DO NOT know the secret word!</strong></p>
                <p>Listen closely to others&apos; clues, pretend you know the word, and give a convincing clue!</p>
                {imposterSecret?.otherImposters && imposterSecret.otherImposters.length > 0 && (
                  <p className="text-amber-300 font-bold mt-2">
                    Fellow Imposter: {imposterSecret.otherImposters.join(', ')}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="card w-full bg-gradient-to-b from-blue-950/40 via-purple-950/30 to-blue-950/40 border-2 border-blue-400 p-6 rounded-3xl shadow-2xl space-y-3">
              <span className="text-5xl block">🤫</span>
              <div className="inline-block bg-blue-500 text-white font-black text-xs uppercase tracking-widest px-4 py-1 rounded-full shadow">
                NORMAL PLAYER / നിരപരാധി
              </div>
              <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Secret Word / രഹസ്യ വാക്ക്</p>
              <h2 className="ml-text text-4xl font-black text-amber-300 leading-tight">
                {imposterSecret?.secretWord}
              </h2>
              <p className="text-white/70 text-base font-bold">
                {imposterSecret?.secretManglish}
              </p>
              <div className="border-t border-white/10 pt-3 text-white/60 text-xs leading-relaxed">
                Give one subtle verbal clue on your turn without giving away the exact word!
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 2: CLUE GIVING ───────────────────────────────────────────── */}
      {imposterState.roundPhase === 'clues' && (
        <div className="my-auto flex flex-col items-center text-center gap-5 animate-fade-in w-full">
          {/* Secret word reference for normal players */}
          {!isImposter && imposterSecret?.secretWord && (
            <div className="card bg-white/5 border border-white/10 py-2 px-4 rounded-xl w-full flex items-center justify-between">
              <span className="text-white/40 text-[10px] uppercase font-bold">Your Word:</span>
              <span className="ml-text text-base font-black text-amber-300">{imposterSecret.secretWord}</span>
              <span className="text-white/50 text-xs font-semibold">({imposterSecret.secretManglish})</span>
            </div>
          )}

          {isMyClueTurn ? (
            <div className="card w-full bg-gradient-to-b from-red-950/50 via-purple-950/30 to-red-950/50 border-2 border-red-400 p-6 rounded-3xl shadow-2xl space-y-4">
              <span className="text-5xl animate-bounce block">🗣️</span>
              <h3 className="text-2xl font-black text-white">YOUR TURN TO SPEAK!</h3>
              <p className="ml-text text-amber-300 text-lg font-bold">നിങ്ങളുടെ ഊഴം!</p>
              <p className="text-white/70 text-xs">
                {isImposter
                  ? 'Give a convincing verbal clue without knowing the secret word!'
                  : 'Speak ONE verbal clue aloud without revealing the secret word!'}
              </p>

              <button
                onClick={handleNextClue}
                className="btn-primary w-full py-4 text-base font-black bg-red-600 hover:bg-red-500 text-white shadow-xl rounded-2xl"
              >
                ✅ I Gave My Clue! (കഴിഞ്ഞു)
              </button>
            </div>
          ) : (
            <div className="card w-full bg-white/5 border border-white/10 p-6 rounded-3xl space-y-3">
              <span className="text-4xl block">👂</span>
              <h3 className="text-xl font-black text-white">
                {imposterState.currentCluePlayerName || 'Someone'} is Speaking
              </h3>
              <p className="ml-text text-red-300 text-sm font-semibold">
                ശ്രദ്ധയോടെ കേൾക്കൂ!
              </p>
              <p className="text-white/40 text-xs">
                {isImposter
                  ? 'Listen carefully to deduce what the secret word might be!'
                  : 'Does their clue sound suspicious or out of place?'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 3: DISCUSSION ────────────────────────────────────────────── */}
      {imposterState.roundPhase === 'discussion' && (
        <div className="my-auto flex flex-col items-center text-center gap-5 animate-fade-in w-full">
          {!isImposter && imposterSecret?.secretWord && (
            <div className="card bg-white/5 border border-white/10 py-2 px-4 rounded-xl w-full flex items-center justify-between">
              <span className="text-white/40 text-[10px] uppercase font-bold">Your Word:</span>
              <span className="ml-text text-base font-black text-amber-300">{imposterSecret.secretWord}</span>
            </div>
          )}

          <div className="card w-full bg-amber-950/30 border-2 border-amber-400/40 p-6 rounded-3xl shadow-2xl space-y-3">
            <span className="text-5xl animate-pulse block">💬</span>
            <h3 className="text-2xl font-black text-white">Discussion Time!</h3>
            <p className="ml-text text-amber-300 text-lg font-bold">ചർച്ച സമയം!</p>
            <p className="text-white/70 text-xs leading-relaxed">
              Speak aloud with everyone! Defend yourself and challenge players with suspicious clues!
            </p>
          </div>
        </div>
      )}

      {/* ── PHASE 4: VOTING & TIE-BREAK ────────────────────────────────────── */}
      {(imposterState.roundPhase === 'voting' || imposterState.roundPhase === 'tie-break') && (
        <div className="my-auto flex flex-col items-center gap-4 animate-fade-in w-full">
          <div className="text-center">
            <h3 className="text-xl font-black text-white">
              {imposterState.roundPhase === 'tie-break' ? '⚖️ Tie-Break Vote!' : '🗳️ Vote for the Imposter'}
            </h3>
            <p className="ml-text text-red-400 text-xs font-bold">
              ചതിയൻ ആരാണ്? വോട്ട് ചെയ്യൂ!
            </p>
          </div>

          {hasVotedImposter ? (
            <div className="card bg-emerald-950/40 border-2 border-emerald-500/50 p-6 rounded-3xl text-center space-y-2 w-full animate-bounce-in">
              <span className="text-4xl">✅</span>
              <h4 className="text-emerald-300 font-black text-lg">Vote Submitted!</h4>
              <p className="text-white/60 text-xs">
                Waiting for remaining players to cast their votes…
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full max-h-72 overflow-y-auto pr-1">
              {room.players
                .filter(p => !p.isHost && p.id !== myPlayer?.id)
                .filter(p => {
                  if (imposterState.roundPhase === 'tie-break' && imposterState.tiedCandidateIds) {
                    return imposterState.tiedCandidateIds.includes(p.id);
                  }
                  return true;
                })
                .map(candidate => (
                  <button
                    key={candidate.id}
                    onClick={() => handleVote(candidate.id)}
                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-red-600/30 border border-white/10 hover:border-red-400 text-left flex items-center justify-between transition-all active:scale-95"
                  >
                    <span className="text-white font-bold text-base flex items-center gap-2">
                      <span>👤</span>
                      <span>{candidate.name}</span>
                    </span>
                    <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2.5 py-1 rounded-lg">
                      Vote / വോട്ട്
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 5: IMPOSTER FINAL GUESS ──────────────────────────────────── */}
      {imposterState.roundPhase === 'imposter-guess' && (
        <div className="my-auto flex flex-col items-center text-center gap-5 animate-fade-in w-full">
          {isCaughtImposter ? (
            <div className="card w-full bg-red-950/60 border-2 border-red-500 p-6 rounded-3xl shadow-2xl space-y-3">
              <span className="text-5xl animate-bounce block">🎯</span>
              <h3 className="text-2xl font-black text-white">YOU WERE CAUGHT!</h3>
              <p className="ml-text text-amber-300 text-sm font-bold">
                രഹസ്യ വാക്ക് ഊഹിച്ചാൽ നിങ്ങൾക്ക് വിജയിക്കാം!
              </p>
              <p className="text-white/70 text-xs">
                Guess the secret word below to steal the victory (+5 pts):
              </p>

              <form onSubmit={handleGuessSubmit} className="space-y-3 pt-2">
                <input
                  type="text"
                  value={wordGuessInput}
                  onChange={e => setWordGuessInput(e.target.value)}
                  placeholder="Type secret word (Malayalam or Manglish)…"
                  disabled={guessSubmitted}
                  className="input-field text-center text-lg w-full"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!wordGuessInput.trim() || guessSubmitted}
                  className="btn-primary w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-lg"
                >
                  {guessSubmitted ? 'Submitted!' : 'Submit Final Guess / അയക്കൂ'}
                </button>
              </form>
            </div>
          ) : (
            <div className="card w-full bg-white/5 border border-white/10 p-6 rounded-3xl space-y-2">
              <span className="text-4xl block">⏳</span>
              <h3 className="text-xl font-black text-white">Imposter Was Caught!</h3>
              <p className="text-white/60 text-xs">
                {imposterState.caughtImposterName} is currently submitting their final guess on their phone…
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 6: ROUND END ─────────────────────────────────────────────── */}
      {imposterState.roundPhase === 'round-end' && imposterState.roundResult && (
        <div className="my-auto flex flex-col items-center text-center gap-4 animate-bounce-in w-full">
          <div className="text-5xl">
            {imposterState.roundResult.winner === 'normal' ? '🎉' : '😈'}
          </div>

          <div>
            <h3 className="text-xl font-black text-white">
              {imposterState.roundResult.winner === 'normal' ? 'Normal Players Won!' : 'Imposter Won!'}
            </h3>
            <p className="text-white/50 text-xs mt-0.5">{imposterState.roundResult.reason}</p>
          </div>

          <div className="card w-full bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1">
            <span className="text-white/40 text-[10px] uppercase font-bold">Secret Word:</span>
            <p className="ml-text text-2xl font-black text-amber-300">
              {imposterState.revealedWord?.word}
            </p>
            <p className="text-white/60 text-xs font-semibold">
              {imposterState.revealedWord?.manglish}
            </p>
          </div>

          <div className="card w-full bg-red-950/30 border border-red-500/30 p-3 rounded-2xl">
            <p className="text-red-400 text-xs font-bold">
              Imposter: {imposterState.imposterIds?.map(id => room.players.find(p => p.id === id)?.name).join(', ')}
            </p>
            {myPlayer && imposterState.roundResult.pointsAwarded[myPlayer.id] ? (
              <p className="text-emerald-400 font-black text-sm mt-1">
                You earned +{imposterState.roundResult.pointsAwarded[myPlayer.id]} points this round!
              </p>
            ) : (
              <p className="text-white/40 text-xs mt-1">No points earned this round</p>
            )}
          </div>
        </div>
      )}

      {/* ── Footer Role Pill ──────────────────────────────────────────────── */}
      <div className="text-center pt-2 border-t border-white/5 shrink-0">
        <span className="text-[11px] text-white/40 font-semibold">
          Playing as: <strong className="text-white">{myPlayer?.name}</strong> •{' '}
          {isImposter ? (
            <span className="text-red-400 font-bold">Imposter (ചതിയൻ)</span>
          ) : (
            <span className="text-blue-300 font-bold">Normal Player</span>
          )}
        </span>
      </div>

    </div>
  );
}
