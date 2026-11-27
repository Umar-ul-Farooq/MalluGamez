import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';
import type { DrawIdentifySettings } from '@chitram/shared';

const MIN_DRAWING_SECONDS = 5;
const MAX_DRAWING_SECONDS = 60;
const DEFAULT_DRAWING_SECONDS = 15;

const MIN_IDENTIFY_SECONDS = 30;
const MAX_IDENTIFY_SECONDS = 180;
const IDENTIFY_STEP_SECONDS = 15;
const DEFAULT_IDENTIFY_SECONDS = 60;

interface Props {
  hostIP: string;
}

export default function DrawIdentifyTVScreen({ hostIP }: Props) {
  const navigate = useNavigate();
  const { room, connected, drawIdentifyState } = useGameStore();

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!room) return null;

  const players = room.players.filter(p => !p.isHost);
  const canStart = players.length >= 2; // minimum 2 players for drawer + opposing players

  const settings: DrawIdentifySettings = room.drawIdentifySettings ?? {
    objectCount: 12,
    language: 'english',
    drawingDurationSeconds: DEFAULT_DRAWING_SECONDS,
    identificationDurationSeconds: DEFAULT_IDENTIFY_SECONDS,
  };
  const drawingSeconds = settings.drawingDurationSeconds ?? DEFAULT_DRAWING_SECONDS;
  const identifySeconds = settings.identificationDurationSeconds ?? DEFAULT_IDENTIFY_SECONDS;

  function updateSettings(patch: Partial<DrawIdentifySettings>) {
    getSocket().emit('draw-identify:update-settings', patch);
  }

  function startGame() {
    getSocket().emit('draw-identify:start-game');
  }

  function handleNextRound() {
    getSocket().emit('draw-identify:next-round');
  }

  function handleFinishGame() {
    getSocket().emit('draw-identify:finish-game');
  }

  function handleRestart() {
    getSocket().emit('draw-identify:restart-game');
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

  // ─── Modals ───────────────────────────────────────────────────────────────
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
                Force reset this room? All connected players will be removed from the current game session, and the TV and mobile screens will return to a clean state.
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
  if (room.phase === 'lobby' || !drawIdentifyState) {
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
      <div className="h-full flex flex-col bg-gradient-to-br from-gray-950 via-teal-950/30 to-gray-950 overflow-hidden select-none">
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
              <span className="text-4xl">✏️🔍</span>
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Draw & Identify</h1>
                <p className="ml-text text-teal-300 text-base font-semibold">വരയും കണ്ടെത്തലും • ഒരൊറ്റ വര ചലഞ്ച്</p>
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
              <span className="text-xs">🔄</span>
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
              <p className="text-teal-300 font-bold text-sm tracking-wide">{displayUrl}</p>
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
                <span className="text-teal-400 text-sm font-normal">({players.length})</span>
              </h2>
              {players.length < 2 && (
                <span className="text-amber-400 text-xs font-semibold animate-pulse">
                  ⚠️ Need at least 2 players to start
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 gap-3 content-start">
              {players.map((p, idx) => (
                <div
                  key={p.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3 animate-fade-in"
                >
                  <span className="text-2xl">{['😎', '🤠', '🥳', '🤓', '🤖', '👑', '🦁', '🚀'][idx % 8]}</span>
                  <div className="truncate">
                    <p className="text-white font-bold text-base truncate">{p.name}</p>
                    <p className="text-white/40 text-xs">Ready to draw & guess</p>
                  </div>
                </div>
              ))}
              {players.length === 0 && (
                <div className="col-span-2 py-16 text-center text-white/30 text-sm">
                  Scan the QR code to join! 📱
                </div>
              )}
            </div>
          </div>

          {/* Right: Game Settings */}
          <div className="w-96 shrink-0 h-full flex flex-col justify-between bg-white/5 border border-white/10 rounded-3xl p-6">
            <div className="space-y-5">
              <h2 className="text-white font-black text-lg flex items-center gap-2 border-b border-white/10 pb-3">
                <span>⚙️ Game Configuration</span>
              </h2>

              {/* Number of Objects */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/80 font-bold text-xs uppercase tracking-wider">Objects per round</span>
                  <span className="text-teal-300 font-extrabold text-sm">{settings.objectCount} Objects</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {([6, 9, 12, 15] as const).map(n => (
                    <button
                      key={n}
                      onClick={() => updateSettings({ objectCount: n })}
                      className={`py-2.5 rounded-xl font-black text-sm transition-all ${
                        settings.objectCount === n
                          ? 'bg-teal-600 text-white ring-2 ring-teal-400 shadow-lg shadow-teal-950/60 scale-105'
                          : 'bg-white/5 text-white/60 hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Option */}
              <div>
                <span className="text-white/80 font-bold text-xs uppercase tracking-wider block mb-2">
                  Language / ഭാഷ
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateSettings({ language: 'english' })}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
                      settings.language === 'english'
                        ? 'bg-teal-600 text-white ring-2 ring-teal-400 shadow-md'
                        : 'bg-white/5 text-white/60 hover:bg-white/15'
                    }`}
                  >
                    🇬🇧 English Objects
                  </button>
                  <button
                    onClick={() => updateSettings({ language: 'malayalam' })}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
                      settings.language === 'malayalam'
                        ? 'bg-teal-600 text-white ring-2 ring-teal-400 shadow-md'
                        : 'bg-white/5 text-white/60 hover:bg-white/15'
                    }`}
                  >
                    🌴 മലയാളം (Kerala)
                  </button>
                </div>
              </div>

              {/* Drawing Timer Control */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-white/80 font-bold text-xs uppercase tracking-wider block">
                      Drawing Phase Timer
                    </span>
                    <span className="text-white/40 text-[11px]">
                      {MIN_DRAWING_SECONDS}s – {MAX_DRAWING_SECONDS}s per round
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings({
                          drawingDurationSeconds: Math.max(MIN_DRAWING_SECONDS, drawingSeconds - 1),
                        })
                      }
                      disabled={drawingSeconds <= MIN_DRAWING_SECONDS}
                      aria-label="Decrease drawing timer"
                      className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-lg flex items-center justify-center transition-all"
                    >
                      −
                    </button>
                    <span className="min-w-[3.5rem] text-center text-teal-300 font-mono font-black text-xl tabular-nums">
                      {drawingSeconds}s
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings({
                          drawingDurationSeconds: Math.min(MAX_DRAWING_SECONDS, drawingSeconds + 1),
                        })
                      }
                      disabled={drawingSeconds >= MAX_DRAWING_SECONDS}
                      aria-label="Increase drawing timer"
                      className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-lg flex items-center justify-center transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/10">
                  <div>
                    <span className="text-white/80 font-bold text-xs uppercase tracking-wider block">
                      Identification Timer
                    </span>
                    <span className="text-white/40 text-[11px]">
                      {MIN_IDENTIFY_SECONDS}s – {MAX_IDENTIFY_SECONDS}s (15s steps)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings({
                          identificationDurationSeconds: Math.max(
                            MIN_IDENTIFY_SECONDS,
                            identifySeconds - IDENTIFY_STEP_SECONDS
                          ),
                        })
                      }
                      disabled={identifySeconds <= MIN_IDENTIFY_SECONDS}
                      aria-label="Decrease identification timer"
                      className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-lg flex items-center justify-center transition-all"
                    >
                      −
                    </button>
                    <span className="min-w-[3.5rem] text-center text-teal-300 font-mono font-black text-xl tabular-nums">
                      {identifySeconds}s
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings({
                          identificationDurationSeconds: Math.min(
                            MAX_IDENTIFY_SECONDS,
                            identifySeconds + IDENTIFY_STEP_SECONDS
                          ),
                        })
                      }
                      disabled={identifySeconds >= MAX_IDENTIFY_SECONDS}
                      aria-label="Increase identification timer"
                      className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-lg flex items-center justify-center transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={startGame}
              disabled={!canStart}
              className={`btn-primary text-xl py-4.5 w-full flex items-center justify-center gap-3 ${
                !canStart
                  ? 'opacity-30 cursor-not-allowed shadow-none'
                  : 'bg-teal-600 hover:bg-teal-500 shadow-lg shadow-teal-900/60 hover:scale-[1.02] active:scale-95'
              }`}
            >
              {canStart ? '🚀 Start Challenge' : '⏳ Waiting for 2+ players…'}
            </button>
          </div>
        </div>

        {renderModals()}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: FINAL GAME OVER / LEADERBOARD
  // ──────────────────────────────────────────────────────────────────────────
  if (drawIdentifyState.roundPhase === 'game-end') {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];

    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-teal-950 to-gray-950 p-10 select-none overflow-hidden relative">
        <div className="absolute top-6 right-8">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-[11px] text-white/30 hover:text-red-400 hover:bg-red-950/30 border border-white/10 hover:border-red-500/40 px-2.5 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5"
            title="Force reset this room"
          >
            <span className="text-xs">🔄</span>
            <span>Force Reset</span>
          </button>
        </div>

        <div className="text-center mb-6 animate-bounce-in">
          <div className="text-7xl mb-2">🏆</div>
          <h1 className="text-5xl font-black text-white">Challenge Complete!</h1>
          <p className="ml-text text-3xl font-bold text-teal-300 mt-2">
            വിജയി: {winner?.name ?? 'ആരുമില്ല'} 🎉
          </p>
        </div>

        <div className="w-full max-w-xl bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md mb-8">
          <p className="text-white/50 text-xs uppercase tracking-widest font-bold mb-4 text-center">
            Final Scores / അന്തിമ സ്കോർ
          </p>
          <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
            {sorted.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3.5 rounded-2xl transition-all ${
                  idx === 0
                    ? 'bg-teal-600/30 border border-teal-400/60 text-white font-extrabold text-xl shadow-lg'
                    : 'bg-white/5 text-white/90 text-lg font-semibold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{['🥇', '🥈', '🥉'][idx] ?? '👤'}</span>
                  <span>{p.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-teal-300 font-bold text-xl">{p.score}</span>
                  <span className="text-white/40 text-xs font-normal">pts</span>
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
            🏠 Home / പ്രധാന പേജ്
          </button>
          <button
            onClick={handleRestart}
            className="btn-primary bg-teal-600 hover:bg-teal-500 text-base py-3 px-8 shadow-lg shadow-teal-900/40"
          >
            🔄 Play Again / വീണ്ടും കളിക്കാം
          </button>
        </div>

        {renderModals()}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 3: ACTIVE GAME (DRAWING, IDENTIFICATION, ROUND-END)
  // ──────────────────────────────────────────────────────────────────────────
  const {
    currentRound,
    currentDrawerName,
    roundPhase,
    objectCount,
    drawings,
    submittedCount,
    identifiedCount,
    roundScore,
    objectList,
  } = drawIdentifyState;

  // Grid styling based on object count
  const gridColsClass =
    objectCount === 6 ? 'grid-cols-3 grid-rows-2' :
    objectCount === 9 ? 'grid-cols-3 grid-rows-3' :
    objectCount === 12 ? 'grid-cols-4 grid-rows-3' :
    'grid-cols-5 grid-rows-3';

  // Full-screen clean white drawing grid during drawing & identification phases
  if (roundPhase === 'drawing' || roundPhase === 'identification') {
    return (
      <div className="h-full w-full bg-white p-4 select-none overflow-hidden flex items-center justify-center">
        <div className={`grid ${gridColsClass} gap-3 w-full h-full`}>
          {Array.from({ length: objectCount }).map((_, idx) => {
            const drawing = drawings[idx];
            const isIdentified = objectList[idx]?.isIdentified;

            return (
              <div
                key={idx}
                className={`relative w-full h-full min-h-0 min-w-0 rounded-xl bg-white flex items-center justify-center overflow-hidden transition-all duration-200 ${
                  isIdentified
                    ? 'ring-4 ring-green-500 border-2 border-green-500'
                    : 'border-2 border-gray-200'
                }`}
              >
                <span
                  className={`absolute top-2 left-2 z-20 min-w-[1.75rem] h-7 px-1.5 rounded-lg font-black text-sm flex items-center justify-center shadow-sm ${
                    isIdentified
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-900/80 text-white'
                  }`}
                >
                  {idx + 1}
                </span>

                {isIdentified && (
                  <div
                    className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-green-500 text-white font-black text-lg flex items-center justify-center shadow-md"
                    aria-label="Identified"
                  >
                    ✓
                  </div>
                )}

                {drawing && (
                  <img
                    src={drawing.dataUrl}
                    alt=""
                    className="w-full h-full object-contain p-2 select-none pointer-events-none"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-950 select-none overflow-hidden relative">
      {/* ── Top Header Bar ── */}
      <div className="flex items-center justify-between px-10 py-3 border-b border-white/10 shrink-0 bg-gray-900/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-white/70 hover:text-white"
          >
            ← Exit
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">✏️🔍</span>
            <span className="text-xl font-black text-white">Draw & Identify</span>
          </div>
          <span className="bg-teal-600/30 text-teal-300 border border-teal-500/40 px-3 py-1 rounded-full font-bold text-xs">
            Round {currentRound}
          </span>
          <span className="bg-white/10 text-white/70 px-3 py-1 rounded-full font-semibold text-xs">
            {objectCount} Objects
          </span>
        </div>

        {/* Center: Status */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-1 rounded-2xl shadow-inner">
          <span className="text-white/40 text-xs uppercase tracking-wider font-bold">
            Round Status:
          </span>
          <span className="text-amber-400 font-bold text-sm">Round Complete</span>
        </div>

        {/* Right: Drawer name & Controls */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Drawer (വരയ്ക്കുന്നു)</p>
            <p className="text-teal-300 font-extrabold text-sm">{currentDrawerName}</p>
          </div>
          <div className="bg-teal-500/20 border border-teal-500/40 px-3 py-1 rounded-xl font-mono font-bold text-teal-300 text-sm">
            {room.code}
          </div>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-[11px] text-white/30 hover:text-red-400 hover:bg-red-950/40 border border-white/10 hover:border-red-500/40 px-2 py-1 rounded-lg transition-all font-semibold flex items-center gap-1"
            title="Force reset this room"
          >
            <span className="text-xs">🔄</span>
            <span>Force Reset</span>
          </button>
        </div>
      </div>

      {/* ── Phase Announcement Banner ── */}
      <div className="px-10 py-2 flex items-center justify-between border-b transition-all bg-purple-950/30 border-purple-500/20 text-purple-200">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏁</span>
          <p className="text-xs font-bold text-white">
            Round {currentRound} Summary! Ready for next round or finish game.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="bg-white/10 px-3 py-1 rounded-full text-white/80">
            Drawings: <strong className="text-white">{submittedCount}</strong> / {objectCount}
          </span>
          <span className="bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-300">
            Identified: <strong className="text-emerald-200">{identifiedCount}</strong> / {objectCount}
          </span>
        </div>
      </div>

      {/* ── Main Arena: The Drawing Grid ── */}
      <div className="flex-1 flex gap-6 p-6 min-h-0 overflow-hidden">
        {/* The TV Grid */}
        <div className="flex-1 h-full min-h-0 bg-white/5 border border-white/10 rounded-3xl p-4 shadow-2xl flex flex-col justify-center">
          <div className={`grid ${gridColsClass} gap-3 w-full h-full`}>
            {Array.from({ length: objectCount }).map((_, idx) => {
              const drawing = drawings[idx];
              const isIdentified = objectList[idx]?.isIdentified;

              return (
                <div
                  key={idx}
                  className={`relative rounded-2xl transition-all duration-300 flex items-center justify-center overflow-hidden ${
                    isIdentified
                      ? 'bg-emerald-950/25 ring-4 ring-emerald-500 border-2 border-emerald-400 shadow-lg shadow-emerald-900/40'
                      : drawing
                      ? 'bg-white/95 border border-white/40 shadow-md'
                      : 'bg-white/5 border-2 border-dashed border-white/15'
                  }`}
                >
                  {/* Slot Number Badge */}
                  <span className={`absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-md z-10 ${
                    isIdentified
                      ? 'bg-emerald-600 text-white'
                      : drawing
                      ? 'bg-gray-900/80 text-white'
                      : 'bg-white/10 text-white/40'
                  }`}>
                    #{idx + 1}
                  </span>

                  {/* IDENTIFIED VISUAL FEEDBACK: Green Tick Badge */}
                  {isIdentified && (
                    <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-emerald-500 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-lg shadow-emerald-950/80 animate-scale-up">
                      <span className="text-sm">✓</span>
                      <span className="tracking-wide text-[10px]">IDENTIFIED</span>
                    </div>
                  )}

                  {/* Render Drawing Image if submitted */}
                  {drawing ? (
                    <img
                      src={drawing.dataUrl}
                      alt={`Drawing ${idx + 1}`}
                      className="w-full h-full object-contain p-2 select-none pointer-events-none transition-all"
                    />
                  ) : (
                    <div className="text-center p-2">
                      <span className="text-2xl text-white/20 block mb-1">◻️</span>
                      <p className="text-[11px] font-bold text-white/30">Empty</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Scoreboard & Round Controls */}
        <div className="w-80 shrink-0 h-full flex flex-col justify-between bg-white/5 border border-white/10 rounded-3xl p-5 overflow-hidden">
          {/* Top: Scoreboard */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <p className="text-white/50 text-xs uppercase tracking-widest font-bold mb-3 flex items-center justify-between">
              <span>Scoreboard</span>
              <span className="text-teal-300 font-normal">സ്കോർബോർഡ്</span>
            </p>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {[...players].sort((a, b) => b.score - a.score).map((p, idx) => {
                const isDrawer = p.id === drawIdentifyState.currentDrawerId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                      isDrawer
                        ? 'bg-teal-600/30 border border-teal-400/50 text-white shadow-md ring-1 ring-teal-400/40'
                        : 'bg-white/5 text-white/80 border border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-lg shrink-0">{['🥇', '🥈', '🥉'][idx] ?? '👤'}</span>
                      <div className="truncate">
                        <p className="font-bold text-sm truncate">{p.name}</p>
                        {isDrawer && (
                          <p className="text-teal-300 text-[10px] font-semibold">🎨 Drawing (+{roundScore} pts)</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-lg font-black text-teal-300 tabular-nums">{p.score}</span>
                      <span className="text-white/40 text-[10px] ml-1">pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom: Round End Summary / Next Round Buttons */}
          {roundPhase === 'round-end' && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-fade-in">
              <div className="bg-teal-950/40 border border-teal-500/30 rounded-2xl p-3 text-center">
                <p className="text-xs text-white/70">Round Score for {currentDrawerName}:</p>
                <p className="text-2xl font-black text-teal-300">+{roundScore} Points</p>
                <p className="text-[10px] text-white/50 mt-0.5">
                  {identifiedCount} of {objectCount} identified correctly
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleNextRound}
                  className="btn-primary bg-teal-600 hover:bg-teal-500 text-white font-black text-sm py-3 px-4 shadow-lg rounded-xl"
                >
                  ⏭️ Next Round / അടുത്ത റൗണ്ട്
                </button>
                <button
                  onClick={handleFinishGame}
                  className="btn-secondary text-xs py-2 px-4 rounded-xl text-white/70 hover:text-white"
                >
                  🏆 Finish Game / ഫലം കാണുക
                </button>
              </div>
            </div>
          )}

          {roundPhase !== 'round-end' && (
            <div className="mt-4 pt-3 border-t border-white/10 text-center text-white/40 text-xs">
              {roundPhase === 'drawing'
                ? 'Opposing players shout names! 🗣️'
                : 'Tick correct items on mobile! 📱'}
            </div>
          )}
        </div>
      </div>

      {renderModals()}
    </div>
  );
}
