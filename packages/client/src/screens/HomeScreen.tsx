import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomeScreen() {
  const navigate = useNavigate();
  const [showGamePicker, setShowGamePicker] = useState(false);

  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 p-6
                    bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-950 select-none overflow-hidden">

      {/* Brand Header */}
      <div className="text-center animate-bounce-in">
        <div className="flex items-center justify-center gap-3 text-6xl mb-2">
          <span>🎨</span>
          <span>🎭</span>
        </div>
        <h1 className="text-5xl font-black text-white tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Chitram
        </h1>
        <p className="ml-text text-3xl font-extrabold text-amber-300 mt-1">
          മലയാളം പാർട്ടി ഗെയിംസ്
        </p>
        <p className="text-white/40 mt-1 text-xs tracking-widest uppercase">
          Malayalam Multiplayer Party Gaming Platform
        </p>
      </div>

      {/* Main Choice Cards */}
      {!showGamePicker ? (
        <div className="flex flex-col gap-3.5 w-full max-w-sm animate-fade-in">
          <button
            className="btn-primary text-xl py-4 bg-amber-500 hover:bg-amber-600 text-gray-950 font-black shadow-xl shadow-amber-950/50 flex items-center justify-center gap-3"
            onClick={() => setShowGamePicker(true)}
          >
            <span className="text-2xl">📺</span>
            <span>Host on TV / പുതിയ കളി</span>
          </button>

          <button
            className="btn-secondary text-xl py-4 flex items-center justify-center gap-3"
            onClick={() => navigate('/lobby')}
          >
            <span className="text-2xl">📱</span>
            <span>Join Game / ചേരുക</span>
          </button>
        </div>
      ) : (
        /* Game Selection Mode */
        <div className="flex flex-col gap-3.5 w-full max-w-md animate-fade-in">
          <p className="text-white/60 text-xs uppercase tracking-widest font-bold text-center">
            Choose a game to host on TV:
          </p>

          {/* Game 1: The Imposter (NEW!) */}
          <button
            onClick={() => navigate('/tv?game=imposter')}
            className="p-5 rounded-3xl bg-gradient-to-r from-red-950/50 via-purple-950/30 to-red-950/50 border-2 border-red-500/70 hover:border-red-400 text-left transition-all active:scale-95 shadow-xl group"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl group-hover:scale-110 transition-transform">🕵️‍♂️</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-white">The Imposter (ചതിയൻ)</h3>
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">NEW</span>
                </div>
                <p className="ml-text text-red-400 text-sm font-bold">ആരാണ് ചതിയൻ? കണ്ടുപിടിക്കൂ!</p>
                <p className="text-white/50 text-xs mt-1">
                  3–12 Players • Social deduction • Verbal clues & secret voting
                </p>
              </div>
            </div>
          </button>

          {/* Game 2: Dumb Charades */}
          <button
            onClick={() => navigate('/tv?game=charades')}
            className="p-5 rounded-3xl bg-gradient-to-r from-purple-900/40 to-amber-900/30 border-2 border-amber-400/60 hover:border-amber-400 text-left transition-all active:scale-95 shadow-xl group"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl group-hover:scale-110 transition-transform">🎭</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-white">Dumb Charades</h3>
                </div>
                <p className="ml-text text-amber-300 text-sm font-bold">മലയാള സിനിമ ഡംബ് ഷെറേഡ്സ്</p>
                <p className="text-white/50 text-xs mt-1">
                  Team A vs Team B • Acting without speaking • Verbal guessing
                </p>
              </div>
            </div>
          </button>

          {/* Game 3: Chitram (Drawing & Guessing) */}
          <button
            onClick={() => navigate('/tv?game=pictionary')}
            className="p-5 rounded-3xl bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-2 border-blue-400/40 hover:border-blue-400 text-left transition-all active:scale-95 shadow-xl group"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl group-hover:scale-110 transition-transform">🎨</span>
              <div>
                <h3 className="text-xl font-black text-white">Chitram (ചിത്രം)</h3>
                <p className="ml-text text-blue-300 text-sm font-bold">ചിത്രം വരയ്ക്കൂ, ഉത്തരം പറയൂ!</p>
                <p className="text-white/50 text-xs mt-1">
                  Pictionary style • Live touchscreen canvas on TV
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setShowGamePicker(false)}
            className="text-white/40 text-xs hover:text-white mt-1 text-center py-2"
          >
            ← Back to Menu
          </button>
        </div>
      )}

      {/* Malayalam Tagline */}
      <p className="text-white/20 text-xs mt-2">
        കുടുംബത്തോടും കൂട്ടുകാരോടും ഒപ്പം ഒത്തുകൂടാം!
      </p>
    </div>
  );
}
