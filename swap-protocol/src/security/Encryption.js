import { bytesToBase64, base64ToBytes } from '../utils/base64.js';

export class Encryption {
  static async encrypt(payloadObj, aesKey) {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = encoder.encode(JSON.stringify(payloadObj));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plaintext);
    return { ciphertext: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) };
  }

  static async decrypt(ciphertextB64, ivB64, aesKey) {
    const encrypted = base64ToBytes(ciphertextB64);
    const iv = base64ToBytes(ivB64);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, aesKey, new Uint8Array(encrypted));
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }
}
