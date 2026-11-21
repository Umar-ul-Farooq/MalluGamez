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
    in: (target: string) => ({
      emit: (event: string, data: any) => {
        emittedEvents.push({ target, event, data });
      },
      socketsLeave: (_room: string) => {},
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
  const total = 14;

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
      room.imposterState!.roundPhase = 'round-end';
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

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 8: Imposter Caught Ends Round Immediately (No Final Guess, Edge Cases)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 8: Immediate Round End & No Imposter Final Guess Option');
    const mockIO = createMockIO();
    const rm = new RoomManager();

    const { room } = rm.createRoom('tv-sock-8', 'TV Host', 'imposter');
    const code = room.code;
    rm.joinRoom('p1', code, 'Alice');
    rm.joinRoom('p2', code, 'Bob');
    rm.joinRoom('p3', code, 'Charlie');

    const engine = rm.ensureImposterEngine(code, mockIO);
    engine.updateSettings({ totalRounds: 5 });
    engine.startGame();

    // ── Edge Case 1: Imposter identified in Round 1 of 5 ──
    assert(room.imposterState?.currentRound === 1, 'Should start at Round 1');

    // Find who the imposter is in round 1
    const imposterId = (engine as any).currentImposterIds.values().next().value;
    const innocentIds = ['p1', 'p2', 'p3'].filter(id => id !== imposterId);

    // Vote for the imposter
    engine.startVotingPhase();
    assert(room.imposterState?.roundPhase === 'voting', 'Should be voting phase');

    engine.vote(innocentIds[0], imposterId);
    engine.vote(innocentIds[1], imposterId);
    engine.vote(imposterId, innocentIds[0]); // Imposter votes for innocent

    // The round must END IMMEDIATELY in 'round-end', NOT 'imposter-guess'!
    assert(room.imposterState?.roundPhase === 'round-end', 'Round must immediately be round-end when imposter is caught');
    assert((room.imposterState?.roundPhase as any) !== 'imposter-guess', 'Must NOT enter imposter-guess phase');
    assert(room.imposterState?.caughtImposterId === imposterId, 'Caught imposter ID must be set');
    assert(room.imposterState?.roundResult?.winner === 'normal', 'Normal players must win when imposter is caught');

    // Verify scoring: innocent players got 2 (win) + 1 (voted imposter) = 3; imposter got 0
    const pointsAwarded = room.imposterState?.roundResult?.pointsAwarded!;
    assert(pointsAwarded[innocentIds[0]] === 3, 'Innocent voter 1 should get 3 points');
    assert(pointsAwarded[innocentIds[1]] === 3, 'Innocent voter 2 should get 3 points');
    assert(pointsAwarded[imposterId] === 0, 'Caught imposter should get 0 points without guess option');

    // Verify submitWordGuess does not exist on engine
    assert(typeof (engine as any).submitWordGuess === 'undefined', 'submitWordGuess must be removed');

    // Advance to Round 2
    engine.nextRound();
    assert(room.imposterState?.currentRound === 2, 'Must proceed to Round 2 of 5');
    assert(room.imposterState?.roundPhase === 'role-reveal', 'Round 2 must start with role-reveal');
    console.log('  ✓ Round 1 imposter caught: immediately ended round, no guess phase, correct scores, advanced to Round 2');

    // Duplicate call to nextRound() during active phase must be ignored
    engine.nextRound();
    assert(room.imposterState?.currentRound === 2, 'Duplicate nextRound must not advance mid-round');
    console.log('  ✓ Duplicate nextRound calls safely ignored');

    // ── Edge Case 2: Round 4 of 5 ──
    // Simulate advancing to round 4
    room.imposterState!.currentRound = 4;
    room.imposterState!.roundPhase = 'voting';
    const round4Imp = (engine as any).currentImposterIds.values().next().value;
    const round4Innocents = ['p1', 'p2', 'p3'].filter(id => id !== round4Imp);

    engine.vote(round4Innocents[0], round4Imp);
    engine.vote(round4Innocents[1], round4Imp);
    engine.vote(round4Imp, round4Innocents[0]);

    assert((engine.getPublicState().roundPhase as string) === 'round-end', 'Round 4 must end immediately');
    engine.nextRound();
    assert(room.imposterState?.currentRound === 5, 'Must proceed to Round 5 of 5');
    console.log('  ✓ Round 4 imposter caught: immediately proceeded to Round 5');

    // ── Edge Case 3: Final Round (Round 5 of 5) ──
    assert(room.imposterState?.currentRound === 5, 'Current round is 5');
    room.imposterState!.roundPhase = 'voting';
    const round5Imp = (engine as any).currentImposterIds.values().next().value;
    const round5Innocents = ['p1', 'p2', 'p3'].filter(id => id !== round5Imp);

    engine.vote(round5Innocents[0], round5Imp);
    engine.vote(round5Innocents[1], round5Imp);
    engine.vote(round5Imp, round5Innocents[0]);

    assert((engine.getPublicState().roundPhase as string) === 'round-end', 'Final round must end immediately');

    // Next round on final round must end the entire game
    engine.nextRound();
    assert((engine.getPublicState().roundPhase as string) === 'game-end', 'Final round nextRound must transition to game-end');
    assert(room.phase === 'game-end', 'Room phase must be game-end');
    console.log('  ✓ Final round imposter caught: immediately ended the game and displayed final results');

    engine.forceReset();
    console.log('✅ TEST 8 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 8 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 9: Test A - Normal Exit & Complete Server Cleanup
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 9: Test A - Normal Exit & Complete Server Cleanup');
    const mockIO = createMockIO();
    const rm = new RoomManager();

    // TV creates room
    const { room } = rm.createRoom('tv-sock-9', 'TV Host', 'imposter');
    const code = room.code;

    // 3 mobile players join
    rm.joinRoom('p1-sock-9', code, 'Player 1');
    rm.joinRoom('p2-sock-9', code, 'Player 2');
    rm.joinRoom('p3-sock-9', code, 'Player 3');

    const engine = rm.ensureImposterEngine(code, mockIO);
    engine.startGame();
    assert(engine.getSessionId() !== null, 'Game session must be active');

    // TV initiates Exit
    mockIO.clearEvents();
    const terminated = rm.terminateRoom(code, 'tv-sock-9', mockIO, 'Host exited the room');
    assert(terminated === true, 'terminateRoom must return true for valid host');

    // 1. Check room:terminated event sent to the room
    const termEvent = mockIO.getEvents().find(e => e.event === 'room:terminated');
    assert(!!termEvent, 'room:terminated event must be emitted to room');
    assert(termEvent?.data?.reason === 'Host exited the room', 'Reason must match exit reason');

    // 2. Check imposter:session-terminated event sent
    const impTermEvent = mockIO.getEvents().find(e => e.event === 'imposter:session-terminated');
    assert(!!impTermEvent, 'imposter:session-terminated event must be emitted');

    // 3. Room must be completely deleted from server memory
    assert(rm.getRoom(code) === undefined, 'Room must be destroyed on server');

    // 4. Imposter engine must be deleted
    assert(rm.getImposterEngine(code) === undefined, 'ImposterEngine must be cleaned up from RoomManager');

    // 5. All player socket mappings must be cleaned up
    assert(rm.getPlayerRoom('p1-sock-9') === undefined, 'Player 1 must be unmapped from room');
    assert(rm.getPlayerRoom('p2-sock-9') === undefined, 'Player 2 must be unmapped from room');
    assert(rm.getPlayerRoom('p3-sock-9') === undefined, 'Player 3 must be unmapped from room');
    assert(rm.getPlayerRoom('tv-sock-9') === undefined, 'TV host must be unmapped from room');

    console.log('  ✓ Normal Exit cleanly broadcasts termination and purges room and engine from server');
    console.log('✅ TEST 9 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 9 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 10: Test B - Force Reset During Active Game (Round 3)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 10: Test B - Force Reset During Active Game (Round 3)');
    const mockIO = createMockIO();
    const rm = new RoomManager();

    const { room } = rm.createRoom('tv-sock-10', 'TV Host', 'imposter');
    const code = room.code;

    rm.joinRoom('p1-sock-10', code, 'Player 1');
    rm.joinRoom('p2-sock-10', code, 'Player 2');
    rm.joinRoom('p3-sock-10', code, 'Player 3');

    const engine = rm.ensureImposterEngine(code, mockIO);
    engine.updateSettings({ totalRounds: 5 });
    engine.startGame();

    // Fast-forward to Round 3, active voting
    room.imposterState!.currentRound = 3;
    room.imposterState!.roundPhase = 'voting';
    const oldSessionId = engine.getSessionId();
    assert(oldSessionId !== null, 'Session ID must exist in Round 3');

    // Host triggers Force Reset
    mockIO.clearEvents();
    const resetSuccess = rm.terminateRoom(code, 'tv-sock-10', mockIO, 'Host force reset the room');
    assert(resetSuccess === true, 'Force reset must succeed');

    // Verify room is destroyed and cannot be referenced
    assert(rm.getRoom(code) === undefined, 'Room must be null after force reset');
    assert(rm.getImposterEngine(code) === undefined, 'Engine must be removed after force reset');

    // Verify termination events were sent to all clients
    const resetEvents = mockIO.getEvents().filter(e => e.event === 'room:terminated' || e.event === 'room:reset');
    assert(resetEvents.length > 0, 'Reset / termination events must be broadcast to clients');

    console.log('  ✓ Force Reset during mid-game (Round 3) stops engine and completely purges session');
    console.log('✅ TEST 10 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 10 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 11: Test C - Multi-Player Consistency & Desync Prevention
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 11: Test C - Multi-Player Consistency & Desync Prevention');
    const mockIO = createMockIO();
    const rm = new RoomManager();

    const { room } = rm.createRoom('tv-sock-11', 'TV Host', 'imposter');
    const code = room.code;

    // 4 mobile players
    const playerSockets = ['p1-11', 'p2-11', 'p3-11', 'p4-11'];
    playerSockets.forEach((s, idx) => rm.joinRoom(s, code, `Player ${idx + 1}`));

    const engine = rm.ensureImposterEngine(code, mockIO);
    engine.startGame();

    // Terminate room
    mockIO.clearEvents();
    rm.terminateRoom(code, 'tv-sock-11', mockIO, 'Host closed room');

    // Verify every single player socket was unmapped
    for (const s of playerSockets) {
      assert(rm.getPlayerRoom(s) === undefined, `Player socket ${s} must be unmapped`);
    }

    // Verify event targeted the room channel where all players listen
    const termEvent = mockIO.getEvents().find(e => e.event === 'room:terminated');
    assert(termEvent?.target === code, 'Termination event must be broadcast to entire room channel');

    console.log('  ✓ All connected mobile players simultaneously receive termination broadcast and are unmapped');
    console.log('✅ TEST 11 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 11 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 12: Test D - Reconnection Rejection for Terminated Rooms
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 12: Test D - Reconnection Rejection for Terminated Rooms');
    const mockIO = createMockIO();
    const rm = new RoomManager();

    const { room } = rm.createRoom('tv-sock-12', 'TV Host', 'imposter');
    const code = room.code;
    const hostToken = room.hostToken!;

    const p1 = rm.joinRoom('p1-sock-12', code, 'Player 1');
    const p1Id = p1.player.id;

    // Terminate room
    rm.terminateRoom(code, 'tv-sock-12', mockIO, 'Room ended');

    // Attempt 1: Mobile player tries to rejoin stale room
    let playerRejoinFailed = false;
    try {
      rm.joinRoom('p1-new-sock', code, 'Player 1');
    } catch (err: any) {
      playerRejoinFailed = true;
      assert(err.message.includes('not found'), `Expected 'not found' error, got: ${err.message}`);
    }
    assert(playerRejoinFailed, 'Rejoining a terminated room must fail with Room not found');

    // Attempt 2: TV tries to reclaim host on stale room
    let hostReclaimFailed = false;
    try {
      rm.reclaimHost('tv-new-sock', code, hostToken);
    } catch (err: any) {
      hostReclaimFailed = true;
      assert(err.message.includes('not found'), `Expected 'not found' error, got: ${err.message}`);
    }
    assert(hostReclaimFailed, 'Reclaiming host on terminated room must fail with Room not found');

    console.log('  ✓ Stale reconnect attempts (mobile and TV) are firmly rejected with Room not found');
    console.log('✅ TEST 12 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 12 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 13: Test E - Multi-Room Isolation
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 13: Test E - Multi-Room Isolation');
    const mockIO = createMockIO();
    const rm = new RoomManager();

    // Create Room 1
    const { room: room1 } = rm.createRoom('tv-sock-r1', 'TV 1', 'imposter');
    const code1 = room1.code;
    rm.joinRoom('p1-r1', code1, 'Player 1A');
    rm.joinRoom('p2-r1', code1, 'Player 1B');
    rm.joinRoom('p3-r1', code1, 'Player 1C');
    const engine1 = rm.ensureImposterEngine(code1, mockIO);
    engine1.startGame();

    // Create Room 2
    const { room: room2 } = rm.createRoom('tv-sock-r2', 'TV 2', 'imposter');
    const code2 = room2.code;
    rm.joinRoom('p1-r2', code2, 'Player 2A');
    rm.joinRoom('p2-r2', code2, 'Player 2B');
    rm.joinRoom('p3-r2', code2, 'Player 2C');
    const engine2 = rm.ensureImposterEngine(code2, mockIO);
    engine2.startGame();

    // Terminate Room 1
    rm.terminateRoom(code1, 'tv-sock-r1', mockIO, 'Room 1 Host Exited');

    // Room 1 must be destroyed
    assert(rm.getRoom(code1) === undefined, 'Room 1 must be destroyed');
    assert(rm.getImposterEngine(code1) === undefined, 'Room 1 engine must be destroyed');

    // Room 2 must remain completely intact and active
    assert(rm.getRoom(code2) !== undefined, 'Room 2 must remain active');
    assert(rm.getImposterEngine(code2) !== undefined, 'Room 2 engine must remain active');
    assert(rm.getRoom(code2)?.phase === 'playing', 'Room 2 phase must remain playing');
    assert(rm.getPlayerRoom('p1-r2') === code2, 'Player 2A must still belong to Room 2');

    console.log('  ✓ Terminating Room 1 had zero effect on concurrent Room 2');
    console.log('✅ TEST 13 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 13 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 14: Test F - Security & Non-Host Guard
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 14: Test F - Security & Non-Host Guard');
    const mockIO = createMockIO();
    const rm = new RoomManager();

    const { room } = rm.createRoom('tv-sock-14', 'TV Host', 'imposter');
    const code = room.code;
    rm.joinRoom('p1-sock-14', code, 'Player 1');
    rm.joinRoom('p2-sock-14', code, 'Player 2');
    rm.joinRoom('p3-sock-14', code, 'Player 3');

    // Non-host player attempts to terminate room
    const unauthorizedTerm = rm.terminateRoom(code, 'p1-sock-14', mockIO, 'Malicious Exit');
    assert(unauthorizedTerm === false, 'Non-host socket must NOT be allowed to terminate room');

    // Room and game remain alive
    assert(rm.getRoom(code) !== undefined, 'Room must still exist after unauthorized termination attempt');
    assert(rm.getPlayerRoom('p1-sock-14') === code, 'Player 1 still belongs to room');

    console.log('  ✓ Unauthorized termination attempts from non-host players are strictly blocked');
    console.log('✅ TEST 14 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 14 FAILED:', err);
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
