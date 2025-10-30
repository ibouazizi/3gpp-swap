import { default as WebSocket, WebSocketServer } from 'ws';
import http from 'http';

const server = http.createServer();
server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  console.log('server listening', port);
  const wss = new WebSocketServer({
    server,
    path: '/3gpp-swap/v1',
    handleProtocols: (protocols) => {
      console.log('handleProtocols', Array.from(protocols));
      return protocols.has('3gpp.SWAP.v1') ? '3gpp.SWAP.v1' : false;
    }
  });
  const ws = new WebSocket(`ws://127.0.0.1:${port}/3gpp-swap/v1`, '3gpp.SWAP.v1');
  ws.on('open', () => {
    console.log('client open');
    ws.close();
    wss.close();
    server.close();
  });
  ws.on('error', (e) => console.log('client error', e.message));
});

