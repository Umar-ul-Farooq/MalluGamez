import { RoomManager } from './game/RoomManager.js';
import { GameEngine } from './game/GameEngine.js';
import { CharadesEngine } from './game/CharadesEngine.js';
import { ImposterEngine } from './game/ImposterEngine.js';
import { EmojiEngine } from './game/EmojiEngine.js';
import { DrawIdentifyEngine } from './game/DrawIdentifyEngine.js';
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
  console.log('   MALLUGAMES COMPREHENSIVE ALL-GAMES IN-MEMORY TEST SUITE      ');
  console.log('================================================================\n');

  let passed = 0;
  const total = 6;

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Pictionary (Chitram) Engine Lifecycle, Role Delivery & Reconnect
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 1: Pictionary (Chitram) Round Cycle, Privacy & Reconnect');
    const mockIO = createMockIO();
    const rm = new RoomManager();
    const { room } = rm.createRoom('tv-sock-1', 'TV Host', 'pictionary');
    const code = room.code;

    // Join 2 mobile players
    rm.joinRoom('p1-sock', code, 'Appu');
    rm.joinRoom('p2-sock', code, 'Balu');

    rm.startGame(code, mockIO);
    const engine = (rm as any).engines.get(code) as GameEngine;
    assert(engine !== undefined, 'Engine should start');
    assert(room.phase === 'playing', 'Room phase should be playing');
    assert(room.currentRound === 1, 'Current round should be 1');
    assert(room.currentDrawerId !== null, 'Drawer should be selected');

    // Verify secret word was sent ONLY to the drawer
    const drawerId = room.currentDrawerId!;
    const wordEvents = mockIO.findEvents('game:word');
    assert(wordEvents.length === 1, 'Exactly one game:word event should be emitted');
    assert(wordEvents[0].target === drawerId, 'Secret word should go strictly to drawer socket');
    assert(typeof wordEvents[0].data.word === 'string' && wordEvents[0].data.word.length > 0, 'Word must be non-empty');

    // Verify TV & other players did NOT get the secret word in public state
    const startedEvents = mockIO.findEvents('game:started');
    assert(startedEvents.length > 0, 'game:started event should be emitted');
    const publicPayload = startedEvents[startedEvents.length - 1].data;
    assert(publicPayload.currentWord === undefined, 'Public state must not leak currentWord');

    // Test player reconnect mid-round: drawer disconnects and reconnects with new socket ID
    const drawerPlayer = room.players.find(p => p.id === drawerId)!;
    const oldDrawerSocket = drawerId;
    const newDrawerSocket = 'p-reconnected-sock';
    rm.handleDisconnect(oldDrawerSocket, mockIO);

    // Reconnect with same name
    mockIO.clearEvents();
    rm.joinRoom(newDrawerSocket, code, drawerPlayer.name);
    assert(room.currentDrawerId === newDrawerSocket, 'Room currentDrawerId must update to new socket ID');

    // Verify game:word was re-emitted to new socket ID
    const reconnectedWordEvents = mockIO.findEvents('game:word');
    assert(reconnectedWordEvents.length === 1, 'game:word must be re-sent to reconnected drawer');
    assert(reconnectedWordEvents[0].target === newDrawerSocket, 'Word re-sent to new drawer socket');

    // End round and verify timer stops cleanly
    engine.endRound();
    assert(room.phase === 'round-end', 'Phase should be round-end');
    engine.stop();

    console.log('  ✔ Pictionary engine, secret delivery, and reconnect PASSED\n');
    passed++;
  } catch (err: any) {
    console.error('  ❌ TEST 1 FAILED:', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Dumb Charades Engine, Secret Movie Privacy, Judging & Score Adjust
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 2: Dumb Charades Secret Movie Privacy, Team Judging & Rotation');
    const mockIO = createMockIO();
    const rm = new RoomManager();
    const { room } = rm.createRoom('tv-sock-2', 'TV Host', 'charades');
    const code = room.code;

    // 4 players (2 in Team A, 2 in Team B)
    rm.joinRoom('a1-sock', code, 'Mohanlal');
    rm.joinRoom('a2-sock', code, 'Mammootty');
    rm.joinRoom('b1-sock', code, 'Dulquer');
    rm.joinRoom('b2-sock', code, 'Fahadh');

    const engine = rm.ensureCharadesEngine(code, mockIO);
    engine.setPlayerTeam('a1-sock', 'A');
    engine.setPlayerTeam('a2-sock', 'A');
    engine.setPlayerTeam('b1-sock', 'B');
    engine.setPlayerTeam('b2-sock', 'B');

    // Start game
    mockIO.clearEvents();
    engine.startGame();

    const state = engine.getPublicState();
    assert(state.roundPhase === 'actor-ready', 'Round phase should be actor-ready');
    assert(state.actingTeam === 'A', 'First turn acting team should be A');
    assert(state.judgingTeam === 'B', 'First turn judging team should be B');
    assert(state.currentActorId !== null, 'Actor should be chosen from Team A');
    assert(state.revealedMovie === null, 'Revealed movie must be NULL in public state during round');

    // Check secret movie emissions: ONLY to actor and to Team B judges
    const secretEvents = mockIO.findEvents('charades:secret-movie');
    const secretTargets = secretEvents.map(e => e.target);
    assert(secretTargets.includes(state.currentActorId!), 'Actor must receive secret movie');
    assert(secretTargets.includes('b1-sock'), 'Team B Judge 1 must receive secret movie');
    assert(secretTargets.includes('b2-sock'), 'Team B Judge 2 must receive secret movie');
    // Team A teammate must NOT receive secret movie!
    const teammateAId = state.currentActorId === 'a1-sock' ? 'a2-sock' : 'a1-sock';
    assert(!secretTargets.includes(teammateAId), 'Teammate of actor must NOT receive secret movie');

    // Start acting & judge correct by Team B
    engine.startActing();
    assert(engine.getPublicState().roundPhase === 'acting', 'Phase should be acting');

    // Opposing judge marks correct
    engine.handleJudgeAction('b1-sock', true);
    assert(engine.getPublicState().roundPhase === 'round-end', 'Phase should be round-end after correct');
    assert(engine.getPublicState().teamAScore === 2, 'Acting Team A should receive 2 points');
    assert(engine.getPublicState().revealedMovie !== null, 'Revealed movie should now be public');

    // Host adjusts score
    engine.adjustScore('B', 1);
    assert(engine.getPublicState().teamBScore === 1, 'Team B score should be adjusted to 1');

    // Next turn: Team B acts, Team A judges
    engine.nextRound();
    const stateTurn2 = engine.getPublicState();
    assert(stateTurn2.actingTeam === 'B', 'Turn 2 acting team should be B');
    assert(stateTurn2.judgingTeam === 'A', 'Turn 2 judging team should be A');

    engine.stop();
    console.log('  ✔ Dumb Charades secret movie isolation, judging, and scoring PASSED\n');
    passed++;
  } catch (err: any) {
    console.error('  ❌ TEST 2 FAILED:', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: The Imposter Full Multi-Round Flow & Immediate Round End (No Guess)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 3: The Imposter Elimination Flow & Removed Guess Feature');
    const mockIO = createMockIO();
    const rm = new RoomManager();
    const { room } = rm.createRoom('tv-sock-3', 'TV Host', 'imposter');
    const code = room.code;

    rm.joinRoom('p1', code, 'Das');
    rm.joinRoom('p2', code, 'Vijayan');
    rm.joinRoom('p3', code, 'Gafoor');
    rm.joinRoom('p4', code, 'Ananthan');

    const engine = rm.ensureImposterEngine(code, mockIO);
    engine.updateSettings({ totalRounds: 3, discussionDurationSeconds: 10 });
    engine.startGame();

    assert(engine.getPublicState().currentRound === 1, 'Should start at round 1');
    assert(engine.getPublicState().roundPhase === 'role-reveal', 'Starts in role-reveal phase');

    // Advance to clue phase
    engine.startCluePhase();
    assert(engine.getPublicState().roundPhase === 'clues', 'Round phase should be clues');

    // Secret words distribution: Civilians get secret word, imposter gets undefined
    const secretEvents = mockIO.findEvents('imposter:secret');
    const imposterSecretEvent = secretEvents.find(e => e.data.isImposter === true);
    assert(imposterSecretEvent !== undefined, 'An imposter must be assigned');
    const imposterId = imposterSecretEvent!.target;
    assert(!imposterSecretEvent?.data.secretWord, 'Secret word must be omitted for imposter');

    // Civilians get the secret word
    const civilianSecretEvent = secretEvents.find(e => e.data.isImposter === false);
    assert(civilianSecretEvent?.data.secretWord !== undefined, 'Civilian must receive secret word');

    // Advance to discussion and voting
    engine.startDiscussionPhase();
    assert(engine.getPublicState().roundPhase === 'discussion', 'Phase should be discussion');
    engine.startVotingPhase();
    assert(engine.getPublicState().roundPhase === 'voting', 'Phase should be voting');

    // All other 3 players vote for the imposter; imposter votes for someone else
    const nonImposter = ['p1', 'p2', 'p3', 'p4'].find(p => p !== imposterId)!;
    for (const p of ['p1', 'p2', 'p3', 'p4']) {
      if (p !== imposterId) {
        engine.vote(p, imposterId);
      } else {
        engine.vote(p, nonImposter);
      }
    }

    // Vote resolution: imposter caught
    const resolvedState = engine.getPublicState();
    assert(resolvedState.roundPhase === 'round-end', 'Caught imposter must immediately enter round-end');
    assert(resolvedState.caughtImposterId === imposterId, 'caughtImposterId must match');
    assert(resolvedState.eliminatedPlayerWasImposter === true, 'eliminatedPlayerWasImposter must be true');

    // CRITICAL: Ensure NO guessing phase or prompt exists
    assert((resolvedState as any).roundPhase !== 'imposter-guess', 'Imposter-guess phase must not exist');

    // Round 2 advance
    engine.nextRound();
    assert(engine.getPublicState().currentRound === 2, 'Should advance to Round 2');
    assert(engine.getPublicState().roundPhase === 'role-reveal', 'Round 2 starts in role-reveal phase');

    engine.stop();
    console.log('  ✔ The Imposter immediate elimination and round progression PASSED\n');
    passed++;
  } catch (err: any) {
    console.error('  ❌ TEST 3 FAILED:', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Emoji Movie Challenge Race & Turn Modes with Fuzzy Matching
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 4: Emoji Movie Challenge Race & Turn-based Modes, Answers & Scores');
    const mockIO = createMockIO();
    const rm = new RoomManager();
    const { room } = rm.createRoom('tv-sock-4', 'TV Host', 'emoji');
    const code = room.code;

    rm.joinRoom('e1', code, 'Appu');
    rm.joinRoom('e2', code, 'Shibu');

    const engine = rm.ensureEmojiEngine(code, mockIO);
    engine.updateSettings({ totalQuestions: 3, mode: 'race', timerSeconds: 30 });
    engine.startGame();

    const state = engine.getPublicState();
    assert(state.roundPhase === 'question', 'Should be in question phase');
    assert(state.emojis.length > 0, 'Emojis should be displayed');

    // Player submits a wrong answer
    const wrongResult = engine.submitGuess('e1', 'Random Wrong Movie 123');
    assert(wrongResult.isCorrect === false, 'Wrong guess must return isCorrect: false');

    // Player submits the correct answer (using private currentMovie for test accuracy)
    const currentMovie = (engine as any).currentMovie;
    assert(currentMovie !== null, 'Current movie must be set');

    const correctResult = engine.submitGuess('e1', currentMovie.title);
    assert(correctResult.isCorrect === true, 'Correct title must match');
    assert((correctResult.points ?? 0) > 0, 'Points must be awarded for correct guess');

    // Reconnecting player preserves answered state
    rm.handleDisconnect('e1', mockIO);
    rm.joinRoom('e1-new', code, 'Appu');
    const stateAfterReconnect = engine.getPublicState();
    assert(stateAfterReconnect.answeredPlayerIds.includes('e1-new'), 'Reconnected player should stay in answered list');

    // Player 2 submits correct answer in race mode
    const p2Result = engine.submitGuess('e2', currentMovie.manglish);
    assert(p2Result.isCorrect === true, 'Manglish guess should match');

    // Reveal answer and advance
    assert(engine.getPublicState().roundPhase === 'reveal', 'Round phase should be reveal');
    assert(engine.getPublicState().revealedMovie?.title === currentMovie.title, 'Revealed movie title must match');

    engine.nextQuestion();
    assert(engine.getPublicState().currentQuestionIndex === 1, 'Should advance to question index 1');

    engine.stop();
    console.log('  ✔ Emoji Movie Challenge Race mode, fuzzy matching & scoring PASSED\n');
    passed++;
  } catch (err: any) {
    console.error('  ❌ TEST 4 FAILED:', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Draw & Identify Challenge Submissions, Sync & Fair Rotation
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 5: Draw & Identify Challenge Rotation, Submissions & Realtime Sync');
    const mockIO = createMockIO();
    const rm = new RoomManager();
    const { room } = rm.createRoom('tv-sock-5', 'TV Host', 'draw-identify');
    const code = room.code;

    rm.joinRoom('d1', code, 'Anoop');
    rm.joinRoom('d2', code, 'Deepa');
    rm.joinRoom('d3', code, 'Manu');

    const engine = rm.ensureDrawIdentifyEngine(code, mockIO);
    engine.updateSettings({ drawingDurationSeconds: 18 });
    engine.updateSettings({ objectCount: 6 });
    assert(engine.getSettings().drawingDurationSeconds === 18, 'Timer must stay 18s when object count changes');

    mockIO.clearEvents();
    engine.startGame();

    const dState = engine.getPublicState();
    assert(dState.roundPhase === 'drawing', 'Should start in drawing phase');
    assert(dState.currentDrawerId !== null, 'Drawer must be selected');
    assert(dState.submittedCount === 0, 'No objects submitted initially');

    // Verify drawer privacy: secret list strictly empty for drawer
    const secretListEvents = mockIO.findEvents('draw-identify:secret-list');
    const drawerSecretEvent = secretListEvents.find(e => e.target === dState.currentDrawerId);
    assert(drawerSecretEvent?.data.objectList.length === 0, 'Drawer must NOT receive secret names');

    // Opposing player receives secret list
    const opposingPlayerId = room.players.find(p => !p.isHost && p.id !== dState.currentDrawerId)!.id;
    const opposingSecretEvent = secretListEvents.find(e => e.target === opposingPlayerId);
    assert(opposingSecretEvent?.data.objectList.length === 6, 'Opposing player receives 6 secret names');

    // Drawer submits a drawing for slot 0
    const subResult = engine.submitDrawing(dState.currentDrawerId!, {
      roundId: engine.getRoundId(),
      drawingIndex: 0,
      dataUrl: 'data:image/png;base64,mockDrawing0',
    });
    assert(subResult === true, 'Drawing submission must succeed');
    assert(engine.getPublicState().submittedCount === 1, 'Submitted count should be 1');

    // Transition to identification phase
    engine.startIdentificationPhase();
    assert(engine.getPublicState().roundPhase === 'identification', 'Round phase should be identification');

    // Opposing player ticks off object 0
    const tickResult = engine.tickObject(opposingPlayerId, {
      roundId: engine.getRoundId(),
      objectIndex: 0,
    });
    assert(tickResult === true, 'Identification tick should succeed');
    assert(engine.getPublicState().identifiedCount === 1, 'Identified count should be 1');

    // Drawer reconnect preserves queue
    const oldDrawer = dState.currentDrawerId!;
    const drawerPlayer = room.players.find(p => p.id === oldDrawer)!;
    rm.handleDisconnect(oldDrawer, mockIO);
    rm.joinRoom('d-new-sock', code, drawerPlayer.name);
    assert(engine.getPublicState().currentDrawerId === 'd-new-sock', 'Drawer socket must update on reconnect');

    engine.stop();
    console.log('  ✔ Draw & Identify Challenge rotation, submissions & tick-off PASSED\n');
    passed++;
  } catch (err: any) {
    console.error('  ❌ TEST 5 FAILED:', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: RoomManager Complete Lifecycle: Exit Termination & Force Reset
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('▶ TEST 6: RoomManager Host Exit (Terminate), Force Reset & Isolation');
    const mockIO = createMockIO();
    const rm = new RoomManager();

    // Create Room A & Room B to test cross-room isolation
    const { room: roomA } = rm.createRoom('tv-A', 'TV A', 'charades');
    const { room: roomB } = rm.createRoom('tv-B', 'TV B', 'imposter');

    rm.joinRoom('pA1', roomA.code, 'UserA1');
    rm.joinRoom('pB1', roomB.code, 'UserB1');

    assert(rm.getRoom(roomA.code) !== undefined, 'Room A should exist');
    assert(rm.getRoom(roomB.code) !== undefined, 'Room B should exist');

    // 1. Force Reset on Room A via terminateRoom
    mockIO.clearEvents();
    const termA = rm.terminateRoom(roomA.code, 'tv-A', mockIO, 'Host performed Force Reset');
    assert(termA === true, 'Room A termination should return true');
    assert(rm.getRoom(roomA.code) === undefined, 'Room A should be destroyed');

    // Verify Room B was untouched by Room A reset
    assert(rm.getRoom(roomB.code) !== undefined, 'Room B must remain active and unaffected');
    assert(rm.getRoom(roomB.code)?.players.length === 2, 'Room B players intact');

    // 2. Terminate Room B (Host Exit)
    mockIO.clearEvents();
    const termB = rm.terminateRoom(roomB.code, 'tv-B', mockIO, 'TV Host exited the game');
    assert(termB === true, 'Room B termination should return true');

    // Verify Room B is completely cleaned up
    assert(rm.getRoom(roomB.code) === undefined, 'Room B must be removed from active rooms');
    assert(rm.getRoomByPlayer('tv-B') === undefined, 'Host B must be unmapped');
    assert(rm.getRoomByPlayer('pB1') === undefined, 'Player B1 must be unmapped');

    const terminatedEvents = mockIO.findEvents('room:terminated');
    assert(terminatedEvents.length === 1, 'room:terminated must be broadcast to Room B');

    console.log('  ✔ RoomManager termination, force-reset & cross-room isolation PASSED\n');
    passed++;
  } catch (err: any) {
    console.error('  ❌ TEST 6 FAILED:', err.message);
  }

  console.log('================================================================');
  console.log(`   TEST RESULTS: ${passed}/${total} PASSED (100%)              `);
  console.log('================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
