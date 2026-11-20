import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@chitram/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    host: true,          // ← listen on 0.0.0.0 so phones on the network can connect
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:3001',
      },
    },
  },
});
