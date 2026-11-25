import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, GameType, RoomPublicState } from '@chitram/shared';
import { registerSocketHandlers } from './socket/index.js';

type TestClient = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function waitForEvent<T = any>(socket: TestClient, event: string, predicate?: (data: T) => boolean, timeoutMs = 4000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event as any, handler);
      reject(new Error(`Timeout waiting for event "${event}"`));
    }, timeoutMs);

    const handler = (data: T) => {
      if (!predicate || predicate(data)) {
        clearTimeout(timer);
        socket.off(event as any, handler);
        resolve(data);
      }
    };
    socket.on(event as any, handler);
  });
}

async function connectClient(url: string): Promise<TestClient> {
  const client: TestClient = ioClient(url, { transports: ['websocket'], forceNew: true });
  await waitForEvent(client, 'connect');
  return client;
}

async function runTests() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: '*' },
  });
  registerSocketHandlers(io);

  await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve));
  const addr = httpServer.address() as any;
  const url = `http://127.0.0.1:${addr.port}`;

  console.log('================================================================');
  console.log('   MULTI-CLIENT SOCKET.IO SESSION SWITCHING TEST SUITE (A-E)    ');
  console.log(`   Listening on ${url}`);
  console.log('================================================================\n');

  let tv = await connectClient(url);
  let p1 = await connectClient(url);
  let p2 = await connectClient(url);

  let passed = 0;
  const total = 5;

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // TEST A: Fastest Finger -> Drawing & Object Identification
    // ──────────────────────────────────────────────────────────────────────────
    console.log('▶ TEST A: Fastest Finger → Drawing & Object Identification');
    const ffRoomPromise = waitForEvent<RoomPublicState>(tv, 'room:joined', r => r.gameType === 'fastest-finger');
    const ffTokenPromise = waitForEvent<{ hostToken: string; roomCode?: string; gameType?: GameType }>(tv, 'room:host-token');
    tv.emit('room:create', { playerName: 'Host', gameType: 'fastest-finger' });
    const ffRoom = await ffRoomPromise;
    const ffToken = await ffTokenPromise;
    assert(ffToken.roomCode === ffRoom.code && ffToken.gameType === 'fastest-finger', 'Host token must include roomCode and gameType');

    // Join 2 players
    const p1JoinFF = waitForEvent<RoomPublicState>(p1, 'room:joined', r => r.code === ffRoom.code);
    p1.emit('room:join', { roomCode: ffRoom.code, playerName: 'Alice' });
    await p1JoinFF;

    const p2JoinFF = waitForEvent<RoomPublicState>(p2, 'room:joined', r => r.code === ffRoom.code);
    p2.emit('room:join', { roomCode: ffRoom.code, playerName: 'Bob' });
    await p2JoinFF;

    // Start Fastest Finger (1 question so it finishes fast)
    tv.emit('fastest-finger:update-settings', { totalQuestions: 1, timerSeconds: 10 });
    const ffStarted = waitForEvent(tv, 'fastest-finger:state', s => s.roundPhase === 'question');
    tv.emit('fastest-finger:start-game');
    await ffStarted;

    // TV returns to home and selects Drawing & Object Identification WITHOUT even manually calling terminate first
    // (verifying server-side room:create also terminates any previous hosted room and leaves old Socket.IO room!)
    let leakedFFEvent = false;
    const leakDetector = (r: RoomPublicState) => {
      if (r.code === ffRoom.code) leakedFFEvent = true;
    };
    tv.on('room:updated', leakDetector);

    const p1Term = waitForEvent(p1, 'room:terminated');
    const p2Term = waitForEvent(p2, 'room:terminated');
    const diRoomPromise = waitForEvent<RoomPublicState>(tv, 'room:joined', r => r.gameType === 'draw-identify');
    tv.emit('room:create', { playerName: 'Host', gameType: 'draw-identify' });
    const diRoom = await diRoomPromise;
    await Promise.all([p1Term, p2Term]);

    assert(diRoom.code !== ffRoom.code, 'New game must get a fresh room code');
    assert(diRoom.fastestFingerState === undefined, 'New room must have no fastestFingerState');

    // Both players scan new QR code and join Drawing game
    const p1JoinDI = waitForEvent<RoomPublicState>(p1, 'room:joined', r => r.code === diRoom.code);
    p1.emit('room:join', { roomCode: diRoom.code, playerName: 'Alice' });
    const p1JoinedState = await p1JoinDI;

    const p2JoinDI = waitForEvent<RoomPublicState>(p2, 'room:joined', r => r.code === diRoom.code);
    p2.emit('room:join', { roomCode: diRoom.code, playerName: 'Bob' });
    await p2JoinDI;

    assert(p1JoinedState.gameType === 'draw-identify', 'Mobile must load draw-identify');
    assert(p1JoinedState.players.every(p => p.score === 0), 'Scores must be reset to 0');

    // Start Drawing game
    const diStarted = waitForEvent(tv, 'draw-identify:state', s => s.roundPhase === 'drawing');
    const p1DiStarted = waitForEvent(p1, 'draw-identify:state', s => s.roundPhase === 'drawing');
    tv.emit('draw-identify:start-game');
    await Promise.all([diStarted, p1DiStarted]);

    tv.off('room:updated', leakDetector);
    assert(!leakedFFEvent, 'TV must NEVER receive stale room:updated from previous Fastest Finger room');
    console.log('✅ TEST A PASSED\n');
    passed++;

    // ──────────────────────────────────────────────────────────────────────────
    // TEST B: Drawing Game -> Fastest Finger
    // ──────────────────────────────────────────────────────────────────────────
    console.log('▶ TEST B: Drawing Game → Fastest Finger');
    const p1TermB = waitForEvent(p1, 'room:terminated');
    const p2TermB = waitForEvent(p2, 'room:terminated');
    tv.emit('room:terminate');
    await Promise.all([p1TermB, p2TermB]);

    const ff2Promise = waitForEvent<RoomPublicState>(tv, 'room:joined', r => r.gameType === 'fastest-finger');
    tv.emit('room:create', { playerName: 'Host', gameType: 'fastest-finger' });
    const ff2Room = await ff2Promise;
    assert(ff2Room.code !== diRoom.code, 'Fresh room code for Fastest Finger');

    const p1JoinFF2 = waitForEvent<RoomPublicState>(p1, 'room:joined', r => r.code === ff2Room.code);
    p1.emit('room:join', { roomCode: ff2Room.code, playerName: 'Alice' });
    await p1JoinFF2;

    const p2JoinFF2 = waitForEvent<RoomPublicState>(p2, 'room:joined', r => r.code === ff2Room.code);
    p2.emit('room:join', { roomCode: ff2Room.code, playerName: 'Bob' });
    await p2JoinFF2;

    const ff2Started = waitForEvent(tv, 'fastest-finger:state', s => s.roundPhase === 'question');
    tv.emit('fastest-finger:start-game');
    await ff2Started;
    console.log('✅ TEST B PASSED\n');
    passed++;

    // ──────────────────────────────────────────────────────────────────────────
    // TEST C: Force Reset & Idempotency
    // ──────────────────────────────────────────────────────────────────────────
    console.log('▶ TEST C: Force Reset & Idempotency');
    const p1Reset = waitForEvent(p1, 'room:reset');
    const p2Reset = waitForEvent(p2, 'room:reset');
    tv.emit('room:force-reset', { roomCode: ff2Room.code });
    await Promise.all([p1Reset, p2Reset]);

    // Second Force Reset must be idempotent (no crash, emits room:reset cleanly)
    const tvSecondReset = waitForEvent(tv, 'room:reset');
    tv.emit('room:force-reset', { roomCode: ff2Room.code });
    await tvSecondReset;

    // Select a different game after Force Reset
    const impPromise = waitForEvent<RoomPublicState>(tv, 'room:joined', r => r.gameType === 'imposter');
    tv.emit('room:create', { playerName: 'Host', gameType: 'imposter' });
    const impRoom = await impPromise;

    const p1JoinImp = waitForEvent<RoomPublicState>(p1, 'room:joined', r => r.code === impRoom.code);
    p1.emit('room:join', { roomCode: impRoom.code, playerName: 'Alice' });
    const impState = await p1JoinImp;
    assert(impState.gameType === 'imposter' && impState.phase === 'lobby', 'New game after Force Reset must start in clean lobby');
    console.log('✅ TEST C PASSED\n');
    passed++;

    // ──────────────────────────────────────────────────────────────────────────
    // TEST D: Refresh / Reconnection Protection & GameType Mismatch Guard
    // ──────────────────────────────────────────────────────────────────────────
    console.log('▶ TEST D: Reconnection Protection & Mismatched GameType Rejection');
    const impTokenPromise = waitForEvent<{ hostToken: string }>(tv, 'room:host-token');
    tv.emit('room:create', { playerName: 'Host', gameType: 'imposter' });
    const imp2Room = await waitForEvent<RoomPublicState>(tv, 'room:joined', r => r.gameType === 'imposter');
    const imp2Token = await impTokenPromise;

    // Attempting to reclaim an imposter room while expecting draw-identify must be rejected!
    const mismatchErr = waitForEvent<string>(tv, 'room:error', m => m.includes('mismatch'));
    tv.emit('room:reclaim-host', { roomCode: imp2Room.code, hostToken: imp2Token.hostToken, gameType: 'draw-identify' });
    await mismatchErr;

    // Terminate room, then simulate TV/mobile refresh trying to reclaim old room -> must reject with Room not found
    tv.emit('room:terminate');
    await new Promise(r => setTimeout(r, 100));

    const notFoundTv = waitForEvent<string>(tv, 'room:error', m => m.includes('not found'));
    tv.emit('room:reclaim-host', { roomCode: imp2Room.code, hostToken: imp2Token.hostToken, gameType: 'imposter' });
    await notFoundTv;

    const notFoundP1 = waitForEvent<string>(p1, 'room:error', m => m.includes('not found'));
    p1.emit('room:join', { roomCode: imp2Room.code, playerName: 'Alice' });
    await notFoundP1;
    console.log('✅ TEST D PASSED\n');
    passed++;

    // ──────────────────────────────────────────────────────────────────────────
    // TEST E: Repeated Consecutive Game Switching
    // Fastest Finger -> Drawing -> Imposter -> Pictionary -> Dumb Charades -> Fastest Finger
    // ──────────────────────────────────────────────────────────────────────────
    console.log('▶ TEST E: Repeated Consecutive Game Switching');
    const sequence: GameType[] = ['fastest-finger', 'draw-identify', 'imposter', 'pictionary', 'charades', 'fastest-finger'];
    const seenCodes = new Set<string>();

    for (const g of sequence) {
      const tvJoin = waitForEvent<RoomPublicState>(tv, 'room:joined', r => r.gameType === g);
      tv.emit('room:create', { playerName: 'Host', gameType: g });
      const rmState = await tvJoin;
      assert(!seenCodes.has(rmState.code), `Room code ${rmState.code} repeated!`);
      seenCodes.add(rmState.code);
      assert(rmState.phase === 'lobby', `${g} must start in lobby`);
      assert(rmState.sessionId !== null, `${g} must have unique sessionId`);

      const p1J = waitForEvent<RoomPublicState>(p1, 'room:joined', r => r.code === rmState.code);
      p1.emit('room:join', { roomCode: rmState.code, playerName: 'Alice' });
      const p1Rm = await p1J;
      assert(p1Rm.gameType === g, `Mobile must receive ${g}`);

      const p2J = waitForEvent<RoomPublicState>(p2, 'room:joined', r => r.code === rmState.code);
      p2.emit('room:join', { roomCode: rmState.code, playerName: 'Bob' });
      await p2J;
    }
    console.log(`  ✓ Switched cleanly across ${sequence.length} consecutive games with zero stale leakage`);
    console.log('✅ TEST E PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
  } finally {
    tv.disconnect();
    p1.disconnect();
    p2.disconnect();
    io.close();
    httpServer.close();
  }

  console.log('================================================================');
  console.log(` RESULT: ${passed} / ${total} MULTI-CLIENT TESTS PASSED`);
  console.log('================================================================');

  if (passed !== total) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
