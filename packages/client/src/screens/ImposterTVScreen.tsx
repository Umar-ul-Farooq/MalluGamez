import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';
import Timer from '../components/Timer';
import type {
  ImposterCategory,
  ImposterDifficulty,
  ImposterSettings,
} from '@chitram/shared';
import { IMPOSTER_CATEGORY_LABELS } from '@chitram/shared';

interface Props {
  hostIP: string;
}

const CATEGORY_OPTIONS: { key: ImposterCategory; label: string }[] = [
  { key: 'mixed', label: '🎲 Mixed / എല്ലാം' },
  { key: 'cinema', label: '🎬 Cinema / സിനിമ' },
  { key: 'celebrities', label: '🌟 Celebrities / താരങ്ങൾ' },
  { key: 'kerala', label: '🌴 Kerala / സംസ്കാരം' },
  { key: 'food', label: '🍲 Food / ഭക്ഷണം' },
  { key: 'places', label: '📍 Places / സ്ഥലങ്ങൾ' },
  { key: 'objects', label: '📦 Objects / വസ്തുക്കൾ' },
];

const ROUND_OPTIONS = [3, 5, 7, 10];
const IMPOSTER_COUNT_OPTIONS = [1, 2];
const DIFFICULTY_OPTIONS: { key: ImposterDifficulty; label: string }[] = [
  { key: 'mixed', label: 'Mixed / മിശ്രിതം' },
  { key: 'easy', label: 'Easy / എളുപ്പം' },
  { key: 'medium', label: 'Medium / ഇടത്തരം' },
  { key: 'hard', label: 'Hard / കഠിനം' },
];
const DISCUSSION_TIMER_OPTIONS = [30, 60, 90];
const VOTING_TIMER_OPTIONS = [20, 30];

