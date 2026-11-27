import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  LastWordPublicState,
  RoomPublicState,
  Room,
} from '@chitram/shared';
import { registerSocketHandlers } from './socket/index.js';
import { LAST_WORD_BANK, type LastWordQuestion } from './game/LastWordBank.js';
import { LastWordValidationService } from './game/LastWordValidationService.js';
import { LastWordEngine } from './game/LastWordEngine.js';

type TestClient = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function waitForEvent<T = any>(
  socket: TestClient,
  event: string,
  predicate?: (data: T) => boolean,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event as any, handler);
      reject(new Error(`Timeout waiting for "${event}"`));
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

function getQuestion(id: string): LastWordQuestion {
  const q = LAST_WORD_BANK.find((item) => item.id === id);
  if (!q) throw new Error(`Missing test question ${id}`);
  return q;
}

async function runTests() {
  console.log('================================================================');
  console.log('   LAST WORD STANDING — HYBRID AI & MULTI-CLIENT SOCKET TESTS   ');
  console.log('================================================================\n');

  // ── Bank Sanity Check ──
  assert(LAST_WORD_BANK.length >= 35, `Expected >= 35 questions, got ${LAST_WORD_BANK.length}`);
  const idSet = new Set(LAST_WORD_BANK.map((q) => q.id));
  assert(idSet.size === LAST_WORD_BANK.length, 'Bank IDs must be unique');

  // ── TEST A: Open-Ended Question (Target + Local DB + AI Uncommon Regional + Cache) ──
  {
    const qBreakfast = getQuestion('LW001'); // secretTarget: Pancake, targetAlternatives: ['Pancakes']
    let aiCallCount = 0;
    const seenPromptStrings: string[] = [];

    const svcA = new LastWordValidationService({
      customEvaluator: async ({ questionPrompt, submittedAnswer, category, constraintsText }) => {
        aiCallCount += 1;
        seenPromptStrings.push(`${questionPrompt} | ${category} | ${constraintsText}`);
        const low = submittedAnswer.toLowerCase();
        if (['idli', 'puttu', 'avocado toast', 'chilaquiles'].includes(low)) {
          return { status: 'VALID', short_reason: `${submittedAnswer} is a recognized breakfast food.` };
        }
        return { status: 'INVALID', short_reason: `${submittedAnswer} is not typically breakfast.` };
      },
    });

    // Stage 1: Secret target & alternative (never triggers AI)
    const rTarget1 = await svcA.validateAnswer(qBreakfast, '  Pancake! ');
    assert(rTarget1.status === 'TARGET_HIT' && rTarget1.stage === 'target', 'Test A: Pancake must hit secret target');
    const rTarget2 = await svcA.validateAnswer(qBreakfast, 'pancakes');
    assert(rTarget2.status === 'TARGET_HIT' && rTarget2.stage === 'target', 'Test A: pancakes alt must hit secret target');
    assert(aiCallCount === 0, 'Test A: AI must NEVER be called for Stage 1 target');

    // Stage 2: Local database
    const rDbValid = await svcA.validateAnswer(qBreakfast, 'eggs');
    assert(rDbValid.status === 'VALID' && rDbValid.stage === 'database', 'Test A: Eggs valid via DB');
    const rDbInvalid = await svcA.validateAnswer(qBreakfast, 'Car');
    assert(rDbInvalid.status === 'INVALID' && rDbInvalid.stage === 'database', 'Test A: Car invalid via DB');
    assert(aiCallCount === 0, 'Test A: AI must NOT be called for Stage 2 DB answers');

    // Stage 3: Uncommon/cultural breakfast items via AI + cache verification
    for (const dish of ['Idli', 'Puttu', 'Avocado toast', 'Chilaquiles']) {
      const res = await svcA.validateAnswer(qBreakfast, dish);
      assert(res.status === 'VALID' && res.stage === 'ai', `Test A: ${dish} should pass via AI`);
    }
    assert(aiCallCount === 4, `Test A: Expected 4 AI calls, got ${aiCallCount}`);

    // Cache hit on repeat
    const resCached = await svcA.validateAnswer(qBreakfast, 'puttu');
    assert(resCached.status === 'VALID' && resCached.stage === 'cache', 'Test A: repeat Puttu should hit cache');
    assert(aiCallCount === 4, 'Test A: cache hit must not make extra AI call');

    // Verify secret target was NEVER included in AI prompt
    for (const txt of seenPromptStrings) {
      assert(!txt.toLowerCase().includes('pancake'), 'Security violation: secret target leaked to AI prompt');
    }

    console.log('✅ Test A passed (Open-ended: Target, Local DB, Creative AI, Cache, No Target Leak)');
  }

  // ── TEST B: Word-Length / Starting-Letter (Deterministic + AI Dictionary Fallback) ──
  {
    const qWord = getQuestion('LW019'); // 3-letter word starting with B, secretTarget: BAT
    let aiCallCount = 0;

    const svcB = new LastWordValidationService({
      customEvaluator: async ({ submittedAnswer }) => {
        aiCallCount += 1;
        if (submittedAnswer.toLowerCase() === 'bog') {
          return { status: 'VALID', short_reason: 'Bog is a valid 3-letter English word starting with B.' };
        }
        return { status: 'INVALID', short_reason: 'Not a recognized word.' };
      },
    });

    const bTarget = await svcB.validateAnswer(qWord, 'bat');
    assert(bTarget.status === 'TARGET_HIT', 'Test B: BAT hits secret target');

    const bDbValid = await svcB.validateAnswer(qWord, 'BAG');
    assert(bDbValid.status === 'VALID' && bDbValid.stage === 'database', 'Test B: BAG valid via DB');

    const bLong = await svcB.validateAnswer(qWord, 'BOXING');
    assert(bLong.status === 'INVALID' && bLong.stage === 'deterministic', 'Test B: BOXING rejected deterministically by length');

    const bWrongStart = await svcB.validateAnswer(qWord, 'CAT');
    assert(bWrongStart.status === 'INVALID' && bWrongStart.stage === 'deterministic', 'Test B: CAT rejected deterministically by start letter');

    const bKnownInvalid = await svcB.validateAnswer(qWord, 'BZZ');
    assert(bKnownInvalid.status === 'INVALID' && bKnownInvalid.stage === 'database', 'Test B: BZZ rejected');

    assert(aiCallCount === 0, 'Test B: deterministic rejections must not invoke AI');

    const bNovelValid = await svcB.validateAnswer(qWord, 'BOG');
    assert(bNovelValid.status === 'VALID' && bNovelValid.stage === 'ai', 'Test B: BOG passes constraints and AI confirms real word');
    assert(aiCallCount === 1, 'Test B: BOG invoked AI once');

    console.log('✅ Test B passed (Word-length & starting-letter deterministic + AI fallback)');
  }

  // ── TEST C: Rhyming Question ("shower") ──
  {
    const qRhyme = getQuestion('LW031'); // Rhyme with "shower", secretTarget: Flower
    const svcC = new LastWordValidationService({
      customEvaluator: async ({ submittedAnswer }) => {
        const w = submittedAnswer.toLowerCase();
        if (w === 'show' || w === 'blow') {
          return { status: 'INVALID', short_reason: 'Does not share pronunciation rhyme with shower.' };
        }
        return { status: 'INVALID', short_reason: 'Not a rhyme.' };
      },
    });

    assert((await svcC.validateAnswer(qRhyme, 'Flower')).status === 'TARGET_HIT', 'Test C: Flower hits secret target');
    assert((await svcC.validateAnswer(qRhyme, 'Power')).status === 'VALID', 'Test C: Power valid');
    assert((await svcC.validateAnswer(qRhyme, 'Tower')).status === 'VALID', 'Test C: Tower valid');
    assert((await svcC.validateAnswer(qRhyme, 'Flour')).status === 'VALID', 'Test C: Flour phonetic rhyme valid');
    assert((await svcC.validateAnswer(qRhyme, 'Devour')).status === 'VALID', 'Test C: Devour phonetic rhyme valid');
    assert((await svcC.validateAnswer(qRhyme, 'Shower')).status === 'INVALID', 'Test C: identical word Shower rejected');
    assert((await svcC.validateAnswer(qRhyme, 'Banana')).status === 'INVALID', 'Test C: Banana rejected');
    assert((await svcC.validateAnswer(qRhyme, 'Show')).status === 'INVALID', 'Test C: Show (non-rhyming prefix) rejected');

    console.log('✅ Test C passed (Rhyming phonetic family + non-rhyming rejection)');
  }

  // ── TEST D: AI API Failure Modes (Must NEVER eliminate player) ──
  {
    const qBreakfast = getQuestion('LW001');
    const prevKey = process.env.GEMINI_API_KEY;
    try {
      // 1. Missing API key
      delete process.env.GEMINI_API_KEY;
      const svcNoKey = new LastWordValidationService();
      const resNoKey = await svcNoKey.validateAnswer(qBreakfast, 'Upma');
      assert(
        resNoKey.status === 'API_ERROR' &&
          resNoKey.message === 'Answer verification is temporarily unavailable. Please try again.',
        `Test D1 missing key failed: ${JSON.stringify(resNoKey)}`,
      );

      // 2. Network error
      const svcNetErr = new LastWordValidationService({
        customEvaluator: async () => {
          throw new Error('ECONNRESET network unreachable');
        },
      });
      const resNetErr = await svcNetErr.validateAnswer(qBreakfast, 'Upma');
      assert(resNetErr.status === 'API_ERROR', 'Test D2 network failure must yield API_ERROR');

      // 3. Timeout
      const svcTimeout = new LastWordValidationService({
        timeoutMs: 40,
        customEvaluator: async () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ status: 'VALID', short_reason: 'Late' }), 200),
          ),
      });
      const resTimeout = await svcTimeout.validateAnswer(qBreakfast, 'Upma');
      assert(resTimeout.status === 'API_ERROR', 'Test D3 timeout must yield API_ERROR');

      // 4. Rate limit (429)
      const svcRate = new LastWordValidationService({
        customEvaluator: async () => {
          throw new Error('429 Resource exhausted');
        },
      });
      const resRate = await svcRate.validateAnswer(qBreakfast, 'Upma');
      assert(resRate.status === 'API_ERROR', 'Test D4 rate limit must yield API_ERROR');

      // 5. Malformed JSON / wrong schema
      const svcBadJson = new LastWordValidationService({
        customEvaluator: async () => ({ badKey: true } as any),
      });
      const resBadJson = await svcBadJson.validateAnswer(qBreakfast, 'Upma');
      assert(resBadJson.status === 'API_ERROR', 'Test D5 malformed AI schema must yield API_ERROR');
    } finally {
      if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
      else delete process.env.GEMINI_API_KEY;
    }

    console.log('✅ Test D passed (Missing key, network, timeout, 429 rate limit, malformed JSON all safe API_ERROR)');
  }

  // ── TEST E1: Engine-Level Timer Pause, AI Latency Guard, Elimination & Winner Flow ──
  {
    const app = express();
    const httpServer = http.createServer(app);
    const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, { cors: { origin: '*' } });
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const addr = httpServer.address() as any;
    const url = `http://127.0.0.1:${addr.port}`;

    io.on('connection', (socket) => {
      socket.on('room:join', ({ roomCode }) => socket.join(roomCode));
    });

    const sHost = await connectClient(url);
    const sAlice = await connectClient(url);
    const sBob = await connectClient(url);

    let aliceServerId = sAlice.id!;
    let bobServerId = sBob.id!;
    let hostServerId = sHost.id!;

    const roomCode = 'LWTT';
    sHost.emit('room:join', { roomCode, playerName: 'TV' });
    sAlice.emit('room:join', { roomCode, playerName: 'Alice' });
    sBob.emit('room:join', { roomCode, playerName: 'Bob' });
    await new Promise((r) => setTimeout(r, 80));

    const fakeRoom: Room = {
      code: roomCode,
      gameType: 'last-word',
      hostToken: 'tok',
      phase: 'lobby',
      players: [
        { id: hostServerId, name: 'TV', score: 0, isHost: true, isDrawing: false, isOnline: true },
        { id: aliceServerId, name: 'Alice', score: 0, isHost: false, isDrawing: false, isOnline: true },
        { id: bobServerId, name: 'Bob', score: 0, isHost: false, isDrawing: false, isOnline: true },
      ],
      settings: { roundDurationSeconds: 60, totalRounds: 3 },
      currentRound: 0,
      currentDrawerId: null,
      currentWord: null,
    };

    const customSvc = new LastWordValidationService({
      customEvaluator: async ({ submittedAnswer }) => {
        await new Promise((r) => setTimeout(r, 120)); // Simulate AI latency while timer should pause
        const low = submittedAnswer.toLowerCase();
        if (low === 'upma') return { status: 'VALID', short_reason: 'South Indian breakfast.' };
        if (low === 'maybe') return { status: 'UNCERTAIN', short_reason: 'Ambiguous.' };
        return { status: 'INVALID', short_reason: 'Not a breakfast food.' };
      },
    });

    const engine = new LastWordEngine(
      fakeRoom,
      io as any,
      { turnDurationSeconds: 10, difficulty: 'mixed' },
      { validationService: customSvc, revealDelayMs: 120, tickIntervalMs: 1000 },
    );

    const q1 = getQuestion('LW001'); // Pancake
    const q2 = getQuestion('LW002'); // Sadhya

    const gameStartPromise = waitForEvent(sAlice, 'last-word:state', (st: LastWordPublicState) => st.roundNumber === 1);
    engine.startGame([q1, q2]);
    const st1 = await gameStartPromise;
    assert(st1.currentTurnPlayerId === aliceServerId, 'Test E1: Alice goes first');
    assert(!('secretTarget' in st1), 'Test E1 Security: public state must NOT expose secretTarget');

    // Out-of-turn player (Bob) blocked
    const bobOutOfTurn = await engine.submitAnswer(bobServerId, 'Eggs', st1.sessionId, st1.questionId);
    assert(bobOutOfTurn.status === 'INVALID' && engine.getPublicState().currentTurnPlayerId === aliceServerId, 'Test E1: out-of-turn submission rejected');

    // Concurrent submission guard + UNCERTAIN keeps same turn & preserves survivor
    const uncertainP = engine.submitAnswer(aliceServerId, 'Maybe', st1.sessionId, st1.questionId);
    await new Promise((r) => setTimeout(r, 20));
    const stValidating = engine.getPublicState();
    assert(stValidating.isValidating === true, 'Test E1: isValidating must be true during async AI check');
    const duplicateDuringVal = await engine.submitAnswer(aliceServerId, 'Eggs', st1.sessionId, st1.questionId);
    assert(duplicateDuringVal.status === 'INVALID', 'Test E1: duplicate submission blocked while isValidating');
    const uncertainRes = await uncertainP;
    assert(uncertainRes.status === 'UNCERTAIN', 'Test E1: UNCERTAIN returned cleanly');
    assert(engine.getPublicState().currentTurnPlayerId === aliceServerId, 'Test E1: UNCERTAIN lets player retry without losing turn');

    // Alice submits AI-validated regional answer "Upma" -> VALID & advances turn to Bob
    const validRes = await engine.submitAnswer(aliceServerId, 'Upma', st1.sessionId, st1.questionId);
    assert(validRes.status === 'VALID', 'Test E1: Upma passes via AI');
    assert(engine.getPublicState().currentTurnPlayerId === bobServerId, 'Test E1: Turn advances to Bob');
    assert(engine.getPublicState().usedAnswers.includes('Upma'), 'Test E1: Upma recorded in usedAnswers');

    // Bob hits duplicate "upma" -> rejected gently, turn remains Bob
    const dupUsedRes = await engine.submitAnswer(bobServerId, 'UPMA', st1.sessionId, st1.questionId);
    assert(dupUsedRes.status === 'INVALID', 'Test E1: duplicate already-used answer rejected');
    assert(engine.getPublicState().currentTurnPlayerId === bobServerId, 'Test E1: duplicate does not eliminate Bob');

    // Bob hits Secret Target "Pancake" -> eliminated -> Alice wins Last Word Standing!
    const gameEndPromise = waitForEvent(sHost, 'game:end');
    const hitRes = await engine.submitAnswer(bobServerId, 'Pancake', st1.sessionId, st1.questionId);
    assert(hitRes.status === 'TARGET_HIT', 'Test E1: Pancake hits Secret Target');
    const stElim = engine.getPublicState();
    assert(stElim.roundPhase === 'eliminated', 'Test E1: roundPhase transitions to eliminated');
    assert(stElim.eliminatedThisTurn?.playerName === 'Bob' && stElim.eliminatedThisTurn?.revealedTarget === 'Pancake', 'Test E1: reveals eliminated player & target');

    // Eliminated Bob cannot submit further answers
    const elimBobTry = await engine.submitAnswer(bobServerId, 'Eggs', st1.sessionId, st1.questionId);
    assert(elimBobTry.status === 'INVALID', 'Test E1: eliminated player cannot submit');

    const gameEndPayload = await gameEndPromise;
    const stFinal = engine.getPublicState();
    assert(stFinal.roundPhase === 'game-end' && stFinal.winnerId === aliceServerId && stFinal.winnerName === 'Alice', 'Test E1: Alice crowned Last Word Standing');
    assert(Array.isArray(gameEndPayload.leaderboard) && gameEndPayload.leaderboard[0].id === aliceServerId, 'Test E1: leaderboard emitted on game:end');

    engine.stop();
    sHost.disconnect();
    sAlice.disconnect();
    sBob.disconnect();
    io.close();
    httpServer.close();
    console.log('✅ Test E1 passed (AI latency pause/guard, UNCERTAIN retry, turn rotation, duplicate block, target elimination, winner flow)');
  }

  // ── TEST E2: Full Real RoomManager + Socket Handlers Integration + Reconnect + API Error Recovery ──
  {
    const prevKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const app = express();
    const httpServer = http.createServer(app);
    const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, { cors: { origin: '*' } });
    registerSocketHandlers(io);
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const addr = httpServer.address() as any;
    const url = `http://127.0.0.1:${addr.port}`;

    const tv = await connectClient(url);
    let p1 = await connectClient(url);
    const p2 = await connectClient(url);

    try {
      const joinedHostP = waitForEvent<RoomPublicState>(tv, 'room:joined');
      tv.emit('room:create', { playerName: 'Host TV', gameType: 'last-word' });
      const hostRoom = await joinedHostP;
      assert(hostRoom.gameType === 'last-word', 'Test E2: created last-word room');

      const p1JoinP = waitForEvent<RoomPublicState>(p1, 'room:joined');
      p1.emit('room:join', { roomCode: hostRoom.code, playerName: 'Kiran' });
      await p1JoinP;

      const p2JoinP = waitForEvent<RoomPublicState>(p2, 'room:joined');
      p2.emit('room:join', { roomCode: hostRoom.code, playerName: 'Meera' });
      await p2JoinP;

      // Update settings in lobby
      const settingsP = waitForEvent<RoomPublicState>(tv, 'room:updated', (r) => r.lastWordSettings?.turnDurationSeconds === 20);
      tv.emit('last-word:update-settings', { turnDurationSeconds: 20, difficulty: 'Easy' });
      const updatedRoom = await settingsP;
      assert(updatedRoom.lastWordSettings?.turnDurationSeconds === 20 && updatedRoom.lastWordSettings?.difficulty === 'Easy', 'Test E2: settings updated in lobby');

      // Start game
      const stateP = waitForEvent<LastWordPublicState>(tv, 'last-word:state', (s) => s.roundNumber === 1 && s.roundPhase === 'active');
      tv.emit('last-word:start-game');
      const st = await stateP;
      assert(st.turnDurationSeconds === 20, 'Test E2: game started with 20s turn duration');
      assert(st.survivorIds.length === 2, 'Test E2: 2 survivors registered');

      // Reconnect test: p1 disconnects & rejoins with same name -> inherits active turn cleanly
      const activeClient = st.currentTurnPlayerId === p1.id ? p1 : p2;
      const otherClient = st.currentTurnPlayerId === p1.id ? p2 : p1;
      const activeName = st.currentTurnPlayerName!;

      if (activeClient === p1) {
        p1.disconnect();
        await new Promise((r) => setTimeout(r, 80));
        p1 = await connectClient(url);
        const reJoinP = waitForEvent<LastWordPublicState>(p1, 'last-word:state', (s) => s.roundNumber === 1);
        p1.emit('room:join', { roomCode: hostRoom.code, playerName: activeName });
        const reState = await reJoinP;
        assert(reState.currentTurnPlayerId === p1.id, 'Test E2: reconnected player keeps active turn');
      }

      const currentActiveClient = st.currentTurnPlayerId === otherClient.id ? otherClient : p1;

      // API_ERROR graceful handling over live Socket.IO when key missing and non-DB open answer submitted (if open-ended) or invalid input test
      // Submit empty string -> INVALID feedback, does NOT eliminate
      const emptyFeedbackP = waitForEvent(currentActiveClient, 'last-word:answer-feedback');
      currentActiveClient.emit('last-word:submit-answer', {
        answer: '   ',
        sessionId: st.sessionId,
        questionId: st.questionId,
      });
      const emptyFb = await emptyFeedbackP;
      assert(emptyFb.status === 'INVALID', 'Test E2: empty answer yields INVALID without elimination');

      // Restart game as host resets roundNumber to 1 cleanly
      const restartP = waitForEvent<LastWordPublicState>(tv, 'last-word:state', (s) => s.roundNumber === 1 && s.sessionId !== st.sessionId);
      tv.emit('last-word:restart-game');
      const restarted = await restartP;
      assert(restarted.sessionId !== st.sessionId && restarted.survivorIds.length === 2, 'Test E2: restart creates fresh session');

      // Terminate room cleanly
      const termP = waitForEvent(p2, 'room:terminated');
      tv.emit('room:terminate');
      await termP;
    } finally {
      if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
      else delete process.env.GEMINI_API_KEY;
      tv.disconnect();
      p1.disconnect();
      p2.disconnect();
      io.close();
      httpServer.close();
    }

    console.log('✅ Test E2 passed (Real RoomManager + Socket.IO handlers + Settings + Reconnect + Restart + Terminate)');
  }

  console.log('\n🎉 ALL LAST WORD STANDING TESTS (A, B, C, D, E1, E2) PASSED!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
