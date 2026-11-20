import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';
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

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  const ip = getLocalIP();
  console.log(`\n🎨 Chitram server running`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${ip}:${PORT}`);
  console.log(`   Players should connect to: http://${ip}:3000\n`);
});