export default function ImposterTVScreen({ hostIP }: Props) {
  const navigate = useNavigate();
  const { room, imposterState, timerRemaining, connected } = useGameStore();

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [settings, setSettings] = useState<ImposterSettings>({
    totalRounds: room?.imposterSettings?.totalRounds ?? 5,
    imposterCount: room?.imposterSettings?.imposterCount ?? 1,
    difficulty: room?.imposterSettings?.difficulty ?? 'mixed',
    category: room?.imposterSettings?.category ?? 'mixed',
    discussionDurationSeconds: room?.imposterSettings?.discussionDurationSeconds ?? 60,
    votingDurationSeconds: room?.imposterSettings?.votingDurationSeconds ?? 30,
  });

  if (!room) return null;

  const players = room.players.filter(p => !p.isHost);
  const canStart = players.length >= 3;

  function updateImposterSettings(patch: Partial<ImposterSettings>) {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    getSocket().emit('imposter:update-settings', patch);
  }

  function handleStartGame() {
    if (!canStart) return;
    getSocket().emit('imposter:start-game');
  }

  function handleNextClue() {
    getSocket().emit('imposter:next-clue', { sessionId: imposterState?.sessionId ?? undefined });
  }

  function handleEndDiscussion() {
    getSocket().emit('imposter:end-discussion', { sessionId: imposterState?.sessionId ?? undefined });
  }

  function handleNextRound() {
    getSocket().emit('imposter:next-round', { sessionId: imposterState?.sessionId ?? undefined });
  }

  function handleRestart() {
    getSocket().emit('imposter:restart-game');
  }

  function confirmForceReset() {
    getSocket().emit('room:force-reset');
    sessionStorage.removeItem('chitram_tv_host');
    useGameStore.getState().reset();
    setShowResetConfirm(false);
    navigate('/');
  }

  function requestExit() {
    setShowExitConfirm(true);
  }

  function confirmExit() {
    getSocket().emit('room:terminate');
    sessionStorage.removeItem('chitram_tv_host');
    useGameStore.getState().reset();
    setShowExitConfirm(false);
    navigate('/');
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

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: LOBBY & GAME SETTINGS
  // ──────────────────────────────────────────────────────────────────────────
  if (room.phase === 'lobby' || !imposterState || imposterState.currentRound === 0) {
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
      <div className="h-full flex flex-col bg-gradient-to-br from-gray-950 via-red-950/25 to-gray-950 overflow-hidden select-none">

        {/* Top Header */}
        <div className="flex items-center justify-between px-10 pt-6 pb-3 shrink-0">
          <div className="flex items-center gap-5">
            <button
              onClick={requestExit}
              className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 hover:bg-white/20 transition-all font-semibold"
            >
              ← Home / പ്രധാന പേജ്
            </button>
            <div className="flex items-center gap-3">
              <span className="text-4xl animate-bounce">🕵️‍♂️</span>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  The Imposter
                  <span className="bg-red-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold">
                    ചതിയൻ
                  </span>
                </h1>
                <p className="ml-text text-red-400 text-base font-bold">ആരാണ് ചതിയൻ? കണ്ടുപിടിക്കൂ!</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-white/80 text-sm font-semibold">{players.length} Players</span>
            </div>
            <div className="bg-red-500/20 border border-red-500/40 px-4 py-1.5 rounded-xl font-mono font-bold text-red-300 text-lg">
              Room: {room.code}
            </div>
            {/* Small discreet Force Reset button */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-[11px] text-white/30 hover:text-red-400 hover:bg-red-950/30 border border-white/10 hover:border-red-500/40 px-2.5 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5"
              title="Force reset this room and all sessions"
            >
              <span className="text-xs">🔄</span>
              <span>Force Reset</span>
            </button>
          </div>
        </div>

        {/* Abandoned session alert banner */}
        {imposterState?.isAbandoned && (
          <div className="mx-10 mb-3 p-3 bg-red-950/80 border border-red-500/60 rounded-2xl flex items-center justify-between gap-4 animate-pulse text-xs text-red-200">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <span><strong>Session Interrupted:</strong> The previous game session was interrupted. You can start fresh or force reset to a clean lobby.</span>
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-md"
            >
              Force Reset to Clean Lobby
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex gap-6 px-10 pb-6 min-h-0 items-stretch">

          {/* Left Column: QR Code */}
          <div className="w-64 shrink-0 bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
            <p className="text-white/80 text-xs uppercase tracking-widest font-bold">
              Scan with mobile to join
            </p>
            <div className="bg-white p-3 rounded-2xl shadow-xl shadow-red-950/60">
              <QRCodeSVG value={joinUrl} size={160} />
            </div>
            <p className="text-white/50 text-[11px] break-all leading-tight">
              or visit:<br />
              <span className="text-red-400 font-mono text-xs font-semibold">
                {displayUrl}
              </span>
            </p>
            <div className="card py-2 px-3 bg-red-950/30 border border-red-500/20 w-full text-center">
              <p className="text-red-200 text-xs font-bold">3–12 Players</p>
              <p className="text-white/40 text-[10px]">Social Deduction Party Game</p>
            </div>
          </div>

          {/* Center Column: Joined Players */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col min-h-0 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>👥 Joined Players</span>
                <span className="text-sm font-normal text-white/50">({players.length})</span>
              </h2>
              <span className="text-xs text-white/40 font-semibold">
                {players.length < 3 ? `Need ${3 - players.length} more to start` : 'Ready to start!'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto py-4 grid grid-cols-2 gap-3 content-start">
              {players.length === 0 ? (
                <div className="col-span-2 text-center my-auto py-12">
                  <p className="text-white/40 text-sm italic">Scan QR code or enter room code on mobile…</p>
                </div>
              ) : (
                players.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white/10 border border-white/10 px-4 py-3 rounded-2xl flex items-center justify-between"
                  >
                    <span className="text-white font-bold text-base flex items-center gap-2">
                      <span>👤</span>
                      <span>{p.name}</span>
                      {p.isOnline === false && (
                        <span className="text-[10px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded font-normal">
                          offline
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-mono text-white/40">✓</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Settings */}
          <div className="w-80 shrink-0 bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col justify-between gap-3 shadow-lg">
            <div>
              <h2 className="text-lg font-black text-white pb-2 border-b border-white/10 mb-3">
                ⚙️ Game Settings
              </h2>

              <div className="space-y-3 text-xs">
                {/* Total Rounds */}
                <div>
                  <label className="text-white/60 font-semibold mb-1 block">Rounds</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {ROUND_OPTIONS.map(r => (
                      <button
                        key={r}
                        onClick={() => updateImposterSettings({ totalRounds: r })}
                        className={`py-1.5 rounded-lg font-black transition-all ${settings.totalRounds === r ? 'bg-red-600 text-white shadow' : 'bg-white/10 text-white/60 hover:text-white'}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Imposter Count */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-white/60 font-semibold">Imposters</label>
                    {settings.imposterCount === 2 && (
                      <span className="text-[10px] text-amber-300">Rec. 7+ players</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {IMPOSTER_COUNT_OPTIONS.map(c => (
                      <button
                        key={c}
                        onClick={() => updateImposterSettings({ imposterCount: c })}
                        className={`py-1.5 rounded-lg font-black transition-all ${settings.imposterCount === c ? 'bg-red-600 text-white shadow' : 'bg-white/10 text-white/60 hover:text-white'}`}
                      >
                        {c} Imposter{c > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-white/60 font-semibold mb-1 block">Category / വിഷയം</label>
                  <select
                    value={settings.category}
                    onChange={e => updateImposterSettings({ category: e.target.value as ImposterCategory })}
                    className="w-full bg-white/10 border border-white/20 text-white font-bold py-1.5 px-2 rounded-lg text-xs"
                  >
                    {CATEGORY_OPTIONS.map(cat => (
                      <option key={cat.key} value={cat.key} className="bg-gray-900 text-white">
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="text-white/60 font-semibold mb-1 block">Difficulty / നിലവാരം</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DIFFICULTY_OPTIONS.map(diff => (
                      <button
                        key={diff.key}
                        onClick={() => updateImposterSettings({ difficulty: diff.key })}
                        className={`py-1 rounded font-bold text-[11px] transition-all ${settings.difficulty === diff.key ? 'bg-red-600 text-white' : 'bg-white/10 text-white/60 hover:text-white'}`}
                      >
                        {diff.label.split('/')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discussion Time */}
                <div>
                  <label className="text-white/60 font-semibold mb-1 block">Discussion Time</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DISCUSSION_TIMER_OPTIONS.map(sec => (
                      <button
                        key={sec}
                        onClick={() => updateImposterSettings({ discussionDurationSeconds: sec })}
                        className={`py-1 rounded font-bold text-[11px] transition-all ${settings.discussionDurationSeconds === sec ? 'bg-red-600 text-white' : 'bg-white/10 text-white/60 hover:text-white'}`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div className="pt-2">
              <button
                onClick={handleStartGame}
                disabled={!canStart}
                className={`btn-primary w-full py-3.5 text-base font-black rounded-2xl flex items-center justify-center gap-2 transition-all
                  ${!canStart ? 'opacity-35 cursor-not-allowed shadow-none' : 'bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-950/60 hover:scale-105'}`}
              >
                {canStart ? '🕵️ Start The Imposter!' : '⏳ Need 3+ Players'}
              </button>
            </div>
          </div>

        </div>

        {renderModals()}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: FINAL PODIUM / GAME OVER
  // ──────────────────────────────────────────────────────────────────────────
  if (imposterState.roundPhase === 'game-end') {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];

    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-red-950/30 to-gray-950 p-10 select-none overflow-hidden">
        <div className="text-center mb-8 animate-bounce-in">
          <div className="text-8xl mb-3">🏆</div>
          <h1 className="text-5xl font-black text-white">Game Over!</h1>
          <p className="ml-text text-4xl font-extrabold text-red-400 mt-2">
            വിജയി: {winner ? winner.name : 'Unknown'} ({winner ? winner.score : 0} pts) 🎉
          </p>
        </div>

        {/* Podium Top 3 */}
        <div className="flex items-end justify-center gap-6 mb-10 w-full max-w-2xl">
          {sortedPlayers.slice(0, 3).map((p, i) => (
            <div
              key={p.id}
              className={`flex-1 rounded-3xl p-5 text-center border-2 transition-all ${i === 0 ? 'bg-red-600/30 border-red-400 scale-105 shadow-2xl' : 'bg-white/5 border-white/10'}`}
            >
              <div className="text-3xl mb-1">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
              <h3 className="text-xl font-black text-white">{p.name}</h3>
              <p className="text-3xl font-black text-red-400 mt-1">{p.score} pts</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button onClick={requestExit} className="btn-secondary text-base py-3 px-8">
            🏠 Home / പ്രധാന പേജ്
          </button>
          <button onClick={handleRestart} className="btn-primary bg-red-600 hover:bg-red-500 text-white font-black text-base py-3 px-10 shadow-lg">
            🔄 Rematch / വീണ്ടും കളിക്കാം
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-[11px] text-white/30 hover:text-red-400 hover:bg-red-950/30 border border-white/10 hover:border-red-500/40 px-2.5 py-2 rounded-lg transition-all font-semibold flex items-center gap-1.5 ml-4"
            title="Force reset this room and all sessions"
          >
            <span className="text-xs">🔄</span>
            <span>Force Reset</span>
          </button>
        </div>

        {renderModals()}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 3: IN-GAME ACTIVE PHASES
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-gray-950 select-none overflow-hidden relative">

      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-10 py-3 border-b border-white/10 shrink-0 bg-gray-900/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={requestExit}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-white/70 hover:text-white"
          >
            ← Exit
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🕵️‍♂️</span>
            <span className="text-xl font-black text-white">The Imposter</span>
          </div>
          <span className="bg-red-600/30 text-red-300 border border-red-500/40 px-3 py-1 rounded-full font-bold text-xs">
            Round {imposterState.currentRound} / {imposterState.totalRounds}
          </span>
          <span className="bg-white/10 text-white/70 px-3 py-1 rounded-full font-semibold text-xs">
            {imposterState.category}
          </span>
        </div>

        {/* Center: Timer */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-1 rounded-2xl shadow-inner">
          <span className="text-white/40 text-xs uppercase tracking-wider font-bold">Timer:</span>
          <Timer remaining={timerRemaining} total={60} large />
        </div>

        {/* Right: Room code & Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRestart}
            className="text-xs bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm"
            title="Restart game from Round 1"
          >
            <span>🔄</span> <span>Restart</span>
          </button>
          <div className="bg-red-500/20 border border-red-500/40 px-3 py-1 rounded-xl font-mono font-bold text-red-300 text-sm">
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

      {/* ── Main Arena Content Area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-0 relative">

        {/* 1. ROLE REVEAL PHASE */}
        {imposterState.roundPhase === 'role-reveal' && (
          <div className="space-y-6 max-w-xl animate-fade-in">
            <div className="text-7xl animate-pulse">🤫</div>
            <div>
              <h2 className="text-5xl font-black text-white">Check Your Phones!</h2>
              <p className="ml-text text-red-400 text-3xl font-extrabold mt-2">
                നിങ്ങളുടെ ഫോൺ നോക്കൂ!
              </p>
            </div>
            <div className="card py-5 px-8 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-white/80 text-lg">
                The secret word has been sent to normal players.
              </p>
              <p className="text-red-300 text-sm font-semibold mt-1">
                The Imposter does NOT know the secret word!
              </p>
            </div>
            <p className="text-white/40 text-xs">Clue round starting in a few seconds…</p>
          </div>
        )}

        {/* 2. CLUE-GIVING PHASE */}
        {imposterState.roundPhase === 'clues' && (
          <div className="space-y-8 max-w-3xl animate-fade-in">
            <div>
              <div className="inline-block bg-red-600/30 border border-red-500/50 text-red-200 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-3">
                Clue Round • Turn {imposterState.clueTurnIndex + 1} of {imposterState.clueOrder.length}
              </div>
              <h2 className="text-6xl font-black text-white tracking-tight">
                {imposterState.currentCluePlayerName || 'Player'}
              </h2>
              <p className="ml-text text-3xl font-extrabold text-red-400 mt-2">
                ഒരു സൂചന ഉറക്കെ പറയൂ!
              </p>
            </div>

            <div className="card bg-gradient-to-r from-red-950/40 via-purple-950/20 to-red-950/40 border-2 border-dashed border-red-400/30 py-8 px-12 rounded-3xl shadow-2xl">
              <span className="text-4xl mb-2 block">🗣️</span>
              <p className="text-white/60 text-base font-bold">
                Speak ONE verbal clue about the secret word aloud.
              </p>
              <p className="text-white/40 text-xs mt-2">
                Do not say the word itself! The Imposter must pretend to know it!
              </p>
            </div>

            {/* Turn order indicators */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {imposterState.clueOrder.map((pid, idx) => {
                const pl = room.players.find(p => p.id === pid);
                const isCurrent = idx === imposterState.clueTurnIndex;
                const isDone = idx < imposterState.clueTurnIndex;

                return (
                  <div
                    key={pid}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${isCurrent ? 'bg-red-600 text-white scale-110 shadow-lg' : isDone ? 'bg-white/10 text-white/40' : 'bg-white/5 text-white/20'}`}
                  >
                    {isDone ? '✓ ' : ''}{pl?.name}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleNextClue}
              className="btn-secondary text-sm py-2.5 px-6 hover:bg-white/20"
            >
              ⏭️ Next Player (അടുത്ത ആൾ)
            </button>
          </div>
        )}

        {/* 3. DISCUSSION PHASE */}
        {imposterState.roundPhase === 'discussion' && (
          <div className="space-y-8 max-w-2xl animate-fade-in">
            <div className="text-7xl animate-pulse">💬</div>
            <div>
              <div className="inline-block bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-3">
                Discussion Time / ചർച്ച
              </div>
              <h2 className="text-6xl font-black text-white tracking-tight">
                Who is the Imposter?
              </h2>
              <p className="ml-text text-3xl font-extrabold text-amber-300 mt-2">
                സംശയം ഉള്ളവരെ ചോദ്യം ചെയ്യൂ!
              </p>
            </div>

            <div className="card py-6 px-10 bg-white/5 border border-white/10 rounded-3xl">
              <p className="text-white/80 text-lg">
                Discuss the clues given. Catch the person who gave a suspicious clue!
              </p>
            </div>

            <button
              onClick={handleEndDiscussion}
              className="btn-primary bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-base py-3.5 px-8 shadow-xl"
            >
              🗳️ End Discussion & Start Voting Now
            </button>
          </div>
        )}

        {/* 4. VOTING & TIE-BREAK PHASES */}
        {(imposterState.roundPhase === 'voting' || imposterState.roundPhase === 'tie-break') && (
          <div className="space-y-8 max-w-2xl animate-fade-in">
            <div className="text-7xl">🗳️</div>
            <div>
              {imposterState.roundPhase === 'tie-break' ? (
                <div className="inline-block bg-amber-600/30 border border-amber-500/50 text-amber-200 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-3">
                  ⚖️ TIE-BREAK VOTE / വോട്ടുകൾ തുല്യം!
                </div>
              ) : (
                <div className="inline-block bg-red-600/30 border border-red-500/50 text-red-200 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-3">
                  Voting in Progress / വോട്ടിംഗ് നടക്കുന്നു
                </div>
              )}
              <h2 className="text-5xl font-black text-white tracking-tight">
                Vote for the Imposter on your phone!
              </h2>
              <p className="ml-text text-2xl font-bold text-red-400 mt-2">
                നിങ്ങളുടെ ഫോണിൽ വോട്ട് രേഖപ്പെടുത്തൂ!
              </p>
            </div>

            {/* Voting progress count */}
            <div className="card py-6 px-12 bg-white/5 border border-white/10 rounded-3xl">
              <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-2">Voting Progress</p>
              <p className="text-5xl font-black text-white tabular-nums">
                {imposterState.votedPlayerIds.length} / {players.length}
              </p>
              <p className="text-white/50 text-xs mt-2">Votes are cast privately</p>
            </div>
          </div>
        )}

        {/* 5. ROUND-END PHASE */}
        {imposterState.roundPhase === 'round-end' && imposterState.roundResult && (
          <div className="space-y-6 max-w-3xl animate-bounce-in">
            <div className="text-7xl">
              {imposterState.roundResult.winner === 'normal' ? '🎉' : '😈'}
            </div>

            <div>
              <h2 className="text-5xl font-black text-white tracking-tight">
                {imposterState.roundResult.winner === 'normal'
                  ? 'Normal Players Win! / നിരപരാധികൾ വിജയിച്ചു!'
                  : 'Imposter Wins! / ചതിയൻ വിജയിച്ചു!'}
              </h2>
              <p className="text-white/60 text-lg mt-1">{imposterState.roundResult.reason}</p>
            </div>

            {/* Revealed Secret Word & Imposters */}
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="card bg-white/5 border border-white/10 p-5 rounded-2xl text-left">
                <p className="text-white/40 text-xs uppercase font-bold tracking-wider">Secret Word / രഹസ്യ വാക്ക്</p>
                <h3 className="ml-text text-3xl font-black text-amber-300 mt-1">
                  {imposterState.revealedWord?.word}
                </h3>
                <p className="text-white/60 text-sm font-bold">
                  {imposterState.revealedWord?.manglish}
                </p>
              </div>

              <div className="card bg-red-950/30 border border-red-500/30 p-5 rounded-2xl text-left">
                <p className="text-red-400 text-xs uppercase font-bold tracking-wider">The Imposter(s) / ചതിയൻമാർ</p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {imposterState.imposterIds?.map(id => room.players.find(p => p.id === id)?.name).join(', ')}
                </h3>
              </div>
            </div>

            {/* Scoreboard table */}
            <div className="card bg-white/5 border border-white/10 p-4 rounded-2xl w-full">
              <h4 className="text-xs uppercase font-bold text-white/40 mb-3 text-left">Round Scoreboard</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {players.map(p => (
                  <div key={p.id} className="flex justify-between items-center bg-white/5 px-3 py-1.5 rounded-xl">
                    <span className="text-white font-bold">{p.name}</span>
                    <div className="flex items-center gap-2">
                      {imposterState.roundResult?.pointsAwarded[p.id] ? (
                        <span className="text-emerald-400 font-bold text-xs">
                          +{imposterState.roundResult.pointsAwarded[p.id]}
                        </span>
                      ) : null}
                      <span className="text-white font-black">{p.score} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleNextRound}
                className="btn-primary bg-red-600 hover:bg-red-500 text-white font-black text-base py-3.5 px-10 shadow-xl rounded-2xl"
              >
                {imposterState.currentRound >= imposterState.totalRounds
                  ? '🏆 View Final Results / ഫലം കാണുക'
                  : '⏭️ Next Round / അടുത്ത റൗണ്ട്'}
              </button>
              {timerRemaining > 0 && (
                <p className="text-white/40 text-xs">
                  Auto-advancing in {timerRemaining}s…
                </p>
              )}
            </div>
          </div>
        )}

      </div>

      {renderModals()}

    </div>
  );
}
