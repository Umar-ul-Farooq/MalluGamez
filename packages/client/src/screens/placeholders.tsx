// Placeholder screens — will be built out in later phases

const Placeholder = ({ name }: { name: string }) => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center">
      <div className="text-6xl mb-4">🎨</div>
      <div className="text-2xl font-bold text-white/80">{name}</div>
      <div className="text-white/40 mt-2 text-sm">Coming soon</div>
    </div>
  </div>
);

export const TVHostScreen    = () => <Placeholder name="TV Host Screen" />;
export const LobbyScreen     = () => <Placeholder name="Lobby" />;
export const DrawingScreen   = () => <Placeholder name="Drawing Screen" />;
export const GuessingScreen  = () => <Placeholder name="Guessing Screen" />;
export const LeaderboardScreen = () => <Placeholder name="Leaderboard" />;
