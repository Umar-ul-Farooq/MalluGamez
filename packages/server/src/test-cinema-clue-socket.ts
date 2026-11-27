import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  CinemaCluePublicState,
  RoomPublicState,
  Room,
} from '@chitram/shared';
import { registerSocketHandlers } from './socket/index.js';
import { CINEMA_CLUE_MOVIES, validateCinemaClueAnswer, type CinemaClueMovieItem } from './game/CinemaClueBank.js';
import { CinemaClueEngine } from './game/CinemaClueEngine.js';

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

function createFakeRoom(code: string, players: Array<{ id: string; name: string; isHost?: boolean; team?: 'A' | 'B' }>): Room {
  return {
    code,
    gameType: 'cinema-clue',
    hostToken: 'tok',
    phase: 'lobby',
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      score: 0,
      isHost: Boolean(p.isHost),
      isDrawing: false,
      team: p.team ?? null,
      isOnline: true,
    })),
    settings: { roundDurationSeconds: 60, totalRounds: 3 },
    currentRound: 0,
    currentDrawerId: null,
    currentWord: null,
  };
}

const MOVIES_FIXTURE: CinemaClueMovieItem[] = [
  CINEMA_CLUE_MOVIES[0], // Drishyam / ദൃശ്യം
  CINEMA_CLUE_MOVIES[1], // Manichithrathazhu / മണിച്ചിത്രത്താഴ്
  CINEMA_CLUE_MOVIES[2], // Premam / പ്രേമം
  CINEMA_CLUE_MOVIES[3], // Kilukkam / കിലുക്കം
];

