import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type { ClientToServerEvents, ServerToClientEvents } from '@chitram/shared';
import { registerSocketHandlers } from './socket/index';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Health check — useful for checking the server is alive
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', name: 'Chitram Game Server' });
});

// Register all socket event handlers
registerSocketHandlers(io);

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🎨 Chitram server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});
