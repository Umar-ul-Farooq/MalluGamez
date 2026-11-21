import { RoomManager } from './game/RoomManager.js';
import { ImposterEngine } from './game/ImposterEngine.js';
import type { GameServer } from './socket/index.js';

function createMockIO() {
  const emittedEvents: Array<{ target: string; event: string; data: any }> = [];
  const mockIO = {
    to: (target: string) => ({
      emit: (event: string, data: any) => {
        emittedEvents.push({ target, event, data });
      },
    }),
    emit: (event: string, data: any) => {
      emittedEvents.push({ target: 'all', event, data });
    },
    getEvents: () => emittedEvents,
    clearEvents: () => { emittedEvents.length = 0; },
    findEvent: (event: string) => emittedEvents.filter(e => e.event === event),
    lastEvent: (event: string) => [...emittedEvents].reverse().find(e => e.event === event),
  } as unknown as GameServer & {
    getEvents: () => typeof emittedEvents;
    clearEvents: () => void;
    findEvent: (event: string) => typeof emittedEvents;
    lastEvent: (event: string) => { target: string; event: string; data: any } | undefined;
  };
  return mockIO;
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('   RUNNING THE IMPOSTER SESSION MANAGEMENT & RECOVERY SUITE    ');
  console.log('================================================================\n');

  let passed = 0;
  const total = 7;

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Session Interruption & Fresh Start
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 1: Session Interruption & Fresh Start');
    const mockIO = createMockIO();
    const rm = new RoomManager();

    // TV creates room
    const { room } = rm.createRoom('tv-sock-1', 'TV Host', 'imposter');
    const code = room.code;
    const hostToken = room.hostToken!;
    assert(!!hostToken, 'Room must have a persistent hostToken');

    // 3 mobile players join
    rm.joinRoom('p1-sock', code, 'Player 1');
    rm.joinRoom('p2-sock', code, 'Player 2');
    rm.joinRoom('p3-sock', code, 'Player 3');

    const engine = rm.ensureImposterEngine(code, mockIO);
    engine.updateSettings({ totalRounds: 5 });

    // Start Game
    engine.startGame();
    const session1 = engine.getSessionId();
    assert(session1 !== null && session1.startsWith('imp_'), 'SessionId must be initialized on start');
    assert(room.phase === 'playing', 'Room phase must be playing');
    assert(room.imposterState?.currentRound === 1, 'Game must start at Round 1');

    console.log(`  ✓ Game successfully started in Round 1 with sessionId: ${session1}`);

    // Progress through rounds to Round 4
    for (let r = 2; r <= 4; r++) {
      engine.nextRound();
      assert(room.imposterState?.currentRound === r, `Should advance to round ${r}`);
    }
    console.log(`  ✓ Reached Round 4 (mid-game) with sessionId: ${engine.getSessionId()}`);

    // Simulate TV disconnect mid-game
    rm.handleDisconnect('tv-sock-1', mockIO);
    assert(room.players.find(p => p.isHost)?.id === 'tv-sock-1', 'TV host identity must NOT be reassigned to mobile player');
    assert(room.players.every(p => p.id === 'tv-sock-1' || !p.isHost), 'No mobile player should be host');
    assert(room.imposterState?.isAbandoned === true, 'Session must be marked abandoned during host absence');
    console.log('  ✓ TV disconnect did not reassign host to mobile players; marked session abandoned');

    // Reconnect TV and reclaim host
    const reclaimed = rm.reclaimHost('tv-sock-new', code, hostToken);
    assert(reclaimed.player.id === 'tv-sock-new' && reclaimed.player.isHost, 'TV must reclaim host');
    assert(room.imposterState?.isAbandoned === false, 'Session must recover from abandonment upon host return');
    console.log('  ✓ TV reconnected, reclaimed host, and resumed control');

    // TV triggers Force Reset
    mockIO.clearEvents();
    engine.forceReset('Host requested reset');

    assert(engine.getSessionId() === null, 'SessionId must be null after forceReset');
    assert(room.sessionId === null, 'room.sessionId must be null after forceReset');
    assert(room.phase === 'lobby', 'Room must return to lobby phase');
    assert(room.imposterState?.currentRound === 0, 'currentRound must reset to 0');
    assert(room.players.every(p => p.score === 0), 'Player scores must reset to 0');

    const resetEvent = mockIO.lastEvent('imposter:session-reset');
    assert(!!resetEvent, 'imposter:session-reset event must be broadcasted');
    console.log('  ✓ Force Reset successfully stopped timers, cleared session, and returned room to lobby');

    // TV starts a completely fresh game
    engine.startGame();
    const session2 = engine.getSessionId();
    assert(session2 !== null && session2.startsWith('imp_'), 'Fresh sessionId must be generated');
    assert(session2 !== session1, 'Fresh sessionId must be unique and different from session 1');
    assert(room.imposterState?.currentRound === 1, 'Fresh game must start from Round 1');
    assert(room.phase === 'playing', 'Room must be back in playing phase');
    console.log(`  ✓ Completely fresh game started from Round 1 with new sessionId: ${session2}`);

    engine.forceReset();
    console.log('✅ TEST 1 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 1 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Restart with Missing Players (< 3 online)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 2: Restart with Missing Players (< 3 online)');
    const mockIO = createMockIO();
    const rm = new RoomManager();

    const { room } = rm.createRoom('tv-sock-2', 'TV Host', 'imposter');
    const code = room.code;
    rm.joinRoom('p1', code, 'Player 1');
    rm.joinRoom('p2', code, 'Player 2');
    rm.joinRoom('p3', code, 'Player 3');

    const engine = rm.ensureImposterEngine(code, mockIO);
    engine.startGame();
    assert(room.phase === 'playing', 'Game must start with 3 players');
    console.log('  ✓ Started game with 3 players');

    // 2 players disconnect (leaving only 1 online player)
    rm.handleDisconnect('p2', mockIO);
    rm.handleDisconnect('p3', mockIO);

    const onlineCount = room.players.filter(p => !p.isHost && p.isOnline).length;
    assert(onlineCount === 1, 'Only 1 mobile player should be online');

    // Trigger restartGame()
    // It must NOT throw an unhandled exception and must NOT leave room stuck in playing
    engine.restartGame();

    assert(room.phase === 'lobby', 'Restart with <3 players must gracefully fall back to lobby');
    assert(engine.getSessionId() === null, 'Session ID must be cleared');
    assert(room.imposterState?.currentRound === 0, 'Round must be reset to 0');
    console.log('  ✓ Restart with <3 players safely fell back to clean lobby without crashing or hanging');

    // Reconnect players so online count >= 3
    rm.joinRoom('p2-new', code, 'Player 2');
    rm.joinRoom('p3-new', code, 'Player 3');

    // Now startGame works again
    engine.startGame();
    assert(room.phase === 'playing' && room.imposterState?.currentRound === 1, 'Game restarts normally with >=3 players');
    console.log('  ✓ Game started successfully once player count returned to >= 3');

    engine.forceReset();
    console.log('✅ TEST 2 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 2 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Stale Session Event Invalidation
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 3: Stale Session Event Invalidation');
    const mockIO = createMockIO();
    const rm = new RoomManager();

    const { room } = rm.createRoom('tv-sock-3', 'TV Host', 'imposter');
    const code = room.code;
    rm.joinRoom('p1', code, 'Alice');
    rm.joinRoom('p2', code, 'Bob');
    rm.joinRoom('p3', code, 'Charlie');

    const engine = rm.ensureImposterEngine(code, mockIO);
    engine.startGame();
    const oldSessionId = engine.getSessionId()!;
    assert(!!oldSessionId, 'Session ID must exist');

    // Terminate/Reset Session
    engine.forceReset('Session ended');

    // Stale action with oldSessionId
    const isValid = engine.validateSession(oldSessionId);
    assert(isValid === false, 'validateSession must return false for terminated/mismatched sessionId');

    // Start a new session S2
    engine.startGame();
    const newSessionId = engine.getSessionId()!;
    assert(newSessionId !== oldSessionId, 'New session must be different');

    // Old session ID event tested against new active session
    assert(engine.validateSession(oldSessionId) === false, 'Old session ID must be rejected during new session');
    assert(engine.validateSession(newSessionId) === true, 'Matching session ID must be accepted');

    console.log('  ✓ Stale session events are strictly detected and rejected');

    engine.forceReset();
    console.log('✅ TEST 3 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 3 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: TV Refresh Recovery & No Host Hijack
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 4: TV Refresh Recovery & No Host Promotion for Mobile');
    const mockIO = createMockIO();
    const rm = new RoomManager();

    const { room } = rm.createRoom('tv-sock-4', 'TV Host', 'imposter');
    const code = room.code;
    const hostToken = room.hostToken!;

    rm.joinRoom('mobile-1', code, 'Mobile 1');
    rm.joinRoom('mobile-2', code, 'Mobile 2');
    rm.joinRoom('mobile-3', code, 'Mobile 3');

    const engine = rm.ensureImposterEngine(code, mockIO);
    engine.startGame();

    // TV socket drops
    rm.handleDisconnect('tv-sock-4', mockIO);

    // Check all players: NO ONE must be host
    const hostPlayers = room.players.filter(p => p.isHost);
    assert(hostPlayers.length === 1 && hostPlayers[0].id === 'tv-sock-4', 'Original TV socket remains host record during grace period');
    assert(room.players.find(p => p.id === 'mobile-1')?.isHost === false, 'Mobile 1 was NOT promoted to host');
    assert(room.players.find(p => p.id === 'mobile-2')?.isHost === false, 'Mobile 2 was NOT promoted to host');
    console.log('  ✓ Mobile players are never promoted to host when TV disconnects');

    // TV reconnects with new socket ID
    const reclaimed = rm.reclaimHost('tv-sock-recovered', code, hostToken);
    assert(reclaimed.player.id === 'tv-sock-recovered', 'TV reclaimed host with new socket');
    assert(room.players.find(p => p.isHost)?.id === 'tv-sock-recovered', 'room host is updated to new socket');
    assert(room.players.find(p => p.id === 'tv-sock-recovered')?.isHost === true, 'TV is host');

    console.log('  ✓ TV recovered host identity seamlessly with hostToken');

    engine.forceReset();
    console.log('✅ TEST 4 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 4 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: All Players Leave and TV Returns
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 5: All Players Leave and TV Returns');
    const mockIO = createMockIO();
    const rm = new RoomManager();

    const { room } = rm.createRoom('tv-sock-5', 'TV Host', 'imposter');
    const code = room.code;

    rm.joinRoom('old-1', code, 'Old 1');
    rm.joinRoom('old-2', code, 'Old 2');
    rm.joinRoom('old-3', code, 'Old 3');

    const engine = rm.ensureImposterEngine(code, mockIO);
    engine.startGame();

    // All players leave
    rm.handleDisconnect('old-1', mockIO);
    rm.handleDisconnect('old-2', mockIO);
    rm.handleDisconnect('old-3', mockIO);

    // TV forces reset to lobby
    engine.forceReset('Players left');
    assert(room.phase === 'lobby', 'Room must be in lobby');

    // New players join
    rm.joinRoom('new-1', code, 'New 1');
    rm.joinRoom('new-2', code, 'New 2');
    rm.joinRoom('new-3', code, 'New 3');

    engine.startGame();
    assert(room.phase === 'playing', 'Game starts cleanly with new players');
    assert(room.imposterState?.currentRound === 1, 'Round 1 started');

    const onlinePlayers = room.players.filter(p => !p.isHost && p.isOnline).map(p => p.name);
    assert(!onlinePlayers.includes('Old 1') && onlinePlayers.includes('New 1'), 'Only new players in active game');

    console.log('  ✓ Clean fresh game started with only newly joined players');

    engine.forceReset();
    console.log('✅ TEST 5 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 5 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Multiple Rooms Isolation
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 6: Multiple Rooms Isolation');
    const mockIO = createMockIO();
    const rm = new RoomManager();

    // Room A
    const { room: roomA } = rm.createRoom('tv-A', 'TV A', 'imposter');
    rm.joinRoom('a1', roomA.code, 'A1');
    rm.joinRoom('a2', roomA.code, 'A2');
    rm.joinRoom('a3', roomA.code, 'A3');
    const engineA = rm.ensureImposterEngine(roomA.code, mockIO);
    engineA.startGame();
    const sessionA = engineA.getSessionId()!;

    // Room B
    const { room: roomB } = rm.createRoom('tv-B', 'TV B', 'imposter');
    rm.joinRoom('b1', roomB.code, 'B1');
    rm.joinRoom('b2', roomB.code, 'B2');
    rm.joinRoom('b3', roomB.code, 'B3');
    const engineB = rm.ensureImposterEngine(roomB.code, mockIO);
    engineB.startGame();
    const sessionB = engineB.getSessionId()!;

    assert(sessionA !== sessionB, 'Different rooms must have distinct session IDs');
    assert(roomA.phase === 'playing' && roomB.phase === 'playing', 'Both rooms playing');

    // Force reset Room A
    engineA.forceReset('Room A ended');

    // Verify Room A is reset
    assert(roomA.phase === 'lobby', 'Room A must be reset to lobby');
    assert(engineA.getSessionId() === null, 'Room A sessionId must be null');

    // Verify Room B is COMPLETELY UNAFFECTED
    assert(roomB.phase === 'playing', 'Room B must remain playing');
    assert(engineB.getSessionId() === sessionB, 'Room B sessionId must be unchanged');
    assert(roomB.imposterState?.currentRound === 1, 'Room B round must be unchanged');

    console.log('  ✓ Room A force reset had zero effect on Room B active session and state');

    engineB.forceReset();
    console.log('✅ TEST 6 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 6 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Repeated Resets and Restarts (Timer & Memory Leak Prevention)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 7: Repeated Rapid Resets and Restarts');
    const mockIO = createMockIO();
    const rm = new RoomManager();

    const { room } = rm.createRoom('tv-sock-7', 'TV Host', 'imposter');
    const code = room.code;
    rm.joinRoom('p1', code, 'P1');
    rm.joinRoom('p2', code, 'P2');
    rm.joinRoom('p3', code, 'P3');

    const engine = rm.ensureImposterEngine(code, mockIO);

    // Rapidly alternate start, restart, and forceReset
    for (let i = 0; i < 10; i++) {
      engine.startGame();
      engine.restartGame();
      engine.forceReset('Rapid stress test');
    }

    // Now start a clean game
    engine.startGame();
    const finalSession = engine.getSessionId();
    assert(finalSession !== null, 'Clean game must start after stress test');
    assert(room.imposterState?.currentRound === 1, 'Round 1 initialized');
    assert(room.phase === 'playing', 'Phase is playing');

    console.log('  ✓ Cleanly survived 10 rapid start/restart/forceReset cycles with no errors');

    engine.forceReset();
    console.log('✅ TEST 7 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 7 FAILED:', err);
  }

  console.log('================================================================');
  console.log(` RESULT: ${passed} / ${total} TESTS PASSED`);
  console.log('================================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
