import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';
import type { CinemaClueMode, CinemaClueSettings, CinemaClueDifficulty } from '@chitram/shared';

const MODE_OPTIONS: Array<{
  id: CinemaClueMode;
  title: string;
  badge: string;
  description: string;
}> = [
  {
    id: 'buzz-in',
    title: 'Buzz In Mode',
    badge: 'RACE + 20s STEAL',
    description:
      'Both teams submit anytime. First team to buzz in gets first shot — if wrong, the opposing team gets a fixed 20s steal window before the next clue.',
  },
  {
    id: 'alternate-question',
    title: 'Alternate Teams – Question Based',
    badge: 'PER MOVIE',
    description:
      'One team gets first turn across all 4 clues of a movie (with other team second); starting team alternates on every new movie.',
  },
  {
    id: 'alternate-clue',
    title: 'Alternate Teams – Clue Based',
    badge: 'PER CLUE',
    description:
      'First turn alternates after every single clue (A→B on Clue 1, B→A on Clue 2), and reverses starting team on each new movie.',
  },
];

const QUESTION_OPTIONS = [5, 10, 15, 20];
const DIFFICULTY_OPTIONS: Array<{ id: CinemaClueDifficulty; label: string }> = [
  { id: 'mixed', label: 'Mixed' },
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];
const CLUE_POINTS = [10, 7, 5, 3];

interface Props {
  hostIP: string;
}

