3GPP SWAP (Simple WebRTC Application Protocol)
==============================================

See detailed setup and usage below.



3GPP SWAP (Simple WebRTC Application Protocol) – Reference Server and JS Library
==============================================================================

This repo contains a reference SWAP WebSocket server and a modular JavaScript library that implements the SWAP v1 protocol (as per 3GPP TS 26.113 v19.1.0).

- Server entrypoint: `server.js`
- Library package (ESM): `swap-protocol/`
- WS endpoint: `/3gpp-swap/v1`
- WS subprotocol: `3gpp.SWAP.v1`

Use this to register endpoints, match peers via criteria, exchange SDP offer/answer, and relay application messages. Security (integrity and encryption) is optional and negotiated.

Quick Start
-----------

- Requirements: Node.js 18+ (tested with Node 24), npm, git
- Install dependencies:
  - Root: `npm install`
  - Library: `cd swap-protocol && npm install`
- Run server: `npm start`
  - WS URL: `ws://localhost:8080/3gpp-swap/v1`
  - Health check: `http://localhost:8080/health`

Run With Docker
---------------

- Build: `docker build -t swap-server .`
- Run (plaintext): `docker run -p 8080:8080 swap-server`
- Run (secured relay):
  - `docker run -p 8080:8080 -e SWAP_SECURITY_ENABLED=true -e SWAP_SHARED_SECRET=secret123 swap-server`

Environment variables:
- `PORT`: server port (default `8080`)
- `SWAP_SECURITY_ENABLED`: `true|1` enables HMAC signing and optional AES-GCM encryption for hop‑by‑hop relay
- `SWAP_SHARED_SECRET`: shared secret used by HMAC/AES-GCM when security is enabled

Protocol Highlights
-------------------

- Transport: WebSocket(S), subprotocol `3gpp.SWAP.v1`
- Path: `/3gpp-swap/v1`
- Messages (JSON): `register`, `response`, `connect`, `accept`, `reject`, `update`, `close`, `application`
- Matching: server selects target by criteria (e.g., `{ type: 'service', value: 'video-call' }`)
- SDP rules (v1): no trickle ICE; send offers/answers with all gathered candidates
- Errors: RFC 7807 Problem Details

Security Model (Optional, Negotiated)
-------------------------------------

- Hop‑by‑hop protection between client and server.
- Capabilities advertised by clients at `register`:
  - `capabilities.security.integrity: boolean`
  - `capabilities.security.encryption: boolean`
- If server security is enabled and the recipient advertised capabilities, the server signs (and optionally encrypts) messages addressed to that recipient.
- Clients enable security via configuration (see below). End‑to‑end client‑to‑client encryption is not implemented here (no key exchange); this focuses on hop‑by‑hop transport protection.

Library Usage (Local Development)
---------------------------------

Library paths (choose based on your runtime):

- Browser bundle (zero-config): `swap-protocol/dist/browser/swap.esm.js`
- Browser source (use with your bundler): `swap-protocol/src/index.js`
- Node (client + server APIs): `swap-protocol/src/index.node.js`

Import for browser (bundle or your bundler):

```js
import {
  SwapClient,
  CriteriaBuilder,
  SdpValidator,
  IceGatherer
} from './swap-protocol/dist/browser/swap.esm.js';
```

For packaging to npm, the public entry is `swap-protocol/src/index.js` and the package.json already declares ESM exports.

SwapClient (plaintext)
----------------------

```js
const client = new SwapClient({ host: 'localhost', port: 8080, secure: false });
await client.connect();

// Register as an answerer for service "video-call"
await client.register(new CriteriaBuilder().withService('video-call').build());

client.on('connect', async (offer, sourceId) => {
  // Handle incoming offer from sourceId
});

// Initiator sends an SDP offer to whoever registered for the service
await client.connectOffer('v=0...SDP', new CriteriaBuilder().withService('video-call').build());
```

SwapClient (secured hop‑by‑hop)
-------------------------------

```js
const client = new SwapClient({
  host: 'localhost', port: 8080, secure: false,
  security: { enabled: true, integrity: true, encryption: true, sharedSecret: 'secret123' }
});
await client.connect();
// Will advertise capabilities on register, so the server signs/encrypts messages addressed to this client
await client.register(new CriteriaBuilder().withService('video-call').build());
```

Reference Server (Node.js)
--------------------------

- Runs an Express HTTP server and a WebSocket server on `/3gpp-swap/v1` with subprotocol `3gpp.SWAP.v1`.
- Stores registered endpoints with their criteria and capabilities.
- Finds matches and relays messages between endpoints.
- Security is optional and controlled by env variables.

Start locally:

```bash
npm install
npm start
# WebSocket: ws://localhost:8080/3gpp-swap/v1
# Health:    http://localhost:8080/health
```

Enable hop‑by‑hop security:

