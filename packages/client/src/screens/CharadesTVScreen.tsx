import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';
import Timer from '../components/Timer';
import type { CharadesSettings, CharadesDifficulty } from '@chitram/shared';

const TIMER_OPTIONS = [60, 90, 120];
const ROUNDS_PER_TEAM_OPTIONS = [3, 5, 7];
const DIFFICULTY_OPTIONS: { id: CharadesDifficulty; label: string; ml: string }[] = [
  { id: 'easy', label: 'Easy', ml: 'എളുപ്പം' },
  { id: 'medium', label: 'Medium', ml: 'ഇടത്തരം' },
  { id: 'hard', label: 'Hard', ml: 'കഠിനം' },
  { id: 'mixed', label: 'Mixed', ml: 'എല്ലാം' },
];

interface Props {
  hostIP: string;
}

export default function CharadesTVScreen({ hostIP }: Props) {
  const navigate = useNavigate();
  const { room, connected, charadesState, timerRemaining } = useGameStore();

  const [editingTeamA, setEditingTeamA] = useState(false);
  const [editingTeamB, setEditingTeamB] = useState(false);
  const [teamANameInput, setTeamANameInput] = useState('');
  const [teamBNameInput, setTeamBNameInput] = useState('');

  if (!room) return null;

  const players = room.players.filter(p => !p.isHost);
  const teamAPlayers = players.filter(p => p.team === 'A');
  const teamBPlayers = players.filter(p => p.team === 'B');
  const unassignedPlayers = players.filter(p => !p.team);

  const canStart = teamAPlayers.length >= 2 && teamBPlayers.length >= 2;
  const settings: CharadesSettings = room.charadesSettings ?? {
    roundDurationSeconds: 90,
    totalRoundsPerTeam: 5,
    difficulty: 'mixed',
    actorSelection: 'random',
    teamAName: 'മിന്നൽ മുരളി',
    teamBName: 'പ്രേമം ഗ്യാങ്',
  };

  const totalSecs = settings.roundDurationSeconds || 90;

  function updateCharadesSettings(patch: Partial<CharadesSettings>) {
    getSocket().emit('charades:update-settings', patch);
  }

  function handleLockAndStart() {
    getSocket().emit('charades:lock-teams');
  }

  function handleHome() {
    getSocket().emit('room:leave');
    useGameStore.getState().reset();
    navigate('/');
  }

  function handleStartActing() {
    getSocket().emit('charades:start-acting');
  }

  function handleNextRound() {
    getSocket().emit('charades:next-round');
  }

  function handleRestart() {
    getSocket().emit('charades:restart-game');
  }

  function handleAdjustScore(team: 'A' | 'B', delta: number) {
    getSocket().emit('charades:adjust-score', { team, delta });
  }

  function saveTeamAName() {
    if (teamANameInput.trim()) {
      updateCharadesSettings({ teamAName: teamANameInput.trim() });
    }
    setEditingTeamA(false);
  }

  function saveTeamBName() {
    if (teamBNameInput.trim()) {
      updateCharadesSettings({ teamBName: teamBNameInput.trim() });
    }
    setEditingTeamB(false);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: CHARADES LOBBY & TEAM SELECTION
  // ──────────────────────────────────────────────────────────────────────────
  if (room.phase === 'lobby' || !charadesState?.teamsLocked) {
    const joinUrl = `http://${hostIP || 'localhost'}:3000/lobby?room=${room.code}`;

    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 overflow-hidden select-none">
        {/* Top bar */}
        <div className="flex items-center justify-between px-10 pt-6 pb-3 shrink-0">
          <div className="flex items-center gap-5">
            <button
              onClick={handleHome}
              className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 hover:bg-white/20 transition-all font-semibold"
            >
              ← Home / പ്രധാന പേജ്
            </button>
            <div className="flex items-center gap-3">
              <span className="text-4xl animate-bounce">🎭</span>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Dumb Charades</h1>
                <p className="ml-text text-amber-300 text-base font-bold">മലയാള സിനിമ ഡംബ് ഷെറേഡ്സ്</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-white/80 text-sm font-semibold">{players.length} Players</span>
            </div>
            <div className="bg-amber-500/20 border border-amber-400/40 px-4 py-1.5 rounded-xl font-mono font-bold text-amber-300 text-lg">
              Room: {room.code}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex gap-6 px-10 pb-6 min-h-0 items-stretch">

          {/* Left Column: QR Code */}
          <div className="w-64 shrink-0 bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
            <p className="text-white/80 text-xs uppercase tracking-widest font-bold">
              Scan with mobile to join
            </p>
            <div className="bg-white p-3 rounded-2xl shadow-xl shadow-purple-950/60">
              <QRCodeSVG value={joinUrl} size={160} />
            </div>
            <p className="text-white/50 text-[11px] break-all leading-tight">
              or visit:<br />
              <span className="text-amber-300 font-mono text-xs font-semibold">
                {hostIP ? `http://${hostIP}:3000` : 'getting IP…'}
              </span>
            </p>
          </div>

          {/* Center Column: Teams Grid */}
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">

              {/* Team A */}
              <div className="bg-blue-950/40 border-2 border-blue-500/40 rounded-3xl p-5 flex flex-col min-h-0 shadow-lg">
                <div className="flex items-center justify-between pb-3 border-b border-blue-500/20 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    {editingTeamA ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={teamANameInput}
                          onChange={e => setTeamANameInput(e.target.value)}
                          className="bg-blue-900/60 text-white font-black text-lg px-2 py-1 rounded border border-blue-400 w-36"
                          autoFocus
                        />
                        <button onClick={saveTeamAName} className="text-xs bg-blue-600 px-2 py-1 rounded text-white">Save</button>
                      </div>
                    ) : (
                      <h2
                        onClick={() => { setTeamANameInput(settings.teamAName); setEditingTeamA(true); }}
                        className="text-xl font-black text-blue-300 cursor-pointer hover:underline"
                        title="Click to rename"
                      >
                        {settings.teamAName} ✏️
                      </h2>
                    )}
                  </div>
                  <span className="bg-blue-500/30 text-blue-200 text-xs font-bold px-3 py-1 rounded-full">
                    {teamAPlayers.length} Players {teamAPlayers.length < 2 && '(Min 2)'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2 pr-1">
                  {teamAPlayers.length === 0 ? (
                    <p className="text-white/30 text-center my-auto text-sm italic">
                      Select Team A on phone to join…
                    </p>
                  ) : (
                    teamAPlayers.map(p => (
                      <div key={p.id} className="bg-blue-900/30 border border-blue-400/30 px-3 py-2 rounded-xl flex items-center justify-between">
                        <span className="text-white font-bold text-sm flex items-center gap-1.5">
                          👤 {p.name}
                          {p.isOnline === false && (
                            <span className="text-[10px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded font-normal">
                              screen locked
                            </span>
                          )}
                        </span>
                        <button
                          onClick={() => getSocket().emit('charades:move-player', { playerId: p.id, team: 'B' })}
                          className="text-[11px] text-blue-300 hover:text-white bg-blue-800/50 px-2 py-0.5 rounded"
                          title="Move to Team B"
                        >
                          → Team B
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Team B */}
              <div className="bg-amber-950/40 border-2 border-amber-500/40 rounded-3xl p-5 flex flex-col min-h-0 shadow-lg">
                <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🔥</span>
                    {editingTeamB ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={teamBNameInput}
                          onChange={e => setTeamBNameInput(e.target.value)}
                          className="bg-amber-900/60 text-white font-black text-lg px-2 py-1 rounded border border-amber-400 w-36"
                          autoFocus
                        />
                        <button onClick={saveTeamBName} className="text-xs bg-amber-600 px-2 py-1 rounded text-white">Save</button>
                      </div>
                    ) : (
                      <h2
                        onClick={() => { setTeamBNameInput(settings.teamBName); setEditingTeamB(true); }}
                        className="text-xl font-black text-amber-300 cursor-pointer hover:underline"
                        title="Click to rename"
                      >
                        {settings.teamBName} ✏️
                      </h2>
                    )}
                  </div>
                  <span className="bg-amber-500/30 text-amber-200 text-xs font-bold px-3 py-1 rounded-full">
                    {teamBPlayers.length} Players {teamBPlayers.length < 2 && '(Min 2)'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2 pr-1">
                  {teamBPlayers.length === 0 ? (
                    <p className="text-white/30 text-center my-auto text-sm italic">
                      Select Team B on phone to join…
                    </p>
                  ) : (
                    teamBPlayers.map(p => (
                      <div key={p.id} className="bg-amber-900/30 border border-amber-400/30 px-3 py-2 rounded-xl flex items-center justify-between">
                        <span className="text-white font-bold text-sm flex items-center gap-1.5">
                          👤 {p.name}
                          {p.isOnline === false && (
                            <span className="text-[10px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded font-normal">
                              screen locked
                            </span>
                          )}
                        </span>
                        <button
                          onClick={() => getSocket().emit('charades:move-player', { playerId: p.id, team: 'A' })}
                          className="text-[11px] text-amber-300 hover:text-white bg-amber-800/50 px-2 py-0.5 rounded"
                          title="Move to Team A"
                        >
                          ← Team A
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Unassigned Players Bar */}
            {unassignedPlayers.length > 0 && (
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3 shrink-0">
                <span className="text-white/50 text-xs font-bold uppercase tracking-wider shrink-0">Choosing team:</span>
                <div className="flex flex-wrap gap-2">
                  {unassignedPlayers.map(p => (
                    <span key={p.id} className="bg-white/10 text-white text-xs px-2.5 py-1 rounded-full font-medium">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Settings & Lock/Start */}
          <div className="w-80 shrink-0 flex flex-col justify-between gap-4">
            <div className="card space-y-4 p-5">
              {/* Timer */}
              <div>
                <p className="text-white/70 text-xs uppercase tracking-widest font-bold mb-2">Acting Time</p>
                <div className="flex gap-2">
                  {TIMER_OPTIONS.map(secs => (
                    <button
                      key={secs}
                      onClick={() => updateCharadesSettings({ roundDurationSeconds: secs })}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all
                        ${settings.roundDurationSeconds === secs
                          ? 'bg-amber-500 text-gray-950 shadow-md font-black'
                          : 'bg-white/5 text-white/60 hover:text-white'}`}
                    >
                      {secs}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Rounds per team */}
              <div>
                <p className="text-white/70 text-xs uppercase tracking-widest font-bold mb-2">Rounds Per Team</p>
                <div className="flex gap-2">
                  {ROUNDS_PER_TEAM_OPTIONS.map(n => (
                    <button
                      key={n}
                      onClick={() => updateCharadesSettings({ totalRoundsPerTeam: n })}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all
                        ${settings.totalRoundsPerTeam === n
                          ? 'bg-amber-500 text-gray-950 shadow-md font-black'
                          : 'bg-white/5 text-white/60 hover:text-white'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <p className="text-white/70 text-xs uppercase tracking-widest font-bold mb-2">Movie Difficulty</p>
                <div className="grid grid-cols-2 gap-2">
                  {DIFFICULTY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => updateCharadesSettings({ difficulty: opt.id })}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all
                        ${settings.difficulty === opt.id
                          ? 'bg-amber-500 text-gray-950 font-black shadow-md'
                          : 'bg-white/5 text-white/60 hover:text-white'}`}
                    >
                      {opt.label} ({opt.ml})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lock & Start Button */}
            <div className="space-y-2">
              <button
                onClick={handleLockAndStart}
                disabled={!canStart}
                className={`btn-primary text-xl py-4 w-full flex items-center justify-center gap-2
                  ${!canStart ? 'opacity-35 cursor-not-allowed shadow-none' : 'bg-amber-500 hover:bg-amber-600 text-gray-950 shadow-amber-900/40 font-black hover:scale-105'}`}
              >
                {canStart ? '🎬 Start Charades!' : '⏳ Need 2+ on both teams'}
              </button>
              {!canStart && (
                <p className="text-white/40 text-xs text-center">
                  Each team must have at least 2 players to start.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: GAME OVER / FINAL PODIUM
  // ──────────────────────────────────────────────────────────────────────────
  if (charadesState?.roundPhase === 'game-end') {
    const isTeamAWinner = charadesState.teamAScore > charadesState.teamBScore;
    const isTie = charadesState.teamAScore === charadesState.teamBScore;
    const winnerName = isTie
      ? 'It is a Tie! (തുല്യം)'
      : isTeamAWinner
      ? charadesState.teamAName
      : charadesState.teamBName;

    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 p-10 select-none overflow-hidden">
        <div className="text-center mb-8 animate-bounce-in">
          <div className="text-8xl mb-3">🏆</div>
          <h1 className="text-5xl font-black text-white">Game Over!</h1>
          <p className="ml-text text-4xl font-extrabold text-amber-300 mt-2">
            {isTie ? 'മത്സരം സമനിലയിൽ അവസാനിച്ചു!' : `വിജയികൾ: ${winnerName} 🎉`}
          </p>
        </div>

        {/* Final Score Comparison */}
        <div className="grid grid-cols-2 gap-8 w-full max-w-2xl mb-8">
          <div className={`p-6 rounded-3xl text-center border-2 transition-all ${isTeamAWinner ? 'bg-blue-600/30 border-blue-400 shadow-2xl scale-105' : 'bg-white/5 border-white/10'}`}>
            <p className="text-blue-300 text-xl font-black mb-1">{charadesState.teamAName}</p>
            <p className="text-6xl font-black text-white">{charadesState.teamAScore}</p>
            <p className="text-white/40 text-xs uppercase mt-2">Rounds Won: {charadesState.roundsPlayed.A}</p>
          </div>

          <div className={`p-6 rounded-3xl text-center border-2 transition-all ${!isTeamAWinner && !isTie ? 'bg-amber-600/30 border-amber-400 shadow-2xl scale-105' : 'bg-white/5 border-white/10'}`}>
            <p className="text-amber-300 text-xl font-black mb-1">{charadesState.teamBName}</p>
            <p className="text-6xl font-black text-white">{charadesState.teamBScore}</p>
            <p className="text-white/40 text-xs uppercase mt-2">Rounds Won: {charadesState.roundsPlayed.B}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleHome}
            className="btn-secondary text-lg py-3 px-8"
          >
            🏠 Home / പ്രധാന പേജ്
          </button>
          <button
            onClick={handleRestart}
            className="btn-primary bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-lg py-3 px-10 shadow-lg"
          >
            🔄 Rematch / വീണ്ടും കളിക്കാം
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 3: ACTIVE ROUND (ACTOR-READY, ACTING, or ROUND-END)
  // ──────────────────────────────────────────────────────────────────────────
  const isActingTeamA = charadesState.actingTeam === 'A';
  const actingTeamName = isActingTeamA ? charadesState.teamAName : charadesState.teamBName;
  const judgingTeamName = isActingTeamA ? charadesState.teamBName : charadesState.teamAName;
  const currentActor = room.players.find(p => p.id === charadesState.currentActorId);
  const isActorOffline = currentActor?.isOnline === false;

  return (
    <div className="h-full flex flex-col bg-gray-950 select-none overflow-hidden">

      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-10 py-3 border-b border-white/10 shrink-0 bg-gray-900/70 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={handleHome}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-white/70 hover:text-white"
          >
            ← Exit
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎭</span>
            <span className="text-xl font-black text-white">Dumb Charades</span>
          </div>
          <span className="bg-white/10 px-3 py-1 rounded-full text-white/80 font-bold text-xs">
            Turn {charadesState.currentRoundNumber} / {charadesState.totalRounds}
          </span>
        </div>

        {/* Center: Big Timer */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-1 rounded-2xl shadow-inner">
          <span className="text-white/40 text-xs uppercase tracking-wider font-bold">Timer:</span>
          <Timer remaining={timerRemaining} total={totalSecs} large />
        </div>

        {/* Right: Room code */}
        <div className="bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-xl font-mono font-bold text-amber-300 text-sm">
          {room.code}
        </div>
      </div>

      {/* ── Scoreboard Banner ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 divide-x divide-white/10 border-b border-white/10 bg-white/5 shrink-0">
        {/* Team A */}
        <div className={`flex items-center justify-between px-10 py-3 ${isActingTeamA ? 'bg-blue-600/20 ring-2 ring-inset ring-blue-400' : ''}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-lg font-black text-blue-300">{charadesState.teamAName}</p>
              {isActingTeamA && (
                <span className="text-xs bg-blue-500 text-white font-bold px-2 py-0.5 rounded-full">
                  ACTING TEAM (അഭിനയിക്കുന്നു)
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => handleAdjustScore('A', 1)} className="text-[10px] bg-white/10 hover:bg-white/20 px-1.5 rounded text-white/60 font-bold">+</button>
              <button onClick={() => handleAdjustScore('A', -1)} className="text-[10px] bg-white/10 hover:bg-white/20 px-1.5 rounded text-white/60 font-bold">-</button>
            </div>
            <span className="text-4xl font-black text-white tabular-nums">{charadesState.teamAScore}</span>
            <span className="text-xs text-white/40">pts</span>
          </div>
        </div>

        {/* Team B */}
        <div className={`flex items-center justify-between px-10 py-3 ${!isActingTeamA ? 'bg-amber-600/20 ring-2 ring-inset ring-amber-400' : ''}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="text-lg font-black text-amber-300">{charadesState.teamBName}</p>
              {!isActingTeamA && (
                <span className="text-xs bg-amber-500 text-gray-950 font-bold px-2 py-0.5 rounded-full">
                  ACTING TEAM (അഭിനയിക്കുന്നു)
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => handleAdjustScore('B', 1)} className="text-[10px] bg-white/10 hover:bg-white/20 px-1.5 rounded text-white/60 font-bold">+</button>
              <button onClick={() => handleAdjustScore('B', -1)} className="text-[10px] bg-white/10 hover:bg-white/20 px-1.5 rounded text-white/60 font-bold">-</button>
            </div>
            <span className="text-4xl font-black text-white tabular-nums">{charadesState.teamBScore}</span>
            <span className="text-xs text-white/40">pts</span>
          </div>
        </div>
      </div>

      {/* ── Main Arena Area ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-0 relative">

        {/* PHASE A: Actor Ready Wait */}
        {charadesState.roundPhase === 'actor-ready' && (
          <div className="space-y-6 max-w-2xl animate-fade-in">
            <div className="w-24 h-24 bg-amber-500/20 border-2 border-amber-400/50 rounded-3xl mx-auto flex items-center justify-center text-5xl shadow-2xl">
              🎬
            </div>
            <div>
              <p className="text-white/60 text-sm uppercase tracking-widest font-bold mb-1">Current Actor / നടൻ</p>
              <h2 className="text-5xl font-black text-white tracking-tight">
                {charadesState.currentActorName}
              </h2>
              <p className="ml-text text-amber-300 text-2xl font-bold mt-2">
                {actingTeamName}-ന് വേണ്ടി അഭിനയിക്കുന്നു!
              </p>
            </div>
            <div className="card py-4 px-6 bg-white/5 border border-white/10">
              <p className="text-white/70 text-base">
                Actor is reading the secret movie title on their phone.
              </p>
              <p className="text-white/40 text-xs mt-1">
                Waiting for {charadesState.currentActorName} to click Ready…
              </p>
            </div>
            {isActorOffline && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-200 px-4 py-2.5 rounded-2xl text-sm flex items-center justify-center gap-3 animate-pulse">
                <span>⚠️ {charadesState.currentActorName}&apos;s phone is disconnected or screen locked!</span>
                <button
                  onClick={() => getSocket().emit('charades:change-actor')}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-3 py-1 rounded-lg"
                >
                  Pick Replacement Now
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleStartActing}
                className="btn-primary bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-lg py-3 px-8"
              >
                ▶️ Force Start Acting (Host)
              </button>
              <button
                onClick={() => getSocket().emit('charades:change-actor')}
                className="btn-secondary text-sm py-3 px-5 text-white/80 hover:text-white"
                title="Pick another player from the acting team"
              >
                🔄 Change Actor / നടനെ മാറ്റുക
              </button>
            </div>
          </div>
        )}

        {/* PHASE B: Acting in progress */}
        {charadesState.roundPhase === 'acting' && (
          <div className="space-y-8 max-w-3xl animate-fade-in">
            <div>
              <div className="inline-block bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-3">
                Round in Progress
              </div>
              <h2 className="text-6xl font-black text-white tracking-tight">
                {charadesState.currentActorName} is Acting!
              </h2>
              <p className="ml-text text-3xl font-extrabold text-amber-300 mt-2">
                {actingTeamName} ടീമംഗങ്ങൾ ഉത്തരം ഉറക്കെ പറയൂ!
              </p>
            </div>

            {/* Secret Movie Hidden Placeholder on TV */}
            <div className="card bg-gradient-to-r from-purple-950/40 via-amber-950/20 to-purple-950/40 border-2 border-dashed border-white/20 py-8 px-12 rounded-3xl shadow-2xl">
              <span className="text-4xl mb-2 block">🤫</span>
              <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Secret Malayalam Movie Title</p>
              <p className="text-3xl font-black text-white/90 mt-1 tracking-widest">
                • • • • • • • • • • •
              </p>
              <p className="text-white/40 text-xs mt-2">
                (Visible only to {charadesState.currentActorName} and the judging team {judgingTeamName})
              </p>
            </div>

            {/* Rules reminder */}
            <div className="flex justify-center gap-6 text-sm text-white/60">
              <span className="flex items-center gap-2">🚫 ശബ്ദം ഉണ്ടാക്കരുത്</span>
              <span className="flex items-center gap-2">✋ ആംഗ്യങ്ങൾ മാത്രം</span>
              <span className="flex items-center gap-2">🗣️ ഉറക്കെ വിളിച്ചു പറയുക</span>
            </div>

            {/* Change Actor button / connection warning */}
            <div className="flex items-center justify-center gap-4 pt-1">
              {isActorOffline && (
                <span className="text-red-400 text-xs font-bold animate-pulse">
                  ⚠️ Actor is disconnected / locked
                </span>
              )}
              <button
                onClick={() => getSocket().emit('charades:change-actor')}
                className="text-xs text-white/50 hover:text-white underline"
              >
                🔄 Actor disconnected? Change Actor (നടനെ മാറ്റുക)
              </button>
            </div>
          </div>
        )}

        {/* PHASE C: Round End Reveal */}
        {charadesState.roundPhase === 'round-end' && charadesState.revealedMovie && (
          <div className="space-y-6 max-w-2xl animate-bounce-in">
            <div className="text-7xl">
              {charadesState.lastRoundResult?.type === 'correct' ? '🎉' : '⏰'}
            </div>

            <div>
              <p className="text-white/50 text-sm uppercase tracking-widest font-bold mb-1">The Movie Was / സിനിമ</p>
              <h2 className="ml-text text-6xl font-black text-amber-300 drop-shadow-[0_0_40px_rgba(245,158,11,0.5)]">
                {charadesState.revealedMovie.title}
              </h2>
              <p className="text-white/70 text-2xl font-bold mt-2">
                {charadesState.revealedMovie.manglish} ({charadesState.revealedMovie.year})
              </p>
            </div>

            <div className="card py-5 px-8 bg-white/10 border-2 border-white/20 rounded-2xl">
              <p className="text-2xl font-black text-white">
                {charadesState.lastRoundResult?.type === 'correct'
                  ? `✅ ${actingTeamName} got it right! (+2 Points)`
                  : `❌ Time up! ${judgingTeamName} gets the points! (+2 Points)`}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleNextRound}
                className="btn-primary bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-lg py-3 px-8"
              >
                ⏭️ Next Round Now
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
