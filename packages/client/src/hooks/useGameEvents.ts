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
      const current = useGameStore.getState();
      current.setMyId(socket.id ?? '');
      current.setConnected(true);

      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const searchParams = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();

      // Never auto-rejoin or reclaim an old session when on the Home screen
      if (pathname === '/' || pathname === '') {
        return;
      }

      // Check if this browser window is a TV host attempting to reconnect/refresh on /tv
      if (pathname.startsWith('/tv')) {
        const tvGameParam = searchParams.get('game') || 'pictionary';
        const savedHost = sessionStorage.getItem('chitram_tv_host');
        if (savedHost) {
          try {
            const { roomCode, hostToken, gameType } = JSON.parse(savedHost);
            if (roomCode && hostToken && gameType && gameType === tvGameParam) {
              console.log(`[reconnect] Reclaiming host session for ${gameType} room ${roomCode}`);
              socket.emit('room:reclaim-host', { roomCode, hostToken, gameType });
              return;
            }
          } catch (e) {}
        }
        return;
      }

      // Auto-reconnect mobile player ONLY if they are not scanning a DIFFERENT QR room code
      const urlRoomCode = (searchParams.get('room') ?? '').toUpperCase();
      const saved = localStorage.getItem('chitram_session');
      if (saved) {
        try {
          const { roomCode, playerName } = JSON.parse(saved);
          if (urlRoomCode && roomCode && roomCode.toUpperCase() !== urlRoomCode) {
            // Player scanned a new QR code for a different room — clear stale session!
            localStorage.removeItem('chitram_session');
            useGameStore.getState().reset();
            return;
          }
          if (roomCode && playerName) {
            socket.emit('room:join', { roomCode, playerName });
          }
        } catch (e) {}
      }
    };
    const onDisconnect = () => useGameStore.getState().setConnected(false);

    const onRoomJoined = (room: any) => {
      const current = useGameStore.getState();
      if (current.room && (current.room.code !== room.code || current.room.gameType !== room.gameType)) {
        current.reset();
        useGameStore.getState().setMyId(socket.id ?? '');
        useGameStore.getState().setConnected(true);
      }
      useGameStore.getState().setRoom(room);
      const me = room.players.find((p: any) => p.id === socket.id);
      if (me && !me.isHost) {
        localStorage.setItem('chitram_session', JSON.stringify({ roomCode: room.code, playerName: me.name }));
      }
    };

    const onRoomUpdated = (room: any) => {
      const current = useGameStore.getState();
      if (current.room && (current.room.code !== room.code || current.room.gameType !== room.gameType)) {
        // Ignore stale room updates from a previous room/game
        return;
      }
      current.setRoom(room);
    };

    socket.on('connect',       onConnect);
    socket.on('disconnect',    onDisconnect);
    socket.on('room:joined',   onRoomJoined);
    socket.on('room:updated',  onRoomUpdated);
    socket.on('room:host-token', ({ hostToken, roomCode, gameType }) => {
      const activeRoom = useGameStore.getState().room;
      const code = roomCode || activeRoom?.code;
      const gType = gameType || activeRoom?.gameType;
      if (code && gType) {
        sessionStorage.setItem('chitram_tv_host', JSON.stringify({ roomCode: code, hostToken, gameType: gType }));
      }
    });
    socket.on('room:terminated', ({ reason }) => {
      console.log(`[room] Room terminated: ${reason}`);
      localStorage.removeItem('chitram_session');
      sessionStorage.removeItem('chitram_tv_host');
      useGameStore.getState().reset();
      useGameStore.getState().addToast(`ℹ️ ${reason || 'Game session ended by TV host'}`, 'info');
      navigate('/');
    });
    socket.on('room:reset', ({ reason }) => {
      console.log(`[room] Room reset: ${reason}`);
      localStorage.removeItem('chitram_session');
      sessionStorage.removeItem('chitram_tv_host');
      useGameStore.getState().reset();
      useGameStore.getState().addToast(`⚠️ ${reason || 'Game session was reset'}`, 'info');
      navigate('/');
    });
    socket.on('room:error',    (msg) => {
      if (
        msg.includes('not found') ||
        msg.includes('Invalid host credentials') ||
        msg.includes('game type mismatch')
      ) {
        localStorage.removeItem('chitram_session');
        sessionStorage.removeItem('chitram_tv_host');
        useGameStore.getState().reset();
        navigate('/');
      }
      useGameStore.getState().addToast(`⚠️ ${msg}`, 'error');
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

    // ── Imposter Events ──
    socket.on('imposter:state', (state) => {
      store.setImposterState(state);
      // Reset vote state when round phase moves away from voting
      if (state.roundPhase !== 'voting' && state.roundPhase !== 'tie-break') {
        store.setHasVotedImposter(false);
      }
    });
    socket.on('imposter:secret', store.setImposterSecret);
    socket.on('imposter:vote-registered', () => store.setHasVotedImposter(true));
    socket.on('imposter:session-reset', () => {
      store.setImposterSecret(null);
      store.setHasVotedImposter(false);
      store.addToast('ℹ️ Imposter session was reset to the lobby.', 'info');
    });
    socket.on('imposter:session-terminated', ({ reason }) => {
      store.setImposterSecret(null);
      store.setHasVotedImposter(false);
      store.addToast(`⚠️ Session ended: ${reason}`, 'info');
    });

    // ── Emoji Events ──
    socket.on('emoji:state', store.setEmojiState);
    socket.on('emoji:guess-result', (res) => {
      store.setEmojiGuessFeedback(res);
      if (res.isCorrect) {
        store.addToast(res.message, 'success');
      } else {
        store.addToast(res.message, 'error');
      }
    });

    // ── Draw & Identify Events ──
    socket.on('draw-identify:state', store.setDrawIdentifyState);
    socket.on('draw-identify:secret-list', ({ objectList }) => {
      store.setDrawIdentifySecretList(objectList);
    });
    socket.on('draw-identify:object-ticked', (data) => {
      store.setLastTickedObject(data);
      store.addToast(`✓ ${data.identifiedBy} identified object #${data.objectIndex + 1}! (${data.identifiedCount} found)`, 'success');
    });

    // ── Fastest Finger – Picture Rush Events ──
    socket.on('fastest-finger:state', store.setFastestFingerState);
    socket.on('fastest-finger:guess-result', (res) => {
      store.setFastestFingerGuessFeedback(res);
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
      socket.off('charades:state');
      socket.off('charades:secret-movie');
      socket.off('charades:incorrect-feedback');
      socket.off('charades:round-ended');
      socket.off('imposter:state');
      socket.off('imposter:secret');
      socket.off('imposter:session-reset');
      socket.off('imposter:session-terminated');
      socket.off('emoji:state');
      socket.off('emoji:guess-result');
      socket.off('imposter:vote-registered');
      socket.off('draw-identify:state');
      socket.off('draw-identify:secret-list');
      socket.off('draw-identify:object-ticked');
      socket.off('fastest-finger:state');
      socket.off('fastest-finger:guess-result');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