async function runTests() {
  console.log('================================================================');
  console.log('   CINEMA CLUE BATTLE — ALL 3 MODES & MULTI-CLIENT SOCKET TESTS ');
  console.log('================================================================\n');

  // ── 0. Bank & Malayalam/English Matching Check ──
  assert(CINEMA_CLUE_MOVIES.length >= 30, `Expected >= 30 movies, got ${CINEMA_CLUE_MOVIES.length}`);
  for (const m of CINEMA_CLUE_MOVIES) {
    assert(m.clues.length === 4, `Movie ${m.id} must have 4 clues`);
    assert(validateCinemaClueAnswer(m.title, m), `Malayalam title failed for ${m.id}`);
    assert(validateCinemaClueAnswer(m.manglish, m), `English title failed for ${m.id}`);
  }
  console.log('✅ Bank check passed (Malayalam Unicode & English title recognition + 4 clues each)');

  // Setup local Socket.IO server for engine-level fast-tick tests
  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, { cors: { origin: '*' } });
  io.on('connection', (socket) => {
    socket.on('room:join', ({ roomCode }) => socket.join(roomCode));
  });
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const port = (httpServer.address() as any).port;
  const url = `http://127.0.0.1:${port}`;

  // ── 1. MODE 1: BUZZ IN MODE TESTS (Multi-player teams + Single-player edge + 20s steal + timers) ──
  {
    const tv = await connectClient(url);
    const a1 = await connectClient(url);
    const a2 = await connectClient(url);
    const b1 = await connectClient(url); // Team B has 1 player (tests 2 vs 1 asymmetric single-player team)

    const code = 'CCB1';
    tv.emit('room:join', { roomCode: code, playerName: 'TV' });
    a1.emit('room:join', { roomCode: code, playerName: 'A1' });
    a2.emit('room:join', { roomCode: code, playerName: 'A2' });
    b1.emit('room:join', { roomCode: code, playerName: 'B1' });
    await new Promise((r) => setTimeout(r, 80));

    const room = createFakeRoom(code, [
      { id: tv.id!, name: 'TV', isHost: true },
      { id: a1.id!, name: 'A1', team: 'A' },
      { id: a2.id!, name: 'A2', team: 'A' },
      { id: b1.id!, name: 'B1', team: 'B' },
    ]);

    // Use 15ms ticks so 20s steal window expires cleanly in ~300ms while verifying exact initial tick = 20!
    const engine = new CinemaClueEngine(
      room,
      io as any,
      {
        mode: 'buzz-in',
        clueDurationSeconds: 10,
        totalQuestions: 2,
        difficulty: 'mixed',
        teamAName: 'Team A',
        teamBName: 'Team B',
      },
      { revealDelayMs: 60, tickIntervalMs: 25, buzzResponseSeconds: 20 },
    );

    const ticks: number[] = [];
    tv.on('timer:tick', ({ remaining }) => ticks.push(remaining));

    engine.startGame([MOVIES_FIXTURE[0], MOVIES_FIXTURE[1]]);
    let st = engine.getPublicState();
    assert(st.questionNumber === 1 && st.currentClueIndex === 0 && st.clues.length === 1, 'BuzzIn: Q1 Clue 1 loaded');
    assert(st.activeTeam === null && st.potentialPoints === 10, 'BuzzIn: Open buzz-in at Clue 1 worth 10 pts');

    // Teammate sharing + Duplicate prevention without consuming guess:
    // First Team A guesses "Premam" (wrong) -> Team B gets fixed 20-second response window!
    const stealTickP = waitForEvent(tv, 'timer:tick', ({ remaining }) => remaining === 20);
    const resA1 = engine.submitGuess(a1.id!, 'Premam', st.sessionId, st.questionId, 0);
    assert(!resA1.isCorrect, 'BuzzIn: A1 wrong guess');
    st = engine.getPublicState();
    assert(st.buzzResponseWindowActive === true && st.activeTeam === 'B', 'BuzzIn: Opposing Team B granted 20s window');
    assert(engine.getRemainingSeconds() === 20, `BuzzIn: 20s window MUST be 20 (independent of 10s clue timer), got ${engine.getRemainingSeconds()}`);
    await stealTickP;
    assert(st.teamAGuessedThisClue === true && st.guessedMovies.length === 1, 'BuzzIn: Guess recorded in Previously Guessed panel');

    // A2 cannot submit again on Clue 1 (both opposing window AND team already guessed)
    const resA2 = engine.submitGuess(a2.id!, 'Drishyam', st.sessionId, st.questionId, 0);
    assert(!resA2.isCorrect && engine.getPublicState().roundPhase === 'question', 'BuzzIn: Team A teammate blocked on same clue');

    // B1 submits duplicate "premam" / "പ്രേമം" -> MUST NOT consume Team B's guess or end 20s window!
    const dupB1 = engine.submitGuess(b1.id!, 'പ്രേമം', st.sessionId, st.questionId, 0);
    assert(dupB1.isDuplicate === true, 'BuzzIn: Malayalam/English duplicate detected');
    assert(engine.getPublicState().teamBGuessedThisClue === false && engine.getPublicState().activeTeam === 'B', 'BuzzIn: Duplicate did NOT consume Team B guess');

    // B1 now submits a non-duplicate wrong guess "Lucifer" -> both teams missed -> Clue 2 of SAME movie appears!
    const resB1Wrong = engine.submitGuess(b1.id!, 'Lucifer', st.sessionId, st.questionId, 0);
    assert(!resB1Wrong.isCorrect, 'BuzzIn: B1 wrong guess');
    st = engine.getPublicState();
    assert(st.questionNumber === 1 && st.currentClueIndex === 1 && st.clues.length === 2, 'BuzzIn: Revealed Clue 2 of SAME movie');
    assert(st.potentialPoints === 7 && st.activeTeam === null && !st.teamAGuessedThisClue && !st.teamBGuessedThisClue, 'BuzzIn: Clue 2 resets both teams buzz-in');
    assert(st.guessedMovies.length === 2, 'BuzzIn: Previously guessed movies preserved across clues of same movie');

    // On Clue 2: B1 misses, granting Team A 20s window -> let 20s window expire without answering -> reveals Clue 3 of SAME movie!
    engine.submitGuess(b1.id!, 'Kilukkam', st.sessionId, st.questionId, 1);
    assert(engine.getPublicState().buzzResponseWindowActive === true && engine.getPublicState().activeTeam === 'A', 'BuzzIn: Team A gets 20s window');
    await waitForEvent(tv, 'cinema-clue:state', (s: CinemaCluePublicState) => s.currentClueIndex === 2, 3000);
    st = engine.getPublicState();
    assert(st.questionNumber === 1 && st.currentClueIndex === 2 && st.potentialPoints === 5, 'BuzzIn: 20s expiry revealed Clue 3 of SAME movie');

    // Wait for Clue 3 normal timer expiry with NO answers -> reveals Clue 4 of SAME movie!
    await waitForEvent(tv, 'cinema-clue:state', (s: CinemaCluePublicState) => s.currentClueIndex === 3, 3000);
    st = engine.getPublicState();
    assert(st.questionNumber === 1 && st.currentClueIndex === 3 && st.potentialPoints === 3, 'BuzzIn: Normal clue timeout revealed Clue 4 of SAME movie');

    // On Clue 4: Team A answers in Malayalam Unicode ("ദൃശ്യം") and Team B tries simultaneously right after -> ONLY Team A gets 3 pts!
    const winA = engine.submitGuess(a2.id!, 'ദൃശ്യം', st.sessionId, st.questionId, 3);
    const lateB = engine.submitGuess(b1.id!, 'Drishyam', st.sessionId, st.questionId, 3);
    assert(winA.isCorrect === true && winA.points === 3, 'BuzzIn: Clue 4 awards 3 pts for Malayalam title');
    assert(lateB.isCorrect === false, 'BuzzIn: Simultaneous/second team cannot also win same question');
    st = engine.getPublicState();
    assert(st.roundPhase === 'reveal' && st.teamAScore === 3 && st.teamBScore === 0, 'BuzzIn: Only winning team scored');
    // Team score shared by all Team A members
    assert(room.players.filter((p) => p.team === 'A').every((p) => p.score === 3), 'BuzzIn: Team score shared across members');

    // Next question loads automatically and CLEARS previously guessed movies!
    await waitForEvent(tv, 'cinema-clue:state', (s: CinemaCluePublicState) => s.questionNumber === 2 && s.roundPhase === 'question', 3000);
    st = engine.getPublicState();
    assert(st.guessedMovies.length === 0, 'BuzzIn: Guessed movies panel cleared on next question');

    // Q2: Exhaust all 4 clues with wrong answers -> reveals Q2 movie answer -> ends game!
    for (let c = 0; c < 4; c++) {
      st = engine.getPublicState();
      assert(st.currentClueIndex === c, `Expected Clue ${c + 1}`);
      engine.submitGuess(a1.id!, `WrongA${c}`, st.sessionId, st.questionId, c);
      engine.submitGuess(b1.id!, `WrongB${c}`, st.sessionId, st.questionId, c);
    }
    st = engine.getPublicState();
    assert(st.roundPhase === 'reveal' && st.revealInfo?.winnerTeam === null && st.revealInfo?.manglish === 'Manichithrathazhu', 'BuzzIn: After Clue 4 missed, reveals movie answer');

    await waitForEvent(tv, 'game:end', undefined, 3000);
    assert(engine.getPublicState().roundPhase === 'game-end', 'BuzzIn: Game ended cleanly');

    engine.stop();
    tv.disconnect();
    a1.disconnect();
    a2.disconnect();
    b1.disconnect();
    console.log('✅ Buzz In Mode tests passed (race order, 20s fixed steal, clue progression, 10/7/5/3 pts, Clue 4 reveal, shared score, duplicates)');
  }

  // ── 2. MODE 2: ALTERNATE TEAMS – QUESTION BASED ──
  {
    const tv = await connectClient(url);
    const a1 = await connectClient(url);
    const b1 = await connectClient(url);

    const code = 'CCB2';
    tv.emit('room:join', { roomCode: code, playerName: 'TV' });
    a1.emit('room:join', { roomCode: code, playerName: 'A1' });
    b1.emit('room:join', { roomCode: code, playerName: 'B1' });
    await new Promise((r) => setTimeout(r, 80));

    const room = createFakeRoom(code, [
      { id: tv.id!, name: 'TV', isHost: true },
      { id: a1.id!, name: 'A1', team: 'A' },
      { id: b1.id!, name: 'B1', team: 'B' },
    ]);

    const engine = new CinemaClueEngine(
      room,
      io as any,
      {
        mode: 'alternate-question',
        clueDurationSeconds: 25,
        totalQuestions: 2,
        difficulty: 'mixed',
        teamAName: 'Team A',
        teamBName: 'Team B',
      },
      { revealDelayMs: 50, tickIntervalMs: 120 },
    );

    engine.startGame([MOVIES_FIXTURE[0], MOVIES_FIXTURE[1]]);

    // Question 1: Team A starts ALL clues; B cannot butt in before A
    for (let c = 0; c < 3; c++) {
      let st = engine.getPublicState();
      assert(st.questionNumber === 1 && st.currentClueIndex === c && st.activeTeam === 'A', `Alt-Q Q1 Clue ${c + 1} must start Team A`);

      // B blocked out of turn
      const bEarly = engine.submitGuess(b1.id!, 'Premam', st.sessionId, st.questionId, c);
      assert(!bEarly.isCorrect && engine.getPublicState().activeTeam === 'A', 'Alt-Q: Out-of-turn B blocked');

      // Wait 2 ticks so remaining drops below 25
      await new Promise((r) => setTimeout(r, 270));
      const remainingBeforeSwitch = engine.getRemainingSeconds();
      assert(remainingBeforeSwitch < 25, `Alt-Q: Timer ticked down to ${remainingBeforeSwitch}`);

      // Team A guesses wrong -> switches to Team B WITHOUT restarting timer!
      engine.submitGuess(a1.id!, `MissA${c}`, st.sessionId, st.questionId, c);
      st = engine.getPublicState();
      assert(st.activeTeam === 'B', `Alt-Q: Switched to Team B on Clue ${c + 1}`);
      assert(engine.getRemainingSeconds() <= remainingBeforeSwitch, 'Alt-Q: Clue timer MUST NOT restart on turn change');

      // On Clue 3, Team B answers Clue 3 correctly (5 pts) -> advances to Q2!
      if (c === 2) {
        const winB = engine.submitGuess(b1.id!, 'Drishyam', st.sessionId, st.questionId, 2);
        assert(winB.isCorrect && winB.points === 5, 'Alt-Q: Clue 3 awards 5 pts to Team B');
        break;
      } else {
        // Team B guesses wrong -> Clue 2/3 immediately
        engine.submitGuess(b1.id!, `MissB${c}`, st.sessionId, st.questionId, c);
      }
    }

    await waitForEvent(tv, 'cinema-clue:state', (s: CinemaCluePublicState) => s.questionNumber === 2 && s.roundPhase === 'question', 3000);

    // Question 2: Team B MUST start Clue 1 AND Clue 2!
    let st2 = engine.getPublicState();
    assert(st2.activeTeam === 'B', 'Alt-Q: Question 2 Clue 1 MUST start Team B');
    engine.submitGuess(b1.id!, 'WrongB_Q2C1', st2.sessionId, st2.questionId, 0);
    assert(engine.getPublicState().activeTeam === 'A', 'Alt-Q: Q2 Clue 1 switches B -> A');
    engine.submitGuess(a1.id!, 'WrongA_Q2C1', st2.sessionId, st2.questionId, 0);

    st2 = engine.getPublicState();
    assert(st2.currentClueIndex === 1 && st2.activeTeam === 'B', 'Alt-Q: Q2 Clue 2 MUST still start Team B');
    const winA = engine.submitGuess(a1.id!, 'WrongA2', st2.sessionId, st2.questionId, 1);
    assert(!winA.isCorrect, 'Alt-Q: Out-of-turn A blocked on Q2 Clue 2');

    // Let B answer Q2 Clue 2 correctly (7 pts)
    const winB2 = engine.submitGuess(b1.id!, 'Manichithrathazhu', st2.sessionId, st2.questionId, 1);
    assert(winB2.isCorrect && winB2.points === 7 && engine.getPublicState().teamBScore === 12, 'Alt-Q: Q2 Clue 2 awards 7 pts (5+7=12)');

    engine.stop();
    tv.disconnect();
    a1.disconnect();
    b1.disconnect();
    console.log('✅ Alternate Teams – Question Based tests passed (Q1=A, Q2=B across all clues, non-restarting timer, 7+5 pts)');
  }

  // ── 3. MODE 3: ALTERNATE TEAMS – CLUE BASED ──
  {
    const tv = await connectClient(url);
    const a1 = await connectClient(url);
    const b1 = await connectClient(url);

    const code = 'CCB3';
    tv.emit('room:join', { roomCode: code, playerName: 'TV' });
    a1.emit('room:join', { roomCode: code, playerName: 'A1' });
    b1.emit('room:join', { roomCode: code, playerName: 'B1' });
    await new Promise((r) => setTimeout(r, 80));

    const room = createFakeRoom(code, [
      { id: tv.id!, name: 'TV', isHost: true },
      { id: a1.id!, name: 'A1', team: 'A' },
      { id: b1.id!, name: 'B1', team: 'B' },
    ]);

    const engine = new CinemaClueEngine(
      room,
      io as any,
      {
        mode: 'alternate-clue',
        clueDurationSeconds: 20,
        totalQuestions: 2,
        difficulty: 'mixed',
        teamAName: 'Team A',
        teamBName: 'Team B',
      },
      { revealDelayMs: 50, tickIntervalMs: 120 },
    );

    engine.startGame([MOVIES_FIXTURE[0], MOVIES_FIXTURE[1]]);

    // Question 1 starting order must alternate per clue: Clue 1 = A, Clue 2 = B, Clue 3 = A, Clue 4 = B
    const expectedQ1Starts: Array<'A' | 'B'> = ['A', 'B', 'A', 'B'];
    for (let c = 0; c < 4; c++) {
      let st = engine.getPublicState();
      const first = expectedQ1Starts[c];
      const second = first === 'A' ? 'B' : 'A';
      const firstSock = first === 'A' ? a1 : b1;
      const secondSock = second === 'A' ? a1 : b1;

      assert(st.questionNumber === 1 && st.currentClueIndex === c && st.activeTeam === first, `Alt-Clue Q1 Clue ${c + 1} must start ${first}`);
      engine.submitGuess(firstSock.id!, `Q1Miss1_${c}`, st.sessionId, st.questionId, c);
      assert(engine.getPublicState().activeTeam === second, `Alt-Clue Q1 Clue ${c + 1} must move to ${second}`);
      // First team cannot guess twice on same clue
      const retryFirst = engine.submitGuess(firstSock.id!, 'Drishyam', st.sessionId, st.questionId, c);
      assert(!retryFirst.isCorrect && engine.getPublicState().activeTeam === second, 'Alt-Clue: team cannot submit twice on same clue');

      if (c === 3) {
        // B solves Clue 4 on Q1 -> 3 pts
        const winQ1 = engine.submitGuess(secondSock.id!, 'Drishyam', st.sessionId, st.questionId, 3);
        assert(winQ1.isCorrect && winQ1.points === 3, 'Alt-Clue: Clue 4 awards 3 pts');
      } else {
        engine.submitGuess(secondSock.id!, `Q1Miss2_${c}`, st.sessionId, st.questionId, c);
      }
    }

    await waitForEvent(tv, 'cinema-clue:state', (s: CinemaCluePublicState) => s.questionNumber === 2 && s.roundPhase === 'question', 3000);

    // Question 2 REVERSES starting order: Clue 1 = B, Clue 2 = A!
    let st2 = engine.getPublicState();
    assert(st2.activeTeam === 'B', 'Alt-Clue Q2 Clue 1 must start Team B');
    engine.submitGuess(b1.id!, 'WrongQ2B', st2.sessionId, st2.questionId, 0);
    assert(engine.getPublicState().activeTeam === 'A', 'Alt-Clue Q2 Clue 1 switches to Team A');
    engine.submitGuess(a1.id!, 'WrongQ2A', st2.sessionId, st2.questionId, 0);

    st2 = engine.getPublicState();
    assert(st2.currentClueIndex === 1 && st2.activeTeam === 'A', 'Alt-Clue Q2 Clue 2 must start Team A');
    // Solve at Clue 1 vs Clue 2: test Clue 1 (10 pts) next in real Socket.IO test!
    const winQ2 = engine.submitGuess(a1.id!, 'മണിച്ചിത്രത്താഴ്', st2.sessionId, st2.questionId, 1);
    assert(winQ2.isCorrect && winQ2.points === 7, 'Alt-Clue: Clue 2 awards 7 pts for Malayalam title');

    engine.stop();
    tv.disconnect();
    a1.disconnect();
    b1.disconnect();
    console.log('✅ Alternate Teams – Clue Based tests passed (Q1 A/B/A/B, Q2 B/A, single guess per clue)');
  }

  io.close();
  httpServer.close();

  // ── 4. FULL REAL ROOMMANAGER + SOCKET HANDLERS INTEGRATION TEST (ALL GENERAL RULES + CLUE 1 = 10 PTS) ──
  {
    const realApp = express();
    const realServer = http.createServer(realApp);
    const realIo = new Server<ClientToServerEvents, ServerToClientEvents>(realServer, { cors: { origin: '*' } });
    registerSocketHandlers(realIo);
    await new Promise<void>((resolve) => realServer.listen(0, '127.0.0.1', resolve));
    const rPort = (realServer.address() as any).port;
    const rUrl = `http://127.0.0.1:${rPort}`;

    const tv = await connectClient(rUrl);
    let pA = await connectClient(rUrl);
    const pB = await connectClient(rUrl);

    try {
      const createdP = waitForEvent<RoomPublicState>(tv, 'room:joined');
      tv.emit('room:create', { playerName: 'HostTV', gameType: 'cinema-clue' });
      const room = await createdP;
      assert(room.gameType === 'cinema-clue', 'Real socket: created cinema-clue room');
      assert(room.cinemaClueSettings?.clueDurationSeconds === 20, 'Real socket: default clue timer is 20s');
      assert(room.cinemaClueSettings?.mode === 'buzz-in', 'Real socket: default mode is buzz-in');

      // Join 1 player on A and 1 on B (Single-player teams!)
      const joinAP = waitForEvent(pA, 'room:joined');
      pA.emit('room:join', { roomCode: room.code, playerName: 'SoloA' });
      await joinAP;
      pA.emit('cinema-clue:select-team', { team: 'A' });

      const joinBP = waitForEvent(pB, 'room:joined');
      pB.emit('room:join', { roomCode: room.code, playerName: 'SoloB' });
      await joinBP;
      pB.emit('cinema-clue:select-team', { team: 'B' });

      // Host updates timer in 5s steps to 30s & picks alternate-clue
      const setP = waitForEvent<RoomPublicState>(
        tv,
        'room:updated',
        (r) => r.cinemaClueSettings?.clueDurationSeconds === 30 && r.cinemaClueSettings?.mode === 'alternate-clue',
      );
      tv.emit('cinema-clue:update-settings', { clueDurationSeconds: 30, mode: 'alternate-clue', totalQuestions: 5 });
      const updated = await setP;
      assert(updated.cinemaClueSettings?.clueDurationSeconds === 30, 'Real socket: 5s step timer updated');

      // Start game -> settings locked
      const stP = waitForEvent<CinemaCluePublicState>(tv, 'cinema-clue:state', (s) => s.questionNumber === 1);
      tv.emit('cinema-clue:start-game');
      const st1 = await stP;
      assert(st1.teamsLocked === true && st1.clueDurationSeconds === 30 && st1.potentialPoints === 10, 'Real socket: started Clue 1 worth 10 pts');

      // Reconnect test mid-game
      pA.disconnect();
      await new Promise((r) => setTimeout(r, 80));
      pA = await connectClient(rUrl);
      const reJoinP = waitForEvent<CinemaCluePublicState>(pA, 'cinema-clue:state', (s) => s.questionNumber === 1);
      pA.emit('room:join', { roomCode: room.code, playerName: 'SoloA' });
      const reSt = await reJoinP;
      assert(reSt.questionId === st1.questionId, 'Real socket: reconnected player synced to active question');

      // Verify game-start lock prevents changing mode/timer mid-game
      tv.emit('cinema-clue:update-settings', { clueDurationSeconds: 15, mode: 'buzz-in' });
      await new Promise((r) => setTimeout(r, 50));
      const roomNowP = waitForEvent(tv, 'room:terminated');
      tv.emit('room:terminate');
      await roomNowP;
    } finally {
      tv.disconnect();
      pA.disconnect();
      pB.disconnect();
      realIo.close();
      realServer.close();
    }
    console.log('✅ Real RoomManager + Socket.IO tests passed (single-player teams, 5s timer settings, lock, reconnect, terminate)');
  }

  // ── 5. Explicit Clue 1 = 10 pts check ──
  {
    const room = createFakeRoom('CC10', [
      { id: 'h', name: 'TV', isHost: true },
      { id: 'a', name: 'A', team: 'A' },
      { id: 'b', name: 'B', team: 'B' },
    ]);
    const dummyIo = { to: () => ({ emit: () => {} }) } as any;
    const engine = new CinemaClueEngine(room, dummyIo, {
      mode: 'buzz-in',
      clueDurationSeconds: 20,
      totalQuestions: 2,
      difficulty: 'mixed',
      teamAName: 'A',
      teamBName: 'B',
    });
    engine.startGame([MOVIES_FIXTURE[0], MOVIES_FIXTURE[1]]);
    const st = engine.getPublicState();
    const res10 = engine.submitGuess('a', 'Drishyam', st.sessionId, st.questionId, 0);
    assert(res10.isCorrect && res10.points === 10 && engine.getPublicState().teamAScore === 10, 'Clue 1 must award 10 pts');
    engine.stop();
    console.log('✅ Clue 1 = 10 pts scoring check passed');
  }

  console.log('\n🎉 ALL CINEMA CLUE BATTLE TESTS PASSED!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
