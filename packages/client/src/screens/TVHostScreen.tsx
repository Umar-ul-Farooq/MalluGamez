import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';
import type { RoomSettings } from '@chitram/shared';

const TIMER_OPTIONS = [30, 60, 90, 120];
const ROUND_OPTIONS = [2, 3, 5];

export default function TVHostScreen() {
  const { room, connected } = useGameStore();
  const [creating, setCreating] = useState(false);
  const [hostIP, setHostIP] = useState<string>('');

  // Fetch the machine's real local IP for the QR code
  useEffect(() => {
    fetch('/api/host-ip')
      .then(r => r.json())
      .then(({ ip }: { ip: string }) => setHostIP(ip))
      .catch(() => setHostIP('localhost'));
  }, []);

  // Create room as soon as socket connects
  useEffect(() => {
    const socket = getSocket();
    const tryCreate = () => {
      if (creating) return;
      setCreating(true);
      socket.emit('room:create', { playerName: 'Host' });
    };
    if (socket.connected) tryCreate();
    else socket.once('connect', tryCreate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!room) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="text-5xl animate-spin mb-4">🎨</div>
          <p className="text-white/60">Setting up your room…</p>
        </div>
      </div>
    );
  }

  const joinUrl = `http://${hostIP || 'localhost'}:3000/lobby?room=${room.code}`;
  const players = room.players.filter(p => !p.isHost);
  const settings = room.settings;
  const canStart = players.length >= 1; // at least 1 non-host player

  function updateSettings(patch: Partial<RoomSettings>) {
    const socket = getSocket();
    socket.emit('game:settings', { ...settings, ...patch });
  }

  function startGame() {
    getSocket().emit('game:start');
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-950 via-brand-900/20 to-gray-950 overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-10 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🎨</span>
          <div>
            <h1 className="text-3xl font-extrabold text-white leading-none">Chitram</h1>
            <p className="ml-text text-brand-300 text-lg leading-none">ചിത്രം</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-white/60 text-sm">
            {players.length} player{players.length !== 1 ? 's' : ''} joined
          </span>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="flex-1 flex gap-8 px-10 pb-8 overflow-hidden">

        {/* Left — QR + join instructions */}
        <div className="flex flex-col items-center justify-center gap-6 w-72 shrink-0">
          <p className="text-white/60 text-sm uppercase tracking-widest text-center">
            Scan to join
          </p>
          <div className="bg-white p-4 rounded-3xl shadow-2xl shadow-brand-900/60">
            <QRCodeSVG value={joinUrl} size={200} />
          </div>
          <p className="text-white/40 text-xs text-center break-all px-2">
            or type:<br />
            <span className="text-white/70 font-mono text-sm">
              {hostIP ? `${hostIP}:3000` : 'getting IP…'}
            </span>
          </p>
        </div>

        {/* Center — room code + player list */}
        <div className="flex-1 flex flex-col justify-center gap-6">

          {/* Room code */}
          <div className="text-center">
            <p className="text-white/40 text-sm uppercase tracking-widest mb-2">Room Code</p>
            <div className="text-8xl font-extrabold text-white tracking-[0.2em] leading-none
                            drop-shadow-[0_0_40px_rgba(168,85,247,0.6)]">
              {room.code}
            </div>
          </div>

          {/* Player chips */}
          <div>
            <p className="text-white/40 text-sm uppercase tracking-widest mb-3 text-center">
              {players.length === 0 ? 'Waiting for players…' : 'Players'}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {players.length === 0 ? (
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-2 h-2 bg-white/20 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              ) : (
                players.map(p => (
                  <div key={p.id}
                    className="flex items-center gap-2 bg-brand-600/20 border border-brand-500/40
                               rounded-full px-4 py-2 animate-bounce-in">
                    <span className="text-xl">👤</span>
                    <span className="text-white font-semibold">{p.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right — settings + start */}
        <div className="flex flex-col justify-center gap-6 w-64 shrink-0">

          <div className="card">
            <p className="text-white/60 text-xs uppercase tracking-widest mb-4">Round Timer</p>
            <div className="grid grid-cols-2 gap-2">
              {TIMER_OPTIONS.map(secs => (
                <button
                  key={secs}
                  onClick={() => updateSettings({ roundDurationSeconds: secs })}
                  className={`py-2 px-3 rounded-xl text-sm font-bold transition-all
                    ${settings.roundDurationSeconds === secs
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                >
                  {secs}s
                </button>
              ))}
            </div>

            <p className="text-white/60 text-xs uppercase tracking-widest mb-4 mt-5">Rounds</p>
            <div className="flex gap-2">
              {ROUND_OPTIONS.map(n => (
                <button
                  key={n}
                  onClick={() => updateSettings({ totalRounds: n })}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all
                    ${settings.totalRounds === n
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startGame}
            disabled={!canStart}
            className={`btn-primary text-lg py-4 w-full
              ${!canStart ? 'opacity-40 cursor-not-allowed' : 'animate-pulse-subtle'}`}
          >
            {canStart ? '🚀 Start Game' : '⏳ Waiting…'}
          </button>

          {!canStart && (
            <p className="text-white/30 text-xs text-center">
              Need at least 1 player to start
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
