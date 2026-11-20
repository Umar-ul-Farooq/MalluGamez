import { useNavigate } from 'react-router-dom';

export default function HomeScreen() {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 p-6
                    bg-gradient-to-br from-gray-950 via-brand-900/30 to-gray-950">

      {/* Logo */}
      <div className="text-center animate-bounce-in">
        <div className="text-7xl mb-3">🎨</div>
        <h1 className="text-5xl font-extrabold text-white tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Chitram
        </h1>
        <p className="ml-text text-3xl text-brand-300 mt-1 font-semibold">ചിത്രം</p>
        <p className="text-white/40 mt-2 text-sm tracking-widest uppercase">
          Malayalam Party Game
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-4 w-full max-w-xs animate-fade-in">
        <button
          className="btn-primary text-xl py-4"
          onClick={() => navigate('/tv')}
        >
          📺 &nbsp; Host on TV
        </button>
        <button
          className="btn-secondary text-xl py-4"
          onClick={() => navigate('/lobby')}
        >
          📱 &nbsp; Join Game
        </button>
      </div>

      <p className="text-white/20 text-xs mt-4">
        ചിത്രം വരയ്ക്കൂ, ഉത്തരം പറയൂ!
      </p>
    </div>
  );
}
