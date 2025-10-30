import test from 'node:test';
import assert from 'node:assert/strict';

import { MessageQueue, ReconnectionManager, buildSwapUri } from '../src/index.js';

test('buildSwapUri formats correctly', () => {
  const uri = buildSwapUri({ host: 'swap.example.com', port: 443 });
  assert.equal(uri, 'wss://swap.example.com:443/3gpp-swap/v1');
  const uri2 = buildSwapUri({ host: 'swap.example.com', port: 8443, prefix: 'api' });
  assert.equal(uri2, 'wss://swap.example.com:8443/api/3gpp-swap/v1');
});

test('MessageQueue enqueues and flushes', () => {
  const q = new MessageQueue();
  q.enqueue('a');
  q.enqueue('b');
  const out = [];
  q.flush((m) => out.push(m));
  assert.deepEqual(out, ['a', 'b']);
  assert.equal(q.isEmpty(), true);
});

test('ReconnectionManager schedules with backoff', async () => {
  const rm = new ReconnectionManager({ enabled: true, maxAttempts: 2, initialDelay: 10, backoffMultiplier: 2 });
  let calls = 0;
  rm.scheduleReconnect(() => { calls += 1; });
  await new Promise((r) => setTimeout(r, 15));
  assert.equal(calls, 1);
  rm.scheduleReconnect(() => { calls += 1; });
  await new Promise((r) => setTimeout(r, 25));
  assert.equal(calls, 2);
});

