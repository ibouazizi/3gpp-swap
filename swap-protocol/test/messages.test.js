import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MessageTypes,
  RegisterMessage,
  ConnectMessage,
  AcceptMessage,
  ResponseMessage,
  MessageFactory,
  validateMessageShape,
  SwapMessage
} from '../src/index.js';

test('RegisterMessage validates and serializes', () => {
  const reg = new RegisterMessage([
    { type: 'service', value: 'video-call' },
    { type: 'qos', value: 'high' }
  ], { source_id: 'endpoint-123456' });

  assert.equal(reg.message_type, MessageTypes.REGISTER);
  const { valid, errors } = validateMessageShape(reg);
  assert.equal(valid, true, JSON.stringify(errors));
  const json = reg.serialize();
  const parsed = JSON.parse(json);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.source_id, 'endpoint-123456');
});

test('ConnectMessage round-trip via factory', () => {
  const con = new ConnectMessage('v=0...sdp-offer', [{ type: 'service', value: 'test' }], {
    source_id: 'endpoint-abcdefg'
  });
  const json = con.serialize();
  const rebuilt = MessageFactory.fromJSON(json);
  assert.equal(rebuilt.offer, 'v=0...sdp-offer');
  assert.equal(rebuilt.criteria.length, 1);
  assert.equal(rebuilt.source_id, 'endpoint-abcdefg');
});

test('Accept/Response messages validate schemas', () => {
  const acc = new AcceptMessage('target-123456', 'v=0...answer', { source_id: 'source-zzzzz1' });
  const res = new ResponseMessage(acc.message_id, 200, 'OK', null, { source_id: 'source-zzzzz1' });
  assert.equal(validateMessageShape(acc).valid, true);
  assert.equal(validateMessageShape(res).valid, true);
});

// SwapMessage.sign() and SwapMessage.encrypt() tests (TS 26.113 § 13.2.4.5)

test('SwapMessage default - no signing, no encryption', () => {
  const msg = new ConnectMessage('v=0...offer', [{ type: 'service', value: 'test' }], {
    source_id: 'endpoint-default'
  });

  // Default: no security envelope
  assert.equal(msg.security, undefined);
  // Payload is in plaintext
  assert.equal(msg.offer, 'v=0...offer');
  assert.deepEqual(msg.criteria, [{ type: 'service', value: 'test' }]);

  // Serialized message has no security field
  const serialized = JSON.parse(msg.serialize());
  assert.equal(serialized.security, undefined);
});

test('SwapMessage.sign() with sharedSecret adds signature', async () => {
  const msg = new ConnectMessage('v=0...offer', [{ type: 'service', value: 'test' }], {
    source_id: 'endpoint-sign-test'
  });

  await msg.sign({ sharedSecret: 'test-secret-123' });

  assert.ok(msg.security, 'security object should exist');
  assert.equal(msg.security.mac, 'HMAC-SHA256');
  assert.ok(msg.security.signature, 'signature should exist');
  assert.equal(typeof msg.security.signature, 'string');
});

test('SwapMessage.sign() returns this for chaining', async () => {
  const msg = new ConnectMessage('v=0...offer', [{ type: 'service', value: 'test' }], {
    source_id: 'endpoint-chain-test'
  });

  const result = await msg.sign({ sharedSecret: 'test-secret' });
  assert.strictEqual(result, msg, 'sign() should return this');
});

test('SwapMessage.sign() throws without key or secret', async () => {
  const msg = new ConnectMessage('v=0...offer', [{ type: 'service', value: 'test' }], {
    source_id: 'endpoint-error-test'
  });

  await assert.rejects(
    () => msg.sign({}),
    /requires either hmacKey or sharedSecret/
  );
});

test('SwapMessage.sign() without encrypt() - encryption is optional', async () => {
  const msg = new ConnectMessage('v=0...offer', [{ type: 'service', value: 'test' }], {
    source_id: 'endpoint-sign-only'
  });

  await msg.sign({ sharedSecret: 'sign-only-secret' });

  // Security envelope should indicate no encryption
  assert.equal(msg.security.enc, 'none');
  assert.equal(msg.security.mac, 'HMAC-SHA256');
  assert.ok(msg.security.signature);
  // Payload remains in plaintext
  assert.equal(msg.offer, 'v=0...offer');
  assert.deepEqual(msg.criteria, [{ type: 'service', value: 'test' }]);

  // Verify signature works on sign-only message
  const msgObj = JSON.parse(JSON.stringify(msg));
  const isValid = await SwapMessage.verify(msgObj, { sharedSecret: 'sign-only-secret' });
  assert.equal(isValid, true);
});

