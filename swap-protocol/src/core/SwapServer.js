import { EventEmitter } from 'events';
import http from 'http';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

import { MatchingEngine } from '../matching/MatchingEngine.js';
import { ResponseMessage } from '../messages/ResponseMessage.js';
import { CloseMessage } from '../messages/CloseMessage.js';
import { ErrorTypes } from '../errors/ErrorTypes.js';
import { ProblemDetails } from '../errors/ProblemDetails.js';
import { validateMessageShape } from '../utils/Validator.js';
import { generateSourceId } from '../utils/IdGenerator.js';
import { SecurityManager } from '../security/SecurityManager.js';

export class SwapServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = { host: '0.0.0.0', port: 0, path: '/3gpp-swap/v1', ...options };
    this.httpServer = options.httpServer || http.createServer();
    this.wss = null;
    this.port = null;
    this.path = this.options.path;
    this.endpoints = new Map(); // source_id -> ws
    this.registeredEndpoints = new Map(); // source_id -> { ws, criteria, capabilities }
    this.activeSessions = new Map(); // sessionId -> { a, b, state }
    this.pendingConnections = new Map(); // source_id -> { target, offer, messageId }
    this.serverSource = generateSourceId('server');
    this.matching = new MatchingEngine();
    this.security = new SecurityManager(options.security || { enabled: false });
  }

  async start() {
    await new Promise((resolve) => this.httpServer.listen(this.options.port, this.options.host, resolve));
    this.port = this.httpServer.address().port;
    this.wss = new WebSocketServer({ server: this.httpServer, path: this.path, handleProtocols: (protocols) => {
      if (protocols?.has && protocols.has('3gpp.SWAP.v1')) return '3gpp.SWAP.v1';
      return false;
    }});

    this.wss.on('connection', (ws) => { console.log('[server] connection'); this._onConnection(ws); });
    return this.port;
  }

  async stop() {
    for (const ws of this.endpoints.values()) {
      try { ws.close(); } catch {}
    }
    await new Promise((resolve) => this.wss?.close(() => resolve()));
    await new Promise((resolve) => this.httpServer?.close(() => resolve()));
    this.endpoints.clear();
    this.registeredEndpoints.clear();
    this.activeSessions.clear();
  }

  _onConnection(ws) {
    ws.on('message', async (data) => {
      let message;
      try { message = JSON.parse(data.toString()); } catch { return this._sendError(ws, 0, ErrorTypes.MESSAGE_MALFORMATTED, 'Invalid JSON'); }
      // Try to unpack if security envelope present
      if (message && message.security) {
        try { message = await this.security.unpackIncoming(message); } catch (e) { return this._sendError(ws, message.message_id || 0, ErrorTypes.MESSAGE_MALFORMATTED, 'Security unpack failed'); }
      }
      const v = validateMessageShape(message);
      if (!v.valid) return this._sendError(ws, message.message_id || 0, ErrorTypes.MESSAGE_MALFORMATTED, 'Message does not conform to schema');
      this.endpoints.set(message.source_id, ws);
      this._dispatch(ws, message);
    });

    ws.on('close', () => {
      // Clean up endpoint entries and sessions
      for (const [src, sock] of this.endpoints.entries()) {
        if (sock === ws) {
          this.endpoints.delete(src);
          this.matching.unregister(src);
          this.registeredEndpoints.delete(src);
          this._closeSessionsFor(src);
        }
      }
    });
  }

  _dispatch(ws, message) {
    switch (message.message_type) {
      case 'register': return this._onRegister(ws, message);
      case 'connect': return this._onConnect(ws, message);
      case 'accept': return this._onAccept(ws, message);
      case 'reject': return this._onReject(ws, message);
      case 'update': return this._onUpdate(ws, message);
      case 'close': return this._onClose(ws, message);
      case 'application': return this._onApplication(ws, message);
      case 'response': default: return; // ignore
    }
  }

  async _ack(ws, msg, status = 200, reason = 'OK') {
    const resp = new ResponseMessage(msg.message_id, status, reason, null, { source_id: this.serverSource });
    // Only secure if server enabled and sender advertised security support
    const caps = this.registeredEndpoints.get(msg.source_id)?.capabilities;
    const wantsSec = !!caps?.security?.integrity || !!caps?.security?.encryption;
    if (this.security?.config?.enabled && wantsSec) {
      try {
        const raw = JSON.parse(JSON.stringify(resp));
        const out = await this.security.prepareOutgoing(raw);
        ws.send(JSON.stringify(out));
        return;
      } catch {}
    }
    ws.send(JSON.stringify(resp));
  }

  _onRegister(ws, message) {
    console.log('[server] register from', message.source_id);
    this.registeredEndpoints.set(message.source_id, { ws, criteria: message.criteria, capabilities: message.capabilities || {} });
    this.matching.register(message.source_id, message.criteria);
    this._ack(ws, message);
  }

  async _onConnect(ws, message) {
    console.log('[server] connect from', message.source_id);
    const matches = this.matching.findMatches(message.criteria).filter(id => id !== message.source_id);
    if (!matches.length) return this._sendError(ws, message.message_id, ErrorTypes.TARGET_UNKNOWN, 'No matching endpoint found');
    const selected = this.matching.selectEndpoint(matches);
    const targetSock = this.endpoints.get(selected);
    if (!targetSock) return this._sendError(ws, message.message_id, ErrorTypes.TARGET_UNKNOWN, 'Selected endpoint unavailable');
    this.pendingConnections.set(message.source_id, { target: selected, offer: message.offer, messageId: message.message_id });
    await this._forwardTo(selected, message);
    this._ack(ws, message);
  }

  async _onAccept(ws, message) {
    const targetSock = this.endpoints.get(message.target);
    if (!targetSock) return this._sendError(ws, message.message_id, ErrorTypes.TARGET_UNKNOWN, 'Target endpoint not found');
    const sessionId = uuidv4();
    this.activeSessions.set(sessionId, { a: message.source_id, b: message.target, state: 'active' });
    await this._forwardTo(message.target, message);
    this._ack(ws, message);
    this.emit('session_created', message.source_id, message.target);
  }

  async _onReject(ws, message) {
    const targetSock = this.endpoints.get(message.target);
    if (!targetSock) return this._sendError(ws, message.message_id, ErrorTypes.TARGET_UNKNOWN, 'Target endpoint not found');
    await this._forwardTo(message.target, message);
    this._ack(ws, message);
  }

  async _onUpdate(ws, message) {
    const targetSock = this.endpoints.get(message.target);
    if (!targetSock) return this._sendError(ws, message.message_id, ErrorTypes.TARGET_UNKNOWN, 'Target endpoint not found');
    await this._forwardTo(message.target, message);
    this._ack(ws, message);
  }

  async _onClose(ws, message) {
    const targetSock = this.endpoints.get(message.target);
    if (targetSock) await this._forwardTo(message.target, message);
    // remove matching session
    for (const [sid, s] of this.activeSessions.entries()) {
      if ((s.a === message.source_id && s.b === message.target) || (s.b === message.source_id && s.a === message.target)) {
        this.activeSessions.delete(sid);
        break;
      }
    }
    this._ack(ws, message);
    this.emit('session_closed', message.source_id, message.target);
  }

  async _onApplication(ws, message) {
    const targetSock = this.endpoints.get(message.target);
    if (!targetSock) return this._sendError(ws, message.message_id, ErrorTypes.TARGET_UNKNOWN, 'Target endpoint not found');
    await this._forwardTo(message.target, message);
    this._ack(ws, message);
  }

  async _forwardTo(targetId, messageObj) {
    const endpoint = this.registeredEndpoints.get(targetId);
    if (!endpoint) return;
    let out = messageObj;
    const wantsSec = !!endpoint.capabilities?.security?.integrity || !!endpoint.capabilities?.security?.encryption;
    if (wantsSec && this.security?.config?.enabled) {
      try {
        const raw = JSON.parse(JSON.stringify(messageObj));
        out = await this.security.prepareOutgoing(raw);
      } catch {
        out = messageObj;
      }
    }
    endpoint.ws.send(JSON.stringify(out));
  }

  _sendError(ws, responseTo, errorType, detail) {
    let problem = ProblemDetails[errorType]?.() || { type: errorType, title: 'Bad Request', status: 400, detail };
    if (detail) problem.detail = detail;
    const resp = new ResponseMessage(responseTo || 0, 400, 'Bad Request', problem, { source_id: this.serverSource });
    ws.send(JSON.stringify(resp));
  }

  _closeSessionsFor(source) {
    for (const [sid, s] of this.activeSessions.entries()) {
      if (s.a === source || s.b === source) {
        const other = s.a === source ? s.b : s.a;
        const otherWs = this.endpoints.get(other);
        if (otherWs) {
          const close = new CloseMessage(source, { source_id: this.serverSource });
          otherWs.send(JSON.stringify(close));
        }
        this.activeSessions.delete(sid);
      }
    }
  }
}
