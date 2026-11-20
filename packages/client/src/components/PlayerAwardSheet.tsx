import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';

interface Props {
  onClose: () => void;
}

export default function PlayerAwardSheet({ onClose }: Props) {
  const room = useGameStore(s => s.room);
  const myId = useGameStore(s => s.myId);

  // Show all players except the host and the drawer (the person awarding)
  const eligiblePlayers = room?.players.filter(p => !p.isHost && p.id !== myId) ?? [];

  function award(winnerId: string) {
    getSocket().emit('guess:award', { winnerId });
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-white/10
                      rounded-t-3xl p-6 animate-bounce-in">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
        <h3 className="text-white font-bold text-lg mb-1 text-center">Who got it right?</h3>
        <p className="text-white/40 text-sm text-center mb-5">Tap the player who guessed correctly</p>

        <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
          {eligiblePlayers.length === 0 ? (
            <p className="text-white/40 text-center text-sm">No other players</p>
          ) : (
            eligiblePlayers.map(p => (
              <button
                key={p.id}
                onClick={() => award(p.id)}
                className="btn-primary text-lg py-4 flex items-center justify-center gap-3"
              >
                <span className="text-2xl">👤</span>
                <span>{p.name}</span>
              </button>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full text-white/40 text-sm py-2 hover:text-white/70 transition-colors"
        >
          Nobody yet — keep going
        </button>
      </div>
    </>
  );
}
