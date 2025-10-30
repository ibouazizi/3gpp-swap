import WebSocket, { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';

import {
  MessageTypes,
  ErrorTypes,
  validateMessageShape,
  ResponseMessage,
  CloseMessage,
  generateSourceId,
  ProblemDetails,
  MatchingEngine,
  SecurityManager
} from './swap-protocol/src/index.js';

const app = express();
const server = http.createServer(app);

// SWAP WebSocket server configuration
const wss = new WebSocketServer({
  server,
  path: '/3gpp-swap/v1',
  handleProtocols: (protocols) => {
    if (protocols.has && protocols.has('3gpp.SWAP.v1')) {
      return '3gpp.SWAP.v1';
    }
    return false;
  }
});

// Server state management
class SwapServer {
  constructor() {
    this.registeredEndpoints = new Map(); // source_id -> {ws, criteria, messageId}
    this.activeSessions = new Map(); // sessionId -> {source1, source2, state}
    this.pendingConnections = new Map(); // source_id -> {target, offer, messageId}
    this.serverSource = this.generateSource();
    this.matching = new MatchingEngine();
    this.security = new SecurityManager({
      enabled: process.env.SWAP_SECURITY_ENABLED === '1' || process.env.SWAP_SECURITY_ENABLED === 'true',
      integrity: true,
      encryption: false,
      sharedSecret: process.env.SWAP_SHARED_SECRET || null
    });
  }

  generateSource() {
    // Generate a unique source identifier (min 10 chars)
    return generateSourceId('server');
  }

  handleConnection(ws, request) {
    console.log('New WebSocket connection established');
    
    ws.on('message', async (data) => {
      try {
        let message = JSON.parse(data.toString());
        // Try to unpack if security envelope present
        if (message && message.security && this.security?.config?.enabled) {
          try { message = await this.security.unpackIncoming(message); } catch (e) {
            console.error('Security unpack failed:', e);
            this.sendError(ws, message.message_id || 0, ErrorTypes.MESSAGE_MALFORMATTED, 'Security unpack failed');
            return;
          }
        }
        await this.handleMessage(ws, message);
      } catch (error) {
        console.error('Failed to parse message:', error);
        this.sendError(ws, null, ErrorTypes.MESSAGE_MALFORMATTED, 'Invalid JSON');
      }
    });

    ws.on('close', () => {
      // Clean up registered endpoints and sessions
      for (const [source, endpoint] of this.registeredEndpoints.entries()) {
        if (endpoint.ws === ws) {
          console.log(`Endpoint ${source} disconnected`);
          this.registeredEndpoints.delete(source);
          this.matching?.unregister(source);
          // Close any active sessions
          this.closeSessionsForEndpoint(source);
          break;
        }
      }
      if (this.endpoints) {
        for (const [source, sock] of this.endpoints.entries()) {
          if (sock === ws) {
            this.endpoints.delete(source);
            break;
          }
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  async handleMessage(ws, message) {
    // Validate message schema
    const validation = validateMessageShape(message);
    if (!validation.valid) {
      console.error('Message validation failed:', validation.errors);
      this.sendError(ws, message.message_id, ErrorTypes.MESSAGE_MALFORMATTED, 'Message does not conform to schema');
      return;
    }

    // Track endpoint for forwarding even if not registered
    this.endpoints = this.endpoints || new Map();
    this.endpoints.set(message.source_id, ws);

    console.log(`Received ${message.message_type} message from ${message.source_id}`);

    switch (message.message_type) {
      case MessageTypes.REGISTER:
        this.handleRegister(ws, message);
        break;
      case MessageTypes.CONNECT:
        this.handleConnect(ws, message);
        break;
      case MessageTypes.ACCEPT:
        this.handleAccept(ws, message);
        break;
      case MessageTypes.REJECT:
        this.handleReject(ws, message);
        break;
      case MessageTypes.UPDATE:
        this.handleUpdate(ws, message);
        break;
      case MessageTypes.CLOSE:
        this.handleClose(ws, message);
        break;
      case MessageTypes.APPLICATION:
        this.handleApplication(ws, message);
        break;
      case MessageTypes.RESPONSE:
        // Clients acknowledge server messages
        console.log(`Received response to message ${message.response_to}`);
        break;
      default:
        this.sendError(ws, message.message_id, ErrorTypes.MESSAGE_UNKNOWN,
          `Unknown message type: ${message.message_type}`);
    }
  }

  handleRegister(ws, message) {
    // Register endpoint with criteria
    this.registeredEndpoints.set(message.source_id, {
      ws: ws,
      criteria: message.criteria,
      capabilities: message.capabilities || {},
      messageId: message.message_id
    });
    this.matching.register(message.source_id, message.criteria);

    // Send success response
    const response = new ResponseMessage(message.message_id, 200, 'OK', null, { source_id: this.serverSource });
    this.sendMessage(ws, response, message.source_id);
    console.log(`Registered endpoint ${message.source_id} with criteria:`, message.criteria);
  }

  handleConnect(ws, message) {
    // Find matching endpoint based on criteria
    const matches = this.matching.findMatches(message.criteria).filter(id => id !== message.source_id);
    if (!matches || matches.length === 0) {
      this.sendError(ws, message.message_id, ErrorTypes.TARGET_UNKNOWN,
        'No matching endpoint found');
      return;
    }

    const selectedId = this.matching.selectEndpoint(matches);
    const targetEndpoint = this.registeredEndpoints.get(selectedId);
    if (!targetEndpoint) {
      this.sendError(ws, message.message_id, ErrorTypes.TARGET_UNKNOWN, 'Selected endpoint unavailable');
      return;
    }

    // Store pending connection
    this.pendingConnections.set(message.source_id, {
      target: selectedId,
      offer: message.offer,
      messageId: message.message_id
    });

    // Forward connect message to target (secure if requested by target)
    this.sendMessage(targetEndpoint.ws, message, selectedId);
    
    // Send acknowledgment to sender
    const response = new ResponseMessage(message.message_id, 200, 'OK', null, { source_id: this.serverSource });
    this.sendMessage(ws, response, message.source_id);
  }

  handleAccept(ws, message) {
    const targetEndpoint = this.registeredEndpoints.get(message.target) || (this.endpoints?.get(message.target) ? { ws: this.endpoints.get(message.target) } : null);
    
    if (!targetEndpoint) {
      this.sendError(ws, message.message_id, ErrorTypes.TARGET_UNKNOWN,
        'Target endpoint not found');
      return;
    }

    // Create active session
    const sessionId = uuidv4();
    this.activeSessions.set(sessionId, {
      source1: message.source_id,
      source2: message.target,
      state: 'active'
    });

    // Forward accept message to target
    this.sendMessage(targetEndpoint.ws, message, message.target);
    
    // Send acknowledgment
    const response = new ResponseMessage(message.message_id, 200, 'OK', null, { source_id: this.serverSource });
    this.sendMessage(ws, response, message.source_id);

    console.log(`Session established between ${message.source_id} and ${message.target}`);
  }

  handleReject(ws, message) {
    const targetEndpoint = this.registeredEndpoints.get(message.target) || (this.endpoints?.get(message.target) ? { ws: this.endpoints.get(message.target) } : null);
    
    if (!targetEndpoint) {
      this.sendError(ws, message.message_id, ErrorTypes.TARGET_UNKNOWN,
        'Target endpoint not found');
      return;
    }

    // Forward reject message to target
    this.sendMessage(targetEndpoint.ws, message, message.target);
    
    // Send acknowledgment
    const response = new ResponseMessage(message.message_id, 200, 'OK', null, { source_id: this.serverSource });
    this.sendMessage(ws, response, message.source_id);
  }

  handleUpdate(ws, message) {
    const targetEndpoint = this.registeredEndpoints.get(message.target) || (this.endpoints?.get(message.target) ? { ws: this.endpoints.get(message.target) } : null);
    
    if (!targetEndpoint) {
      this.sendError(ws, message.message_id, ErrorTypes.TARGET_UNKNOWN,
        'Target endpoint not found');
      return;
    }

    // Forward update message to target
    this.sendMessage(targetEndpoint.ws, message, message.target);
    
    // Send acknowledgment
    const response = new ResponseMessage(message.message_id, 200, 'OK', null, { source_id: this.serverSource });
    this.sendMessage(ws, response, message.source_id);
  }

  handleClose(ws, message) {
    const targetEndpoint = this.registeredEndpoints.get(message.target) || (this.endpoints?.get(message.target) ? { ws: this.endpoints.get(message.target) } : null);
    
    if (targetEndpoint) {
      // Forward close message to target
      this.sendMessage(targetEndpoint.ws, message, message.target);
    }

    // Remove active session
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if ((session.source1 === message.source_id && session.source2 === message.target) ||
          (session.source2 === message.source_id && session.source1 === message.target)) {
        this.activeSessions.delete(sessionId);
        console.log(`Session closed between ${message.source_id} and ${message.target}`);
        break;
      }
    }

    // Send acknowledgment
    const response = new ResponseMessage(message.message_id, 200, 'OK', null, { source_id: this.serverSource });
    this.sendMessage(ws, response, message.source_id);
  }

  handleApplication(ws, message) {
    const targetEndpoint = this.registeredEndpoints.get(message.target) || (this.endpoints?.get(message.target) ? { ws: this.endpoints.get(message.target) } : null);
    
    if (!targetEndpoint) {
      this.sendError(ws, message.message_id, ErrorTypes.TARGET_UNKNOWN,
        'Target endpoint not found');
      return;
    }

    // Forward application message to target
    this.sendMessage(targetEndpoint.ws, message, message.target);
    
    // Send acknowledgment
    const response = new ResponseMessage(message.message_id, 200, 'OK', null, { source_id: this.serverSource });
    this.sendMessage(ws, response, message.source_id);
  }

  findMatchingEndpoint(criteria, excludeSource) {
    // Simple matching logic - in production, this would be more sophisticated
    for (const [source_id, endpoint] of this.registeredEndpoints.entries()) {
      if (source_id === excludeSource) continue;
      
      // Check if any criteria match
      for (const criterion of criteria) {
        for (const endpointCriterion of endpoint.criteria) {
          if (criterion.type === endpointCriterion.type &&
              criterion.value === endpointCriterion.value) {
            return { source_id, endpoint };
          }
        }
      }
    }
    return null;
  }

  closeSessionsForEndpoint(source) {
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.source1 === source || session.source2 === source) {
        // Notify the other endpoint
        const otherSource = session.source1 === source ? session.source2 : session.source1;
        const otherEndpoint = this.registeredEndpoints.get(otherSource);
        
        if (otherEndpoint) {
          const closeMessage = new CloseMessage(source, { source_id: this.serverSource });
          this.sendMessage(otherEndpoint.ws, closeMessage);
        }
        
        this.activeSessions.delete(sessionId);
      }
    }
  }

  async sendMessage(ws, message, recipientId) {
    if (ws.readyState === WebSocket.OPEN) {
      let payload = message;
      if (typeof payload !== 'string') {
        // Apply security if recipient advertises support and server has security enabled
        const caps = recipientId ? this.registeredEndpoints.get(recipientId)?.capabilities : null;
        const wantsSec = !!caps?.security?.integrity || !!caps?.security?.encryption;
        if (this.security?.config?.enabled && wantsSec) {
          try {
            const secured = await this.security.prepareOutgoing(payload);
            payload = JSON.stringify(secured);
          } catch {
            payload = JSON.stringify(payload);
          }
        } else {
          payload = JSON.stringify(payload);
        }
      }
      ws.send(payload);
      try {
        const m = typeof message === 'string' ? JSON.parse(message) : message;
        console.log(`Sent ${m.message_type} message`);
      } catch {}
    }
  }

  sendError(ws, responseTo, errorType, detail) {
    let problem;
    try {
      if (ProblemDetails[errorType]) {
        problem = ProblemDetails[errorType]();
        if (detail) problem.detail = detail;
      }
    } catch {}
    if (!problem) {
      problem = { type: errorType, title: 'Bad Request', status: 400, detail };
    }
    const response = new ResponseMessage(responseTo || 0, 400, 'Bad Request', problem, { source_id: this.serverSource });
    this.sendMessage(ws, response);
  }
}

// Initialize SWAP server
const swapServer = new SwapServer();

// Handle WebSocket connections
wss.on('connection', (ws, request) => {
  swapServer.handleConnection(ws, request);
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
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`SWAP server listening on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/3gpp-swap/v1`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
