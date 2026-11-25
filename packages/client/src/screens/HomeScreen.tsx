import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type CategoryTab = 'all' | 'multiplayer' | 'singleplayer';

interface GameItem {
  id: string;
  title: string;
  malayalamTitle: string;
  subtitle: string;
  description: string;
  emoji: string;
  mode: 'multiplayer' | 'singleplayer' | 'both';
  playerCount: string;
  badge?: string;
  badgeColor?: string;
  gradient: string;
  borderColor: string;
  status: 'live' | 'coming-soon';
  hostUrl?: string;
  playUrl?: string;
}

const GAMES: GameItem[] = [
  // ─── Multiplayer Games ───
  {
    id: 'imposter',
    title: 'The Imposter',
    malayalamTitle: 'ചതിയൻ',
    subtitle: 'ആരാണ് ചതിയൻ? കണ്ടുപിടിക്കൂ!',
    description: 'Social deduction party game. Give verbal clues, blend in, and find the secret imposter!',
    emoji: '🕵️‍♂️',
    mode: 'multiplayer',
    playerCount: '3–12 Players',
    badge: 'NEW',
    badgeColor: 'bg-red-500 text-white',
    gradient: 'from-red-950/60 via-purple-950/40 to-red-950/60',
    borderColor: 'border-red-500/50 hover:border-red-400',
    status: 'live',
    hostUrl: '/tv?game=imposter',
  },
  {
    id: 'emoji-multi',
    title: 'Emoji Movie Challenge',
    malayalamTitle: 'സിനിമ കണ്ടുപിടിക്കാമോ?',
    subtitle: 'ഇമോജികളിലൂടെ സിനിമ കണ്ടെത്തൂ!',
    description: 'Identify Malayalam movies from emojis. Race Mode & Turn-Based mode with speed scoring!',
    emoji: '🎬🍿',
    mode: 'both',
    playerCount: '1–20 Players',
    badge: 'NEW',
    badgeColor: 'bg-amber-400 text-gray-950 font-black',
    gradient: 'from-purple-950/70 via-pink-950/30 to-purple-950/70',
    borderColor: 'border-purple-500/50 hover:border-purple-400',
    status: 'live',
    hostUrl: '/tv?game=emoji',
    playUrl: '/single-player/emoji',
  },
  {
    id: 'charades',
    title: 'Dumb Charades',
    malayalamTitle: 'ഡംബ് ഷെറേഡ്സ്',
    subtitle: 'മലയാള സിനിമ ഡംബ് ഷെറേഡ്സ്',
    description: 'Team A vs Team B. One actor performs without speaking, teammates guess the Malayalam film!',
    emoji: '🎭',
    mode: 'multiplayer',
    playerCount: '2 Teams (4–24 Players)',
    badge: 'CLASSIC',
    badgeColor: 'bg-amber-500/30 text-amber-300 border border-amber-500/40',
    gradient: 'from-purple-900/40 via-amber-900/30 to-purple-950/40',
    borderColor: 'border-amber-400/50 hover:border-amber-300',
    status: 'live',
    hostUrl: '/tv?game=charades',
  },
  {
    id: 'pictionary',
    title: 'Chitram (Pictionary)',
    malayalamTitle: 'ചിത്രം',
    subtitle: 'ചിത്രം വരയ്ക്കൂ, ഉത്തരം പറയൂ!',
    description: 'Live interactive canvas on TV. One player draws secretly while others guess on screen!',
    emoji: '🎨',
    mode: 'multiplayer',
    playerCount: '2–8 Players',
    badge: 'POPULAR',
    badgeColor: 'bg-blue-500/30 text-blue-300 border border-blue-500/40',
    gradient: 'from-blue-950/50 via-purple-950/40 to-blue-950/50',
    borderColor: 'border-blue-400/50 hover:border-blue-300',
    status: 'live',
    hostUrl: '/tv?game=pictionary',
  },
  {
    id: 'draw-identify',
    title: 'Draw & Identify Challenge',
    malayalamTitle: 'വരയും കണ്ടെത്തലും',
    subtitle: 'ചിത്രങ്ങൾ വരയ്ക്കൂ, ഒപ്പമുള്ളവർ കണ്ടെത്തട്ടെ!',
    description: 'Fast-paced speed drawing & object identification frenzy! One draws against the clock, others shout & tick off items on TV!',
    emoji: '✏️🔍',
    mode: 'multiplayer',
    playerCount: '2–16 Players',
    badge: 'NEW',
    badgeColor: 'bg-teal-500 text-white font-black',
    gradient: 'from-teal-950/70 via-emerald-950/30 to-teal-950/70',
    borderColor: 'border-teal-500/50 hover:border-teal-400',
    status: 'live',
    hostUrl: '/tv?game=draw-identify',
  },
  {
    id: 'fastest-finger',
    title: 'Fastest Finger – Picture Rush',
    malayalamTitle: 'ഫാസ്റ്റസ്റ്റ് ഫിംഗർ',
    subtitle: 'ചിത്രം കാണൂ, ആദ്യം ഉത്തരം പറയൂ!',
    description: 'Race to identify real photographs on the TV! Type your answer on your phone — first correct answer wins 10 points!',
    emoji: '⚡📸',
    mode: 'multiplayer',
    playerCount: '2–20 Players',
    badge: 'NEW',
    badgeColor: 'bg-orange-500 text-white font-black',
    gradient: 'from-orange-950/70 via-amber-950/30 to-orange-950/70',
    borderColor: 'border-orange-500/50 hover:border-orange-400',
    status: 'live',
    hostUrl: '/tv?game=fastest-finger',
  },

  // ─── Single Player Coming Soon Games ───
  {
    id: 'cinema-master',
    title: 'Cinema Master',
    malayalamTitle: 'സിനിമ മാസ്റ്റർ',
    subtitle: 'ഡയലോഗുകളും കഥാപാത്രങ്ങളും',
    description: 'Iconic Malayalam movie dialogue trivia, character quizzes and scene guessing challenge.',
    emoji: '🎙️',
    mode: 'singleplayer',
    playerCount: '1 Player',
    badge: 'COMING SOON',
    badgeColor: 'bg-white/10 text-white/50 border border-white/20',
    gradient: 'from-gray-900/60 to-gray-950/80',
    borderColor: 'border-white/10',
    status: 'coming-soon',
  },
  {
    id: 'daily-challenge',
    title: 'Daily Challenge',
    malayalamTitle: 'ദിന ചലഞ്ച്',
    subtitle: 'ദിവസേന പുതിയ പസിലുകൾ',
    description: 'A new Malayalam cinema & culture puzzle every single day. Maintain your daily streak!',
    emoji: '📅',
    mode: 'singleplayer',
    playerCount: '1 Player',
    badge: 'COMING SOON',
    badgeColor: 'bg-white/10 text-white/50 border border-white/20',
    gradient: 'from-gray-900/60 to-gray-950/80',
    borderColor: 'border-white/10',
    status: 'coming-soon',
  },
  {
    id: 'word-search',
    title: 'Malayalam Word Search',
    malayalamTitle: 'വാക്ക് കണ്ടെത്തൽ',
    subtitle: 'അക്ഷര കൂട്ടിൽ നിന്ന് വാക്കുകൾ',
    description: 'Find hidden Malayalam words, movie names and culture terms inside an interactive letter grid.',
    emoji: '🔍',
    mode: 'singleplayer',
    playerCount: '1 Player',
    badge: 'COMING SOON',
    badgeColor: 'bg-white/10 text-white/50 border border-white/20',
    gradient: 'from-gray-900/60 to-gray-950/80',
    borderColor: 'border-white/10',
    status: 'coming-soon',
  },
];

