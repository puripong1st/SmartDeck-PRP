import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import apiRouter from './api';
import { initDb } from './db';
import { initWebSocketServer, broadcastProfileChange } from './ws';
import { startAppDetection, stopAppDetection } from './app-detector';

const PORT = 5001;
const app = express();
const server = createServer(app);

app.use(cors({
  origin: '*', // Allow Web UI access
  credentials: true
}));

app.use(express.json());

// API routes
app.use('/api', apiRouter);

async function main() {
  try {
    console.log('[Bridge] Initializing Local Data Store (SQLite)...');
    await initDb();
    console.log('[Bridge] Local Data Store initialized.');

    console.log('[Bridge] Initializing WebSocket Server...');
    initWebSocketServer(server);
    console.log('[Bridge] WebSocket Server ready.');

    console.log('[Bridge] Starting App Detection rules daemon...');
    startAppDetection((profileId) => {
      // Triggered when active process changes match a rule
      broadcastProfileChange(profileId);
    });

    server.listen(PORT, '127.0.0.1', () => {
      console.log(`=========================================`);
      console.log(` SmartDeck Pro Local Bridge Running      `);
      console.log(` Port: ${PORT}                            `);
      console.log(` Address: http://127.0.0.1:${PORT}        `);
      console.log(`=========================================`);
    });
  } catch (err) {
    console.error('[Bridge] Failed to start:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Bridge] Shutting down...');
  stopAppDetection();
  server.close(() => {
    console.log('[Bridge] Offline.');
    process.exit(0);
  });
});

main();
