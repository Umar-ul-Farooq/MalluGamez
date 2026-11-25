import fs from 'fs';
import path from 'path';
import { RoomManager } from './game/RoomManager.js';
import { FASTEST_FINGER_BANK, validateFastestFingerAnswer } from './game/FastestFingerBank.js';
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
  console.log('   FASTEST FINGER – PICTURE RUSH AUTOMATED TEST SUITE           ');
  console.log('================================================================\n');

  let passed = 0;
  const total = 6;

  // TEST 1: Question Bank Integrity, Unique IDs/Images, and Local WebP Files Exist
  try {
    console.log('▶ TEST 1: Question Bank Integrity & Local WebP Image Verification');
    assert(FASTEST_FINGER_BANK.length >= 20, 'Bank must have at least 20 verified items');

    const ids = new Set<string>();
    const images = new Set<string>();
    const clientPublicDir = path.resolve(process.cwd(), 'packages/client/public');

    for (const item of FASTEST_FINGER_BANK) {
      assert(!ids.has(item.id), `Duplicate ID: ${item.id}`);
      ids.add(item.id);

      assert(!images.has(item.image), `Duplicate image: ${item.image}`);
      images.add(item.image);

      assert(item.image.endsWith('.webp'), `Image must be WebP: ${item.image}`);
      const fullPath = path.join(clientPublicDir, item.image.replace(/^\//, ''));
      assert(fs.existsSync(fullPath), `Image file missing on disk: ${fullPath}`);
      assert(fs.statSync(fullPath).size > 5000, `Image file suspiciously small: ${fullPath}`);
    }

    console.log(`  ✓ Verified ${FASTEST_FINGER_BANK.length} unique WebP images on disk`);
    console.log('✅ TEST 1 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 1 FAILED:', err);
  }

  // TEST 2: Controlled Answer Validation (Case, Spaces, Punctuation, Alternatives, No Loose Fuzzy)
  try {
    console.log('▶ TEST 2: Controlled Answer Validation');
    const whisk = FASTEST_FINGER_BANK.find(q => q.id === 'FF001')!;
    assert(validateFastestFingerAnswer('whisk', whisk), 'Lowercase should match');
    assert(validateFastestFingerAnswer('  WHISK!!  ', whisk), 'Whitespace + punctuation should match');
    assert(validateFastestFingerAnswer('egg   whisk', whisk), 'Repeated spaces + alternative should match');
    assert(!validateFastestFingerAnswer('spoon', whisk), 'Unrelated word must fail');
    assert(!validateFastestFingerAnswer('whi', whisk), 'Partial prefix must NOT fuzzy-match');

    const elephant = FASTEST_FINGER_BANK.find(q => q.id === 'FF009')!;
    assert(validateFastestFingerAnswer('Aana', elephant), 'Manglish alternative should match');
    assert(validateFastestFingerAnswer('ആന', elephant), 'Malayalam alternative should match');

    console.log('  ✓ Controlled normalization & English/Malayalam validation verified');
    console.log('✅ TEST 2 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 2 FAILED:', err);
  }

  // TEST 3: Timer Setup & Settings Lock After Game Starts
  try {
    console.log('▶ TEST 3: Timer Setup (5/10/15/20/30s) & Lock on Start');
    const mockIO = createMockIO();
    const rm = new RoomManager();
    const { room } = rm.createRoom('tv-ff-3', 'TV Host', 'fastest-finger');
    rm.joinRoom('p1', room.code, 'Alice');
    rm.joinRoom('p2', room.code, 'Bob');

    const engine = rm.ensureFastestFingerEngine(room.code, mockIO);
    assert(engine.getSettings().timerSeconds === 15, 'Default timer must be 15s');

    engine.updateSettings({ timerSeconds: 20, totalQuestions: 5 });
    assert(engine.getSettings().timerSeconds === 20, 'Timer should update to 20s');
    assert(engine.getSettings().totalQuestions === 5, 'Total questions should update to 5');

    engine.startGame();
    assert(engine.getPublicState().timerSeconds === 20, 'Active game must use selected 20s timer');

    // Attempt to change settings after game starts (must be locked)
    engine.updateSettings({ timerSeconds: 5 });
    assert(engine.getSettings().timerSeconds === 20, 'Timer must remain locked after game start');

    engine.stop();
    console.log('  ✓ Timer configuration and game-start lock verified');
    console.log('✅ TEST 3 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 3 FAILED:', err);
  }

  // TEST 4: Retry After Wrong Answer + First Correct Wins 10 Points + Lock Submissions
  try {
    console.log('▶ TEST 4: Retry After Incorrect Answer, First-Correct-Wins & Submission Lock');
    const mockIO = createMockIO();
    const rm = new RoomManager();
    const { room } = rm.createRoom('tv-ff-4', 'TV Host', 'fastest-finger');
    rm.joinRoom('p1', room.code, 'Alice');
    rm.joinRoom('p2', room.code, 'Bob');

    const engine = rm.ensureFastestFingerEngine(room.code, mockIO);
    engine.updateSettings({ timerSeconds: 15, totalQuestions: 3 });
    engine.startGame();

    const state = engine.getPublicState();
    const qItem = (engine as any).currentItem;
    assert(qItem !== null, 'Current item must exist');

    // Alice submits an incorrect answer
    const wrongRes = engine.submitGuess('p1', 'Wrong Guess', state.sessionId, state.questionId);
    assert(wrongRes.isCorrect === false, 'Wrong guess must return isCorrect: false');
    assert(wrongRes.message === 'Not quite! Try again!', 'Must return retry message');
    assert(engine.getPublicState().roundPhase === 'question', 'Question must remain active after wrong guess');
    assert(engine.getPublicState().revealedAnswer === null, 'Answer must NOT be revealed after wrong guess');

    // Alice immediately retries with the correct answer and wins 10 pts
    const winRes = engine.submitGuess('p1', qItem.answer, state.sessionId, state.questionId);
    assert(winRes.isCorrect === true, 'Retry with correct answer must succeed');
    assert(winRes.points === 10, 'First correct answer must award 10 points');
    assert(engine.getPublicState().roundPhase === 'won', 'Question phase must transition to won');
    assert(engine.getPublicState().winnerName === 'Alice', 'Winner name must be Alice');

    // Bob submits right after (duplicate/simultaneous submission must be locked)
    const lateRes = engine.submitGuess('p2', qItem.answer, state.sessionId, state.questionId);
    assert(lateRes.isCorrect === false, 'Submissions must be locked once first correct answer is accepted');

    // Alice tries submitting again (must not award duplicate points)
    const dupRes = engine.submitGuess('p1', qItem.answer, state.sessionId, state.questionId);
    assert(dupRes.isCorrect === false, 'Duplicate submission from winner must be rejected');

    const alice = room.players.find(p => p.id === 'p1')!;
    const bob = room.players.find(p => p.id === 'p2')!;
    assert(alice.score === 10, 'Alice must have exactly 10 points');
    assert(bob.score === 0, 'Bob must have 0 points');

    engine.stop();
    console.log('  ✓ Retry without penalty, authoritative first-correct-wins, and lock verified');
    console.log('✅ TEST 4 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 4 FAILED:', err);
  }

  // TEST 5: Timeout Auto-Skip + Stale Question Rejection + Reconnect Preserves Score & Count
  try {
    console.log('▶ TEST 5: Timeout Skip, Stale Question Rejection & Reconnect Handling');
    const mockIO = createMockIO();
    const rm = new RoomManager();
    const { room } = rm.createRoom('tv-ff-5', 'TV Host', 'fastest-finger');
    rm.joinRoom('p1', room.code, 'Alice');
    rm.joinRoom('p2', room.code, 'Bob');

    const engine = rm.ensureFastestFingerEngine(room.code, mockIO);
    engine.updateSettings({ timerSeconds: 5, totalQuestions: 2 });
    engine.startGame();

    const s1 = engine.getPublicState();
    const q1Item = (engine as any).currentItem;

    // Trigger timeout on Q1
    (engine as any).handleTimeout(s1.sessionId, s1.questionId);
    assert(engine.getPublicState().roundPhase === 'skipped', 'Timeout must mark question as skipped');
    assert(engine.getPublicState().revealedAnswer === q1Item.answer, 'Timeout must reveal correct answer');

    // Stale submission for Q1 after skip must be rejected
    const staleRes = engine.submitGuess('p1', q1Item.answer, s1.sessionId, s1.questionId);
    assert(staleRes.isCorrect === false, 'Stale submission after timeout must be rejected');

    // Advance manually to Q2, Alice answers, then reconnects
    (engine as any).startQuestion(1);
    const s2 = engine.getPublicState();
    const q2Item = (engine as any).currentItem;
    assert(s2.questionId !== s1.questionId, 'Q2 must have unique questionId');
    assert(q2Item.id !== q1Item.id, 'Q2 must not repeat Q1');

    engine.submitGuess('p1', q2Item.answer, s2.sessionId, s2.questionId);

    // Alice disconnects and reconnects with new socket ID
    rm.handleDisconnect('p1', mockIO);
    rm.joinRoom('p1-new', room.code, 'Alice');

    const aliceNew = room.players.find(p => p.id === 'p1-new')!;
    assert(aliceNew.score === 10, 'Reconnected player must keep score of 10');
    assert(engine.getPublicState().correctCounts['p1-new'] === 1, 'Reconnected player must keep solved count');

    engine.stop();
    console.log('  ✓ Timeout skip, stale rejection, non-repeating questions & reconnect verified');
    console.log('✅ TEST 5 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 5 FAILED:', err);
  }

  // TEST 6: Game End & Final Leaderboard + Play Again Without Repeating Pictures
  try {
    console.log('▶ TEST 6: Final Leaderboard & Play Again Non-Repeating Pictures');
    const mockIO = createMockIO();
    const rm = new RoomManager();
    const { room } = rm.createRoom('tv-ff-6', 'TV Host', 'fastest-finger');
    rm.joinRoom('p1', room.code, 'Alice');
    rm.joinRoom('p2', room.code, 'Bob');

    const engine = rm.ensureFastestFingerEngine(room.code, mockIO);
    engine.updateSettings({ timerSeconds: 10, totalQuestions: 5 });
    engine.startGame();

    const firstGameIds = new Set<string>((engine as any).questionPool.map((q: any) => q.id));
    assert(firstGameIds.size === 5, 'First game must have 5 unique questions');

    engine.endGame();
    assert(room.phase === 'game-end', 'Room phase must be game-end');
    const endEvent = mockIO.lastEvent('game:end');
    assert(endEvent !== undefined, 'game:end must be emitted');

    // Play Again: next 5 questions should not overlap with first 5
    engine.restartGame();
    const secondGameIds = new Set<string>((engine as any).questionPool.map((q: any) => q.id));
    assert(secondGameIds.size === 5, 'Second game must have 5 unique questions');
    for (const id of secondGameIds) {
      assert(!firstGameIds.has(id), `Play Again repeated recently used picture ${id}`);
    }

    engine.stop();
    console.log('  ✓ Final leaderboard & non-repeating Play Again verified');
    console.log('✅ TEST 6 PASSED\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 6 FAILED:', err);
  }

  console.log('================================================================');
  console.log(` RESULT: ${passed} / ${total} TESTS PASSED`);
  console.log('================================================================');

  if (passed !== total) process.exit(1);
}

runTestSuite().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
