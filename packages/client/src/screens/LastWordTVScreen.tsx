import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';
import type { LastWordSettings } from '@chitram/shared';

const TURN_TIMER_OPTIONS: Array<10 | 15 | 20 | 30> = [10, 15, 20, 30];
const DIFFICULTY_OPTIONS: Array<{ value: LastWordSettings['difficulty']; label: string }> = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
];

interface Props {
  hostIP: string;
}

export default function LastWordTVScreen({ hostIP }: Props) {
  const navigate = useNavigate();
  const { room, connected, lastWordState, timerRemaining } = useGameStore();

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!room) return null;

  const players = room.players.filter((p) => !p.isHost);
  const canStart = players.length >= 2;

  const settings: LastWordSettings = room.lastWordSettings ?? {
    turnDurationSeconds: 15,
    difficulty: 'mixed',
  };

  function updateSettings(patch: Partial<LastWordSettings>) {
    getSocket().emit('last-word:update-settings', patch);
  }

  function startGame() {
    if (!canStart) return;
    getSocket().emit('last-word:start-game');
  }

  function restartGame() {
    getSocket().emit('last-word:restart-game');
  }

  function confirmExit() {
    getSocket().emit('room:terminate');
    sessionStorage.removeItem('chitram_tv_host');
    useGameStore.getState().reset();
    setShowExitConfirm(false);
    navigate('/');
  }

  function confirmForceReset() {
    getSocket().emit('room:force-reset', { roomCode: room?.code, hostToken: room?.hostToken });
    sessionStorage.removeItem('chitram_tv_host');
    useGameStore.getState().reset();
    setShowResetConfirm(false);
    navigate('/');
  }

  const renderModals = () => (
    <>
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#1a0f1e] border-2 border-white/20 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl space-y-5">
            <div className="text-5xl">🚪</div>
            <div>
              <h3 className="text-2xl font-black text-white">Exit Game?</h3>
              <p className="text-red-400 font-bold mt-1">കളി അവസാനിപ്പിക്കണോ?</p>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              This will end the game session for all connected players and return everyone to the home screen.
            </p>
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 text-sm font-bold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
              >
                Cancel / വേണ്ട
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 py-3 text-sm font-black bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg transition-all"
              >
                Yes, Exit Game
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#1a0f1e] border-2 border-red-500/40 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl space-y-5">
            <div className="text-5xl">⚠️</div>
            <div>
              <h3 className="text-2xl font-black text-red-400">Force Reset Session?</h3>
              <p className="text-white/70 font-semibold mt-1">Emergency Override / അടിയന്തര റീസെറ്റ്</p>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              This clears the current session and disconnects all players cleanly.
            </p>
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 text-sm font-bold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmForceReset}
                className="flex-1 py-3 text-sm font-black bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg transition-all"
              >
                Force Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: LOBBY
  // ──────────────────────────────────────────────────────────────────────────
  if (room.phase === 'lobby' || !lastWordState) {
    const isHostedDomain =
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';

    const joinUrl = isHostedDomain
      ? `${window.location.origin}/lobby?room=${room.code}`
      : `http://${hostIP || 'localhost'}:3000/lobby?room=${room.code}`;

    const displayUrl = isHostedDomain
      ? window.location.host
      : hostIP
        ? `http://${hostIP}:3000`
        : 'getting IP…';

    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-gray-950 via-rose-950/25 to-gray-950 overflow-hidden select-none">
        {renderModals()}
        {/* Top bar */}
        <div className="flex items-center justify-between px-10 pt-6 pb-3">
          <div className="flex items-center gap-5">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 hover:bg-white/20 transition-all font-semibold"
            >
              ← Home / പ്രധാന പേജ്
            </button>
            <div className="flex items-center gap-3">
              <span className="text-4xl">💣🗣️</span>
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Last Word Standing</h1>
                <p className="ml-text text-rose-300 text-base font-semibold">രഹസ്യ വാക്ക് ഒഴിവാക്കൂ — അവസാനം വരെ നിൽക്കൂ!</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-5 py-2 backdrop-blur-md">
              <span className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-white/80 font-medium text-sm">
                {players.length} player{players.length !== 1 ? 's' : ''} joined
              </span>
            </div>

            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-[11px] text-white/30 hover:text-red-400 hover:bg-red-950/30 border border-white/10 hover:border-red-500/40 px-2.5 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5"
              title="Force reset this room"
            >
              <span>🔄</span>
              <span>Force Reset</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-8 px-10 pb-8 overflow-hidden items-center">
          {/* Left: QR Code */}
          <div className="w-80 shrink-0 bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
            <p className="text-white/60 text-xs uppercase tracking-widest font-bold">Join Game / ചേരുക</p>
            <div className="bg-white p-3.5 rounded-2xl shadow-2xl">
              <QRCodeSVG value={joinUrl} size={180} level="M" />
            </div>
            <div>
              <p className="text-white/40 text-xs">Go to / പോകുക:</p>
              <p className="text-rose-300 font-bold text-sm tracking-wide">{displayUrl}</p>
            </div>
            <div className="bg-white/10 border border-white/15 px-6 py-2.5 rounded-2xl w-full">
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Room Code</p>
              <p className="text-4xl font-mono font-black text-white tracking-[0.2em]">{room.code}</p>
            </div>
          </div>

          {/* Middle: Players List */}
          <div className="flex-1 h-full min-h-0 bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <span>Joined Players</span>
                <span className="text-rose-400 text-sm font-normal">({players.length})</span>
              </h2>
              {players.length < 2 && (
                <span className="text-amber-400 text-xs font-semibold animate-pulse">
                  ⚠️ Need at least 2 players to start!
                </span>
              )}
            </div>

            {players.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-center gap-3">
                <span className="text-6xl">📱</span>
                <p className="text-base font-medium">Scan the QR code on your phones to join!</p>
                <p className="text-xs text-white/40 max-w-xs">
                  Each player takes turns answering the prompt without hitting the secret trap word.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto pr-1">
                {players.map((p, idx) => (
                  <div
                    key={p.id}
                    className="bg-white/10 border border-white/15 rounded-2xl p-4 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white font-black text-base shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-bold truncate">{p.name}</p>
                      <p className="text-xs text-emerald-400">Ready</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Settings & Start */}
          <div className="w-96 shrink-0 h-full min-h-0 bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between gap-4 overflow-y-auto">
            <div className="space-y-5">
              <div>
                <h2 className="text-white font-bold text-lg">Game Settings</h2>
                <p className="text-white/40 text-xs">Settings lock once the game begins</p>
              </div>

              {/* Turn Timer */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest font-bold text-white/60 block">
                  Seconds Per Turn
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TURN_TIMER_OPTIONS.map((sec) => {
                    const active = settings.turnDurationSeconds === sec;
                    return (
                      <button
                        key={sec}
                        onClick={() => updateSettings({ turnDurationSeconds: sec })}
                        className={`py-2.5 rounded-xl font-bold text-sm transition-all border ${
                          active
                            ? 'bg-rose-500 text-white border-rose-300 shadow-lg shadow-rose-500/30'
                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {sec}s
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest font-bold text-white/60 block">
                  Question Difficulty
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DIFFICULTY_OPTIONS.map((opt) => {
                    const active = settings.difficulty === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => updateSettings({ difficulty: opt.value })}
                        className={`py-2.5 rounded-xl font-bold text-sm transition-all border ${
                          active
                            ? 'bg-amber-500 text-black border-amber-300 shadow-lg'
                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rules Summary */}
              <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-2 text-xs text-white/70 leading-relaxed">
                <p className="font-bold text-rose-300 uppercase tracking-wider text-[11px]">How To Play</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Take turns typing answers matching the TV prompt</li>
                  <li>Avoid the hidden <strong>Secret Target</strong> word</li>
                  <li>Creative & unusual valid answers are verified automatically</li>
                  <li>Hit the secret target or run out of time = <strong>Eliminated</strong></li>
                  <li>Last player standing wins!</li>
                </ul>
              </div>
            </div>

            <button
              onClick={startGame}
              disabled={!canStart}
              className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl ${
                canStart
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {canStart ? '💣 Start Game' : 'Need 2+ Players'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: GAME END (LAST WORD STANDING WINNER)
  // ──────────────────────────────────────────────────────────────────────────
  if (room.phase === 'game-end' || lastWordState.roundPhase === 'game-end') {
    const rankedPlayers = [...players].sort((a, b) => {
      if (a.id === lastWordState.winnerId) return -1;
      if (b.id === lastWordState.winnerId) return 1;
      return b.score - a.score;
    });

    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-gray-950 via-rose-950/30 to-gray-950 overflow-hidden select-none p-8">
        {renderModals()}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🏆</span>
            <div>
              <h1 className="text-3xl font-black text-white">Last Word Standing — Winner!</h1>
              <p className="text-rose-300 text-sm font-semibold">
                {lastWordState.winnerName
                  ? `${lastWordState.winnerName} survived all rounds!`
                  : 'Game Complete'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={restartGame}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-black shadow-lg transition-all"
            >
              🔄 Play Again
            </button>
            <button
              onClick={() => setShowExitConfirm(true)}
              className="btn-secondary px-5 py-3 rounded-2xl font-bold"
            >
              ← Home
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 overflow-y-auto">
          {lastWordState.winnerName && (
            <div className="bg-gradient-to-br from-amber-500/20 to-rose-500/20 border-2 border-amber-400/60 rounded-3xl px-12 py-8 text-center shadow-2xl">
              <div className="text-6xl mb-3">👑</div>
              <p className="text-xs uppercase tracking-widest text-amber-300 font-black">Last Word Standing Champion</p>
              <h2 className="text-5xl font-black text-white mt-2">{lastWordState.winnerName}</h2>
            </div>
          )}

          <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
            <h3 className="text-xs uppercase tracking-widest font-bold text-white/50">Final Standings</h3>
            {rankedPlayers.map((p, idx) => {
              const isWinner = p.id === lastWordState.winnerId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-5 py-3.5 rounded-2xl border ${
                    isWinner
                      ? 'bg-amber-500/15 border-amber-400/50'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-white/70 w-7">#{idx + 1}</span>
                    <span className="text-white font-bold text-lg">{p.name}</span>
                    {isWinner && (
                      <span className="text-xs bg-amber-500 text-black font-black px-2 py-0.5 rounded-full">
                        SURVIVOR
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-black text-amber-300 text-lg">{p.score} pts</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 3: ACTIVE GAMEPLAY & ELIMINATION REVEAL
  // ──────────────────────────────────────────────────────────────────────────
  const isEliminatedReveal = lastWordState.roundPhase === 'eliminated' && lastWordState.eliminatedThisTurn;
  const urgentTimer = timerRemaining <= 5 && !lastWordState.isValidating && !isEliminatedReveal;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-950 via-rose-950/20 to-gray-950 overflow-hidden select-none">
      {renderModals()}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-8 pt-5 pb-3 border-b border-white/10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="btn-secondary text-xs py-2 px-3 font-semibold"
          >
            ← Exit
          </button>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">💣🗣️</span>
            <span className="text-xl font-black text-white">Last Word Standing</span>
            <span className="ml-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-white/80">
              Round {lastWordState.roundNumber}
            </span>
            <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-xs font-bold text-rose-300">
              {lastWordState.category}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white/60">
              {lastWordState.difficulty}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {lastWordState.isValidating ? (
            <div className="px-5 py-2 rounded-2xl bg-violet-600/30 border border-violet-400/60 text-violet-200 font-black text-sm animate-pulse">
              🤖 Validating Answer… (Timer Paused)
            </div>
          ) : (
            <div
              className={`px-5 py-2 rounded-2xl font-mono font-black text-2xl border transition-all ${
                urgentTimer
                  ? 'bg-red-600/30 border-red-400 text-red-300 animate-pulse'
                  : 'bg-white/10 border-white/15 text-white'
              }`}
            >
              ⏱ {timerRemaining}s
            </div>
          )}

          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-[11px] text-white/30 hover:text-red-400 border border-white/10 px-2.5 py-1.5 rounded-lg font-semibold"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 p-8 min-h-0 overflow-hidden">
        {/* Left & Center: Prompt + Turn Spotlight + Used Answers */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          {/* Prompt Banner */}
          <div className="bg-white/5 border-2 border-white/15 rounded-3xl p-8 text-center shadow-2xl">
            <p className="text-xs uppercase tracking-widest font-bold text-rose-300 mb-2">
              Current Prompt • Avoid the Hidden Target Word!
            </p>
            <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight">
              {lastWordState.prompt}
            </h2>
          </div>

          {/* Turn Spotlight OR Elimination Reveal */}
          {isEliminatedReveal && lastWordState.eliminatedThisTurn ? (
            <div className="bg-gradient-to-br from-red-900/50 to-rose-950/60 border-2 border-red-400/70 rounded-3xl p-8 text-center shadow-2xl space-y-3 animate-fade-in">
              <div className="text-6xl">
                {lastWordState.eliminatedThisTurn.reason === 'target-hit' ? '💥' : '⏰'}
              </div>
              <h3 className="text-3xl font-black text-red-300">
                {lastWordState.eliminatedThisTurn.playerName} Eliminated!
              </h3>
              <p className="text-white/90 text-lg font-semibold">
                {lastWordState.eliminatedThisTurn.reason === 'target-hit'
                  ? `Submitted "${lastWordState.eliminatedThisTurn.submittedAnswer}" — hit the Secret Target!`
                  : 'Ran out of time before submitting a valid answer!'}
              </p>
              {lastWordState.eliminatedThisTurn.revealedTarget && (
                <div className="inline-block bg-black/40 border border-red-400/40 rounded-2xl px-6 py-2.5 mt-1">
                  <span className="text-xs uppercase tracking-wider text-white/50 block">Secret Target Word</span>
                  <span className="text-2xl font-black text-amber-300">
                    {lastWordState.eliminatedThisTurn.revealedTarget}
                  </span>
                </div>
              )}
              <p className="text-xs text-white/50 pt-1 animate-pulse">
                {lastWordState.survivorIds.length <= 1
                  ? 'Crowning the Last Word Standing winner…'
                  : 'Loading next question…'}
              </p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-rose-950/40 to-amber-950/20 border border-rose-500/30 rounded-3xl p-6 flex items-center justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-white/50">Active Turn</p>
                <p className="text-3xl font-black text-white mt-1 flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-400 animate-ping" />
                  <span>{lastWordState.currentTurnPlayerName ?? 'Waiting…'}</span>
                </p>
              </div>

              {lastWordState.lastSafeEvent && (
                <div className="bg-emerald-500/15 border border-emerald-400/40 rounded-2xl px-5 py-3 text-right">
                  <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold">Last Safe Answer</p>
                  <p className="text-white font-bold text-lg">
                    ✅ {lastWordState.lastSafeEvent.playerName}: “{lastWordState.lastSafeEvent.answer}”
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Accepted / Used Answers */}
          <div className="flex-1 min-h-0 bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase tracking-widest font-bold text-white/60">
                Safe Answers Used This Round ({lastWordState.usedAnswers.length})
              </h3>
              <span className="text-xs text-white/40">Cannot repeat these words</span>
            </div>

            {lastWordState.usedAnswers.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
                No answers submitted yet on this prompt…
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5 overflow-y-auto content-start">
                {lastWordState.usedAnswers.map((ans, idx) => (
                  <span
                    key={`${ans}-${idx}`}
                    className="px-4 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-200 font-bold text-base"
                  >
                    ✓ {ans}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Survivors & Eliminated */}
        <div className="w-80 shrink-0 bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h3 className="text-xs uppercase tracking-widest font-bold text-emerald-300 mb-2.5">
              Survivors ({lastWordState.survivorIds.length})
            </h3>
            <div className="space-y-2">
              {lastWordState.survivorIds.map((pid) => {
                const player = players.find((p) => p.id === pid);
                if (!player) return null;
                const isTurn = pid === lastWordState.currentTurnPlayerId;
                return (
                  <div
                    key={pid}
                    className={`px-4 py-3 rounded-2xl border flex items-center justify-between transition-all ${
                      isTurn
                        ? 'bg-rose-500/25 border-rose-400 shadow-lg'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base">{isTurn ? '🎯' : '💚'}</span>
                      <span className="text-white font-bold truncate">{player.name}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-300">{player.score}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {lastWordState.eliminatedPlayerIds.length > 0 && (
            <div className="pt-2 border-t border-white/10">
              <h3 className="text-xs uppercase tracking-widest font-bold text-red-400 mb-2.5">
                Eliminated ({lastWordState.eliminatedPlayerIds.length})
              </h3>
              <div className="space-y-2">
                {lastWordState.eliminatedPlayerIds.map((pid) => {
                  const player = players.find((p) => p.id === pid);
                  if (!player) return null;
                  return (
                    <div
                      key={pid}
                      className="px-4 py-2.5 rounded-2xl bg-red-950/30 border border-red-500/20 flex items-center justify-between opacity-65"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span>💀</span>
                        <span className="text-white/70 line-through truncate font-medium">{player.name}</span>
                      </div>
                      <span className="text-xs font-mono text-white/40">{player.score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
