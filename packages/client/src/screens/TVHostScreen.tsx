import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';
import Canvas from '../components/Canvas';
import Timer from '../components/Timer';
import RoundEndOverlay from '../components/RoundEndOverlay';
import CharadesTVScreen from './CharadesTVScreen';
import ImposterTVScreen from './ImposterTVScreen';
import EmojiTVScreen from './EmojiTVScreen';
import DrawIdentifyTVScreen from './DrawIdentifyTVScreen';
import FastestFingerTVScreen from './FastestFingerTVScreen';
import type { RoomSettings, GameType } from '@chitram/shared';

const TIMER_OPTIONS = [30, 60, 90, 120];
const ROUND_OPTIONS = [2, 3, 5];

export default function TVHostScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gameTypeParam = (searchParams.get('game') as GameType) || 'pictionary';

  const { room, connected, timerRemaining } = useGameStore();
  const [creating, setCreating] = useState(false);
  const [hostIP, setHostIP] = useState<string>('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  function confirmExit() {
    sessionStorage.removeItem('chitram_tv_host');
    getSocket().emit('room:terminate');
    useGameStore.getState().reset();
    setShowExitConfirm(false);
    navigate('/');
  }

  function confirmForceReset() {
    sessionStorage.removeItem('chitram_tv_host');
    getSocket().emit('room:force-reset');
    useGameStore.getState().reset();
    setShowResetConfirm(false);
    navigate('/');
  }

  function handleHome() {
    setShowExitConfirm(true);
  }

  const renderModals = () => (
    <>
      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#1a0f1e] border-2 border-white/20 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl space-y-5">
            <div className="text-5xl">🚪</div>
            <div>
              <h3 className="text-2xl font-black text-white">Exit Game?</h3>
              <p className="text-red-400 font-bold mt-1">കളി അവസാനിപ്പിക്കണോ?</p>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              This will end the current game session for all connected players and return everyone to the home screen.
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

      {/* Force Reset Confirmation Modal */}
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
              <p className="text-white/50 text-[11px]">
                • Terminates the active game session on the server.
                <br />• Clears all temporary roles, scores, and stale connections.
                <br />• Returns all mobile phones and the TV to the home screen.
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

  // Fetch the machine's real local IP for the QR code
  useEffect(() => {
    fetch('/api/host-ip')
      .then(r => r.json())
      .then(({ ip }: { ip: string }) => setHostIP(ip))
      .catch(() => setHostIP('localhost'));
  }, []);

  // Reclaim existing room or create room as soon as socket connects
  useEffect(() => {
    const socket = getSocket();
    const tryInit = () => {
      if (creating) return;
      setCreating(true);

      const savedHost = sessionStorage.getItem('chitram_tv_host');
      if (savedHost) {
        try {
          const { roomCode, hostToken, gameType } = JSON.parse(savedHost);
          if (roomCode && hostToken && (!gameType || gameType === gameTypeParam)) {
            console.log(`[TVHost] Reclaiming host room ${roomCode}`);
            socket.emit('room:reclaim-host', { roomCode, hostToken });
            return;
          }
        } catch (e) {}
      }

      socket.emit('room:create', { playerName: 'Host', gameType: gameTypeParam });
    };

    if (socket.connected) tryInit();
    else socket.once('connect', tryInit);
  }, [creating, gameTypeParam]);

  if (!room) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">🎨</div>
          <p className="text-white/60 text-xl font-medium">Setting up your room…</p>
        </div>
      </div>
    );
  }

  // If this room is for Dumb Charades, render Charades TV Screen
  if (room.gameType === 'charades') {
    return <CharadesTVScreen hostIP={hostIP} />;
  }

  // If this room is for The Imposter, render Imposter TV Screen
  if (room.gameType === 'imposter') {
    return <ImposterTVScreen hostIP={hostIP} />;
  }

  // If this room is for Emoji Movie Challenge, render Emoji TV Screen
  if (room.gameType === 'emoji') {
    return <EmojiTVScreen hostIP={hostIP} />;
  }

  // If this room is for Draw & Identify Challenge, render DrawIdentify TV Screen
  if (room.gameType === 'draw-identify') {
    return <DrawIdentifyTVScreen hostIP={hostIP} />;
  }

  // If this room is for Fastest Finger – Picture Rush, render FastestFinger TV Screen
  if (room.gameType === 'fastest-finger') {
    return <FastestFingerTVScreen hostIP={hostIP} />;
  }

  const players = room.players.filter(p => !p.isHost);
  const settings = room.settings;
  const canStart = players.length >= 1; // at least 1 non-host player
  const currentDrawer = room.players.find(p => p.isDrawing);
  const totalSecs = room.settings.roundDurationSeconds || 60;

  function updateSettings(patch: Partial<RoomSettings>) {
    const socket = getSocket();
    socket.emit('game:settings', { ...settings, ...patch });
  }

  function startGame() {
    getSocket().emit('game:start');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: LOBBY
  // ──────────────────────────────────────────────────────────────────────────
  if (room.phase === 'lobby') {
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
      <div className="h-full flex flex-col bg-gradient-to-br from-gray-950 via-brand-900/25 to-gray-950 overflow-hidden select-none">
        {/* Top bar */}
        <div className="flex items-center justify-between px-12 pt-8 pb-4">
          <div className="flex items-center gap-6">
            <button
              onClick={handleHome}
              className="btn-secondary text-sm py-2.5 px-5 flex items-center gap-2 hover:bg-white/20 transition-all font-semibold"
            >
              ← Home / പ്രധാന പേജ്
            </button>
            <div className="flex items-center gap-4">
              <span className="text-5xl">🎨</span>
              <div>
                <h1 className="text-4xl font-extrabold text-white tracking-tight">Chitram</h1>
                <p className="ml-text text-brand-300 text-xl font-semibold">ചിത്രം പാർട്ടി ഗെയിം</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-5 py-2.5 backdrop-blur-md">
              <span className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-white/80 font-medium text-base">
                {players.length} player{players.length !== 1 ? 's' : ''} joined
              </span>
            </div>
            {/* Small discreet Force Reset button */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-[11px] text-white/30 hover:text-red-400 hover:bg-red-950/30 border border-white/10 hover:border-red-500/40 px-2.5 py-2 rounded-lg transition-all font-semibold flex items-center gap-1.5"
              title="Force reset this room and all sessions"
            >
              <span className="text-xs">🔄</span>
              <span>Force Reset</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-10 px-12 pb-10 overflow-hidden items-center">
          {/* Left: QR Code */}
          <div className="flex flex-col items-center justify-center gap-5 w-80 shrink-0 bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
            <p className="text-white/70 text-sm uppercase tracking-widest font-bold text-center">
              Scan with phone to join
            </p>
            <div className="bg-white p-4 rounded-2xl shadow-2xl shadow-brand-900/60">
              <QRCodeSVG value={joinUrl} size={210} />
            </div>
            <p className="text-white/50 text-xs text-center break-all">
              or browse to:<br />
              <span className="text-brand-300 font-mono text-sm font-semibold">
                {displayUrl}
              </span>
            </p>
          </div>

          {/* Center: Big Room Code & Player Roster */}
          <div className="flex-1 flex flex-col justify-center items-center gap-8 h-full">
            <div className="text-center">
              <p className="text-white/40 text-sm uppercase tracking-widest font-bold mb-2">Room Code</p>
              <div className="text-9xl font-black text-white tracking-[0.25em] pl-6 leading-none
                              drop-shadow-[0_0_50px_rgba(168,85,247,0.7)]">
                {room.code}
              </div>
            </div>

            <div className="w-full max-w-xl">
              <p className="text-white/50 text-xs uppercase tracking-widest font-semibold mb-4 text-center">
                {players.length === 0 ? 'Waiting for players to scan QR code…' : 'Joined Players'}
              </p>
              <div className="flex flex-wrap gap-3 justify-center min-h-[90px] items-center">
                {players.length === 0 ? (
                  <div className="flex items-center gap-2 text-white/30 text-lg">
                    <span>ഫോണിൽ QR കോഡ് സ്കാൻ ചെയ്യുക</span>
                    <span className="animate-pulse">…</span>
                  </div>
                ) : (
                  players.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 bg-brand-600/30 border border-brand-400/50
                                 rounded-2xl px-5 py-3 shadow-lg shadow-brand-950/50 animate-bounce-in"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <span className="text-2xl">👤</span>
                      <span className="text-white text-xl font-bold">{p.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Settings & Start Button */}
          <div className="flex flex-col justify-center gap-6 w-80 shrink-0">
            <div className="card space-y-6">
              <div>
                <p className="text-white/70 text-xs uppercase tracking-widest font-bold mb-3">Round Timer</p>
                <div className="grid grid-cols-2 gap-2">
                  {TIMER_OPTIONS.map(secs => (
                    <button
                      key={secs}
                      onClick={() => updateSettings({ roundDurationSeconds: secs })}
                      className={`py-3 px-3 rounded-xl text-base font-bold transition-all
                        ${settings.roundDurationSeconds === secs
                          ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/60 ring-2 ring-brand-400 scale-[1.02]'
                          : 'bg-white/5 text-white/60 hover:bg-white/15 hover:text-white'}`}
                    >
                      {secs}s
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-white/70 text-xs uppercase tracking-widest font-bold mb-3">Total Rounds</p>
                <div className="flex gap-2">
                  {ROUND_OPTIONS.map(n => (
                    <button
                      key={n}
                      onClick={() => updateSettings({ totalRounds: n })}
                      className={`flex-1 py-3 rounded-xl text-base font-bold transition-all
                        ${settings.totalRounds === n
                          ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/60 ring-2 ring-brand-400 scale-[1.02]'
                          : 'bg-white/5 text-white/60 hover:bg-white/15 hover:text-white'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={startGame}
              disabled={!canStart}
              className={`btn-primary text-2xl py-5 w-full flex items-center justify-center gap-3
                ${!canStart ? 'opacity-30 cursor-not-allowed shadow-none' : 'hover:scale-105 active:scale-95'}`}
            >
              {canStart ? '🚀 Start Game' : '⏳ Waiting for players…'}
            </button>
          </div>
        </div>
        {renderModals()}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: GAME END / FINAL LEADERBOARD
  // ──────────────────────────────────────────────────────────────────────────
  if (room.phase === 'game-end') {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];

    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-brand-950 to-gray-950 p-12 select-none overflow-hidden relative">
        <div className="absolute top-6 right-8">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-[11px] text-white/30 hover:text-red-400 hover:bg-red-950/30 border border-white/10 hover:border-red-500/40 px-2.5 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5"
            title="Force reset this room and all sessions"
          >
            <span className="text-xs">🔄</span>
            <span>Force Reset</span>
          </button>
        </div>
        <div className="text-center mb-8 animate-bounce-in">
          <div className="text-7xl mb-2">🏆</div>
          <h1 className="text-5xl font-black text-white">Game Over!</h1>
          <p className="ml-text text-3xl font-bold text-brand-300 mt-2">വിജയി: {winner?.name ?? 'ആരുമില്ല'} 🎉</p>
        </div>

        <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md mb-8">
          <p className="text-white/50 text-xs uppercase tracking-widest font-bold mb-4 text-center">
            Final Scores / അന്തിമ സ്കോർ
          </p>
          <div className="flex flex-col gap-3">
            {sorted.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-4 rounded-2xl transition-all
                  ${idx === 0
                    ? 'bg-brand-600/30 border border-brand-400/60 text-white font-extrabold text-2xl shadow-xl shadow-brand-900/40'
                    : 'bg-white/5 text-white/90 text-xl font-semibold'}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{['🥇', '🥈', '🥉'][idx] ?? '👤'}</span>
                  <span>{p.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-brand-300 font-bold">{p.score}</span>
                  <span className="text-white/40 text-sm font-normal">pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleHome}
            className="btn-secondary text-xl py-4 px-8"
          >
            🏠 Home / പ്രധാന പേജ്
          </button>
          <button
            onClick={startGame}
            className="btn-primary text-xl py-4 px-10"
          >
            🔄 Play Again / വീണ്ടും കളിക്കാം
          </button>
        </div>
        {renderModals()}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 3: ACTIVE GAME (PLAYING or ROUND-END)
  // ──────────────────────────────────────────────────────────────────────────
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="h-full flex flex-col bg-gray-950 select-none overflow-hidden">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-10 py-4 border-b border-white/10 shrink-0 bg-gray-900/60 backdrop-blur-md">
        {/* Left: Logo & Round */}
        <div className="flex items-center gap-5">
          <button
            onClick={handleHome}
            className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 text-white/70 hover:text-white font-medium"
            title="Leave room and return to home page"
          >
            ← Exit
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎨</span>
            <span className="text-2xl font-black text-white">Chitram</span>
          </div>
          <div className="bg-white/10 px-4 py-1.5 rounded-full text-white/80 font-semibold text-sm">
            Round {room.currentRound} of {room.settings.totalRounds}
          </div>
        </div>

        {/* Center: Big Timer */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-8 py-2 rounded-2xl shadow-inner">
          <span className="text-white/40 text-sm uppercase tracking-wider font-bold">Time:</span>
          <Timer remaining={timerRemaining} total={totalSecs} large />
        </div>

        {/* Right: Drawer name & Room code */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Drawing now</p>
            <p className="text-brand-300 font-extrabold text-xl">{currentDrawer?.name ?? '—'}</p>
          </div>
          <div className="bg-brand-600/20 border border-brand-500/40 px-3.5 py-1.5 rounded-xl font-mono font-bold text-white text-base">
            {room.code}
          </div>
          {/* Small discreet Force Reset button */}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-[11px] text-white/30 hover:text-red-400 hover:bg-red-950/40 border border-white/10 hover:border-red-500/40 px-2 py-1 rounded-lg transition-all font-semibold flex items-center gap-1"
            title="Force reset this room and all sessions"
          >
            <span className="text-xs">🔄</span>
            <span>Force Reset</span>
          </button>
        </div>
      </div>

      {/* ── Banner: Drawer announcement & Category Clue ──────────────────── */}
      <div className="bg-brand-900/30 border-b border-brand-500/20 px-10 py-2.5 flex items-center justify-between text-center">
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-bounce">✏️</span>
          <span className="text-white text-lg font-bold">
            <span className="text-brand-300 underline underline-offset-4 decoration-brand-400">{currentDrawer?.name}</span> is drawing!
          </span>
          <span className="ml-text text-brand-200/80 text-base font-semibold">
            ({currentDrawer?.name} ചിത്രം വരയ്ക്കുന്നു)
          </span>
        </div>

        {room.currentCategory && (
          <div className="flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/40 px-5 py-1.5 rounded-full shadow-lg">
            <span className="text-white/60 text-xs uppercase tracking-wider font-bold">Category:</span>
            <span className="text-yellow-300 font-black text-base">{room.currentCategory}</span>
          </div>
        )}
      </div>

      {/* ── Main Body: Canvas + Scoreboard ─────────────────────────────────── */}
      <div className="flex-1 flex gap-6 p-6 min-h-0 overflow-hidden">
        {/* Canvas Display */}
        <div className="flex-1 h-full min-h-0 bg-white/5 border border-white/10 rounded-3xl p-3 shadow-2xl flex flex-col">
          <div className="flex-1 w-full h-full relative rounded-2xl overflow-hidden shadow-inner">
            <Canvas mode="view" />
          </div>
        </div>

        {/* Scoreboard Sidebar */}
        <div className="w-80 shrink-0 h-full flex flex-col card p-5 overflow-hidden">
          <p className="text-white/50 text-xs uppercase tracking-widest font-bold mb-4 flex items-center justify-between">
            <span>Scoreboard</span>
            <span className="text-white/30 text-[10px]">സ്കോർബോർഡ്</span>
          </p>

          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
            {sortedPlayers.map((p, idx) => {
              const isDrawing = p.id === currentDrawer?.id;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl transition-all
                    ${isDrawing
                      ? 'bg-brand-600/30 border border-brand-400/50 text-white shadow-lg ring-1 ring-brand-400/40'
                      : 'bg-white/5 text-white/80 border border-white/5'}`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="text-xl shrink-0">{['🥇', '🥈', '🥉'][idx] ?? '👤'}</span>
                    <div className="truncate">
                      <p className="font-bold text-base truncate">{p.name}</p>
                      {isDrawing && (
                        <p className="text-brand-300 text-xs font-semibold">🎨 വരയ്ക്കുന്നു</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xl font-black text-brand-300 tabular-nums">{p.score}</span>
                    <span className="text-white/40 text-xs ml-1">pts</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 text-center text-white/40 text-xs">
            Shout guesses out loud! 🗣️
          </div>
        </div>
      </div>

      {/* Round End Overlay */}
      <RoundEndOverlay />

      {renderModals()}
    </div>
  );
}
