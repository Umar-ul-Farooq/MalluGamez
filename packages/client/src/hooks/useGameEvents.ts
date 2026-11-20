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
    };
    const onDisconnect = () => store.setConnected(false);

    socket.on('connect',       onConnect);
    socket.on('disconnect',    onDisconnect);
    socket.on('room:joined',   store.setRoom);
    socket.on('room:updated',  store.setRoom);
    socket.on('room:error',    (msg) => store.addToast(`⚠️ ${msg}`, 'error'));

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
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
