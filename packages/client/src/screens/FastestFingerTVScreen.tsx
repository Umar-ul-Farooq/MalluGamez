import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';
import type { FastestFingerSettings, FastestFingerTimerOption } from '@chitram/shared';

const TIMER_OPTIONS: FastestFingerTimerOption[] = [5, 10, 15, 20, 30];
const QUESTION_COUNT_OPTIONS = [10, 20, 30, 50];

interface Props {
  hostIP: string;
}

export default function FastestFingerTVScreen({ hostIP }: Props) {
  const navigate = useNavigate();
  const { room, connected, fastestFingerState, timerRemaining } = useGameStore();

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!room) return null;

  const players = room.players.filter(p => !p.isHost);
  const canStart = players.length >= 1;

  const settings: FastestFingerSettings = room.fastestFingerSettings ?? {
    timerSeconds: 15,
    totalQuestions: 20,
  };

  function updateSettings(patch: Partial<FastestFingerSettings>) {
    getSocket().emit('fastest-finger:update-settings', patch);
  }

  function startGame() {
    if (!canStart) return;
    getSocket().emit('fastest-finger:start-game');
  }

  function restartGame() {
    getSocket().emit('fastest-finger:restart-game');
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
          <div className="bg-[#1a0f1e] border-2 border-red-500/50 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl space-y-5">
            <div className="text-5xl">⚠️</div>
            <div>
              <h3 className="text-2xl font-black text-white">Force Reset This Room?</h3>
              <p className="text-red-400 font-bold mt-1">ഈ റൂം പൂർണ്ണമായി റീസെറ്റ് ചെയ്യണോ?</p>
            </div>
            <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-4 text-left text-xs text-white/80 space-y-2">
              <p className="font-semibold text-white">
                All connected players will be removed from the current game session, and the TV and mobile screens will return to a clean state.
              </p>
            </div>
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 text-sm font-bold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmForceReset}
                className="flex-1 py-3 text-sm font-black bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg shadow-red-900/50 transition-all"
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
  if (room.phase === 'lobby' || !fastestFingerState) {
    const isHostedDomain = typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';

    const joinUrl = isHostedDomain
      ? `${window.location.origin}/lobby?room=${room.code}`
      : `http://${hostIP || 'localhost'}:3000/lobby?room=${room.code}`;

    const displayUrl = isHostedDomain
      ? window.location.host
      : (hostIP ? `http://${hostIP}:3000` : 'getting IP…');

    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-gray-950 via-orange-950/30 to-gray-950 overflow-hidden select-none">
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
              <span className="text-4xl">⚡📸</span>
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Fastest Finger – Picture Rush</h1>
                <p className="ml-text text-orange-300 text-base font-semibold">ചിത്രം കാണൂ, ഏറ്റവും വേഗം ഉത്തരം പറയൂ!</p>
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
              <p className="text-orange-300 font-bold text-sm tracking-wide">{displayUrl}</p>
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
                <span className="text-orange-400 text-sm font-normal">({players.length})</span>
              </h2>
              {players.length < 1 && (
                <span className="text-amber-400 text-xs font-semibold animate-pulse">
                  ⚠️ Scan QR code to join!
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 gap-3 content-start">
              {players.map((p, idx) => (
                <div
                  key={p.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3 animate-fade-in"
                >
                  <span className="text-2xl">{['⚡', '🔥', '😎', '🎯', '🚀', '🦁', '👑', '🌟'][idx % 8]}</span>
                  <div className="truncate">
                    <p className="text-white font-bold text-base truncate">{p.name}</p>
                    <p className="text-white/40 text-xs">Ready to race</p>
                  </div>
                </div>
              ))}
              {players.length === 0 && (
                <div className="col-span-2 py-16 text-center text-white/30 text-sm">
                  Scan the QR code on your phone to join! 📱
                </div>
              )}
            </div>
          </div>

          {/* Right: Game Setup */}
          <div className="w-96 shrink-0 h-full flex flex-col justify-between bg-white/5 border border-white/10 rounded-3xl p-6">
            <div className="space-y-6">
              <h2 className="text-white font-black text-lg flex items-center gap-2 border-b border-white/10 pb-3">
                <span>⚙️ Game Setup</span>
              </h2>

              {/* Time per Picture */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/80 font-bold text-xs uppercase tracking-wider">Time per Picture</span>
                  <span className="text-orange-300 font-extrabold text-sm">{settings.timerSeconds}s</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {TIMER_OPTIONS.map(sec => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => updateSettings({ timerSeconds: sec })}
                      className={`py-2.5 rounded-xl font-black text-sm transition-all ${
                        settings.timerSeconds === sec
                          ? 'bg-orange-500 text-white ring-2 ring-orange-300 shadow-lg scale-105'
                          : 'bg-white/5 text-white/60 hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Pictures */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/80 font-bold text-xs uppercase tracking-wider">Pictures per Game</span>
                  <span className="text-orange-300 font-extrabold text-sm">{settings.totalQuestions}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {QUESTION_COUNT_OPTIONS.map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => updateSettings({ totalQuestions: cnt })}
                      className={`py-2.5 rounded-xl font-black text-sm transition-all ${
                        settings.totalQuestions === cnt
                          ? 'bg-orange-500 text-white ring-2 ring-orange-300 shadow-lg scale-105'
                          : 'bg-white/5 text-white/60 hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rules Box */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs space-y-1.5 text-white/70">
                <p className="font-bold text-orange-300">⚡ Rules:</p>
                <p>• First player to submit a correct answer wins <strong className="text-white">10 points</strong>.</p>
                <p>• Wrong answers don't end the round — keep trying!</p>
                <p>• Timer expires with no winner → picture skips automatically.</p>
              </div>
            </div>

            <button
              onClick={startGame}
              disabled={!canStart}
              className={`btn-primary text-xl py-4 w-full flex items-center justify-center gap-3 ${
                !canStart
                  ? 'opacity-30 cursor-not-allowed shadow-none'
                  : 'bg-orange-500 hover:bg-orange-400 shadow-lg shadow-orange-950/60 hover:scale-[1.02] active:scale-95'
              }`}
            >
              {canStart ? '🚀 Start Game' : '⏳ Waiting for players…'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: FINAL LEADERBOARD (GAME-END)
  // ──────────────────────────────────────────────────────────────────────────
  if (room.phase === 'game-end' || fastestFingerState.roundPhase === 'game-end') {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    const counts = fastestFingerState.correctCounts ?? {};

    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-orange-950/40 to-gray-950 p-10 select-none overflow-hidden relative">
        {renderModals()}
        <div className="absolute top-6 right-8">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-[11px] text-white/30 hover:text-red-400 hover:bg-red-950/30 border border-white/10 hover:border-red-500/40 px-2.5 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>Force Reset</span>
          </button>
        </div>

        <div className="text-center mb-6 animate-bounce-in">
          <div className="text-7xl mb-2">🏆⚡</div>
          <h1 className="text-5xl font-black text-white">Picture Rush Complete!</h1>
          <p className="ml-text text-3xl font-bold text-orange-300 mt-2">
            വിജയി: {winner?.name ?? 'ആരുമില്ല'} 🎉
          </p>
        </div>

        <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md mb-8">
          <p className="text-white/50 text-xs uppercase tracking-widest font-bold mb-4 text-center">
            Final Leaderboard / അന്തിമ സ്കോർ
          </p>
          <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
            {sorted.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                  idx === 0
                    ? 'bg-orange-500/25 border border-orange-400/60 text-white font-extrabold text-xl shadow-lg'
                    : 'bg-white/5 text-white/90 text-lg font-semibold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{['🥇', '🥈', '🥉'][idx] ?? `#${idx + 1}`}</span>
                  <div>
                    <span>{p.name}</span>
                    <p className="text-xs text-white/50 font-normal">
                      {counts[p.id] ?? 0} picture{(counts[p.id] ?? 0) !== 1 ? 's' : ''} answered correctly
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-orange-300 font-black text-2xl tabular-nums">{p.score}</span>
                  <span className="text-white/40 text-xs ml-1">pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="btn-secondary text-base py-3 px-6"
          >
            🏠 Return to Home
          </button>
          <button
            onClick={restartGame}
            className="btn-primary bg-orange-500 hover:bg-orange-400 text-base py-3 px-8 shadow-lg"
          >
            🔄 Play Again
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 3: ACTIVE GAME (QUESTION / WON / SKIPPED)
  // ──────────────────────────────────────────────────────────────────────────
  const {
    currentQuestionIndex,
    totalQuestions,
    roundPhase,
    imageUrl,
    category,
    winnerName,
    winningAnswer,
    pointsAwarded,
    revealedAnswer,
    correctCounts,
  } = fastestFingerState;

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="h-full flex flex-col bg-gray-950 select-none overflow-hidden">
      {renderModals()}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-8 py-3.5 border-b border-white/10 bg-black/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="btn-secondary text-xs py-1.5 px-3 text-white/70 hover:text-white"
          >
            ← Exit
          </button>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⚡📸</span>
            <div>
              <h2 className="text-lg font-black text-white leading-tight">
                Picture {currentQuestionIndex + 1} of {totalQuestions}
              </h2>
              <span className="text-xs text-orange-300 font-semibold">{category}</span>
            </div>
          </div>
        </div>

        {/* Center: Countdown Timer */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/15 px-6 py-1.5 rounded-2xl">
          <span className="text-white/50 text-xs uppercase tracking-wider font-bold">Time Left</span>
          <span className={`text-3xl font-mono font-black tabular-nums ${
            timerRemaining <= 5 && roundPhase === 'question' ? 'text-red-400 animate-pulse' : 'text-orange-400'
          }`}>
            {timerRemaining}s
          </span>
        </div>

        {/* Right: Room & Force Reset */}
        <div className="flex items-center gap-3">
          <div className="bg-orange-500/20 border border-orange-500/40 px-3 py-1 rounded-xl font-mono font-bold text-orange-300 text-sm">
            {room.code}
          </div>
          <button
            onClick={() => setShowResetConfirm(true)}
            title="Force Reset"
            className="opacity-40 hover:opacity-100 text-xs text-white/60 hover:text-red-400 border border-white/10 hover:border-red-500/30 px-2 py-1 rounded transition-all"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Main Content: Prominent Picture + Live Scoreboard */}
      <div className="flex-1 flex gap-6 p-6 min-h-0 overflow-hidden">
        {/* Left/Center: Large Picture Display */}
        <div className="flex-1 h-full min-h-0 flex flex-col gap-4">
          <div className="flex-1 min-h-0 bg-white rounded-3xl p-4 shadow-2xl border-4 border-white/10 flex items-center justify-center relative overflow-hidden">
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Identify this picture"
                className="w-full h-full object-contain select-none pointer-events-none"
              />
            )}

            {/* Overlay banner when question won */}
            {roundPhase === 'won' && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-950/95 via-emerald-900/90 to-transparent p-6 pt-12 text-center animate-fade-in">
                <p className="text-emerald-300 text-xs uppercase tracking-widest font-bold">
                  🎉 First Correct Answer!
                </p>
                <h3 className="text-4xl font-black text-white mt-1">
                  {winnerName} wins +{pointsAwarded} pts!
                </h3>
                <p className="text-emerald-200 text-lg font-bold mt-1">
                  Answer: <span className="text-white underline">{winningAnswer || revealedAnswer}</span>
                </p>
                <p className="text-white/60 text-xs mt-2 animate-pulse">
                  Loading next picture…
                </p>
              </div>
            )}

            {/* Overlay banner when skipped */}
            {roundPhase === 'skipped' && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-red-950/95 via-red-900/90 to-transparent p-6 pt-12 text-center animate-fade-in">
                <p className="text-red-300 text-xs uppercase tracking-widest font-bold">
                  ⏰ Time's Up! Nobody answered correctly
                </p>
                <h3 className="text-4xl font-black text-white mt-1">
                  Answer: {revealedAnswer}
                </h3>
                <p className="text-white/60 text-xs mt-2 animate-pulse">
                  Skipping to next picture…
                </p>
              </div>
            )}
          </div>

          {/* Active status bar */}
          {roundPhase === 'question' && (
            <div className="bg-orange-500/15 border border-orange-500/30 rounded-2xl px-6 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-orange-400 animate-ping" />
                <span className="text-orange-200 font-bold text-sm">
                  Players are typing their answers on their phones… First correct answer wins 10 pts!
                </span>
              </div>
              <span className="text-white/50 text-xs font-semibold">
                Press DONE on phone to submit
              </span>
            </div>
          )}
        </div>

        {/* Right: Live Leaderboard */}
        <div className="w-80 shrink-0 h-full bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <span className="text-white/60 text-xs uppercase tracking-widest font-bold">Leaderboard</span>
            <span className="text-orange-300 text-xs font-bold">+10 pts / pic</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {sortedPlayers.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                  roundPhase === 'won' && fastestFingerState.winnerId === p.id
                    ? 'bg-emerald-600/30 border border-emerald-400 text-white shadow-lg scale-[1.02]'
                    : 'bg-white/5 border border-white/5 text-white/90'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-lg shrink-0">{['🥇', '🥈', '🥉'][idx] ?? '👤'}</span>
                  <div className="truncate">
                    <p className="font-bold text-sm truncate">{p.name}</p>
                    <p className="text-[10px] text-white/40">{correctCounts[p.id] ?? 0} solved</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-black text-orange-300 tabular-nums">{p.score}</span>
                  <span className="text-white/40 text-[10px] ml-1">pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
