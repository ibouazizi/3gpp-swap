import { Emitter } from '../utils/Emitter.js';
import { WebSocketTransport } from '../transport/WebSocketTransport.js';
import { StateMachine, States } from '../state/StateMachine.js';
import { SessionManager } from './SessionManager.js';
import { defaultLogger } from '../utils/Logger.js';
import { SecurityManager } from '../security/SecurityManager.js';
import { MessageFactory } from '../messages/MessageFactory.js';
import { RegisterMessage } from '../messages/RegisterMessage.js';
import { ConnectMessage } from '../messages/ConnectMessage.js';
import { AcceptMessage } from '../messages/AcceptMessage.js';
import { RejectMessage } from '../messages/RejectMessage.js';
import { UpdateMessage } from '../messages/UpdateMessage.js';
import { CloseMessage } from '../messages/CloseMessage.js';
import { ApplicationMessage } from '../messages/ApplicationMessage.js';

export class SwapClient extends Emitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.transport = new WebSocketTransport(options);
    this.stateMachine = new StateMachine();
    this.sessions = new SessionManager();
    this.logger = options.logger || defaultLogger;
    this.security = new SecurityManager(options.security || {});
    this.pending = new Map(); // message_id -> { resolve, reject, timer }
    this._bindTransport();
  }

  async connect() {
    await this.transport.connect();
    // Initialize crypto keys if needed; use a stable source_id if provided
    const sid = this.options?.identity?.source_id || 'swap';
    await this.security.init(sid).catch(() => {});
  }

  async register(criteria) {
    // Advertise security capabilities if configured
    const caps = this.security?.config?.enabled
      ? { capabilities: { security: { integrity: !!this.security.config.integrity, encryption: !!this.security.config.encryption } } }
      : {};
    const msg = new RegisterMessage(criteria, { ...this._init(), ...caps });
    const res = await this._sendAndWait(msg);
    if (res?.status === 200) this.emit('registered', res);
    return res;
  }

  async connectOffer(offer, criteria) {
    if (!this.stateMachine.canSend('connect')) throw new Error('Invalid state to send connect');
    const msg = new ConnectMessage(offer, criteria, this._init());
    this.stateMachine.apply('connect');
    const res = await this._sendAndWait(msg);
    return res; // Ack from server
  }

  async accept(target, answer) {
    const msg = new AcceptMessage(target, answer, this._init());
    const res = await this._sendAndWait(msg);
    return res;
  }

  async reject(target, reason) {
    const msg = new RejectMessage(target, reason, this._init());
    const res = await this._sendAndWait(msg);
    return res;
  }

  async update(target, sdp) {
    const msg = new UpdateMessage(target, sdp, this._init());
    const res = await this._sendAndWait(msg);
    return res;
  }

  async close(target) {
    const msg = new CloseMessage(target, this._init());
    const res = await this._sendAndWait(msg);
    return res;
  }

  async sendApp(target, type, value) {
    const msg = new ApplicationMessage(target, type, value, this._init());
    const res = await this._sendAndWait(msg);
    return res;
  }

  _bindTransport() {
    this.transport.onMessage(async (text) => {
      let obj;
      try { obj = JSON.parse(text); } catch (e) { this.logger.error('Invalid JSON from server'); return; }
      // Try to unpack via security manager if enabled
      if (this.security.config.enabled) {
        try {
          obj = await this.security.unpackIncoming(obj);
        } catch (e) {
          this.logger.error('Security unpack failed', e?.message || e);
        }
      }
      const message = MessageFactory.fromObject(obj);
      const mt = message.message_type;
      if (mt === 'response') {
        this._handleResponse(message);
        return;
      }
      switch (mt) {
        case 'connect': {
          this.stateMachine.apply('accept_incoming');
          this.emit('connect', message.offer, message.source_id);
          break;
        }
        case 'accept': {
          this.stateMachine.apply('accept');
          this.sessions.create(message.source_id, message.target);
          this.emit('accept', message.answer, message.source_id);
          break;
        }
        case 'reject': {
          this.stateMachine.apply('reject');
          this.emit('reject', message.reason, message.source_id);
          break;
        }
        case 'update': {
          this.emit('update', message.sdp, message.source_id);
          break;
        }
        case 'close': {
          this.stateMachine.apply('close');
          this.sessions.remove(message.source_id, message.target);
          this.emit('close', message.source_id);
          break;
        }
        case 'application': {
          this.emit('application', message.type, message.value, message.source_id);
          break;
        }
        default:
          this.logger.warn('Unhandled message type', mt);
      }
    });

    this.transport.on('error', (e) => this.emit('error', e));
  }

  _init() {
    return this.options.identity || {}; // allow caller to fix source_id if needed
  }

  async _sendAndWait(msg) {
    const timeoutMs = this.options?.timeout?.response ?? 5000;
    const mid = msg.message_id;
    const raw = JSON.parse(msg.serialize());
    const payloadObj = await this.security.prepareOutgoing(raw).catch(() => raw);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(mid);
        reject(new Error('Response timeout'));
      }, timeoutMs);
      this.pending.set(mid, { resolve, reject, timer });
      this.transport.send(payloadObj);
    });
  }

  _handleResponse(msg) {
    const entry = this.pending.get(msg.response_to);
    if (!entry) return;
    clearTimeout(entry.timer);
    this.pending.delete(msg.response_to);
    if (msg.status && msg.status >= 200 && msg.status < 300) entry.resolve(msg);
    else entry.reject(Object.assign(new Error('SWAP error'), { problem: msg.error, status: msg.status }));
  }
}
