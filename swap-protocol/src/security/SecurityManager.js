import { KeyDerivation } from './KeyDerivation.js';
import { IntegrityProtection } from './IntegrityProtection.js';
import { Encryption } from './Encryption.js';

export class SecurityManager {
  constructor(config = {}) {
    const defaults = { enabled: false, integrity: true, encryption: false, sharedSecret: null, salt: null };
    this.config = { ...defaults, ...config };
    this._aesKey = null;
    this._hmacKey = null;
  }

  async init(sourceId = 'swap') {
    if (!this.config.enabled) return;
    const secret = this.config.sharedSecret;
    if (!secret) throw new Error('SecurityManager: sharedSecret required when enabled');
    if (this.config.encryption) {
      const salt = this.config.salt || `swap-v1:${sourceId}`;
      this._aesKey = await KeyDerivation.deriveAesKey(secret, salt);
    }
    if (this.config.integrity) {
      this._hmacKey = await KeyDerivation.importHmacKey(secret);
    }
  }

  // Split base fields and payload fields
  _split(obj) {
    const { version, source_id, message_id, message_type, security, ...payload } = obj;
    const base = { version, source_id, message_id, message_type };
    return { base, payload };
  }

  async prepareOutgoing(messageObj) {
    if (!this.config.enabled) return messageObj;
    const { base, payload } = this._split(messageObj);
    const out = { ...base };
    out.security = { enc: this.config.encryption ? 'AES-GCM' : 'none', mac: this.config.integrity ? 'HMAC-SHA256' : 'none' };
    if (this.config.encryption) {
      if (!this._aesKey) await this.init(base.source_id);
      const { ciphertext, iv } = await Encryption.encrypt(payload, this._aesKey);
      out.security.ciphertext = ciphertext;
      out.security.iv = iv;
    } else {
      Object.assign(out, payload);
    }
    if (this.config.integrity) {
      if (!this._hmacKey) await this.init(base.source_id);
      const toSign = { ...out };
      const sig = await IntegrityProtection.sign(toSign, this._hmacKey);
      out.security.signature = sig;
    }
    return out;
  }

  async unpackIncoming(messageObj) {
    if (!messageObj.security || !this.config.enabled) return messageObj;
    const sec = messageObj.security || {};
    // Verify signature first if present
    if (this.config.integrity && sec.signature) {
      if (!this._hmacKey) await this.init(messageObj.source_id);
      const toVerify = { ...messageObj, security: { ...sec } };
      delete toVerify.security.signature;
      const ok = await IntegrityProtection.verify(toVerify, sec.signature, this._hmacKey);
      if (!ok) throw new Error('SecurityManager: signature verification failed');
    }
    // Decrypt if ciphertext present
    if (this.config.encryption && sec.ciphertext && sec.iv) {
      if (!this._aesKey) await this.init(messageObj.source_id);
      const { version, source_id, message_id, message_type } = messageObj;
      const payload = await Encryption.decrypt(sec.ciphertext, sec.iv, this._aesKey);
      return { version, source_id, message_id, message_type, ...payload };
    }
    return messageObj;
  }
}
