import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, DrawIdentifyPublicState, DrawIdentifyObjectItem, RoomPublicState } from '@chitram/shared';
import { registerSocketHandlers } from './socket/index.js';
import { DRAW_IDENTIFY_WORDS } from './game/DrawIdentifyBank.js';

type TestClient = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function waitForEvent<T = any>(socket: TestClient, event: string, predicate?: (data: T) => boolean, timeoutMs = 4000): Promise<T> {
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

async function runTests() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, { cors: { origin: '*' } });
  registerSocketHandlers(io);

  await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve));
  const addr = httpServer.address() as any;
  const url = `http://127.0.0.1:${addr.port}`;

  console.log('================================================================');
  console.log('   DRAW & IDENTIFY MULTI-CLIENT SOCKET.IO TEST (TV + 2 MOBILES) ');
  console.log('================================================================\n');

  const tv = await connectClient(url);
  let p1 = await connectClient(url);
  let p2 = await connectClient(url);

  try {
    // 0. Verify expanded bank has 350+ unique objects
    assert(DRAW_IDENTIFY_WORDS.length >= 370, `Expected 370+ objects, got ${DRAW_IDENTIFY_WORDS.length}`);
    const uniqueEng = new Set(DRAW_IDENTIFY_WORDS.map(w => w.english.toLowerCase().trim()));
    assert(uniqueEng.size === DRAW_IDENTIFY_WORDS.length, 'Bank must have no duplicate English names');
    console.log(`✓ Verified expanded Draw & Identify bank (${DRAW_IDENTIFY_WORDS.length} unique objects)`);

    // 1. Create draw-identify room on TV, join 2 mobile players
    const tvJoined = waitForEvent<RoomPublicState>(tv, 'room:joined');
    tv.emit('room:create', { playerName: 'Host', gameType: 'draw-identify' });
    const room = await tvJoined;
    assert(room.drawIdentifySettings?.identificationDurationSeconds === 60, 'Default identify timer must be 60s');

    const p1J = waitForEvent<RoomPublicState>(p1, 'room:joined');
    p1.emit('room:join', { roomCode: room.code, playerName: 'Alice' });
    await p1J;

    const p2J = waitForEvent<RoomPublicState>(p2, 'room:joined');
    p2.emit('room:join', { roomCode: room.code, playerName: 'Bob' });
    await p2J;

    // 2. Configure both drawing timer (10s) and identification timer (90s = 60 + 15 + 15), verify sync & lock on start
    const tvCfgP = waitForEvent<DrawIdentifyPublicState>(tv, 'draw-identify:state', s => s.identificationDurationSeconds === 90);
    const p1CfgP = waitForEvent<DrawIdentifyPublicState>(p1, 'draw-identify:state', s => s.identificationDurationSeconds === 90);
    const p2CfgP = waitForEvent<DrawIdentifyPublicState>(p2, 'draw-identify:state', s => s.identificationDurationSeconds === 90);
    tv.emit('draw-identify:update-settings', { objectCount: 6, drawingDurationSeconds: 10, identificationDurationSeconds: 90 });
    await Promise.all([tvCfgP, p1CfgP, p2CfgP]);
    console.log('✓ Configurable identification timer (90s) synced across TV & mobile');

    const tvStateP = waitForEvent<DrawIdentifyPublicState>(tv, 'draw-identify:state', s => s.roundPhase === 'drawing' && Boolean(s.currentDrawerId));
    const p1StateP = waitForEvent<DrawIdentifyPublicState>(p1, 'draw-identify:state', s => s.roundPhase === 'drawing' && Boolean(s.currentDrawerId));
    const p2StateP = waitForEvent<DrawIdentifyPublicState>(p2, 'draw-identify:state', s => s.roundPhase === 'drawing' && Boolean(s.currentDrawerId));
    const p1SecretP = waitForEvent<{ roundId: string; objectList: DrawIdentifyObjectItem[] }>(p1, 'draw-identify:secret-list');
    const p2SecretP = waitForEvent<{ roundId: string; objectList: DrawIdentifyObjectItem[] }>(p2, 'draw-identify:secret-list');

    tv.emit('draw-identify:start-game');

    const [tvState, p1State, p2State, p1Secret, p2Secret] = await Promise.all([
      tvStateP, p1StateP, p2StateP, p1SecretP, p2SecretP,
    ]);

    // Attempt to mutate identificationDurationSeconds after game starts -> must stay 90s
    tv.emit('draw-identify:update-settings', { identificationDurationSeconds: 30 });
    assert(tvState.identificationDurationSeconds === 90, 'Identification timer must be 90s');

    assert(tvState.currentDrawerId === p1State.currentDrawerId, 'TV and mobile must agree on drawer');
    assert(p1State.currentDrawerId === p2State.currentDrawerId, 'Both mobiles must agree on drawer');

    const drawerIsP1 = tvState.currentDrawerId === p1.id;
    const drawerSock = drawerIsP1 ? p1 : p2;
    const oppSock = drawerIsP1 ? p2 : p1;
    const drawerSecret = drawerIsP1 ? p1Secret : p2Secret;
    const oppSecret = drawerIsP1 ? p2Secret : p1Secret;

    assert(drawerSecret.objectList.length === 0, 'Drawer must NOT receive secret object names');
    assert(oppSecret.objectList.length === 6, 'Opposing player must receive all 6 object names');
    console.log('✓ Round 1 started: TV, Drawer, and Opposing Player received authoritative roles');

    // 3. Drawer submits all 6 drawings -> transitions to identification phase
    const idPhaseTV = waitForEvent<DrawIdentifyPublicState>(tv, 'draw-identify:state', s => s.roundPhase === 'identification');
    for (let i = 0; i < 6; i++) {
      drawerSock.emit('draw-identify:submit-drawing', {
        roundId: tvState.roundId,
        drawingIndex: i,
        dataUrl: `data:image/png;base64,img_${i}`,
      });
    }
    const tvIdState = await idPhaseTV;
    assert(tvIdState.submittedCount === 6 && tvIdState.drawings.every(d => d !== null), 'All 6 drawings must appear on TV grid');
    console.log('✓ Drawer submitted 6 drawings sequentially and transitioned to identification');

    // 4. Opposing player marks object #0 Incorrect twice (does not disable Correct or award points), then ticks object #0 Correct!
    const incEvent1 = waitForEvent(oppSock, 'draw-identify:object-incorrect', (d: any) => d.objectIndex === 0 && d.incorrectCount === 1);
    oppSock.emit('draw-identify:mark-incorrect', { roundId: tvState.roundId, objectIndex: 0 });
    await incEvent1;

    const incEvent2 = waitForEvent(oppSock, 'draw-identify:object-incorrect', (d: any) => d.objectIndex === 0 && d.incorrectCount === 2);
    const oppSecretAfterInc = waitForEvent<{ roundId: string; objectList: DrawIdentifyObjectItem[] }>(
      oppSock,
      'draw-identify:secret-list',
      d => d.objectList[0]?.incorrectCount === 2
    );
    oppSock.emit('draw-identify:mark-incorrect', { roundId: tvState.roundId, objectIndex: 0 });
    const [, secAfterInc] = await Promise.all([incEvent2, oppSecretAfterInc]);
    assert(secAfterInc.objectList[0].isIdentified === false, 'Incorrect must NOT finalize or disable Correct');
    console.log('✓ Incorrect marked twice without disabling Correct or awarding points');

    const tickedTV = waitForEvent<DrawIdentifyPublicState>(tv, 'draw-identify:state', s => s.identifiedCount === 1);
    const tickedEvent = waitForEvent(oppSock, 'draw-identify:object-ticked');
    oppSock.emit('draw-identify:tick-object', { roundId: tvState.roundId, objectIndex: 0 });
    const [afterTickTV] = await Promise.all([tickedTV, tickedEvent]);
    assert(afterTickTV.objectList[0].isIdentified === true, 'TV grid cell 0 must be marked identified after prior Incorrect');
    assert(afterTickTV.roundScore === 1, 'Drawer score must be 1');
    console.log('✓ Object #0 marked Correct after Incorrect; TV and clients synced');

    // 5. Refresh opposing player mobile -> reconnects & restores secret list & tick state
    const oppName = drawerIsP1 ? 'Bob' : 'Alice';
    oppSock.disconnect();
    const oppReconnected = await connectClient(url);
    const oppRejoinState = waitForEvent<DrawIdentifyPublicState>(oppReconnected, 'draw-identify:state');
    const oppRejoinSecret = waitForEvent<{ roundId: string; objectList: DrawIdentifyObjectItem[] }>(oppReconnected, 'draw-identify:secret-list');
    oppReconnected.emit('room:join', { roomCode: room.code, playerName: oppName });
    const [rState, rSecret] = await Promise.all([oppRejoinState, oppRejoinSecret]);
    assert(rState.identifiedCount === 1, 'Reconnected opposing player sees identifiedCount = 1');
    assert(rSecret.objectList.length === 6 && rSecret.objectList[0].isIdentified === true, 'Reconnected opposing player restores ticked secret list');
    console.log('✓ Mobile browser refresh restored exact round state and secret list');

    oppReconnected.disconnect();
    console.log('\nRESULT: ALL MULTI-CLIENT DRAW & IDENTIFY TESTS PASSED');
  } finally {
    tv.disconnect();
    p1.disconnect();
    p2.disconnect();
    io.close();
    httpServer.close();
  }
}

runTests().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
