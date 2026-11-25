import { RoomManager } from './game/RoomManager.js';
import { DrawIdentifyEngine, MIN_DRAWING_SECONDS, MAX_DRAWING_SECONDS, DEFAULT_DRAWING_SECONDS } from './game/DrawIdentifyEngine.js';
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
    findEvents: (event: string) => emittedEvents.filter(e => e.event === event),
    lastEvent: (event: string) => [...emittedEvents].reverse().find(e => e.event === event),
  } as unknown as GameServer & {
    getEvents: () => typeof emittedEvents;
    clearEvents: () => void;
    findEvents: (event: string) => typeof emittedEvents;
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
  console.log('   RUNNING DRAW & IDENTIFY CHALLENGE AUTOMATED TEST SUITE       ');
  console.log('================================================================\n');

  let passed = 0;
  const total = 7;

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Setup & Player-Controlled Drawing Timer (+ / -), Limits & Lock
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 1: Setup & Player-Controlled Drawing Timer (+ / -), Limits & Lock');
    const mockIO = createMockIO();
    const rm = new RoomManager();
    const { room } = rm.createRoom('tv-sock-1', 'TV Host', 'draw-identify');
    const code = room.code;

    const engine = rm.ensureDrawIdentifyEngine(code, mockIO);

    // Verify default settings
    const defaultSettings = engine.getSettings();
    assert(defaultSettings.objectCount === 12, 'Default object count should be 12');
    assert(defaultSettings.drawingDurationSeconds === DEFAULT_DRAWING_SECONDS, 'Default drawing timer should be 15s');
    assert(defaultSettings.identificationDurationSeconds === 60, 'Identification timer should be 60s');

    // Player increases timer by 1s (+ button) and sets custom time (e.g. 22s)
    engine.updateSettings({ drawingDurationSeconds: 16 });
    assert(engine.getSettings().drawingDurationSeconds === 16, 'Timer should increase to 16s');
    engine.updateSettings({ drawingDurationSeconds: 22 });
    assert(engine.getSettings().drawingDurationSeconds === 22, 'Timer should update to 22s');

    // Changing objectCount must NOT overwrite or auto-calculate drawingDurationSeconds
    engine.updateSettings({ objectCount: 6, language: 'malayalam' });
    assert(engine.getSettings().objectCount === 6, 'Should update to 6 objects');
    assert(engine.getSettings().drawingDurationSeconds === 22, 'Timer must remain 22s when objectCount changes to 6');
    assert(engine.getSettings().language === 'malayalam', 'Should support Malayalam language mode');

    engine.updateSettings({ objectCount: 15, language: 'english' });
    assert(engine.getSettings().objectCount === 15, 'Should update to 15 objects');
    assert(engine.getSettings().drawingDurationSeconds === 22, 'Timer must remain 22s when objectCount changes to 15');

    // Verify min & max clamping
    engine.updateSettings({ drawingDurationSeconds: 1 });
    assert(engine.getSettings().drawingDurationSeconds === MIN_DRAWING_SECONDS, `Timer must clamp to min ${MIN_DRAWING_SECONDS}s`);
    engine.updateSettings({ drawingDurationSeconds: 999 });
    assert(engine.getSettings().drawingDurationSeconds === MAX_DRAWING_SECONDS, `Timer must clamp to max ${MAX_DRAWING_SECONDS}s`);

    // Set final custom timer (19s), start game, and verify it applies & locks
    engine.updateSettings({ drawingDurationSeconds: 19 });
    rm.joinRoom('p1-t1', code, 'Alice');
    rm.joinRoom('p2-t1', code, 'Bob');
    engine.startGame();

    assert(engine.getPublicState().drawingDurationSeconds === 19, 'Selected 19s timer should apply to drawing phase');
    engine.updateSettings({ drawingDurationSeconds: 40 });
    assert(engine.getSettings().drawingDurationSeconds === 19, 'Timer setting must be locked once game starts');
    engine.stop();

    console.log('  ✓ Player-controlled timer (+ / -), min/max clamping, independence from objectCount, and game-start lock verified');
    console.log('  ✓ Supported English and Malayalam language modes');
    console.log('✅ TEST 1 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 1 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Individual Player Rotation Without Immediate Repetition
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 2: Individual Player Rotation Without Immediate Repetition');
    const mockIO = createMockIO();
    const rm = new RoomManager();
    const { room } = rm.createRoom('tv-sock-2', 'TV Host', 'draw-identify');
    const code = room.code;

    // Join 3 mobile players
    rm.joinRoom('p1-sock', code, 'Player 1');
    rm.joinRoom('p2-sock', code, 'Player 2');
    rm.joinRoom('p3-sock', code, 'Player 3');

    const engine = rm.ensureDrawIdentifyEngine(code, mockIO);
    engine.updateSettings({ objectCount: 6 });

    // Round 1
    engine.startGame();
    const drawerRound1 = engine.getPublicState().currentDrawerId;
    assert(['p1-sock', 'p2-sock', 'p3-sock'].includes(drawerRound1), 'Drawer 1 must be one of the non-host players');
    assert(room.players.find(p => p.id === drawerRound1)?.isDrawing === true, 'Drawer must be flagged isDrawing');

    // End round 1 and advance to round 2
    (engine as any).endRound();
    engine.nextRound();
    const drawerRound2 = engine.getPublicState().currentDrawerId;
    assert(['p1-sock', 'p2-sock', 'p3-sock'].includes(drawerRound2), 'Drawer 2 must be one of the players');
    assert(drawerRound2 !== drawerRound1, 'Drawer 2 must NOT repeat Drawer 1 before all have drawn');

    // End round 2 and advance to round 3
    (engine as any).endRound();
    engine.nextRound();
    const drawerRound3 = engine.getPublicState().currentDrawerId;
    assert(drawerRound3 !== drawerRound1 && drawerRound3 !== drawerRound2, 'Drawer 3 must be the remaining unselected player');

    console.log('  ✓ Rotated through all 3 players fairly without repeating any drawer');
    console.log('✅ TEST 2 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 2 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Drawer Privacy (Drawer Never Sees Secret Names)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 3: Drawer Privacy (Drawer Never Sees Secret Names)');
    const mockIO = createMockIO();
    const rm = new RoomManager();
    const { room } = rm.createRoom('tv-sock-3', 'TV Host', 'draw-identify');
    const code = room.code;

    rm.joinRoom('p1-sock', code, 'Alice');
    rm.joinRoom('p2-sock', code, 'Bob');

    const engine = rm.ensureDrawIdentifyEngine(code, mockIO);
    engine.updateSettings({ objectCount: 6 });
    mockIO.clearEvents();

    engine.startGame();
    const drawerId = engine.getPublicState().currentDrawerId;
    const opposingId = ['p1-sock', 'p2-sock'].find(id => id !== drawerId)!;

    // Check secret list delivered to drawer vs opposing player
    const secretListEvents = mockIO.findEvents('draw-identify:secret-list');
    const drawerEvent = secretListEvents.find(e => e.target === drawerId);
    const opposingEvent = secretListEvents.find(e => e.target === opposingId);

    assert(!!drawerEvent, 'Secret list event must be sent to drawer');
    assert(drawerEvent!.data.objectList.length === 0, 'Drawer secret list MUST be empty/omitted');

    assert(!!opposingEvent, 'Secret list event must be sent to opposing player');
    assert(opposingEvent!.data.objectList.length === 6, 'Opposing player must receive full 6 object list');
    assert(opposingEvent!.data.objectList.every((o: any) => !!o.name), 'Opposing player receives clear object names');

    // Check public state masked names for TV/general broadcast
    const pubState = engine.getPublicState();
    assert(pubState.objectList[0].name.startsWith('Object') || pubState.objectList[0].name.startsWith('വസ്തു'), 'TV public state object names must be masked until identified');

    console.log('  ✓ Opposing players received ordered object list while drawer and TV remained strictly masked');
    console.log('✅ TEST 3 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 3 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Drawing Submissions & Grid Slots
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 4: Drawing Submissions & Grid Slots');
    const mockIO = createMockIO();
    const rm = new RoomManager();
    const { room } = rm.createRoom('tv-sock-4', 'TV Host', 'draw-identify');
    const code = room.code;

    rm.joinRoom('p1-sock', code, 'Alice');
    rm.joinRoom('p2-sock', code, 'Bob');

    const engine = rm.ensureDrawIdentifyEngine(code, mockIO);
    engine.updateSettings({ objectCount: 6 });
    engine.startGame();

    const drawerId = engine.getPublicState().currentDrawerId;
    const nonDrawerId = ['p1-sock', 'p2-sock'].find(id => id !== drawerId)!;
    const roundId = engine.getRoundId();

    // 1. Non-drawer cannot submit drawings
    const nonDrawerSubmission = engine.submitDrawing(nonDrawerId, {
      roundId,
      drawingIndex: 0,
      dataUrl: 'data:image/png;base64,doodle0',
    });
    assert(nonDrawerSubmission === false, 'Non-drawer must NOT be allowed to submit drawings');

    // 2. Drawer submits drawing #0
    const sub0 = engine.submitDrawing(drawerId, {
      roundId,
      drawingIndex: 0,
      dataUrl: 'data:image/png;base64,doodle0',
    });
    assert(sub0 === true, 'Drawer must successfully submit drawing #0');
    assert(engine.getPublicState().drawings[0]?.dataUrl === 'data:image/png;base64,doodle0', 'Drawing #0 saved in grid cell 0');

    // 3. Duplicate submission to drawing #0 rejected
    const dup0 = engine.submitDrawing(drawerId, {
      roundId,
      drawingIndex: 0,
      dataUrl: 'data:image/png;base64,doodle0_dup',
    });
    assert(dup0 === false, 'Duplicate submission to already filled cell must be rejected');

    // 4. Submit drawings 1 through 5 (completing all 6 objects)
    for (let i = 1; i < 5; i++) {
      engine.submitDrawing(drawerId, { roundId, drawingIndex: i, dataUrl: `data:image/png;base64,doodle${i}` });
    }
    assert(engine.getPublicState().roundPhase === 'drawing', 'Should still be in drawing phase with 5/6 drawings');

    // 5. Submitting 6th (final) drawing automatically triggers identification phase!
    engine.submitDrawing(drawerId, { roundId, drawingIndex: 5, dataUrl: 'data:image/png;base64,doodle5' });
    assert(engine.getPublicState().roundPhase === 'identification', 'Must auto-transition to identification phase when all objects are drawn');

    console.log('  ✓ Submissions correctly filled grid cells without allowing duplicates or non-drawer submissions');
    console.log('  ✓ Automatically transitioned to identification phase once all drawings completed');
    console.log('✅ TEST 4 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 4 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Synchronised Ticking System & Real-Time Feedback
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 5: Synchronised Ticking System & Real-Time Feedback');
    const mockIO = createMockIO();
    const rm = new RoomManager();
    const { room } = rm.createRoom('tv-sock-5', 'TV Host', 'draw-identify');
    const code = room.code;

    rm.joinRoom('p1-sock', code, 'Alice');
    rm.joinRoom('p2-sock', code, 'Bob');
    rm.joinRoom('p3-sock', code, 'Charlie');

    const engine = rm.ensureDrawIdentifyEngine(code, mockIO);
    engine.updateSettings({ objectCount: 6 });
    engine.startGame();

    const drawerId = engine.getPublicState().currentDrawerId;
    const opposingPlayers = ['p1-sock', 'p2-sock', 'p3-sock'].filter(id => id !== drawerId);
    const roundId = engine.getRoundId();

    // Fast-forward to identification phase
    (engine as any).startIdentificationPhase();
    assert(engine.getPublicState().roundPhase === 'identification', 'Must be in identification phase');

    // 1. Drawer cannot tick objects
    const drawerTick = engine.tickObject(drawerId, { roundId, objectIndex: 0 });
    assert(drawerTick === false, 'Drawer must NOT be allowed to tick objects');

    // 2. Opposing player 1 ticks object #2
    mockIO.clearEvents();
    const p1Tick = engine.tickObject(opposingPlayers[0], { roundId, objectIndex: 2 });
    assert(p1Tick === true, 'Opposing player must successfully tick object #2');

    // Check broadcast of draw-identify:object-ticked event
    const tickEvent = mockIO.findEvents('draw-identify:object-ticked')[0];
    assert(!!tickEvent, 'Must emit draw-identify:object-ticked event to all');
    assert(tickEvent.data.objectIndex === 2, 'Ticked event must have objectIndex 2');
    assert(tickEvent.data.identifiedCount === 1, 'Identified count must be 1');

    // 3. Duplicate tick on same object rejected
    const dupTick = engine.tickObject(opposingPlayers[1], { roundId, objectIndex: 2 });
    assert(dupTick === false, 'Duplicate tick on already identified object must be rejected');

    // 4. Opposing player 2 ticks object #0
    const p2Tick = engine.tickObject(opposingPlayers[1], { roundId, objectIndex: 0 });
    assert(p2Tick === true, 'Opposing player 2 successfully ticks object #0');
    assert(engine.getPublicState().identifiedCount === 2, 'Total identified count is now 2');

    console.log('  ✓ Real-time synchronized tick verified across all players and TV');
    console.log('  ✓ Simultaneous / duplicate tick attempts safely rejected');
    console.log('✅ TEST 5 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 5 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Scoring System (Drawer Awarded 1 Point Per Identified Object)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 6: Scoring System (Drawer Awarded 1 Point Per Identified Object)');
    const mockIO = createMockIO();
    const rm = new RoomManager();
    const { room } = rm.createRoom('tv-sock-6', 'TV Host', 'draw-identify');
    const code = room.code;

    rm.joinRoom('p1-sock', code, 'Alice');
    rm.joinRoom('p2-sock', code, 'Bob');

    const engine = rm.ensureDrawIdentifyEngine(code, mockIO);
    engine.updateSettings({ objectCount: 6 });
    engine.startGame();

    const drawerId = engine.getPublicState().currentDrawerId;
    const opposingId = ['p1-sock', 'p2-sock'].find(id => id !== drawerId)!;
    const roundId = engine.getRoundId();

    (engine as any).startIdentificationPhase();

    // Tick 4 objects
    engine.tickObject(opposingId, { roundId, objectIndex: 0 });
    engine.tickObject(opposingId, { roundId, objectIndex: 1 });
    engine.tickObject(opposingId, { roundId, objectIndex: 3 });
    engine.tickObject(opposingId, { roundId, objectIndex: 4 });

    const drawerPlayer = room.players.find(p => p.id === drawerId)!;
    assert(drawerPlayer.score === 4, `Drawer score should be 4 points, got ${drawerPlayer.score}`);
    assert(engine.getPublicState().roundScore === 4, `Round score should be 4, got ${engine.getPublicState().roundScore}`);

    const opposingPlayer = room.players.find(p => p.id === opposingId)!;
    assert(opposingPlayer.score === 0, 'Opposing player score remains 0');

    console.log('  ✓ Drawer correctly awarded 1 point per identified object; cumulative scores updated');
    console.log('✅ TEST 6 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 6 FAILED:', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Round Completion & Game Finish Podium
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 7: Round Completion & Game Finish Podium');
    const mockIO = createMockIO();
    const rm = new RoomManager();
    const { room } = rm.createRoom('tv-sock-7', 'TV Host', 'draw-identify');
    const code = room.code;

    rm.joinRoom('p1-sock', code, 'Alice');
    rm.joinRoom('p2-sock', code, 'Bob');

    const engine = rm.ensureDrawIdentifyEngine(code, mockIO);
    engine.updateSettings({ objectCount: 6 });
    engine.startGame();

    (engine as any).startIdentificationPhase();
    (engine as any).endRound();

    assert(engine.getPublicState().roundPhase === 'round-end', 'Should be in round-end phase');

    // Host finishes the game
    mockIO.clearEvents();
    engine.finishGame();

    assert(engine.getPublicState().roundPhase === 'game-end', 'Should transition to game-end phase');
    assert(room.phase === 'game-end', 'Room phase must be game-end');

    const gameEndEvent = mockIO.findEvents('game:end')[0];
    assert(!!gameEndEvent, 'game:end event must be emitted');
    assert(Array.isArray(gameEndEvent.data.leaderboard), 'Leaderboard must be included');

    console.log('  ✓ Host successfully ended game and broadcast final leaderboard');
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
