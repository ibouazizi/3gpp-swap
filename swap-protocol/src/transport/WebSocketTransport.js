import { Emitter } from '../utils/Emitter.js';
import { MessageQueue } from './MessageQueue.js';
import { ReconnectionManager } from './ReconnectionManager.js';
import { defaultLogger } from '../utils/Logger.js';

export function buildSwapUri(options) {
  const { host, prefix = '', secure = true } = options || {};
  if (!host) throw new Error('host is required');
  const scheme = secure === false ? 'ws' : 'wss';
  const defaultPort = scheme === 'ws' ? 80 : 443;
  const port = options.port ?? defaultPort;
  const basePath = prefix ? `/${prefix.replace(/^\/+|\/+$/g, '')}` : '';
  return `${scheme}://${host}:${port}${basePath}/3gpp-swap/v1`;
}

export class WebSocketTransport extends Emitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.uri = buildSwapUri(options);
    this.protocol = '3gpp.SWAP.v1';
    this.ws = null;
    this.queue = new MessageQueue();
    this.reconnect = new ReconnectionManager(options.reconnect || options);
    this.logger = options.logger || defaultLogger;
    this._manuallyClosed = false;
  }

  async connect() {
    this._manuallyClosed = false;
    const WS = await this._getWebSocketCtor();
    return new Promise((resolve, reject) => {
      this.logger.info('Connecting', this.uri);
      const ws = new WS(this.uri, this.protocol);
      this.ws = ws;

      // Use Node EventEmitter API (`on`) when available, otherwise fall back
      // to the browser EventTarget API (`addEventListener`). Attaching both
      // causes every event to fire twice on Node's `ws` which supports both.
      const isNode = typeof ws.on === 'function';

      const attach = isNode
        ? (evt, fn) => ws.on(evt, fn)
        : (evt, fn) => ws.addEventListener(evt, fn);

      const detach = isNode
        ? (evt, fn) => ws.off(evt, fn)
        : (evt, fn) => ws.removeEventListener(evt, fn);

      const onError = (err) => {
        this.logger.error('WS error', err?.message || err);
        this.emit('error', err);
      };
      const onClose = () => {
        this.logger.warn('WS closed');
        this.emit('close');
        this.ws = null;
        if (!this._manuallyClosed) {
          this._scheduleReconnect();
        }
      };
      const onMessage = (evt) => {
        try {
          const data = typeof evt === 'string' ? evt : (evt?.data || evt);
          const text = typeof data === 'string' ? data : data.toString();
          this.emit('message', text);
        } catch (e) {
          this.logger.error('WS message parse error', e);
        }
      };

      const wrappedMessage = isNode
        ? (data) => onMessage({ data })
        : onMessage;

      // Persistent listeners — stay active for the lifetime of the connection
      attach('error', onError);
      attach('close', onClose);
      attach('message', wrappedMessage);

      // One-shot open handler — resolves the connect promise then removes itself
      const timeoutMs = this.options?.timeout?.connection ?? 10000;
      const t = setTimeout(() => {
        try { ws.close(); } catch {}
        reject(new Error('Connection timeout'));
      }, timeoutMs);

      const onOpen = () => {
        clearTimeout(t);
        detach('open', onOpen);
        this.logger.info('Connected');
        this.reconnect.reset();
        try { this.queue.flush((m) => this._sendNow(m)); } catch (e) { /* ignore flush failures */ }
        this.emit('open');
        resolve();
      };
      attach('open', onOpen);
    });
  }

  _scheduleReconnect() {
    if (!this.reconnect.enabled) return;
    this.reconnect.scheduleReconnect(() => {
      if (!this._manuallyClosed) {
        this.connect().catch((e) => this.logger.warn('Reconnect failed', e?.message || e));
      }
    });
  }

  async _getWebSocketCtor() {
    if (typeof globalThis !== 'undefined' && globalThis.WebSocket) {
      return globalThis.WebSocket;
    }
    try {
      const mod = await import('ws');
      return mod.default || mod.WebSocket || mod;
    } catch {
      throw new Error('No WebSocket implementation found');
    }
  }

  send(message) {
    const payload = typeof message === 'string'
      ? message
      : (typeof message?.serialize === 'function' ? message.serialize() : JSON.stringify(message));

    if (!this.ws || this._readyState() !== 1) {
      this.queue.enqueue(payload);
      return false;
    }
    this._sendNow(payload);
    return true;
  }

  _readyState() {
    return this.ws?.readyState ?? 0;
  }

  _sendNow(payload) {
    this.ws.send(payload);
  }

  onMessage(callback) {
    this.on('message', callback);
  }

  close(code, reason) {
    this._manuallyClosed = true;
    try { this.ws?.close(code, reason); } catch {}
    this.ws = null;
  }
}
