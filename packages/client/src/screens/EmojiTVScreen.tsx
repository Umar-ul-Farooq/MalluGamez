import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';
import type { EmojiSettings, EmojiDifficulty, EmojiGameMode } from '@chitram/shared';

interface Props {
  hostIP: string;
}

const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20];
const TIMER_OPTIONS = [15, 30, 45];

export default function EmojiTVScreen({ hostIP }: Props) {
  const navigate = useNavigate();
  const { room, emojiState, timerRemaining } = useGameStore();

  const [settings, setSettings] = useState<EmojiSettings>({
    mode: 'race',
    totalQuestions: 10,
    difficulty: 'mixed',
    timerSeconds: 30,
  });

  useEffect(() => {
    if (room?.emojiSettings) {
      setSettings(room.emojiSettings);
    }
  }, [room?.emojiSettings]);

  if (!room) return null;

  const players = room.players.filter(p => !p.isHost);
  const canStart = players.length >= 1;

  function updateSettings(patch: Partial<EmojiSettings>) {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    getSocket().emit('emoji:update-settings', patch);
  }

  function startGame() {
    if (!canStart) return;
    getSocket().emit('emoji:start-game');
  }

  function revealHint() {
    getSocket().emit('emoji:reveal-hint');
  }

  function nextQuestion() {
    getSocket().emit('emoji:next-question');
  }

  function restartGame() {
    getSocket().emit('emoji:restart-game');
  }

  function handleExit() {
    getSocket().emit('room:leave');
    useGameStore.getState().reset();
    navigate('/');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PHASE 1: LOBBY
  // ────────────────────────────────────────────────────────────────────────────
  if (room.phase === 'lobby') {
    const isHostedDomain = typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';

    const joinUrl = isHostedDomain
      ? `${window.location.origin}/lobby?room=${room.code}`
      : `http://${hostIP || 'localhost'}:3000/lobby?room=${room.code}`;

    const displayUrl = isHostedDomain
      ? `${window.location.host}/lobby`
      : `${hostIP || 'localhost'}:3000/lobby`;

    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-950 select-none overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-10 py-5 border-b border-purple-500/20 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <span className="text-4xl animate-bounce">🎬🍿</span>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-white">Emoji Movie Challenge</h1>
                <span className="bg-purple-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Multiplayer
                </span>
              </div>
              <p className="ml-text text-amber-300 font-bold text-sm">
                സിനിമ കണ്ടുപിടിക്കാമോ? • ഇമോജികളിലൂടെ കണ്ടെത്തൂ
              </p>
            </div>
          </div>

          <button
            onClick={handleExit}
            className="text-white/40 hover:text-white text-xs font-semibold px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            ← Exit Game
          </button>
        </div>

        {/* 3-Column Lobby Grid */}
        <div className="flex-1 grid grid-cols-12 gap-8 p-8 overflow-hidden max-w-7xl mx-auto w-full">
          {/* Left: QR Code & Room Info */}
          <div className="col-span-4 card border-2 border-purple-500/30 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-white/50 text-xs uppercase font-bold tracking-widest mb-1">
              Join on your phone
            </p>
            <div className="bg-white p-4 rounded-3xl shadow-2xl my-3">
              <QRCodeSVG value={joinUrl} size={180} />
            </div>

            <p className="text-white/40 text-xs mt-1">Scan QR or browse to:</p>
            <p className="text-amber-400 font-mono text-sm font-bold">{displayUrl}</p>

            <div className="mt-3 bg-purple-950/60 border border-purple-500/30 rounded-2xl py-2 px-5">
              <span className="text-white/50 text-[10px] uppercase font-bold tracking-widest block">Room Code</span>
              <span className="text-4xl font-black text-white tracking-[0.25em] font-mono">{room.code}</span>
            </div>
          </div>

          {/* Middle: Joined Players */}
          <div className="col-span-4 card border-2 border-white/10 flex flex-col p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
              <h2 className="text-white font-black text-lg flex items-center gap-2">
                <span>👥 Joined Players</span>
                <span className="text-sm font-normal text-white/50">({players.length})</span>
              </h2>
              <span className="text-xs text-white/40 font-semibold">
                {players.length < 1 ? 'Waiting for players…' : 'Ready to play!'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {players.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-white/40">
                  <span className="text-4xl animate-pulse mb-2">📱</span>
                  <p className="text-sm">Scan QR code to join this room</p>
                </div>
              ) : (
                players.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 animate-fade-in"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <span className="text-2xl">👤</span>
                    <span className="text-white font-bold text-base truncate">{p.name}</span>
                    <span className="ml-auto text-xs text-green-400 font-semibold">● Ready</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Game Settings & Start */}
          <div className="col-span-4 card border-2 border-purple-500/30 flex flex-col justify-between p-6">
            <div>
              <h2 className="text-white font-black text-lg mb-4 pb-2 border-b border-white/10 flex items-center gap-2">
                <span>⚙️ Game Settings</span>
              </h2>

              <div className="space-y-4">
                {/* Game Mode */}
                <div>
                  <label className="text-white/60 text-xs uppercase font-bold tracking-wider mb-1.5 block">
                    Mode / കളിയുടെ രീതി
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['race', 'turn'] as EmojiGameMode[]).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => updateSettings({ mode: m })}
                        className={`py-2 px-2 text-xs font-bold rounded-xl transition-all
                          ${settings.mode === m
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40 font-black'
                            : 'bg-white/5 text-white/60 hover:text-white'}`}
                      >
                        {m === 'race' ? '🏎️ Race Mode' : '🔄 Turn-Based'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-white/40 mt-1">
                    {settings.mode === 'race' ? 'All players race to answer simultaneously' : 'Players take turns answering one by one'}
                  </p>
                </div>

                {/* Question count */}
                <div>
                  <label className="text-white/60 text-xs uppercase font-bold tracking-wider mb-1.5 block">
                    Number of Questions / ചോദ്യങ്ങൾ
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {QUESTION_COUNT_OPTIONS.map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => updateSettings({ totalQuestions: cnt })}
                        className={`py-2 text-xs font-bold rounded-xl transition-all
                          ${settings.totalQuestions === cnt
                            ? 'bg-amber-500 text-gray-950 font-black'
                            : 'bg-white/5 text-white/60 hover:text-white'}`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="text-white/60 text-xs uppercase font-bold tracking-wider mb-1.5 block">
                    Difficulty / കാഠിന്യം
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['easy', 'medium', 'hard', 'mixed'] as EmojiDifficulty[]).map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => updateSettings({ difficulty: d })}
                        className={`py-2 text-xs font-bold rounded-xl transition-all capitalize
                          ${settings.difficulty === d
                            ? 'bg-purple-600 text-white font-black'
                            : 'bg-white/5 text-white/60 hover:text-white'}`}
                      >
                        {d === 'easy' ? '🟢 Easy' : d === 'medium' ? '🟡 Med' : d === 'hard' ? '🔴 Hard' : '🎲 Mix'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timer duration */}
                <div>
                  <label className="text-white/60 text-xs uppercase font-bold tracking-wider mb-1.5 block">
                    Timer per Question / സമയം
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {TIMER_OPTIONS.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateSettings({ timerSeconds: t })}
                        className={`py-2 text-xs font-bold rounded-xl transition-all
                          ${settings.timerSeconds === t
                            ? 'bg-purple-600 text-white font-black'
                            : 'bg-white/5 text-white/60 hover:text-white'}`}
                      >
                        ⏱️ {t}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div className="pt-4">
              <button
                disabled={!canStart}
                onClick={startGame}
                className={`btn-primary w-full py-4 text-lg font-black rounded-2xl flex items-center justify-center gap-2 transition-all
                  ${!canStart
                    ? 'opacity-35 cursor-not-allowed shadow-none'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-xl shadow-purple-950/60 hover:scale-105'}`}
              >
                {canStart ? '🎬 Start Challenge!' : '⏳ Need 1+ Players'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PHASE 2: QUESTION / REVEAL / GAME-END
  // ────────────────────────────────────────────────────────────────────────────
  const state = emojiState;
  const isQuestionPhase = state?.roundPhase === 'question';
  const isRevealPhase = state?.roundPhase === 'reveal';
  const isGameEndPhase = state?.roundPhase === 'game-end' || room.phase === 'game-end';

  // ── Game End View ──
  if (isGameEndPhase) {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];

    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-950 select-none">
        <div className="w-full max-w-2xl card border-2 border-amber-500/50 shadow-2xl p-8 text-center animate-fade-in">
          <span className="text-7xl mb-2 inline-block">🏆👑</span>
          <h1 className="text-4xl font-black text-white">Challenge Complete!</h1>
          <p className="ml-text text-amber-300 font-extrabold text-xl mt-1">
            വിജയി: {winner?.name || 'Winner'}! 🎉
          </p>

          <div className="my-8 space-y-3 max-h-72 overflow-y-auto pr-2">
            {sortedPlayers.map((p, rank) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-6 py-4 rounded-2xl border transition-transform
                  ${rank === 0
                    ? 'bg-amber-500/20 border-amber-500/60 text-white scale-105 shadow-lg'
                    : rank === 1
                    ? 'bg-gray-400/20 border-gray-400/40 text-white'
                    : rank === 2
                    ? 'bg-amber-800/20 border-amber-800/40 text-white'
                    : 'bg-white/5 border-white/10 text-white/80'}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-black w-8">
                    {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
                  </span>
                  <span className="text-xl font-bold">{p.name}</span>
                </div>
                <span className="text-2xl font-black text-amber-400">{p.score} pts</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={restartGame}
              className="btn-primary py-4 px-8 text-lg font-black bg-purple-600 hover:bg-purple-500 text-white rounded-2xl shadow-xl shadow-purple-950/50"
            >
              🔄 Play Again
            </button>
            <button
              onClick={handleExit}
              className="btn-secondary py-4 px-8 text-base text-white/80 rounded-2xl"
            >
              🏠 Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Live Question / Reveal View ──
  const answeredCount = state?.answeredPlayerIds?.length || 0;
  const correctCount = state?.correctPlayerIds?.length || 0;

  return (
    <div className="h-full flex flex-col justify-between bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-950 select-none p-8 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-purple-500/20">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🎬🍿</span>
          <div>
            <h2 className="text-xl font-black text-white">
              Question {(state?.currentQuestionIndex ?? 0) + 1} of {state?.totalQuestions ?? 10}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs bg-purple-600/40 text-purple-200 border border-purple-500/30 px-2 py-0.5 rounded-md font-semibold">
                {state?.category}
              </span>
              <span className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-md font-semibold uppercase">
                {state?.difficulty}
              </span>
              <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-semibold capitalize">
                {state?.mode === 'race' ? '🏎️ Race Mode' : '🔄 Turn-Based'}
              </span>
            </div>
          </div>
        </div>

        {/* Big Timer */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-white/40 text-xs uppercase font-bold tracking-wider block">Time Left</span>
            <span className={`text-4xl font-black font-mono ${timerRemaining <= 5 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
              {timerRemaining}s
            </span>
          </div>

          <div className="bg-purple-950/60 border border-purple-500/30 rounded-2xl px-5 py-2 text-center">
            <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest block">Room Code</span>
            <span className="text-2xl font-black text-white font-mono tracking-widest">{room.code}</span>
          </div>
        </div>
      </div>

      {/* Main Center Content */}
      <div className="max-w-4xl w-full mx-auto my-auto text-center">
        {/* Emoji Puzzle Box */}
        <div className="card border-2 border-purple-500/40 p-8 sm:p-12 shadow-2xl relative bg-black/50">
          <p className="text-white/40 text-xs uppercase font-bold tracking-widest mb-3">
            Guess the Malayalam Movie / സിനിമ ഏത്?
          </p>

          <div className="py-4 select-all">
            <span className="text-7xl sm:text-8xl tracking-widest inline-block animate-fade-in drop-shadow-[0_10px_20px_rgba(168,85,247,0.3)]">
              {state?.emojis}
            </span>
          </div>

          {/* Turn-based active player indicator */}
          {state?.mode === 'turn' && state.currentTurnPlayerName && isQuestionPhase && (
            <div className="mt-2 inline-block bg-amber-500/20 border border-amber-500/50 rounded-full px-5 py-1.5 text-amber-300 text-sm font-black animate-pulse">
              🎯 Current Turn: {state.currentTurnPlayerName}
            </div>
          )}

          {/* Revealed Hint (if requested or <= 10s) */}
          {state?.revealedHint && (
            <div className="mt-4 bg-purple-950/60 border border-purple-500/40 rounded-2xl p-4 text-sm text-purple-200 animate-fade-in max-w-xl mx-auto">
              <span className="text-amber-300 font-bold block mb-1">💡 സൂചന (Hint):</span>
              {state.revealedHint}
            </div>
          )}

          {/* Answer Reveal Card */}
          {isRevealPhase && state?.revealedMovie && (
            <div className="mt-6 bg-gradient-to-r from-purple-950/80 via-black/80 to-purple-950/80 border-2 border-amber-400 rounded-3xl p-6 shadow-2xl animate-bounce-in">
              <span className="text-amber-400 text-xs uppercase font-bold tracking-widest block mb-1">
                The Correct Movie / സിനിമ
              </span>
              <h3 className="text-4xl sm:text-5xl font-black text-white ml-text">
                {state.revealedMovie.title}
              </h3>
              <p className="text-amber-300 text-xl font-bold mt-1">
                {state.revealedMovie.manglish} ({state.revealedMovie.year})
              </p>

              {/* Correct guessers badges */}
              <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-2">
                {state.roundAnswers && state.roundAnswers.length > 0 ? (
                  state.roundAnswers.map((ans, i) => (
                    <span
                      key={i}
                      className="bg-green-500/20 border border-green-500/40 text-green-300 font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5"
                    >
                      <span>🎉 {ans.playerName}</span>
                      <span className="text-amber-300 font-black">+{ans.pointsAwarded} pts</span>
                    </span>
                  ))
                ) : (
                  <span className="text-white/40 text-xs italic">ആർക്കും ശരിയുത്തരം കണ്ടെത്താൻ കഴിഞ്ഞില്ല (Nobody got it)</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live Answer Progress Tracker */}
        {isQuestionPhase && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className="text-white/60 text-xs font-bold uppercase tracking-wider">
              Answers Submitted:
            </span>
            <div className="flex items-center gap-1.5">
              {players.map(p => {
                const hasAnswered = state?.answeredPlayerIds?.includes(p.id);
                const hasCorrect = state?.correctPlayerIds?.includes(p.id);
                return (
                  <span
                    key={p.id}
                    title={p.name}
                    className={`text-xs px-3 py-1 rounded-full font-bold transition-all flex items-center gap-1
                      ${hasCorrect
                        ? 'bg-green-500 text-gray-950 shadow-md font-black'
                        : hasAnswered
                        ? 'bg-purple-600/50 text-white'
                        : 'bg-white/10 text-white/40'}`}
                  >
                    <span>{hasCorrect ? '✓' : '●'}</span>
                    <span>{p.name}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar: Host Controls & Mini Standings */}
      <div className="flex items-center justify-between pt-4 border-t border-purple-500/20">
        <div className="flex items-center gap-3">
          {isQuestionPhase && !state?.revealedHint && (
            <button
              onClick={revealHint}
              className="text-xs bg-purple-950/60 hover:bg-purple-900 border border-purple-500/30 text-purple-200 font-bold px-4 py-2 rounded-xl transition-all"
            >
              💡 Reveal Hint Now
            </button>
          )}

          {isRevealPhase && (
            <button
              onClick={nextQuestion}
              autoFocus
              className="btn-primary py-3 px-6 text-sm font-black bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-xl shadow-lg shadow-amber-950/50 flex items-center gap-2"
            >
              <span>Next Question</span>
              <span>→</span>
            </button>
          )}
        </div>

        {/* Mini Standings Pills */}
        <div className="flex items-center gap-2">
          {players
            .slice()
            .sort((a, b) => b.score - a.score)
            .slice(0, 4)
            .map((p, idx) => (
              <div
                key={p.id}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs"
              >
                <span className="text-amber-400 font-black">#{idx + 1}</span>
                <span className="text-white font-semibold truncate max-w-[100px]">{p.name}</span>
                <span className="text-white/50 font-mono">{p.score}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
