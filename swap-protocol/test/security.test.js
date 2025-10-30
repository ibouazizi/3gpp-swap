import test from 'node:test';
import assert from 'node:assert/strict';

import { SecurityManager, ConnectMessage, validateMessageShape } from '../src/index.js';

test('SecurityManager sign and encrypt roundtrip', async () => {
  const secA = new SecurityManager({ enabled: true, encryption: true, integrity: true, sharedSecret: 'secret123' });
  await secA.init('endpoint-A');
  const msg = new ConnectMessage('v=0...offer', [{ type: 'service', value: 'test' }], { source_id: 'endpoint-A' });
  const raw = JSON.parse(msg.serialize());
  const protectedMsg = await secA.prepareOutgoing(raw);

  // Schema should allow 'security'; base fields remain
  assert.equal(validateMessageShape(protectedMsg).valid, true);
  assert.ok(protectedMsg.security);

  const secB = new SecurityManager({ enabled: true, encryption: true, integrity: true, sharedSecret: 'secret123' });
  const unpacked = await secB.unpackIncoming(protectedMsg);
  assert.equal(unpacked.offer, 'v=0...offer');
  assert.equal(unpacked.source_id, 'endpoint-A');
});

