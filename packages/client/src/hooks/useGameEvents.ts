import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';

/**
 * Mount this ONCE at the top of the app (in App.tsx).
 * It wires every server → client socket event into the Zustand store
 * and handles navigation based on game phase changes.
 */
export function useGameEvents() {
  const store = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      store.setMyId(socket.id ?? '');
      store.setConnected(true);

      // Auto-reconnect immediately when mobile phone unlocks screen or network reconnects!
      const saved = localStorage.getItem('chitram_session');
      if (saved) {
        try {
          const { roomCode, playerName } = JSON.parse(saved);
          if (roomCode && playerName) {
            socket.emit('room:join', { roomCode, playerName });
          }
        } catch (e) {}
      }
    };
    const onDisconnect = () => store.setConnected(false);

    const onRoomJoined = (room: any) => {
      store.setRoom(room);
      const me = room.players.find((p: any) => p.id === socket.id);
      if (me && !me.isHost) {
        localStorage.setItem('chitram_session', JSON.stringify({ roomCode: room.code, playerName: me.name }));
      }
    };

    socket.on('connect',       onConnect);
    socket.on('disconnect',    onDisconnect);
    socket.on('room:joined',   onRoomJoined);
    socket.on('room:updated',  store.setRoom);
    socket.on('room:error',    (msg) => {
      if (msg.includes('not found')) {
        localStorage.removeItem('chitram_session');
      }
      store.addToast(`⚠️ ${msg}`, 'error');
    });

    socket.on('game:started',  (room) => {
      store.handleGameStarted(room);
      // Navigate based on role
      const me = room.players.find(p => p.id === socket.id);
      if (me?.isHost) return;           // TV stays on /tv
      if (me?.isDrawing) navigate('/draw');
      else navigate('/guess');
    });

    socket.on('game:word',     ({ word, manglish, category }) =>
      store.setSecretWord(word, manglish, category));

    socket.on('timer:tick',    ({ remaining }) => store.setTimer(remaining));
    socket.on('guess:awarded', store.handleAward);
    socket.on('round:end',     store.handleRoundEnd);

    socket.on('game:end',      (payload) => {
      store.handleGameEnd(payload);
      const me = store.room?.players.find(p => p.id === socket.id);
      if (!me?.isHost) {
        navigate('/leaderboard');
      }
    });

    // ── Charades Events ──
    socket.on('charades:state', store.setCharadesState);
    socket.on('charades:secret-movie', store.setSecretMovie);
    socket.on('charades:incorrect-feedback', store.handleCharadesIncorrect);
    socket.on('charades:round-ended', store.handleCharadesRoundEnd);

    // If already connected when this effect runs
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect',       onConnect);
      socket.off('disconnect',    onDisconnect);
      socket.off('room:joined',   store.setRoom);
      socket.off('room:updated',  store.setRoom);
      socket.off('room:error');
      socket.off('game:started');
      socket.off('game:word');
      socket.off('timer:tick');
      socket.off('guess:awarded', store.handleAward);
      socket.off('round:end',     store.handleRoundEnd);
      socket.off('game:end');
      socket.off('charades:state');
      socket.off('charades:secret-movie');
      socket.off('charades:incorrect-feedback');
      socket.off('charades:round-ended');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