```bash
SWAP_SECURITY_ENABLED=true SWAP_SHARED_SECRET=secret123 npm start
```

WebRTC Example Using SWAP
-------------------------

Below demonstrates a simple offer/answer flow using `SwapClient` and the WebRTC API.

Notes:
- SWAP v1 requires offers/answers include all ICE candidates (no trickle).
- Ensure you wait for ICE gathering to complete before sending offer/answer.

Answerer (Registers + Accepts)
------------------------------

```js
// Browser: use the prebuilt bundle
import { SwapClient, CriteriaBuilder } from './swap-protocol/dist/browser/swap.esm.js';

const answerer = new SwapClient({ host: 'localhost', port: 8080, secure: false });
await answerer.connect();

// Register so we can be found by initiators
await answerer.register(new CriteriaBuilder().withService('webrtc-demo').build());

// When a connect (offer) arrives, set it as remote description and reply with an answer
answerer.on('connect', async (offerSdp, sourceId) => {
  const pc = new RTCPeerConnection();
  pc.onicecandidate = (e) => { /* observe for completion */ };

  await pc.setRemoteDescription({ type: 'offer', sdp: offerSdp });
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  // Wait until ICE gathering is complete
  await new Promise((resolve) => {
    const t = setInterval(() => {
      if (pc.iceGatheringState === 'complete') { clearInterval(t); resolve(); }
    }, 100);
  });

  await answerer.accept(sourceId, pc.localDescription.sdp);
});
```

Initiator (Creates Offer)
------------------------

```js
// Browser: use the prebuilt bundle
import { SwapClient, CriteriaBuilder } from './swap-protocol/dist/browser/swap.esm.js';

const initiator = new SwapClient({ host: 'localhost', port: 8080, secure: false });
await initiator.connect();

// Create and fully gather an SDP offer
const pc = new RTCPeerConnection();
const data = pc.createDataChannel('chat');
await pc.setLocalDescription(await pc.createOffer());

await new Promise((resolve) => {
  const t = setInterval(() => {
    if (pc.iceGatheringState === 'complete') { clearInterval(t); resolve(); }
  }, 100);
});

// Send connect with criteria to target an answerer
await initiator.connectOffer(
  pc.localDescription.sdp,
  new CriteriaBuilder().withService('webrtc-demo').build()
);

// When the answer returns, set remote description
initiator.on('accept', async (answerSdp) => {
  await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
  // Data channel should open shortly thereafter
});
```

API Overview
------------

- `SwapClient(options)`
  - `host`, `port`, `secure` (use `false` for ws, `true` for wss)
  - `security`: `{ enabled, integrity, encryption, sharedSecret }`
  - Methods: `connect()`, `register(criteria)`, `connectOffer(offer, criteria)`, `accept(target, answer)`, `reject(target, reason)`, `update(target, sdp)`, `close(target)`, `sendApp(target, type, value)`
  - Events: `registered`, `connect`, `accept`, `reject`, `update`, `close`, `application`, `error`

- `CriteriaBuilder()`
  - `.withService(name)`, `.withQos(level)`, `.withLocation(loc)`, `.withUser(user)`, `.withApp(app)`, `.with(type, value)`

- `SecurityManager`
  - Hop‑by‑hop HMAC (integrity) and AES‑GCM (encryption). The server protects responses and relayed messages when both sides support security and it is enabled on the server.

- `SdpValidator`
  - `validateOffer(sdp)`, `validateAnswer(sdp)`; ensures no trickle ICE and that candidates exist.

Development
-----------

- Run unit tests for the library:

```bash
cd swap-protocol
npm install
npm test
```

- Example browser demo (plaintext):
  - Build the browser bundle: `cd swap-protocol && npm run build:browser`
  - Then serve `examples/webrtc-demo/index.html` (e.g., `npx http-server examples/webrtc-demo -p 8081`).
  - The demo imports from `swap-protocol/dist/browser/swap.esm.js`.

Node Usage (Client + Server)
----------------------------

Use the Node entry to access `SwapServer` (and the client):

```js
import { SwapServer, SwapClient, CriteriaBuilder } from './swap-protocol/src/index.node.js';

const server = new SwapServer({ port: 8443, host: '0.0.0.0' });
await server.start();

const client = new SwapClient({ host: 'localhost', port: 8443, secure: false });
await client.connect();
await client.register(new CriteriaBuilder().withService('video-call').build());
```

If you only need the client in Node, `src/index.node.js` also exports `SwapClient`.

Notes
-----

- This implementation focuses on SWAP v1 and a pragmatic, modular library with optional hop‑by‑hop security.
- End‑to‑end media security should be handled by WebRTC itself (DTLS/SRTP). If you need end‑to‑end application message encryption, you can implement app‑level crypto on top.
- For production use, consider persistence, authentication, rate limiting, and horizontal scaling (e.g., Redis for session coordination).