export default function CinemaClueTVScreen({ hostIP }: Props) {
  const navigate = useNavigate();
  const { room, connected, cinemaClueState, timerRemaining } = useGameStore();

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!room) return null;

  const players = room.players.filter((p) => !p.isHost);
  const teamAPlayers = players.filter((p) => p.team === 'A');
  const teamBPlayers = players.filter((p) => p.team === 'B');
  const unassignedPlayers = players.filter((p) => p.team !== 'A' && p.team !== 'B');

  // Supports 1+ player per team (single-player teams supported)
  const canStart = teamAPlayers.length >= 1 && teamBPlayers.length >= 1;

  const settings: CinemaClueSettings = room.cinemaClueSettings ?? {
    mode: 'buzz-in',
    clueDurationSeconds: 20,
    totalQuestions: 10,
    difficulty: 'mixed',
    teamAName: 'Team A',
    teamBName: 'Team B',
  };

  function updateSettings(patch: Partial<CinemaClueSettings>) {
    getSocket().emit('cinema-clue:update-settings', patch);
  }

  function adjustTimer(delta: number) {
    const next = Math.max(10, Math.min(40, settings.clueDurationSeconds + delta));
    updateSettings({ clueDurationSeconds: next });
  }

  function movePlayer(playerId: string, team: 'A' | 'B') {
    getSocket().emit('cinema-clue:move-player', { playerId, team });
  }

  function startGame() {
    if (!canStart) return;
    getSocket().emit('cinema-clue:start-game');
  }

  function restartGame() {
    getSocket().emit('cinema-clue:restart-game');
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
              This clears the active match and returns all connected clients cleanly.
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
  // VIEW 1: LOBBY / SETUP
  // ──────────────────────────────────────────────────────────────────────────
  if (room.phase === 'lobby' || !cinemaClueState || !cinemaClueState.questionId) {
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
      <div className="h-full flex flex-col bg-gradient-to-br from-gray-950 via-indigo-950/30 to-gray-950 overflow-hidden select-none">
        {renderModals()}
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 pt-5 pb-3 border-b border-white/10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 hover:bg-white/20 font-semibold"
            >
              ← Home / പ്രധാന പേജ്
            </button>
            <div className="flex items-center gap-3">
              <span className="text-4xl">🎬🔍</span>
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Cinema Clue Battle</h1>
                <p className="ml-text text-indigo-300 text-sm font-semibold">
                  4 സൂചനകൾ, 2 ടീമുകൾ — സിനിമ കണ്ടെത്തൂ!
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-4 py-2">
              <span className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-white/80 font-medium text-sm">
                {players.length} player{players.length !== 1 ? 's' : ''} joined
              </span>
            </div>

            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-[11px] text-white/30 hover:text-red-400 hover:bg-red-950/30 border border-white/10 px-2.5 py-1.5 rounded-lg font-semibold"
            >
              🔄 Force Reset
            </button>
          </div>
        </div>

        {/* Main 3-Column Setup Layout */}
        <div className="flex-1 flex gap-6 p-6 min-h-0 overflow-hidden">
          {/* Left: QR Code */}
          <div className="w-72 shrink-0 bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col items-center justify-center gap-3.5 text-center">
            <p className="text-white/60 text-xs uppercase tracking-widest font-bold">Join Room</p>
            <div className="bg-white p-3 rounded-2xl shadow-2xl">
              <QRCodeSVG value={joinUrl} size={165} level="M" />
            </div>
            <div>
              <p className="text-white/40 text-xs">Go to:</p>
              <p className="text-indigo-300 font-bold text-xs tracking-wide">{displayUrl}</p>
            </div>
            <div className="bg-white/10 border border-white/15 px-5 py-2 rounded-2xl w-full">
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Room Code</p>
              <p className="text-3xl font-mono font-black text-white tracking-[0.2em]">{room.code}</p>
            </div>
          </div>

          {/* Middle: Team A vs Team B */}
          <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
              {/* Team A */}
              <div className="bg-cyan-950/30 border border-cyan-500/35 rounded-3xl p-5 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-cyan-300 font-black text-lg">{settings.teamAName}</h2>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-200 font-bold">
                    {teamAPlayers.length} player{teamAPlayers.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {teamAPlayers.length === 0 ? (
                  <p className="text-white/30 text-sm my-auto text-center">Select Team A on mobile (min 1 player)</p>
                ) : (
                  <div className="space-y-2 overflow-y-auto pr-1">
                    {teamAPlayers.map((p) => (
                      <div key={p.id} className="bg-white/10 border border-white/10 rounded-2xl px-3.5 py-2.5 flex items-center justify-between">
                        <span className="text-white font-bold truncate">{p.name}</span>
                        <button
                          onClick={() => movePlayer(p.id, 'B')}
                          className="text-[11px] px-2 py-1 rounded-lg bg-white/10 hover:bg-pink-500/30 text-white/70 font-semibold"
                        >
                          Move → B
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Team B */}
              <div className="bg-pink-950/30 border border-pink-500/35 rounded-3xl p-5 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-pink-300 font-black text-lg">{settings.teamBName}</h2>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-200 font-bold">
                    {teamBPlayers.length} player{teamBPlayers.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {teamBPlayers.length === 0 ? (
                  <p className="text-white/30 text-sm my-auto text-center">Select Team B on mobile (min 1 player)</p>
                ) : (
                  <div className="space-y-2 overflow-y-auto pr-1">
                    {teamBPlayers.map((p) => (
                      <div key={p.id} className="bg-white/10 border border-white/10 rounded-2xl px-3.5 py-2.5 flex items-center justify-between">
                        <span className="text-white font-bold truncate">{p.name}</span>
                        <button
                          onClick={() => movePlayer(p.id, 'A')}
                          className="text-[11px] px-2 py-1 rounded-lg bg-white/10 hover:bg-cyan-500/30 text-white/70 font-semibold"
                        >
                          Move → A
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {unassignedPlayers.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-3.5 flex items-center justify-between gap-4 flex-wrap">
                <span className="text-xs font-bold text-amber-300">
                  Unassigned ({unassignedPlayers.length}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {unassignedPlayers.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 bg-white/10 rounded-xl px-2.5 py-1">
                      <span className="text-xs font-bold text-white">{p.name}</span>
                      <button
                        onClick={() => movePlayer(p.id, 'A')}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-200 font-bold"
                      >
                        +A
                      </button>
                      <button
                        onClick={() => movePlayer(p.id, 'B')}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/30 text-pink-200 font-bold"
                      >
                        +B
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Mode Selection, Timer (+ / -), Start */}
          <div className="w-[410px] shrink-0 bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col justify-between gap-4 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h2 className="text-white font-bold text-lg">Game Mode & Timer</h2>
                <p className="text-white/40 text-xs">Selected mode and timer lock when the game starts</p>
              </div>

              {/* 3 Mode Selection Cards */}
              <div className="space-y-2">
                {MODE_OPTIONS.map((m) => {
                  const active = settings.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => updateSettings({ mode: m.id })}
                      className={`w-full text-left p-3 rounded-2xl border transition-all ${
                        active
                          ? 'bg-indigo-500/25 border-indigo-400 shadow-lg'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-sm text-white">{m.title}</span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            active ? 'bg-indigo-400 text-black' : 'bg-white/10 text-white/60'
                          }`}
                        >
                          {m.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/65 mt-1 leading-snug">{m.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Configurable Clue Timer (+ / - in 5s increments, 10s–40s) */}
              <div className="bg-black/25 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-white/60 block">
                    Clue Timer
                  </span>
                  <span className="text-[11px] text-white/40">10s – 40s (5s steps)</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => adjustTimer(-5)}
                    disabled={settings.clueDurationSeconds <= 10}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-black text-xl flex items-center justify-center"
                    aria-label="Decrease clue timer"
                  >
                    −
                  </button>
                  <span className="text-2xl font-mono font-black text-indigo-300 min-w-[54px] text-center">
                    {settings.clueDurationSeconds}s
                  </span>
                  <button
                    onClick={() => adjustTimer(5)}
                    disabled={settings.clueDurationSeconds >= 40}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-black text-xl flex items-center justify-center"
                    aria-label="Increase clue timer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Questions & Difficulty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-white/50 block mb-1.5">
                    Movies
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {QUESTION_OPTIONS.map((n) => (
                      <button
                        key={n}
                        onClick={() => updateSettings({ totalQuestions: n })}
                        className={`py-1.5 rounded-xl text-xs font-bold border ${
                          settings.totalQuestions === n
                            ? 'bg-amber-500 text-black border-amber-300'
                            : 'bg-white/5 text-white/70 border-white/10'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-white/50 block mb-1.5">
                    Difficulty
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => updateSettings({ difficulty: d.id })}
                        className={`py-1 rounded-xl text-[11px] font-bold border ${
                          settings.difficulty === d.id
                            ? 'bg-emerald-500 text-black border-emerald-300'
                            : 'bg-white/5 text-white/70 border-white/10'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={startGame}
              disabled={!canStart}
              className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl ${
                canStart
                  ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white hover:scale-[1.01]'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {canStart ? '🎬 Start Battle' : 'Need 1+ Player on Both Teams'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: GAME END
  // ──────────────────────────────────────────────────────────────────────────
  if (room.phase === 'game-end' || cinemaClueState.roundPhase === 'game-end') {
    const aWon = cinemaClueState.teamAScore > cinemaClueState.teamBScore;
    const bWon = cinemaClueState.teamBScore > cinemaClueState.teamAScore;
    const headline = aWon
      ? `${cinemaClueState.teamAName} Wins!`
      : bWon
        ? `${cinemaClueState.teamBName} Wins!`
        : "It's a Tie!";

    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-gray-950 via-indigo-950/30 to-gray-950 p-8 select-none overflow-hidden">
        {renderModals()}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🏆</span>
            <div>
              <h1 className="text-3xl font-black text-white">Cinema Clue Battle — Final Score</h1>
              <p className="text-indigo-300 text-sm font-semibold">{headline}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={restartGame}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-black shadow-lg"
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

        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <h2 className="text-5xl font-black text-amber-300">{headline}</h2>

          <div className="grid grid-cols-2 gap-6 w-full max-w-3xl">
            <div
              className={`rounded-3xl p-8 border-2 text-center ${
                aWon ? 'bg-cyan-500/20 border-cyan-400 shadow-2xl' : 'bg-white/5 border-white/10'
              }`}
            >
              <p className="text-cyan-300 font-black text-2xl">{cinemaClueState.teamAName}</p>
              <p className="text-6xl font-mono font-black text-white mt-3">{cinemaClueState.teamAScore}</p>
              <p className="text-xs text-white/50 mt-2">
                {teamAPlayers.map((p) => p.name).join(', ')}
              </p>
            </div>

            <div
              className={`rounded-3xl p-8 border-2 text-center ${
                bWon ? 'bg-pink-500/20 border-pink-400 shadow-2xl' : 'bg-white/5 border-white/10'
              }`}
            >
              <p className="text-pink-300 font-black text-2xl">{cinemaClueState.teamBName}</p>
              <p className="text-6xl font-mono font-black text-white mt-3">{cinemaClueState.teamBScore}</p>
              <p className="text-xs text-white/50 mt-2">
                {teamBPlayers.map((p) => p.name).join(', ')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 3: ACTIVE QUESTION / REVEAL + PREVIOUSLY GUESSED MOVIES PANEL
  // ──────────────────────────────────────────────────────────────────────────
  const modeLabel =
    cinemaClueState.mode === 'buzz-in'
      ? '⚡ Buzz In Mode'
      : cinemaClueState.mode === 'alternate-question'
        ? '🔄 Alternate · Per Movie'
        : '🔁 Alternate · Per Clue';

  const activeTeamName =
    cinemaClueState.activeTeam === 'A'
      ? cinemaClueState.teamAName
      : cinemaClueState.activeTeam === 'B'
        ? cinemaClueState.teamBName
        : null;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-950 via-indigo-950/25 to-gray-950 overflow-hidden select-none">
      {renderModals()}

      {/* Top Scoreboard Bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowExitConfirm(true)} className="btn-secondary text-xs py-2 px-3">
            ← Exit
          </button>
          <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-xs font-black text-indigo-200">
            {modeLabel}
          </span>
          <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-white">
            Movie {cinemaClueState.questionNumber} / {cinemaClueState.totalQuestions}
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-xs font-black text-amber-300">
            Clue {cinemaClueState.currentClueIndex + 1} · {cinemaClueState.potentialPoints} pts
          </span>
        </div>

        {/* Team Scores + Timer */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-cyan-500/15 border border-cyan-400/40">
            <span className="text-xs font-bold text-cyan-300">{cinemaClueState.teamAName}</span>
            <span className="text-xl font-mono font-black text-white">{cinemaClueState.teamAScore}</span>
          </div>

          <div
            className={`px-5 py-2 rounded-2xl font-mono font-black text-2xl border ${
              cinemaClueState.buzzResponseWindowActive
                ? 'bg-orange-600/30 border-orange-400 text-orange-200 animate-pulse'
                : timerRemaining <= 5 && cinemaClueState.roundPhase === 'question'
                  ? 'bg-red-600/30 border-red-400 text-red-200 animate-pulse'
                  : 'bg-white/10 border-white/15 text-white'
            }`}
          >
            {cinemaClueState.buzzResponseWindowActive ? `🔥 20s Steal: ${timerRemaining}s` : `⏱ ${timerRemaining}s`}
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-pink-500/15 border border-pink-400/40">
            <span className="text-xs font-bold text-pink-300">{cinemaClueState.teamBName}</span>
            <span className="text-xl font-mono font-black text-white">{cinemaClueState.teamBScore}</span>
          </div>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-[11px] text-white/30 hover:text-red-400 border border-white/10 px-2.5 py-1.5 rounded-lg"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 p-6 min-h-0 overflow-hidden">
        {/* Left: 4-Stage Clue Cards + Status Banner */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Active Turn / Buzz-In Banner OR Movie Reveal */}
          {cinemaClueState.roundPhase === 'reveal' && cinemaClueState.revealInfo ? (
            <div className="bg-gradient-to-r from-emerald-950/60 to-indigo-950/60 border-2 border-emerald-400/60 rounded-3xl p-6 text-center space-y-2 shadow-2xl">
              <p className="text-xs uppercase tracking-widest font-bold text-emerald-300">
                {cinemaClueState.revealInfo.winnerTeam
                  ? `🎉 Solved at Clue ${cinemaClueState.revealInfo.solvedAtClue} by ${cinemaClueState.revealInfo.winnerName} (+${cinemaClueState.revealInfo.pointsAwarded} pts)`
                  : '📽️ All 4 Clues Exhausted — Movie Revealed'}
              </p>
              <h2 className="ml-text text-4xl font-black text-white">{cinemaClueState.revealInfo.title}</h2>
              <p className="text-2xl font-extrabold text-amber-300">
                {cinemaClueState.revealInfo.manglish} ({cinemaClueState.revealInfo.year})
              </p>
            </div>
          ) : (
            <div
              className={`rounded-2xl px-6 py-4 border flex items-center justify-between ${
                cinemaClueState.buzzResponseWindowActive
                  ? 'bg-orange-500/20 border-orange-400'
                  : 'bg-white/5 border-white/15'
              }`}
            >
              <div>
                <p className="text-xs uppercase tracking-widest text-white/50 font-bold">
                  {cinemaClueState.mode === 'buzz-in'
                    ? cinemaClueState.buzzResponseWindowActive
                      ? '20-Second Opposing Team Steal Window'
                      : 'Buzz In Open'
                    : 'Current Turn'}
                </p>
                <p className="text-2xl font-black text-white">
                  {cinemaClueState.activeTeam === null
                    ? '⚡ Both teams can buzz in and submit!'
                    : cinemaClueState.buzzResponseWindowActive
                      ? `🔥 ${activeTeamName} has ${timerRemaining}s to steal!`
                      : `🎯 ${activeTeamName}'s Turn`}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-bold">
                <span
                  className={`px-3 py-1.5 rounded-xl border ${
                    cinemaClueState.teamAGuessedThisClue
                      ? 'bg-white/5 border-white/10 text-white/40 line-through'
                      : 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200'
                  }`}
                >
                  {cinemaClueState.teamAName}: {cinemaClueState.teamAGuessedThisClue ? 'Used' : 'Guess Ready'}
                </span>
                <span
                  className={`px-3 py-1.5 rounded-xl border ${
                    cinemaClueState.teamBGuessedThisClue
                      ? 'bg-white/5 border-white/10 text-white/40 line-through'
                      : 'bg-pink-500/20 border-pink-400/40 text-pink-200'
                  }`}
                >
                  {cinemaClueState.teamBName}: {cinemaClueState.teamBGuessedThisClue ? 'Used' : 'Guess Ready'}
                </span>
              </div>
            </div>
          )}

          {/* 4-Stage Clue List */}
          <div className="flex-1 grid grid-rows-4 gap-3 min-h-0">
            {[0, 1, 2, 3].map((idx) => {
              const unlocked = idx <= cinemaClueState.currentClueIndex;
              const isCurrent = idx === cinemaClueState.currentClueIndex && cinemaClueState.roundPhase === 'question';
              const clueText = cinemaClueState.clues[idx];
              return (
                <div
                  key={idx}
                  className={`rounded-2xl px-6 py-4 border flex items-center gap-5 transition-all ${
                    isCurrent
                      ? 'bg-indigo-500/25 border-indigo-400 shadow-lg'
                      : unlocked
                        ? 'bg-white/10 border-white/15'
                        : 'bg-white/[0.02] border-white/5 opacity-45'
                  }`}
                >
                  <div className="shrink-0 text-center w-20">
                    <span className="text-[11px] uppercase tracking-widest font-bold text-white/50 block">
                      Clue {idx + 1}
                    </span>
                    <span className="text-base font-black text-amber-300">{CLUE_POINTS[idx]} pts</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {unlocked && clueText ? (
                      <p className="text-xl lg:text-2xl font-bold text-white leading-snug">{clueText}</p>
                    ) : (
                      <p className="text-base font-semibold text-white/30">🔒 Locked until next clue…</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Previously Guessed Movies Panel */}
        <div className="w-80 shrink-0 bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-widest font-bold text-white/70">
              Previously Guessed Movies
            </h3>
            <span className="text-xs font-mono text-white/40">{cinemaClueState.guessedMovies.length}</span>
          </div>
          <p className="text-[11px] text-white/40 mb-3">
            Clears when the next movie question starts. Duplicates are blocked.
          </p>

          {cinemaClueState.guessedMovies.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-white/25 text-sm text-center">
              No guesses submitted yet for this movie
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto pr-1">
              {cinemaClueState.guessedMovies.map((g) => (
                <div
                  key={g.id}
                  className={`p-3 rounded-2xl border ${
                    g.isCorrect
                      ? 'bg-emerald-500/20 border-emerald-400/50'
                      : 'bg-red-950/30 border-red-500/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        g.team === 'A' ? 'bg-cyan-500/30 text-cyan-200' : 'bg-pink-500/30 text-pink-200'
                      }`}
                    >
                      {g.team === 'A' ? cinemaClueState.teamAName : cinemaClueState.teamBName}
                    </span>
                    <span className="text-[11px] font-bold text-white/50">Clue {g.clueNumber}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <span className="font-bold text-white text-sm truncate">{g.guess}</span>
                    <span className="text-base shrink-0">{g.isCorrect ? '✅' : '❌'}</span>
                  </div>
                  <p className="text-[11px] text-white/45 mt-0.5">by {g.playerName}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
