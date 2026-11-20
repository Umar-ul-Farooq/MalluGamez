import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';
import CharadesMobileScreen from './CharadesMobileScreen';
import ImposterMobileScreen from './ImposterMobileScreen';

type JoinState = 'form' | 'waiting';

export default function LobbyScreen() {
  const [searchParams] = useSearchParams();
  const urlRoomCode = (searchParams.get('room') ?? '').toUpperCase();

  const [joinState, setJoinState] = useState<JoinState>('form');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState(urlRoomCode);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const { room, connected } = useGameStore();

  // Once we receive room:joined, switch to waiting state
  useEffect(() => {
    if (room) setJoinState('waiting');
  }, [room]);

  // Listen for room errors
  useEffect(() => {
    const socket = getSocket();
    const onError = (msg: string) => {
      setError(msg);
      setJoining(false);
    };
    socket.on('room:error', onError);
    return () => { socket.off('room:error', onError); };
  }, []);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const name = playerName.trim();
    const code = roomCode.trim().toUpperCase();

    if (!name) { setError('Please enter your name'); return; }
    if (code.length !== 4) { setError('Room code must be 4 characters'); return; }

    setJoining(true);
    getSocket().emit('room:join', { playerName: name, roomCode: code });
  }

  // ── Join form ─────────────────────────────────────────────────────────────
  if (joinState === 'form') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 px-6
                      bg-gradient-to-b from-gray-950 to-brand-900/30">

        {/* Logo */}
        <div className="text-center mb-2">
          <span className="text-5xl">🎨</span>
          <h1 className="text-3xl font-extrabold text-white mt-2">Chitram</h1>
          <p className="ml-text text-brand-300 text-xl">ചിത്രം</p>
        </div>

        <form onSubmit={handleJoin} className="w-full max-w-sm flex flex-col gap-4">

          {/* Name input */}
          <div>
            <label className="text-white/60 text-sm mb-1 block">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="e.g. Anish"
              maxLength={20}
              className="input-field text-xl"
              autoFocus
              autoComplete="off"
            />
          </div>

          {/* Room code input */}
          <div>
            <label className="text-white/60 text-sm mb-1 block">Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="e.g. A B C D"
              maxLength={4}
              className="input-field text-3xl text-center tracking-[0.4em] font-bold uppercase"
              autoComplete="off"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-300
                            rounded-xl px-4 py-3 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={joining || !connected}
            className="btn-primary text-xl py-4 mt-2"
          >
            {joining ? '⏳ Joining…' : !connected ? '⚡ Connecting…' : '🎮 Join Game'}
          </button>
        </form>

        <button
          onClick={() => window.history.back()}
          className="text-white/30 text-sm hover:text-white/60 transition-colors"
        >
          ← Back
        </button>
      </div>
    );
  }

  // ── Waiting room ─────────────────────────────────────────────────────────
  if (!room) return null;

  // If this room is for Dumb Charades, render Charades Mobile Controller
  if (room.gameType === 'charades') {
    return <CharadesMobileScreen />;
  }

  // If this room is for The Imposter, render Imposter Mobile Controller
  if (room.gameType === 'imposter') {
    return <ImposterMobileScreen />;
  }

  const players = room.players.filter(p => !p.isHost);
  const me = room.players.find(p => p.id === getSocket().id);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-950 to-brand-900/30">

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <div>
          <h2 className="text-white font-bold text-xl">Room</h2>
          <p className="text-brand-400 text-3xl font-extrabold tracking-widest">{room.code}</p>
        </div>
        <div className="text-right">
          <p className="text-white/40 text-xs uppercase tracking-widest">Playing as</p>
          <p className="text-white font-semibold text-lg">{me?.name ?? '—'}</p>
        </div>
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3">
          Players — {players.length}
        </p>
        <div className="flex flex-col gap-3">
          {players.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 card py-4 animate-fade-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <span className="text-2xl">
                {p.id === getSocket().id ? '🌟' : '👤'}
              </span>
              <span className="font-semibold text-white text-lg">{p.name}</span>
              {p.id === getSocket().id && (
                <span className="ml-auto text-brand-400 text-xs uppercase tracking-widest">You</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer — waiting message */}
      <div className="px-6 pb-10 pt-4 text-center">
        <div className="card">
          <div className="flex items-center justify-center gap-2 mb-1">
            {[0,1,2].map(i => (
              <span key={i} className="w-2 h-2 bg-brand-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <p className="text-white/60 text-sm">Waiting for the host to start the game…</p>
          <p className="ml-text text-brand-400/60 text-xs mt-1">
            ആട്ടം തുടങ്ങാൻ കാത്തിരിക്കുന്നു
          </p>
        </div>
      </div>
    </div>
  );
}
