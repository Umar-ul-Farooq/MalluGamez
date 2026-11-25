import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, DrawIdentifyPublicState, DrawIdentifyObjectItem, RoomPublicState } from '@chitram/shared';
import { registerSocketHandlers } from './socket/index.js';

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
    // 1. Create draw-identify room on TV, join 2 mobile players
    const tvJoined = waitForEvent<RoomPublicState>(tv, 'room:joined');
    tv.emit('room:create', { playerName: 'Host', gameType: 'draw-identify' });
    const room = await tvJoined;

    const p1J = waitForEvent<RoomPublicState>(p1, 'room:joined');
    p1.emit('room:join', { roomCode: room.code, playerName: 'Alice' });
    await p1J;

    const p2J = waitForEvent<RoomPublicState>(p2, 'room:joined');
    p2.emit('room:join', { roomCode: room.code, playerName: 'Bob' });
    await p2J;

    // 2. Start game, capture role state & secret lists for both phones
    const tvStateP = waitForEvent<DrawIdentifyPublicState>(tv, 'draw-identify:state', s => s.roundPhase === 'drawing');
    const p1StateP = waitForEvent<DrawIdentifyPublicState>(p1, 'draw-identify:state', s => s.roundPhase === 'drawing');
    const p2StateP = waitForEvent<DrawIdentifyPublicState>(p2, 'draw-identify:state', s => s.roundPhase === 'drawing');
    const p1SecretP = waitForEvent<{ roundId: string; objectList: DrawIdentifyObjectItem[] }>(p1, 'draw-identify:secret-list');
    const p2SecretP = waitForEvent<{ roundId: string; objectList: DrawIdentifyObjectItem[] }>(p2, 'draw-identify:secret-list');

    tv.emit('draw-identify:update-settings', { objectCount: 6, drawingDurationSeconds: 10 });
    await waitForEvent(tv, 'draw-identify:state');
    tv.emit('draw-identify:start-game');

    const [tvState, p1State, p2State, p1Secret, p2Secret] = await Promise.all([
      tvStateP, p1StateP, p2StateP, p1SecretP, p2SecretP,
    ]);

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

    // 4. Opposing player ticks object #0 -> TV & opposing player receive tick update
    const tickedTV = waitForEvent<DrawIdentifyPublicState>(tv, 'draw-identify:state', s => s.identifiedCount === 1);
    const tickedEvent = waitForEvent(oppSock, 'draw-identify:object-ticked');
    oppSock.emit('draw-identify:tick-object', { roundId: tvState.roundId, objectIndex: 0 });
    const [afterTickTV] = await Promise.all([tickedTV, tickedEvent]);
    assert(afterTickTV.objectList[0].isIdentified === true, 'TV grid cell 0 must be marked identified');
    console.log('✓ Opposing player ticked object #0; TV and clients synced');

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
