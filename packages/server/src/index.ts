import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';
import path from 'path';
import fs from 'fs';
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

// Serve built frontend assets in production if available
const clientDistCandidates = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(process.cwd(), 'packages/client/dist'),
];
const clientDistPath = clientDistCandidates.find(p => fs.existsSync(p));

if (clientDistPath) {
  app.use(express.static(clientDistPath));
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', name: 'Chitram Game Server' });
});

// Returns the machine's local network IP so the TV screen can build
// a correct QR code URL that phones on the same Wi-Fi can reach.
app.get('/api/host-ip', (_req, res) => {
  const ip = getLocalIP();
  res.json({ ip });
});

function getLocalIP(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      // Skip internal (127.x) and non-IPv4
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Register all socket event handlers
registerSocketHandlers(io);

// In production, fallback any unmatched route to client index.html (SPA routing)
if (clientDistPath) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  const ip = getLocalIP();
  console.log(`\n🎨 Chitram server running`);
  console.log(`   Port:    ${PORT}`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${ip}:${PORT}`);
  if (clientDistPath) {
    console.log(`   Serving client build from: ${clientDistPath}\n`);
  } else {
    console.log(`   Players in dev should connect to: http://${ip}:3000\n`);
  }
});
