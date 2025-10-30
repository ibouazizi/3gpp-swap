import { SwapServer, SwapClient, CriteriaBuilder } from './src/index.node.js';

const server = new SwapServer({ port: 0, host: '127.0.0.1' });
const port = await server.start();
console.log('Server on', port);

const clientA = new SwapClient({ host: '127.0.0.1', port, secure: false, timeout: { response: 2000 } });
const clientB = new SwapClient({ host: '127.0.0.1', port, secure: false, timeout: { response: 2000 } });

clientA.on('error', (e) => console.error('ClientA error', e));
clientB.on('error', (e) => console.error('ClientB error', e));
clientA.transport.on('message', (m) => console.log('ClientA RX', m));
clientB.transport.on('message', (m) => console.log('ClientB RX', m));

await clientA.connect();
await clientB.connect();
console.log('Clients connected');

await clientB.register(new CriteriaBuilder().withService('test').build());
console.log('B registered');

clientB.once('connect', async (offer, source) => {
  console.log('B got connect from', source);
  await clientB.accept(source, 'v=0...answer');
});

const accepted = new Promise((resolve) => clientA.once('accept', (answer, source) => {
  console.log('A got accept from', source, 'answer=', answer);
  resolve();
}));

await clientA.connectOffer('v=0...offer', new CriteriaBuilder().withService('test').build());
console.log('A sent connect');

await accepted;
console.log('Done. Stopping server');
await server.stop();
