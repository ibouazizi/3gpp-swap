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

      const onOpen = () => {
        this.logger.info('Connected');
        this.reconnect.reset();
        try { this.queue.flush((m) => this._sendNow(m)); } catch (e) { /* ignore flush failures */ }
        this.emit('open');
        cleanup();
        resolve();
      };
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

      const cleanup = () => {
        ws.removeEventListener?.('open', onOpen);
        ws.removeEventListener?.('error', onError);
        ws.removeEventListener?.('close', onClose);
        ws.removeEventListener?.('message', onMessage);
        // Node ws API
        ws.off?.('open', onOpen);
        ws.off?.('error', onError);
        ws.off?.('close', onClose);
        ws.off?.('message', onMessage);
      };

      // Attach handlers for browser and node
      ws.addEventListener?.('open', onOpen);
      ws.addEventListener?.('error', onError);
      ws.addEventListener?.('close', onClose);
      ws.addEventListener?.('message', onMessage);
      ws.on?.('open', onOpen);
      ws.on?.('error', onError);
      ws.on?.('close', onClose);
      ws.on?.('message', (data) => onMessage({ data }));

      // Fail connect if not open within timeout
      const timeoutMs = this.options?.timeout?.connection ?? 10000;
      const t = setTimeout(() => {
        try { ws.close(); } catch {}
        reject(new Error('Connection timeout'));
      }, timeoutMs);
      ws.once?.('open', () => clearTimeout(t));
      ws.addEventListener?.('open', () => clearTimeout(t));
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