test('SwapMessage.encrypt() encrypts payload', async () => {
  const msg = new ConnectMessage('v=0...offer', [{ type: 'service', value: 'test' }], {
    source_id: 'endpoint-encrypt-test'
  });

  await msg.encrypt({ sharedSecret: 'test-secret-456' });

  assert.ok(msg.security, 'security object should exist');
  assert.equal(msg.security.enc, 'AES-GCM');
  assert.ok(msg.security.ciphertext, 'ciphertext should exist');
  assert.ok(msg.security.iv, 'iv should exist');
  assert.equal(msg.offer, undefined, 'plaintext payload should be removed');
  assert.equal(msg.criteria, undefined, 'plaintext payload should be removed');
});

test('SwapMessage.encrypt() without sign() - signing is optional', async () => {
  const originalOffer = 'v=0...encrypt-only-offer';
  const originalCriteria = [{ type: 'service', value: 'encrypt-only' }];

  const msg = new ConnectMessage(originalOffer, originalCriteria, {
    source_id: 'endpoint-encrypt-only'
  });

  await msg.encrypt({ sharedSecret: 'encrypt-only-secret' });

  // Security envelope should indicate no signing
  assert.equal(msg.security.enc, 'AES-GCM');
  assert.equal(msg.security.mac, 'none');
  assert.ok(msg.security.ciphertext);
  assert.ok(msg.security.iv);
  assert.equal(msg.security.signature, undefined);

  // Decrypt should still work
  const msgObj = JSON.parse(JSON.stringify(msg));
  const decrypted = await SwapMessage.decrypt(msgObj, { sharedSecret: 'encrypt-only-secret' });
  assert.equal(decrypted.offer, originalOffer);
  assert.deepEqual(decrypted.criteria, originalCriteria);
});

test('SwapMessage.encrypt() then sign() works', async () => {
  const msg = new ConnectMessage('v=0...offer', [{ type: 'service', value: 'test' }], {
    source_id: 'endpoint-full-test'
  });

  await msg.encrypt({ sharedSecret: 'shared-secret' });
  await msg.sign({ sharedSecret: 'shared-secret' });

  assert.equal(msg.security.enc, 'AES-GCM');
  assert.equal(msg.security.mac, 'HMAC-SHA256');
  assert.ok(msg.security.ciphertext);
  assert.ok(msg.security.iv);
  assert.ok(msg.security.signature);
});

test('SwapMessage.verify() validates correct signature', async () => {
  const msg = new ConnectMessage('v=0...offer', [{ type: 'service', value: 'test' }], {
    source_id: 'endpoint-verify-test'
  });

  await msg.sign({ sharedSecret: 'verify-secret' });
  const msgObj = JSON.parse(JSON.stringify(msg));

  const isValid = await SwapMessage.verify(msgObj, { sharedSecret: 'verify-secret' });
  assert.equal(isValid, true, 'signature should be valid');
});

test('SwapMessage.verify() rejects tampered message', async () => {
  const msg = new ConnectMessage('v=0...offer', [{ type: 'service', value: 'test' }], {
    source_id: 'endpoint-tamper-test'
  });

  await msg.sign({ sharedSecret: 'tamper-secret' });
  const msgObj = JSON.parse(JSON.stringify(msg));

  // Tamper with the message
  msgObj.offer = 'v=0...tampered-offer';

  const isValid = await SwapMessage.verify(msgObj, { sharedSecret: 'tamper-secret' });
  assert.equal(isValid, false, 'tampered message should fail verification');
});

test('SwapMessage.decrypt() recovers original payload', async () => {
  const originalOffer = 'v=0...original-offer';
  const originalCriteria = [{ type: 'service', value: 'decrypt-test' }];

  const msg = new ConnectMessage(originalOffer, originalCriteria, {
    source_id: 'endpoint-decrypt-test'
  });

  await msg.encrypt({ sharedSecret: 'decrypt-secret' });
  const encryptedObj = JSON.parse(JSON.stringify(msg));

  const decrypted = await SwapMessage.decrypt(encryptedObj, { sharedSecret: 'decrypt-secret' });

  assert.equal(decrypted.offer, originalOffer);
  assert.deepEqual(decrypted.criteria, originalCriteria);
  assert.equal(decrypted.source_id, 'endpoint-decrypt-test');
});

test('sign() and encrypt() roundtrip with verify() and decrypt()', async () => {
  const originalOffer = 'v=0...roundtrip-offer';
  const originalCriteria = [{ type: 'qos', value: 'high' }];
  const secret = 'roundtrip-secret';

  const msg = new ConnectMessage(originalOffer, originalCriteria, {
    source_id: 'endpoint-roundtrip'
  });

  // Encrypt then sign
  await msg.encrypt({ sharedSecret: secret });
  await msg.sign({ sharedSecret: secret });

  const protectedObj = JSON.parse(JSON.stringify(msg));

  // Verify signature
  const isValid = await SwapMessage.verify(protectedObj, { sharedSecret: secret });
  assert.equal(isValid, true, 'signature should verify');

  // Decrypt payload
  const decrypted = await SwapMessage.decrypt(protectedObj, { sharedSecret: secret });
  assert.equal(decrypted.offer, originalOffer);
  assert.deepEqual(decrypted.criteria, originalCriteria);
});

