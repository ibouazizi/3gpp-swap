import { generateSourceId, nextMessageId } from '../utils/IdGenerator.js';
import { validateMessageShape } from '../utils/Validator.js';
import { KeyDerivation } from '../security/KeyDerivation.js';
import { IntegrityProtection } from '../security/IntegrityProtection.js';
import { Encryption } from '../security/Encryption.js';

export class SwapMessage {
  constructor(messageType, init = {}) {
    this.version = 1;
    this.source_id = init.source_id || generateSourceId('ep');
    if (!SwapMessage._counters[this.source_id]) {
      SwapMessage._counters[this.source_id] = { value: 0 };
    }
    this.message_id = init.message_id || nextMessageId(SwapMessage._counters[this.source_id]);
    this.message_type = messageType;
  }

  validate() {
    const { valid, errors } = validateMessageShape(this);
    if (!valid) {
      const err = new Error('Message validation failed');
      err.errors = errors;
      throw err;
    }
    return true;
  }

  serialize() {
    this.validate();
    return JSON.stringify(this);
  }

  static parse(json) {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    const { valid, errors } = validateMessageShape(obj);
    if (!valid) {
      const err = new Error('Message validation failed');
      err.errors = errors;
      throw err;
    }
    return obj;
  }

  // Base fields that are not part of the payload
  static BASE_FIELDS = ['version', 'source_id', 'message_id', 'message_type', 'security'];

  // Extract payload fields (everything except base fields)
  _getPayload() {
    const payload = {};
    for (const key of Object.keys(this)) {
      if (!SwapMessage.BASE_FIELDS.includes(key)) {
        payload[key] = this[key];
      }
    }
    return payload;
  }

  // Remove payload fields from message (after encryption)
  _clearPayload() {
    for (const key of Object.keys(this)) {
      if (!SwapMessage.BASE_FIELDS.includes(key)) {
        delete this[key];
      }
    }
  }

  /**
   * Sign the message using HMAC-SHA256 (TS 26.113 § 13.2.4.5)
   * @param {Object} options - Signing options
   * @param {CryptoKey} [options.hmacKey] - Pre-derived HMAC key
   * @param {string} [options.sharedSecret] - Shared secret to derive key from
   * @returns {Promise<SwapMessage>} this for chaining
   */
  async sign(options = {}) {
    const { hmacKey, sharedSecret } = options;
    if (!hmacKey && !sharedSecret) {
      throw new Error('sign() requires either hmacKey or sharedSecret');
    }

    const key = hmacKey || await KeyDerivation.importHmacKey(sharedSecret);

    // Initialize security object if not present
    if (!this.security) {
      this.security = {};
    }
    this.security.mac = 'HMAC-SHA256';
    // Set enc to 'none' if not already set (encryption is optional)
    if (!this.security.enc) {
      this.security.enc = 'none';
    }

    // Create object to sign (exclude signature field itself)
    const toSign = { ...this };
    delete toSign.security?.signature;
    if (toSign.security) {
      toSign.security = { ...toSign.security };
      delete toSign.security.signature;
    }

    const signature = await IntegrityProtection.sign(toSign, key);
    this.security.signature = signature;

    return this;
  }

  /**
   * Encrypt the message payload using AES-GCM (TS 26.113 § 13.2.4.5)
   * @param {Object} options - Encryption options
   * @param {CryptoKey} [options.aesKey] - Pre-derived AES key
   * @param {string} [options.sharedSecret] - Shared secret to derive key from
   * @param {string} [options.salt] - Salt for key derivation (defaults to swap-v1:{source_id})
   * @returns {Promise<SwapMessage>} this for chaining
   */
  async encrypt(options = {}) {
    const { aesKey, sharedSecret, salt } = options;
    if (!aesKey && !sharedSecret) {
      throw new Error('encrypt() requires either aesKey or sharedSecret');
    }

    const derivedSalt = salt || `swap-v1:${this.source_id}`;
    const key = aesKey || await KeyDerivation.deriveAesKey(sharedSecret, derivedSalt);

    // Extract and encrypt payload
    const payload = this._getPayload();
    const { ciphertext, iv } = await Encryption.encrypt(payload, key);

    // Initialize security object if not present
    if (!this.security) {
      this.security = {};
    }
    this.security.enc = 'AES-GCM';
    // Set mac to 'none' if not already set (signing is optional)
    if (!this.security.mac) {
      this.security.mac = 'none';
    }
    this.security.ciphertext = ciphertext;
    this.security.iv = iv;

    // Remove plaintext payload fields
    this._clearPayload();

    return this;
  }

  /**
   * Verify the signature of a message object
   * @param {Object} messageObj - Message object with security.signature
   * @param {Object} options - Verification options
   * @param {CryptoKey} [options.hmacKey] - Pre-derived HMAC key
   * @param {string} [options.sharedSecret] - Shared secret to derive key from
   * @returns {Promise<boolean>} true if signature is valid
   */
  static async verify(messageObj, options = {}) {
    const { hmacKey, sharedSecret } = options;
    if (!hmacKey && !sharedSecret) {
      throw new Error('verify() requires either hmacKey or sharedSecret');
    }
    if (!messageObj.security?.signature) {
      throw new Error('Message has no signature to verify');
    }

    const key = hmacKey || await KeyDerivation.importHmacKey(sharedSecret);
    const signature = messageObj.security.signature;

    // Create object to verify (exclude signature field)
    const toVerify = JSON.parse(JSON.stringify(messageObj));
    delete toVerify.security.signature;

    return IntegrityProtection.verify(toVerify, signature, key);
  }

  /**
   * Decrypt a message object's payload
   * @param {Object} messageObj - Message object with security.ciphertext and security.iv
   * @param {Object} options - Decryption options
   * @param {CryptoKey} [options.aesKey] - Pre-derived AES key
   * @param {string} [options.sharedSecret] - Shared secret to derive key from
   * @param {string} [options.salt] - Salt for key derivation (defaults to swap-v1:{source_id})
   * @returns {Promise<Object>} Decrypted message object with payload restored
   */
  static async decrypt(messageObj, options = {}) {
    const { aesKey, sharedSecret, salt } = options;
    if (!aesKey && !sharedSecret) {
      throw new Error('decrypt() requires either aesKey or sharedSecret');
    }
    if (!messageObj.security?.ciphertext || !messageObj.security?.iv) {
      throw new Error('Message has no encrypted payload to decrypt');
    }

    const derivedSalt = salt || `swap-v1:${messageObj.source_id}`;
    const key = aesKey || await KeyDerivation.deriveAesKey(sharedSecret, derivedSalt);

    const payload = await Encryption.decrypt(
      messageObj.security.ciphertext,
      messageObj.security.iv,
      key
    );

    // Return message with decrypted payload
    const { version, source_id, message_id, message_type } = messageObj;
    return { version, source_id, message_id, message_type, ...payload };
  }
}

SwapMessage._counters = {};

