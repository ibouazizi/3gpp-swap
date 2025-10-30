import { bytesToBase64, base64ToBytes } from '../utils/base64.js';

function stableStringify(obj) {
  const keys = Object.keys(obj).sort();
  const parts = [];
  for (const k of keys) {
    const v = obj[k];
    parts.push(JSON.stringify(k) + ':' + (v && typeof v === 'object' && !Array.isArray(v) ? stableStringify(v) : JSON.stringify(v)));
  }
  return '{' + parts.join(',') + '}';
}

export class IntegrityProtection {
  static canonicalize(obj) {
    return stableStringify(obj);
  }

  static async sign(messageObj, hmacKey) {
    const encoder = new TextEncoder();
    const data = encoder.encode(IntegrityProtection.canonicalize(messageObj));
    const signature = await crypto.subtle.sign({ name: 'HMAC' }, hmacKey, data);
    return bytesToBase64(new Uint8Array(signature));
  }

  static async verify(messageObj, signatureB64, hmacKey) {
    const encoder = new TextEncoder();
    const data = encoder.encode(IntegrityProtection.canonicalize(messageObj));
    const sig = base64ToBytes(signatureB64);
    return crypto.subtle.verify({ name: 'HMAC' }, hmacKey, sig, data);
  }
}