export default function HomeScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<CategoryTab>('all');

  const multiplayerGames = GAMES.filter(g => g.mode === 'multiplayer' || g.mode === 'both');
  const singleplayerGames = [
    // Include Emoji Challenge in single player
    ...GAMES.filter(g => g.id === 'emoji-multi'),
    // And future single-player games
    ...GAMES.filter(g => g.mode === 'singleplayer'),
  ];

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 select-none text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 sm:py-10 flex flex-col gap-8">

        {/* ─── Hero Header & Join Quick-Bar ───────────────────────────────────── */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-4xl mb-2">
              <span>🎨</span>
              <span>🎭</span>
              <span>🎬</span>
              <span>🕵️‍♂️</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Chitram
            </h1>
            <p className="ml-text text-2xl sm:text-3xl font-extrabold text-amber-300 mt-0.5">
              മലയാളം പാർട്ടി ഗെയിംസ്
            </p>
            <p className="text-white/40 text-xs tracking-widest uppercase mt-1">
              Malayalam Multiplayer & Single Player Gaming Platform
            </p>
          </div>

          {/* Direct Mobile Join Button */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => navigate('/lobby')}
              className="btn-primary w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-lg rounded-2xl shadow-xl shadow-amber-950/50 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <span className="text-2xl">📱</span>
              <div className="text-left">
                <span className="block leading-tight">Join with Code / ചേരുക</span>
                <span className="text-[10px] font-bold text-gray-800 tracking-wider uppercase block">
                  Enter 4-letter Room Code
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* ─── Category Filter Tabs ────────────────────────────────────────── */}
        <div className="flex items-center justify-center sm:justify-start gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 max-w-fit mx-auto sm:mx-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all
              ${activeTab === 'all'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40 font-black'
                : 'text-white/60 hover:text-white'}`}
          >
            🌟 All Games ({multiplayerGames.length + singleplayerGames.length - 1})
          </button>
          <button
            onClick={() => setActiveTab('multiplayer')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2
              ${activeTab === 'multiplayer'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40 font-black'
                : 'text-white/60 hover:text-white'}`}
          >
            <span>👥 Multiplayer</span>
            <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full">4</span>
          </button>
          <button
            onClick={() => setActiveTab('singleplayer')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2
              ${activeTab === 'singleplayer'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40 font-black'
                : 'text-white/60 hover:text-white'}`}
          >
            <span>👤 Single Player</span>
            <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full">4</span>
          </button>
        </div>

        {/* ─── CATEGORY 1: MULTIPLAYER GAMES ───────────────────────────────── */}
        {(activeTab === 'all' || activeTab === 'multiplayer') && (
          <section className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1 pb-2 border-b border-purple-500/20">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👥</span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    Multiplayer Games
                  </h2>
                  <span className="ml-text text-amber-300 font-bold text-lg sm:text-xl">
                    (കൂട്ടുകാരോടൊപ്പം കളിക്കാം)
                  </span>
                </div>
                <p className="text-white/50 text-xs sm:text-sm mt-0.5">
                  Host on TV or laptop, players join from phones using QR code or room code.
                </p>
              </div>
              <span className="text-xs text-white/40 font-semibold">
                4 Games Available
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {multiplayerGames.map((game) => (
                <div
                  key={game.id}
                  className={`card p-5 sm:p-6 bg-gradient-to-br ${game.gradient} border-2 ${game.borderColor} rounded-3xl transition-all duration-200 hover:scale-[1.01] shadow-xl flex flex-col justify-between`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="text-4xl sm:text-5xl p-2.5 bg-black/30 rounded-2xl border border-white/10">
                        {game.emoji}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 justify-end">
                        {game.badge && (
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${game.badgeColor}`}>
                            {game.badge}
                          </span>
                        )}
                        <span className="text-[10px] bg-white/10 text-white/80 font-bold px-2.5 py-0.5 rounded-full">
                          {game.playerCount}
                        </span>
                      </div>
                    </div>

                    {/* Titles */}
                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      {game.title}
                    </h3>
                    <p className="ml-text text-amber-300 font-bold text-sm sm:text-base mt-0.5">
                      {game.subtitle}
                    </p>
                    <p className="text-white/60 text-xs sm:text-sm mt-2 line-clamp-2">
                      {game.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-3">
                    <button
                      onClick={() => navigate(game.hostUrl!)}
                      className="btn-primary flex-1 py-3 text-sm font-black bg-purple-600 hover:bg-purple-500 text-white rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-950/50"
                    >
                      <span>📺</span>
                      <span>Host on TV / പുതിയ കളി</span>
                    </button>
                    <button
                      onClick={() => navigate('/lobby')}
                      className="btn-secondary py-3 px-4 text-xs font-bold text-white/80 rounded-xl hover:text-white"
                      title="Join an existing room"
                    >
                      📱 Join
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── CATEGORY 2: SINGLE PLAYER GAMES ──────────────────────────────── */}
        {(activeTab === 'all' || activeTab === 'singleplayer') && (
          <section className="space-y-4 animate-fade-in pt-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1 pb-2 border-b border-purple-500/20">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👤</span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    Single Player Games
                  </h2>
                  <span className="ml-text text-amber-300 font-bold text-lg sm:text-xl">
                    (ഒറ്റയ്ക്ക് കളിക്കാം)
                  </span>
                </div>
                <p className="text-white/50 text-xs sm:text-sm mt-0.5">
                  Play directly on your mobile, tablet or PC without needing a party room.
                </p>
              </div>
              <span className="text-xs text-white/40 font-semibold">
                1 Playable • 3 Coming Soon
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {singleplayerGames.map((game, idx) => {
                const isPlayable = game.status === 'live' && game.playUrl;

                return (
                  <div
                    key={`${game.id}-${idx}`}
                    className={`card p-5 sm:p-6 bg-gradient-to-br ${game.gradient} border-2 ${game.borderColor} rounded-3xl transition-all duration-200 shadow-xl flex flex-col justify-between
                      ${isPlayable ? 'hover:scale-[1.01]' : 'opacity-75'}`}
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className="text-4xl sm:text-5xl p-2.5 bg-black/30 rounded-2xl border border-white/10">
                          {game.emoji}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 justify-end">
                          {isPlayable ? (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-green-500 text-gray-950">
                              PLAY NOW
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/20">
                              COMING SOON
                            </span>
                          )}
                          <span className="text-[10px] bg-white/10 text-white/80 font-bold px-2.5 py-0.5 rounded-full">
                            {game.playerCount}
                          </span>
                        </div>
                      </div>

                      {/* Titles */}
                      <h3 className="text-xl sm:text-2xl font-black text-white">
                        {game.title}
                      </h3>
                      <p className="ml-text text-amber-300 font-bold text-sm sm:text-base mt-0.5">
                        {game.malayalamTitle}
                      </p>
                      <p className="text-white/60 text-xs sm:text-sm mt-2 line-clamp-2">
                        {game.description}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 pt-4 border-t border-white/10">
                      {isPlayable ? (
                        <button
                          onClick={() => navigate(game.playUrl!)}
                          className="btn-primary w-full py-3.5 text-sm font-black bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 active:scale-95 transition-all"
                        >
                          <span>🎮</span>
                          <span>Play Now / കളിക്കാം</span>
                          <span>→</span>
                        </button>
                      ) : (
                        <div className="w-full py-3 text-center text-xs text-white/40 font-bold bg-white/5 border border-white/10 rounded-xl cursor-not-allowed">
                          ⏳ Coming Soon / ഉടൻ വരുന്നു
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Footer ──────────────────────────────────────────────────────── */}
        <footer className="text-center py-6 border-t border-white/10 text-white/30 text-xs flex flex-col items-center gap-1">
          <p className="ml-text text-white/40">
            കുടുംബത്തോടും കൂട്ടുകാരോടും ഒപ്പം ഒത്തുകൂടാം! മലയാളം പാർട്ടി ഗെയിംസ്
          </p>
          <p>© 2026 MalluGames • Chitram (ചിത്രം) Platform</p>
        </footer>

      </div>
    </div>
  );
}
