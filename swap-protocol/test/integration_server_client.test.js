import test from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';

import { SwapServer, SwapClient, CriteriaBuilder } from '../src/index.node.js';


test('SwapServer sends ack', async (t) => {
  const server = new SwapServer({ port: 0, host: '127.0.0.1' });
  const port = await server.start();

  const alice = new SwapClient({ host: '127.0.0.1', port, secure: false, timeout: { response: 2000 } });
  await alice.connect();

  const sendSpy = sinon.spy(alice, '_sendAndWait');
  const ackSpy = sinon.spy(alice, '_handleResponse');
  await alice.register(new CriteriaBuilder().withService('test').build());
  
  sinon.assert.calledOnce(sendSpy);
  sinon.assert.calledOnce(ackSpy);

  const regMsg = sendSpy.getCalls()[0].args[0];
  const ackMsg = ackSpy.getCalls()[0].args[0];

  assert.equal(regMsg.message_type, 'register');
  assert.equal(ackMsg.message_type, 'response');
  assert.equal(ackMsg.target, regMsg.source_id);
  assert.equal(ackMsg.type, 'ack');
  await server.stop();
});

test('SwapServer + two SwapClient can connect and accept', async (t) => {
  const server = new SwapServer({ port: 0, host: '127.0.0.1' });
  const port = await server.start();
  console.log('Server started on', port);

  const alice = new SwapClient({ host: '127.0.0.1', port, secure: false, timeout: { response: 2000 } });
  await alice.connect();

  const bob = new SwapClient({ host: '127.0.0.1', port, secure: false, timeout: { response: 2000 } });
  await bob.connect();
  await bob.register(new CriteriaBuilder().withService('test').build());

  console.log('Clients connected');

  const accepted = new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('accept timeout')), 3000);
    alice.once('accept', (answer, source) => { 
      clearTimeout(to); 
      resolve({ answer, source }); 
    });
  });

  bob.once('connect', async (offer, source) => {
    assert.equal(offer, 'v=0...offer');
    await bob.accept(source, 'v=0...answer');
  });

  // FIXME: alice must be registered explicitly before calling connect() ?
  await alice.register(new CriteriaBuilder().withService('test').build());
  await alice.connectOffer('v=0...offer', new CriteriaBuilder().withService('test').build());

  await new Promise(resolve => setTimeout(resolve, 5000));

  const { answer, source } = await accepted;
  assert.equal(source, bob.source_id);
  assert.equal(answer, 'v=0...answer');
  
  await server.stop();
});
