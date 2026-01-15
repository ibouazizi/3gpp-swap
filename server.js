import express from 'express';
import http from 'http';
import https from 'https';
import fs from 'fs';

import { SwapServer } from './swap-protocol/src/index.node.js';

const app = express();

// TLS configuration via environment variables
// USE_TLS=true|1 to enable HTTPS (WSS)
// TLS_CERT_FILE, TLS_KEY_FILE, TLS_CA_FILE optional
const USE_TLS = process.env.USE_TLS === '1' || process.env.USE_TLS === 'true';
let server;
if (USE_TLS) {
  const certPath = process.env.TLS_CERT_FILE || 'certs/cert.pem';
  const keyPath = process.env.TLS_KEY_FILE || 'certs/key.pem';
  const caPath = process.env.TLS_CA_FILE;
  const tlsOptions = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath)
  };
  if (caPath && fs.existsSync(caPath)) {
    tlsOptions.ca = fs.readFileSync(caPath);
  }
  server = https.createServer(tlsOptions, app);
} else {
  server = http.createServer(app);
}

// Server configuration
const PORT = process.env.PORT || 8080;

// Initialize SWAP server using the library implementation
const swapServer = new SwapServer({
  httpServer: server,
  port: PORT,
  path: '/3gpp-swap/v1',
  security: {
    enabled: process.env.SWAP_SECURITY_ENABLED === '1' || process.env.SWAP_SECURITY_ENABLED === 'true',
    integrity: true,
    encryption: false,
    sharedSecret: process.env.SWAP_SHARED_SECRET || null
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    registeredEndpoints: swapServer.registeredEndpoints.size,
    activeSessions: swapServer.activeSessions.size
  });
});

// Start server
async function start() {
  await swapServer.start();
  const scheme = USE_TLS ? 'wss' : 'ws';
  const httpScheme = USE_TLS ? 'https' : 'http';
  const host = process.env.PUBLIC_DOMAIN || 'localhost';
  console.log(`SWAP server listening on port ${PORT} (${USE_TLS ? 'TLS' : 'plaintext'})`);
  console.log(`WebSocket endpoint: ${scheme}://${host}:${PORT}/3gpp-swap/v1`);
  console.log(`Health check: ${httpScheme}://${host}:${PORT}/health`);
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
