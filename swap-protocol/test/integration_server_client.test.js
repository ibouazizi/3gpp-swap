import test from 'node:test';
import assert from 'node:assert/strict';

import { SwapServer, SwapClient, CriteriaBuilder } from '../src/index.node.js';

test('SwapServer + two SwapClient can connect and accept', async (t) => {
  const server = new SwapServer({ port: 0, host: '127.0.0.1' });
  const port = await server.start();
  console.log('Server started on', port);

  const clientA = new SwapClient({ host: '127.0.0.1', port, secure: false, timeout: { response: 2000 } });
  const clientB = new SwapClient({ host: '127.0.0.1', port, secure: false, timeout: { response: 2000 } });

  await clientA.connect();
  await clientB.connect();
  console.log('Clients connected');

  await clientB.register(new CriteriaBuilder().withService('test').build());
  console.log('Client B registered');

  // Promise that resolves when A receives accept
  const accepted = new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('accept timeout')), 3000);
    clientA.once('accept', (answer, source) => { clearTimeout(to); resolve({ answer, source }); });
  });

  // B auto-accept incoming connect
  clientB.once('connect', async (offer, source) => {
    await clientB.accept(source, 'v=0...answer');
  });

  // A sends connect to service 'test'
  await clientA.connectOffer('v=0...offer', new CriteriaBuilder().withService('test').build());

  const { answer } = await accepted;
  assert.equal(answer, 'v=0...answer');

  await server.stop();
});
