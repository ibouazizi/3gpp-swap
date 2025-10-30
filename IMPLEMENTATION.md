# SWAP Protocol JavaScript Library - Implementation Plan

## Executive Summary

This document outlines the implementation plan for a modular, production-ready JavaScript library implementing the 3GPP SWAP (Simple WebRTC Application Protocol) v1 specification as defined in TS 26.113 v19.1.0.

SWAP is a WebRTC signaling protocol that enables real-time communication for immersive applications (AR/XR). This library will provide a complete, spec-compliant implementation with both client and server capabilities.

## 1. Protocol Overview

### 1.1 What is SWAP?

**SWAP (Simple WebRTC Application Protocol)** is a signaling protocol for WebRTC-based real-time communication defined by 3GPP. It provides:

- WebSocket-based message exchange for WebRTC session establishment
- Support for both peer-to-peer and server-relayed communication
- Endpoint registration with capability matching
- SDP offer/answer exchange following JSEP (RFC 8829)
- Security through message integrity and encryption
- Application-specific extensible messaging

### 1.2 Key Features

- **Transport**: WebSocket Secure (WSS) protocol
- **Protocol Version**: v1 (URI path: `/3gpp-swap/v1`)
- **Subprotocol**: `3gpp.SWAP.v1`
- **Message Format**: JSON
- **State Machine**: JSEP-compliant state tracking
- **Security**: WebCrypto API for integrity and encryption
- **Error Format**: RFC 7807 Problem Details

### 1.3 Supported Message Types

1. **Register** - Register endpoint with SWAP server
2. **Response** - Acknowledgment or error response
3. **Connect** - Initiate connection with SDP offer
4. **Accept** - Accept connection with SDP answer
5. **Reject** - Reject connection with reason
6. **Update** - Update session with new SDP
7. **Close** - Terminate session
8. **Application** - Custom application-specific messages

## 2. Library Architecture

### 2.1 Package Structure

```
swap-protocol/
├── src/
│   ├── core/
│   │   ├── SwapClient.js         # Main client implementation
│   │   ├── SwapServer.js         # Server relay implementation
│   │   ├── SwapPeer.js           # Peer-to-peer endpoint
│   │   └── SessionManager.js     # Session state management
│   │
│   ├── messages/
│   │   ├── SwapMessage.js        # Base message class
│   │   ├── RegisterMessage.js
│   │   ├── ResponseMessage.js
│   │   ├── ConnectMessage.js
│   │   ├── AcceptMessage.js
│   │   ├── RejectMessage.js
│   │   ├── UpdateMessage.js
│   │   ├── CloseMessage.js
│   │   ├── ApplicationMessage.js
│   │   └── MessageFactory.js     # Message builder/parser
│   │
│   ├── transport/
│   │   ├── WebSocketTransport.js # WebSocket connection manager
│   │   ├── MessageQueue.js       # Message queuing
│   │   └── ReconnectionManager.js # Auto-reconnect logic
│   │
│   ├── matching/
│   │   ├── MatchingCriteria.js   # Criteria definition
│   │   ├── MatchingEngine.js     # Server-side matching logic
│   │   └── CriteriaBuilder.js    # Fluent builder API
│   │
│   ├── state/
│   │   ├── StateMachine.js       # JSEP state machine
│   │   └── StateValidator.js     # State transition validation
│   │
│   ├── security/
│   │   ├── IntegrityProtection.js # HMAC/MAC implementation
│   │   ├── Encryption.js         # AES-GCM encryption
│   │   ├── KeyDerivation.js      # Key management
│   │   └── SecurityManager.js    # Unified security interface
│   │
│   ├── sdp/
│   │   ├── SdpValidator.js       # SDP validation
│   │   ├── IceGatherer.js        # ICE candidate collection
│   │   └── SdpUtils.js           # SDP parsing utilities
│   │
│   ├── errors/
│   │   ├── SwapError.js          # Base error class
│   │   ├── ProblemDetails.js     # RFC 7807 formatter
│   │   └── ErrorTypes.js         # Predefined error constants
│   │
│   └── utils/
│       ├── IdGenerator.js        # Unique ID generation
│       ├── Validator.js          # Schema validation
│       └── Logger.js             # Logging utilities
│
├── examples/
│   ├── peer-to-peer-chat/
│   ├── server-relay-video/
│   └── custom-messages/
│
├── test/
│   ├── unit/
│   ├── integration/
│   └── mocks/
│
├── docs/
│   ├── api/
│   ├── guides/
│   └── examples/
│
└── package.json
```

### 2.2 Module Dependencies

```
Core Module Dependency Graph:

SwapClient/SwapServer/SwapPeer
    ↓
SessionManager ← StateMachine
    ↓
WebSocketTransport ← MessageQueue
    ↓
MessageFactory → [All Message Classes]
    ↓
SwapMessage (base)
```

## 3. Detailed Component Specifications

### 3.1 Message System

#### 3.1.1 Base Message Structure

```javascript
class SwapMessage {
  constructor(messageType) {
    this.version = 1;                    // Protocol version
    this.source_id = generateSourceId(); // Unique source identifier
    this.message_id = 0;                 // Auto-increment per source
    this.message_type = messageType;     // Message type string
  }

  // Common methods
  validate()        // Schema validation
  serialize()       // Convert to JSON
  static parse()    // Parse from JSON
  sign()           // Add integrity protection
  encrypt()        // Encrypt payload
}
```

#### 3.1.2 Message Type Implementations

**RegisterMessage**
```javascript
{
  version: 1,
  source_id: "unique-id-123",
  message_id: 1,
  message_type: "register",
  matching_criteria: [
    { type: "service", value: "video-call" },
    { type: "qos", value: "high-quality" },
    { type: "processing", value: "gpu-accelerated" }
  ]
}
```

**ConnectMessage**
```javascript
{
  version: 1,
  source_id: "client-xyz",
  message_id: 2,
  message_type: "connect",
  offer: "v=0\r\no=...",  // SDP offer
  matching_criteria: [...]
}
```

**AcceptMessage**
```javascript
{
  version: 1,
  source_id: "server-abc",
  message_id: 1,
  message_type: "accept",
  target: "client-xyz",
  answer: "v=0\r\no=..."  // SDP answer
}
```

### 3.2 WebSocket Transport Layer

#### 3.2.1 Connection Management

```javascript
class WebSocketTransport extends EventEmitter {
  constructor(options) {
    this.uri = buildSwapUri(options);
    this.ws = null;
    this.queue = new MessageQueue();
    this.reconnect = new ReconnectionManager();
  }

  connect() {
    // Connect to wss://{host}/3gpp-swap/v1
    // Include Sec-WebSocket-Protocol: 3gpp.SWAP.v1
  }

  send(message) {
    // Queue if not connected
    // Send when ready
  }

  onMessage(callback) {
    // Handle incoming messages
  }
}
```

#### 3.2.2 URI Construction

Format: `wss://{host}:{port}/{prefix}/3gpp-swap/v1`

```javascript
function buildSwapUri(options) {
  const { host, port = 443, prefix = '' } = options;
  const basePath = prefix ? `/${prefix}` : '';
  return `wss://${host}:${port}${basePath}/3gpp-swap/v1`;
}
```

### 3.3 State Machine

#### 3.3.1 JSEP-Compliant States

```javascript
const States = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  CLOSING: 'closing'
};

const Transitions = {
  [States.IDLE]: {
    'connect': States.CONNECTING,
    'accept_incoming': States.CONNECTING
  },
  [States.CONNECTING]: {
    'accept': States.CONNECTED,
    'reject': States.IDLE
  },
  [States.CONNECTED]: {
    'update': States.CONNECTED,
    'close': States.CLOSING
  },
  [States.CLOSING]: {
    'closed': States.IDLE
  }
};
```

#### 3.3.2 State Validation

```javascript
class StateValidator {
  canSendMessage(currentState, messageType) {
    // Validate if message type is allowed in current state
    // e.g., can't send 'connect' if already connected
  }

  getNextState(currentState, event) {
    // Return next state based on event
  }
}
```

### 3.4 Matching Criteria System

#### 3.4.1 Criteria Types

```javascript
const CriteriaTypes = {
  // Network identifiers
  IPV4: 'ipv4',
  IPV6: 'ipv6',
  FQDN: 'fqdn',

  // Service identifiers
  SERVICE: 'service',
  USER: 'user',
  EAS: 'eas',
  APP: 'app',

  // Capability identifiers
  LOCATION: 'location',
  QOS: 'qos',
  PROCESSING: 'processing'
};
```

#### 3.4.2 Matching Engine (Server-side)

```javascript
class MatchingEngine {
  constructor() {
    this.registry = new Map(); // endpoint -> criteria
  }

  register(endpointId, criteria) {
    // Store endpoint with its criteria
  }

  findMatches(criteria) {
    // Find all endpoints matching ALL provided criteria
    // Returns array of matching endpoint IDs
  }

  selectEndpoint(matches) {
    // Randomly select from matches
    // Deprioritize endpoints with fewer criteria
  }
}
```

#### 3.4.3 Criteria Builder

```javascript
class CriteriaBuilder {
  constructor() {
    this.criteria = [];
  }

  withService(serviceName) {
    this.criteria.push({ type: 'service', value: serviceName });
    return this;
  }

  withQos(qosLevel) {
    this.criteria.push({ type: 'qos', value: qosLevel });
    return this;
  }

  withLocation(location) {
    this.criteria.push({ type: 'location', value: location });
    return this;
  }

  build() {
    return this.criteria;
  }
}
```

### 3.5 Client API

#### 3.5.1 SwapClient

```javascript
class SwapClient extends EventEmitter {
  constructor(options) {
    this.transport = new WebSocketTransport(options);
    this.state = new StateMachine();
    this.sessionManager = new SessionManager();
    this.security = new SecurityManager(options.security);
  }

  // Register with SWAP server
  async register(criteria) {
    const msg = new RegisterMessage(criteria);
    await this.send(msg);
  }

  // Connect to peer
  async connect(offer, criteria) {
    const msg = new ConnectMessage(offer, criteria);
    const response = await this.sendAndWait(msg);
    return response;
  }

  // Accept incoming connection
  async accept(target, answer) {
    const msg = new AcceptMessage(target, answer);
    await this.send(msg);
  }

  // Reject connection
  async reject(target, reason) {
    const msg = new RejectMessage(target, reason);
    await this.send(msg);
  }

  // Update session
  async update(target, sdp) {
    const msg = new UpdateMessage(target, sdp);
    await this.send(msg);
  }

  // Close session
  async close(target) {
    const msg = new CloseMessage(target);
    await this.send(msg);
  }

  // Send custom application message
  async sendApp(target, type, value) {
    const msg = new ApplicationMessage(target, type, value);
    await this.send(msg);
  }

  // Event handlers
  on('registered', (response) => {})
  on('connect', (offer, source) => {})
  on('accept', (answer, source) => {})
  on('reject', (reason, source) => {})
  on('update', (sdp, source) => {})
  on('close', (source) => {})
  on('application', (type, value, source) => {})
  on('error', (error) => {})
}
```

#### 3.5.2 Usage Example

```javascript
// Client A - Initiator
const clientA = new SwapClient({
  host: 'swap.example.com',
  port: 443,
  security: { enabled: true, sharedSecret: 'secret123' }
});

await clientA.connect();

// Register with server
await clientA.register(
  new CriteriaBuilder()
    .withService('video-call')
    .withQos('high')
    .build()
);

// Create WebRTC offer
const pc = new RTCPeerConnection();
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

// Wait for ICE gathering (SWAP v1 requirement)
await waitForIceGathering(pc);

// Send connect with full ICE candidates
const response = await clientA.connect(
  pc.localDescription.sdp,
  new CriteriaBuilder().withService('video-call').build()
);

// Handle response
clientA.on('accept', async (answer, source) => {
  await pc.setRemoteDescription({ type: 'answer', sdp: answer });
});
```

### 3.6 Server API

#### 3.6.1 SwapServer

```javascript
class SwapServer extends EventEmitter {
  constructor(options) {
    this.wss = new WebSocketServer(options);
    this.sessions = new SessionManager();
    this.matching = new MatchingEngine();
    this.security = new SecurityManager(options.security);
  }

  start() {
    // Start WebSocket server
    // Listen on: wss://{host}:{port}/3gpp-swap/v1
  }

  // Handle client connections
  onConnection(ws) {
    // Set up message handlers
    // Track endpoint
  }

  // Handle registration
  onRegister(endpoint, criteria) {
    this.matching.register(endpoint, criteria);
    this.sendResponse(endpoint, 'ack');
  }

  // Handle connect
  onConnect(source, offer, criteria) {
    const targets = this.matching.findMatches(criteria);
    if (targets.length === 0) {
      return this.sendError(source, 'target_unknown');
    }
    const target = this.matching.selectEndpoint(targets);
    this.relayMessage(target, 'connect', { source, offer });
    this.sessions.create(source, target);
  }

  // Relay messages between endpoints
  relayMessage(target, type, data) {
    const endpoint = this.endpoints.get(target);
    endpoint.send(JSON.stringify({ ...data, message_type: type }));
  }

  // Event hooks for monitoring
  on('session_created', (source, target) => {})
  on('session_closed', (source, target) => {})
  on('error', (error) => {})
}
```

### 3.7 Security Implementation

#### 3.7.1 Key Derivation

```javascript
class KeyDerivation {
  async deriveKey(sharedSecret, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(sharedSecret),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
}
```

#### 3.7.2 Integrity Protection

```javascript
class IntegrityProtection {
  async sign(message, key) {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(message));

    const signature = await crypto.subtle.sign(
      { name: 'HMAC', hash: 'SHA-256' },
      key,
      data
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  async verify(message, signature, key) {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(message));
    const sig = Uint8Array.from(atob(signature), c => c.charCodeAt(0));

    return crypto.subtle.verify(
      { name: 'HMAC', hash: 'SHA-256' },
      key,
      sig,
      data
    );
  }
}
```

#### 3.7.3 Encryption

```javascript
class Encryption {
  async encrypt(payload, key) {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(JSON.stringify(payload))
    );

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv))
    };
  }

  async decrypt(ciphertext, iv, key) {
    const encrypted = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivArray },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }
}
```

### 3.8 Error Handling

#### 3.8.1 RFC 7807 Problem Details

```javascript
class ProblemDetails {
  static create(type, title, detail, status) {
    return {
      type: `http://forge.3gpp.org/sa4/swap/${type}.html`,
      title,
      detail,
      status
    };
  }

  static MESSAGE_UNKNOWN = () => this.create(
    'message_unknown',
    'Message type unknown',
    'The message type is not recognized',
    400
  );

  static MESSAGE_MALFORMATTED = () => this.create(
    'message_malformatted',
    'Message malformatted',
    'The message does not conform to the schema',
    400
  );

  static TARGET_UNKNOWN = () => this.create(
    'target_unknown',
    'Target cannot be located',
    'No endpoint matches the provided criteria',
    404
  );

  static UNAUTHORIZED = () => this.create(
    'unauthorized',
    'Unauthorized',
    'Authentication or authorization failed',
    401
  );
}
```

#### 3.8.2 Custom Error Classes

```javascript
class SwapError extends Error {
  constructor(problemDetails) {
    super(problemDetails.detail);
    this.name = 'SwapError';
    this.type = problemDetails.type;
    this.title = problemDetails.title;
    this.status = problemDetails.status;
  }
}

class ConnectionError extends SwapError {}
class ValidationError extends SwapError {}
class SecurityError extends SwapError {}
```

## 4. SDP & WebRTC Integration

### 4.1 ICE Gathering Helper

```javascript
class IceGatherer {
  static async waitForGathering(peerConnection) {
    if (peerConnection.iceGatheringState === 'complete') {
      return;
    }

    return new Promise((resolve) => {
      const checkState = () => {
        if (peerConnection.iceGatheringState === 'complete') {
          peerConnection.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };

      peerConnection.addEventListener('icegatheringstatechange', checkState);
    });
  }
}
```

### 4.2 WebRTC Integration Example

```javascript
class SwapWebRTCHelper {
  constructor(swapClient) {
    this.swap = swapClient;
    this.pc = null;
  }

  async createOffer(config) {
    this.pc = new RTCPeerConnection(config);

    // Create offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Wait for ICE gathering (SWAP v1 requirement)
    await IceGatherer.waitForGathering(this.pc);

    return this.pc.localDescription.sdp;
  }

  async sendOffer(offer, criteria) {
    return new Promise((resolve, reject) => {
      this.swap.connect(offer, criteria)
        .catch(reject);

      this.swap.once('accept', async (answer) => {
        await this.pc.setRemoteDescription({
          type: 'answer',
          sdp: answer
        });
        resolve(this.pc);
      });

      this.swap.once('reject', (reason) => {
        reject(new Error(`Connection rejected: ${reason}`));
      });
    });
  }
}
```

## 5. Testing Strategy

### 5.1 Unit Tests

- Message serialization/deserialization
- State machine transitions
- Matching criteria logic
- Security functions (encryption, integrity)
- ID generation and validation
- Error handling and formatting

### 5.2 Integration Tests

```javascript
describe('SWAP End-to-End', () => {
  it('should establish peer-to-peer connection', async () => {
    const server = new SwapServer({ port: 8443 });
    await server.start();

    const clientA = new SwapClient({ host: 'localhost', port: 8443 });
    const clientB = new SwapClient({ host: 'localhost', port: 8443 });

    await clientA.connect();
    await clientB.connect();

    await clientB.register([{ type: 'service', value: 'test' }]);

    const offer = 'v=0...';
    const answerPromise = new Promise((resolve) => {
      clientB.once('connect', async (receivedOffer, source) => {
        const answer = 'v=0...answer';
        await clientB.accept(source, answer);
      });
    });

    clientA.once('accept', (answer) => {
      expect(answer).toBe('v=0...answer');
    });

    await clientA.connect(offer, [{ type: 'service', value: 'test' }]);
  });
});
```

### 5.3 Test Coverage Targets

- Unit tests: 95%+ code coverage
- Integration tests: All major flows
- Security tests: All crypto operations
- Error scenarios: All error types

## 6. Development Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Project setup and configuration
- [ ] Base message classes
- [ ] JSON schema validation
- [ ] Message factory
- [ ] Unit tests for messages

### Phase 2: Transport (Week 1-2)
- [ ] WebSocket transport layer
- [ ] Connection management
- [ ] Message queuing
- [ ] Reconnection logic
- [ ] Transport tests

### Phase 3: State & Matching (Week 2)
- [ ] State machine implementation
- [ ] State validators
- [ ] Matching criteria system
- [ ] Matching engine
- [ ] State/matching tests

### Phase 4: Client & Server (Week 2-3)
- [ ] SwapClient implementation
- [ ] SwapServer implementation
- [ ] SwapPeer implementation
- [ ] Session management
- [ ] Integration tests

### Phase 5: Security (Week 3)
- [ ] Key derivation
- [ ] Integrity protection
- [ ] Encryption
- [ ] Security manager
- [ ] Security tests

### Phase 6: WebRTC Integration (Week 3-4)
- [ ] SDP validation
- [ ] ICE gathering helpers
- [ ] WebRTC helper API
- [ ] Example applications
- [ ] E2E tests

### Phase 7: Documentation & Polish (Week 4)
- [ ] API documentation
- [ ] Usage guides
- [ ] Example applications
- [ ] Performance optimization
- [ ] Release preparation

## 7. API Examples

### 7.1 Simple Peer-to-Peer

```javascript
// Endpoint A (Listener)
const peerA = new SwapPeer({ listen: true, port: 9443 });
await peerA.start();

peerA.on('connect', async (offer, source) => {
  const answer = await createAnswer(offer);
  await peerA.accept(source, answer);
});

// Endpoint B (Connector)
const peerB = new SwapPeer({ host: 'peer-a.local', port: 9443 });
await peerB.connect();

const offer = await createOffer();
const answer = await peerB.sendConnect(offer);
```

### 7.2 Server-Relayed Connection

```javascript
// Server
const server = new SwapServer({
  port: 8443,
  security: { enabled: true }
});
await server.start();

server.on('session_created', (source, target) => {
  console.log(`Session: ${source} ↔ ${target}`);
});

// Client 1 (Answerer)
const client1 = new SwapClient({ host: 'server.com', port: 8443 });
await client1.connect();
await client1.register([
  { type: 'service', value: 'video-call' },
  { type: 'user', value: 'alice@example.com' }
]);

client1.on('connect', async (offer, source) => {
  const answer = await createAnswer(offer);
  await client1.accept(source, answer);
});

// Client 2 (Offerer)
const client2 = new SwapClient({ host: 'server.com', port: 8443 });
await client2.connect();

const offer = await createOffer();
const response = await client2.connect(offer, [
  { type: 'user', value: 'alice@example.com' }
]);
```

### 7.3 Custom Application Messages

```javascript
// Define custom message type
const CUSTOM_MSG_TYPE = 'urn:example:chat:v1';

// Client A
clientA.on('application', (type, value, source) => {
  if (type === CUSTOM_MSG_TYPE) {
    console.log(`Chat from ${source}: ${value.text}`);
  }
});

// Client B
await clientB.sendApp(
  targetId,
  CUSTOM_MSG_TYPE,
  { text: 'Hello!', timestamp: Date.now() }
);
```

## 8. Configuration Options

### 8.1 Client Configuration

```javascript
const config = {
  // Connection
  host: 'swap.example.com',
  port: 443,
  prefix: 'api',  // Optional path prefix

  // Security
  security: {
    enabled: true,
    sharedSecret: 'secret123',
    algorithm: 'AES-GCM',
    keyLength: 256
  },

  // Reconnection
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  },

  // Timeouts
  timeout: {
    connection: 10000,
    response: 5000,
    keepAlive: 30000
  },

  // Logging
  logger: customLogger,
  logLevel: 'info'
};
```

### 8.2 Server Configuration

```javascript
const config = {
  // Server
  port: 8443,
  host: '0.0.0.0',
  path: '/3gpp-swap/v1',

  // TLS
  tls: {
    key: fs.readFileSync('server-key.pem'),
    cert: fs.readFileSync('server-cert.pem')
  },

  // Security
  security: {
    enabled: true,
    requireAuth: true
  },

  // Limits
  maxConnections: 1000,
  maxMessageSize: 1024 * 1024,  // 1MB

  // Session management
  sessionTimeout: 300000,  // 5 minutes
  cleanupInterval: 60000   // 1 minute
};
```

## 9. Performance Considerations

### 9.1 Message Queuing

- Queue messages when connection is unavailable
- Batch messages when possible
- Priority queue for time-sensitive messages

### 9.2 Connection Pooling (Server)

- Reuse WebSocket connections
- Connection limits per client
- Graceful degradation under load

### 9.3 Memory Management

- Clean up closed sessions
- Limit message history
- Efficient matching algorithm (indexed lookup)

### 9.4 Scalability

- Horizontal scaling with session affinity
- Redis for distributed session storage
- Load balancer support

## 10. Compliance Checklist

### 10.1 Protocol Requirements

- [x] WebSocket Secure (WSS) transport
- [x] URI format: `/3gpp-swap/v1`
- [x] Subprotocol: `3gpp.SWAP.v1`
- [x] All 8 message types
- [x] Common message fields (version, source_id, message_id, message_type)
- [x] Source ID: min 10 UTF-8 characters
- [x] Message ID: positive monotonic integers
- [x] JSEP state machine compliance
- [x] No ICE trickling (v1 limitation)
- [x] No preliminary answers (v1 limitation)
- [x] RFC 7807 error format
- [x] Predefined error types
- [x] Matching criteria types (10 types)
- [x] Security: integrity & encryption

### 10.2 Optional Features

- [ ] Server clustering
- [ ] Redis-based session storage
- [ ] Metrics and monitoring
- [ ] Rate limiting
- [ ] Advanced logging

## 11. Future Enhancements

### Version 2.0 Considerations

- ICE trickling support
- Preliminary answer support
- Enhanced security options
- Performance metrics API
- Protocol negotiation
- Backward compatibility layer

## 12. Dependencies

### Production Dependencies

```json
{
  "ws": "^8.x",           // WebSocket server (Node.js only)
  "uuid": "^9.x"          // ID generation
}
```

### Development Dependencies

```json
{
  "typescript": "^5.x",
  "jest": "^29.x",
  "eslint": "^8.x",
  "prettier": "^3.x",
  "@types/ws": "^8.x",
  "@types/node": "^20.x"
}
```

## 13. Build & Distribution

### 13.1 Build Targets

- **ESM**: Modern ES modules (`dist/esm/`)
- **CommonJS**: Node.js compatibility (`dist/cjs/`)
- **UMD**: Browser bundle (`dist/umd/`)
- **Types**: TypeScript definitions (`dist/types/`)

### 13.2 Package.json

```json
{
  "name": "swap-protocol",
  "version": "1.0.0",
  "description": "3GPP SWAP (Simple WebRTC Application Protocol) implementation",
  "main": "dist/cjs/index.js",
  "module": "dist/esm/index.js",
  "browser": "dist/umd/swap.min.js",
  "types": "dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/types/index.d.ts"
    }
  },
  "engines": {
    "node": ">=16.0.0"
  },
  "keywords": [
    "swap",
    "3gpp",
    "webrtc",
    "signaling",
    "websocket",
    "real-time"
  ]
}
```

## 14. Documentation Structure

### 14.1 API Documentation

- Auto-generated from JSDoc comments
- Hosted on GitHub Pages
- Searchable API reference
- Type definitions

### 14.2 Guides

1. **Getting Started**
   - Installation
   - Basic concepts
   - First connection

2. **Client Guide**
   - Creating a client
   - Registering
   - Connecting
   - Handling events

3. **Server Guide**
   - Setting up a server
   - Matching configuration
   - Session management
   - Security

4. **Security Guide**
   - Enabling security
   - Key management
   - Best practices

5. **WebRTC Integration**
   - Creating offers/answers
   - ICE gathering
   - Helper utilities

6. **Advanced Topics**
   - Custom messages
   - Error handling
   - Performance tuning

## 15. Success Metrics

### 15.1 Code Quality

- Test coverage: >90%
- No critical security issues
- ESLint: zero errors
- TypeScript: strict mode

### 15.2 Performance

- Connection establishment: <200ms
- Message latency: <50ms
- Memory usage: <50MB (1000 connections)
- Zero memory leaks

### 15.3 Documentation

- 100% API coverage
- All examples working
- Clear migration guide
- Active community

## 16. Existing Server Implementation

### 16.1 Current Server Architecture

The project includes a basic SWAP server implementation in `server.js` that demonstrates the core protocol functionality. Here's an overview of the current implementation:

#### 16.1.1 Server Components

**SwapServer Class**
- Manages WebSocket connections for SWAP protocol
- Maintains endpoint registry with matching criteria
- Tracks active sessions between endpoints
- Handles all 8 SWAP message types
- Implements message routing and forwarding

**Key Data Structures:**
```javascript
registeredEndpoints: Map<source, {ws, criteria, messageId}>
activeSessions: Map<sessionId, {source1, source2, state}>
pendingConnections: Map<source, {target, offer, messageId}>
```

#### 16.1.2 Implemented Features

**✅ Message Handling:**
- Register - Endpoint registration with criteria
- Connect - Connection initiation with SDP offer
- Accept - Connection acceptance with SDP answer
- Reject - Connection rejection with reason
- Update - Session updates with new SDP
- Close - Session termination
- Application - Custom message forwarding
- Response - Acknowledgment handling

**✅ Core Functionality:**
- WebSocket connection management
- Message validation and routing
- Endpoint matching based on criteria
- Session lifecycle management
- Automatic cleanup on disconnect
- Health check endpoint (`/health`)

**✅ Protocol Compliance:**
- WebSocket Secure (WSS) ready
- URI path: `/3gpp-swap/v1/`
- Subprotocol: `3gpp.SWAP.v1`
- JSON message format
- RFC 7807 error responses

#### 16.1.3 Server Dependencies

```json
{
  "dependencies": {
    "ws": "^8.x",           // WebSocket server
    "express": "^4.x",      // HTTP server framework
    "uuid": "^9.x"          // Unique ID generation
  }
}
```

#### 16.1.4 Required Common Module

The server depends on a `common/swap-messages.js` module that needs to be implemented with:

```javascript
// common/swap-messages.js
module.exports = {
  MessageTypes: {
    REGISTER: 'register',
    CONNECT: 'connect',
    ACCEPT: 'accept',
    REJECT: 'reject',
    UPDATE: 'update',
    CLOSE: 'close',
    APPLICATION: 'application',
    RESPONSE: 'response'
  },

  ErrorTypes: {
    MESSAGE_UNKNOWN: 'message_unknown',
    MESSAGE_MALFORMATTED: 'message_malformatted',
    TARGET_UNKNOWN: 'target_unknown',
    UNAUTHORIZED: 'unauthorized'
  },

  validateSwapMessage: function(message) {
    // JSON schema validation
    // Returns true if valid, false otherwise
  },

  SwapMessageBuilder: class {
    constructor(sourceId) {
      this.sourceId = sourceId;
      this.messageId = 0;
    }

    createResponse(responseToId, status, statusText, error = null) {
      return {
        version: 1,
        source: this.sourceId,
        message_id: ++this.messageId,
        message_type: 'response',
        response_to: responseToId,
        status,
        statusText,
        error
      };
    }

    createClose(target) {
      return {
        version: 1,
        source: this.sourceId,
        message_id: ++this.messageId,
        message_type: 'close',
        target
      };
    }
  }
};
```

### 16.2 Refactoring Server to Use Shared SWAP Library

#### 16.2.1 Architecture Overview

The current `server.js` implementation should be refactored to use the same SWAP library that clients use. This approach provides several benefits:

**Benefits:**
- ✅ Code reuse and reduced duplication
- ✅ Consistent message handling across client and server
- ✅ Shared validation logic
- ✅ Easier maintenance and testing
- ✅ Single source of truth for protocol implementation
- ✅ Automatic updates when library is updated

**Shared Components:**
```
swap-protocol/
├── src/
│   ├── messages/          # Shared by client & server
│   ├── errors/            # Shared by client & server
│   ├── utils/             # Shared by client & server
│   ├── security/          # Shared by client & server
│   ├── client/            # Client-specific
│   │   ├── SwapClient.js
│   │   └── SwapPeer.js
│   └── server/            # Server-specific
│       └── SwapServer.js
└── examples/
    └── standalone-server/  # Server deployment example
```

#### 16.2.2 Refactored Server Implementation

**Step 1: Import from SWAP Library**

Instead of:
```javascript
const {
  MessageTypes,
  ErrorTypes,
  validateSwapMessage,
  SwapMessageBuilder
} = require('../common/swap-messages');
```

Use:
```javascript
const {
  MessageTypes,
  ErrorTypes,
  SwapMessage,
  RegisterMessage,
  ConnectMessage,
  AcceptMessage,
  RejectMessage,
  UpdateMessage,
  CloseMessage,
  ApplicationMessage,
  ResponseMessage
} = require('swap-protocol/messages');

const { ProblemDetails } = require('swap-protocol/errors');
const { IdGenerator } = require('swap-protocol/utils');
const { MatchingEngine } = require('swap-protocol/matching');
```

**Step 2: Refactored SwapServer Class**

```javascript
const WebSocket = require('ws');
const express = require('express');
const https = require('https');
const { SwapServer } = require('swap-protocol/server');

// Or create custom server extending base class
class CustomSwapServer extends SwapServer {
  constructor(options) {
    super(options);
    // Add custom functionality
    this.customFeatures = new Map();
  }

  // Override or extend methods as needed
  async handleCustomLogic(message) {
    // Custom business logic
  }
}

// Initialize
const swapServer = new CustomSwapServer({
  port: process.env.PORT || 8080,
  security: {
    enabled: true,
    requireAuth: false
  }
});

// Start server
swapServer.start();
```

**Step 3: Use Shared Message Classes**

Replace manual message construction:
```javascript
// OLD WAY
const response = {
  version: 1,
  source: this.serverSource,
  message_id: ++this.messageId,
  message_type: 'response',
  response_to: messageId,
  status: 200,
  statusText: 'OK'
};
```

With message classes:
```javascript
// NEW WAY - Using shared library
const response = new ResponseMessage({
  source: this.serverSource,
  responseTo: messageId,
  status: 200,
  statusText: 'OK'
});

// Serialize when sending
ws.send(response.serialize());
```

**Step 4: Use Shared Matching Engine**

```javascript
const { MatchingEngine, CriteriaBuilder } = require('swap-protocol/matching');

class SwapServerWithMatching extends SwapServer {
  constructor(options) {
    super(options);
    this.matchingEngine = new MatchingEngine({
      strategy: 'all-match',  // Match ALL criteria
      prioritize: true,       // Prioritize endpoints with more criteria
      randomSelect: true      // Random selection from matches
    });
  }

  handleRegister(ws, message) {
    const parsedMessage = RegisterMessage.parse(message);

    // Register with matching engine
    this.matchingEngine.register(
      parsedMessage.source,
      parsedMessage.criteria
    );

    // Send response
    const response = new ResponseMessage({
      source: this.serverSource,
      responseTo: parsedMessage.messageId,
      status: 200,
      statusText: 'Registered'
    });

    this.sendMessage(ws, response);
  }

  handleConnect(ws, message) {
    const parsedMessage = ConnectMessage.parse(message);

    // Find matches using shared engine
    const matches = this.matchingEngine.findMatches(
      parsedMessage.criteria,
      { exclude: parsedMessage.source }
    );

    if (matches.length === 0) {
      this.sendError(ws, parsedMessage.messageId,
        ProblemDetails.TARGET_UNKNOWN());
      return;
    }

    const targetSource = this.matchingEngine.selectEndpoint(matches);
    // ... forward message
  }
}
```

**Step 5: Use Shared Validation**

```javascript
const { MessageValidator } = require('swap-protocol/utils');

class SwapServerWithValidation extends SwapServer {
  handleMessage(ws, data) {
    try {
      // Parse message
      const message = JSON.parse(data.toString());

      // Validate using shared validator
      const validation = MessageValidator.validate(message);

      if (!validation.valid) {
        this.sendError(ws, message.message_id,
          ProblemDetails.MESSAGE_MALFORMATTED(),
          validation.errors.join(', ')
        );
        return;
      }

      // Route to handler
      this.routeMessage(ws, message);

    } catch (error) {
      this.sendError(ws, null,
        ProblemDetails.MESSAGE_MALFORMATTED(),
        error.message
      );
    }
  }
}
```

**Step 6: Use Shared Security Components**

```javascript
const { SecurityManager } = require('swap-protocol/security');

class SecureSwapServer extends SwapServer {
  constructor(options) {
    super(options);

    // Initialize shared security manager
    this.security = new SecurityManager({
      encryption: {
        enabled: options.security?.encryption || false,
        algorithm: 'AES-GCM',
        keyLength: 256
      },
      integrity: {
        enabled: options.security?.integrity || false,
        algorithm: 'HMAC-SHA256'
      }
    });
  }

  async handleMessage(ws, data) {
    const message = JSON.parse(data.toString());

    // Verify message integrity if enabled
    if (this.security.integrityEnabled) {
      const isValid = await this.security.verifyIntegrity(message);
      if (!isValid) {
        this.sendError(ws, message.message_id,
          ProblemDetails.UNAUTHORIZED(),
          'Message integrity check failed'
        );
        return;
      }
    }

    // Decrypt message if encrypted
    if (this.security.encryptionEnabled && message.encrypted) {
      message.payload = await this.security.decrypt(message.payload);
    }

    // Process message
    this.routeMessage(ws, message);
  }

  async sendMessage(ws, message) {
    let msgToSend = message;

    // Encrypt if enabled
    if (this.security.encryptionEnabled) {
      msgToSend = await this.security.encrypt(message);
    }

    // Add integrity signature if enabled
    if (this.security.integrityEnabled) {
      msgToSend = await this.security.addIntegrity(msgToSend);
    }

    // Send
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msgToSend.serialize());
    }
  }
}
```

#### 16.2.3 Complete Refactored Server Example

```javascript
// standalone-server.js
const { SwapServer } = require('swap-protocol/server');
const {
  MessageTypes,
  ResponseMessage,
  ProblemDetails
} = require('swap-protocol');

// Create server instance
const server = new SwapServer({
  // Server configuration
  port: process.env.PORT || 8080,
  host: process.env.HOST || '0.0.0.0',

  // WebSocket configuration
  websocket: {
    path: '/3gpp-swap/v1/',
    maxPayload: 1024 * 1024,
    subprotocol: '3gpp.SWAP.v1'
  },

  // Security configuration
  security: {
    enabled: true,
    encryption: true,
    integrity: true,
    authentication: {
      enabled: false,  // Add later
      type: 'jwt'
    }
  },

  // Matching configuration
  matching: {
    strategy: 'all-criteria',  // ALL criteria must match
    prioritize: true,          // Prioritize endpoints with more criteria
    randomSelect: true         // Random from matches
  },

  // Session configuration
  session: {
    timeout: 300000,           // 5 minutes
    cleanupInterval: 60000,    // 1 minute
    persistence: false         // Enable for Redis/DB
  },

  // Logging configuration
  logging: {
    level: 'info',
    format: 'json',
    destination: 'logs/swap-server.log'
  },

  // TLS/SSL (for production)
  tls: process.env.NODE_ENV === 'production' ? {
    key: fs.readFileSync('./certs/server-key.pem'),
    cert: fs.readFileSync('./certs/server-cert.pem')
  } : null
});

// Event handlers
server.on('started', () => {
  console.log(`SWAP server started on port ${server.port}`);
});

server.on('endpoint:registered', (source, criteria) => {
  console.log(`Endpoint registered: ${source}`);
});

server.on('session:created', (source1, source2, sessionId) => {
  console.log(`Session created: ${source1} ↔ ${source2}`);
});

server.on('session:closed', (sessionId) => {
  console.log(`Session closed: ${sessionId}`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

// Start server
server.start()
  .then(() => {
    console.log('Server ready');
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});
```

#### 16.2.4 Migration Steps from Current Implementation

**Phase 1: Install SWAP Library**

```bash
# If library is published to npm
npm install swap-protocol

# Or link local development version
cd /path/to/swap-protocol
npm link

cd /path/to/swap-server
npm link swap-protocol
```

**Phase 2: Create Migration Branch**

```bash
git checkout -b refactor/use-swap-library
```

**Phase 3: Replace Common Module**

1. Delete `common/swap-messages.js`
2. Replace imports:
   ```javascript
   // OLD
   const { MessageTypes } = require('../common/swap-messages');

   // NEW
   const { MessageTypes } = require('swap-protocol/messages');
   ```

**Phase 4: Refactor Message Handling**

Replace manual message construction with message classes:

```javascript
// OLD
const response = {
  version: 1,
  source: this.serverSource,
  message_id: ++this.messageId,
  message_type: 'response',
  response_to: responseToId,
  status,
  statusText,
  error
};

// NEW
const response = new ResponseMessage({
  source: this.serverSource,
  responseTo: responseToId,
  status,
  statusText,
  error
});
```

**Phase 5: Use Shared Validation**

```javascript
// OLD
if (!validateSwapMessage(message)) {
  // handle error
}

// NEW
const { MessageValidator } = require('swap-protocol/utils');
const validation = MessageValidator.validate(message);
if (!validation.valid) {
  // handle error with validation.errors
}
```

**Phase 6: Integrate Matching Engine**

```javascript
// OLD - Simple matching
findMatchingEndpoint(criteria, excludeSource) {
  for (const [source, endpoint] of this.registeredEndpoints.entries()) {
    if (source === excludeSource) continue;
    // Simple check...
  }
}

// NEW - Use shared engine
const { MatchingEngine } = require('swap-protocol/matching');
this.matchingEngine = new MatchingEngine({ strategy: 'all-match' });

// Register
this.matchingEngine.register(source, criteria);

// Find matches
const matches = this.matchingEngine.findMatches(criteria, { exclude });
```

**Phase 7: Add Error Handling**

```javascript
// OLD
this.sendError(ws, messageId, errorType, detail);

// NEW
const { ProblemDetails } = require('swap-protocol/errors');
const errorResponse = new ResponseMessage({
  source: this.serverSource,
  responseTo: messageId,
  status: 400,
  statusText: 'Bad Request',
  error: ProblemDetails.MESSAGE_MALFORMATTED(detail)
});
this.sendMessage(ws, errorResponse);
```

**Phase 8: Test Migration**

```bash
# Run tests
npm test

# Start server
npm start

# Test with client
node test-client.js
```

**Phase 9: Update Documentation**

Update README.md to reflect new architecture:
```markdown
## Architecture

This server uses the shared `swap-protocol` library for:
- Message handling and validation
- Endpoint matching
- Security (encryption & integrity)
- Error formatting (RFC 7807)

See the [SWAP Protocol Library](https://github.com/org/swap-protocol)
for more information.
```

#### 16.2.5 Comparison: Before and After

**Before (Current Implementation):**
```
server.js (500+ lines)
  ├── Manual message construction
  ├── Basic validation
  ├── Simple matching (ANY criteria)
  ├── Manual error formatting
  └── No security

common/swap-messages.js (200+ lines)
  ├── MessageTypes constants
  ├── ErrorTypes constants
  ├── Basic validation
  └── SwapMessageBuilder class

Total: ~700 lines of custom code
```

**After (Using SWAP Library):**
```
server.js (200 lines)
  ├── Import from swap-protocol
  ├── Configuration
  ├── Server initialization
  └── Event handlers

swap-protocol library
  ├── messages/          (shared)
  ├── matching/          (shared)
  ├── security/          (shared)
  ├── errors/            (shared)
  └── server/SwapServer.js (100 lines)

Total: ~300 lines of custom code
Shared: All validation, messages, security, matching
```

**Reduction: 57% less code, 100% shared logic**

#### 16.2.6 Benefits of Shared Library Approach

| Aspect | Current | With Shared Library |
|--------|---------|-------------------|
| Code duplication | High | None |
| Message validation | Manual | Automatic via JSON Schema |
| Matching logic | Basic (ANY) | Advanced (ALL, weighted) |
| Security | None | Built-in encryption & integrity |
| Error handling | Custom | RFC 7807 compliant |
| Testing | Separate | Shared test suite |
| Updates | Manual sync | Automatic via dependency |
| Type safety | None | TypeScript definitions |
| Documentation | Separate | Single source |

### 16.3 Standalone Server Deployment

#### 16.3.1 Project Setup

**1. Initialize npm package:**

```bash
# Create project directory
mkdir swap-server
cd swap-server

# Initialize package.json
npm init -y
```

**2. Install dependencies:**

```bash
npm install ws express uuid
npm install --save-dev nodemon pm2
```

**3. Create package.json:**

```json
{
  "name": "swap-server",
  "version": "1.0.0",
  "description": "3GPP SWAP Protocol Server",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "pm2:start": "pm2 start ecosystem.config.js",
    "pm2:stop": "pm2 stop swap-server",
    "pm2:restart": "pm2 restart swap-server",
    "pm2:delete": "pm2 delete swap-server",
    "pm2:logs": "pm2 logs swap-server",
    "pm2:monit": "pm2 monit"
  },
  "keywords": ["swap", "3gpp", "webrtc", "signaling"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "uuid": "^9.0.0",
    "ws": "^8.14.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "pm2": "^5.3.0"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
```

**4. Create directory structure:**

```bash
mkdir -p common
mkdir -p logs
mkdir -p config
```

#### 16.2.2 PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'swap-server',
    script: './server.js',
    instances: 1,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
      PORT: 8080
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8443
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    listen_timeout: 3000,
    kill_timeout: 5000
  }]
};
```

#### 16.2.3 Environment Configuration

Create `.env` file:

```bash
# Server Configuration
PORT=8080
HOST=0.0.0.0
NODE_ENV=development

# WebSocket Configuration
WS_PATH=/3gpp-swap/v1/
WS_MAX_PAYLOAD=1048576

# Session Configuration
SESSION_TIMEOUT=300000
CLEANUP_INTERVAL=60000

# Logging
LOG_LEVEL=info
```

Create `config/default.js`:

```javascript
require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 8080,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },
  websocket: {
    path: process.env.WS_PATH || '/3gpp-swap/v1/',
    maxPayload: parseInt(process.env.WS_MAX_PAYLOAD) || 1024 * 1024
  },
  session: {
    timeout: parseInt(process.env.SESSION_TIMEOUT) || 300000,
    cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL) || 60000
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
```

#### 16.2.4 SSL/TLS Configuration

For production with WSS (WebSocket Secure):

Create `config/ssl.js`:

```javascript
const fs = require('fs');
const path = require('path');

module.exports = {
  key: fs.readFileSync(path.join(__dirname, '../certs/server-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../certs/server-cert.pem')),
  ca: fs.readFileSync(path.join(__dirname, '../certs/ca-cert.pem')) // optional
};
```

Update server.js for HTTPS:

```javascript
const https = require('https');
const sslConfig = require('./config/ssl');

const server = https.createServer(sslConfig, app);
```

#### 16.2.5 Deployment Commands

**Development:**
```bash
# Run with nodemon (auto-reload)
npm run dev

# Run normally
npm start
```

**Production with PM2:**
```bash
# Start server
npm run pm2:start

# Or with production environment
pm2 start ecosystem.config.js --env production

# Stop server
npm run pm2:stop

# Restart server
npm run pm2:restart

# View logs
npm run pm2:logs

# Monitor performance
npm run pm2:monit

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# Delete server from PM2
npm run pm2:delete
```

**Docker Deployment:**

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run server
CMD ["node", "server.js"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  swap-server:
    build: .
    container_name: swap-server
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config
    networks:
      - swap-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8080/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

networks:
  swap-network:
    driver: bridge
```

**Docker commands:**
```bash
# Build image
docker build -t swap-server .

# Run container
docker run -d -p 8080:8080 --name swap-server swap-server

# Use docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

#### 16.2.6 Monitoring & Logging

**PM2 Monitoring:**
```bash
# Real-time monitoring
pm2 monit

# Web-based monitoring
pm2 install pm2-server-monit
pm2 web

# Metrics
pm2 describe swap-server
```

**Log Rotation with PM2:**

Install pm2-logrotate:
```bash
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

**Health Monitoring Script:**

Create `scripts/health-check.sh`:

```bash
#!/bin/bash

HEALTH_URL="http://localhost:8080/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
  echo "✓ Server is healthy"
  exit 0
else
  echo "✗ Server is unhealthy (HTTP $RESPONSE)"
  exit 1
fi
```

#### 16.2.7 Production Checklist

- [ ] Install dependencies: `npm ci --only=production`
- [ ] Configure environment variables
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules (allow ports 8080/8443)
- [ ] Set up reverse proxy (nginx/Apache) if needed
- [ ] Configure log rotation
- [ ] Set up monitoring and alerting
- [ ] Enable PM2 startup script
- [ ] Configure backup strategy
- [ ] Set up health check monitoring
- [ ] Document deployment procedures
- [ ] Test failover scenarios

## 17. Implementation ToDo Lists

### 17.1 Server Implementation ToDo

#### Phase 1: Core Dependencies (Priority: HIGH)
- [ ] Create `common/swap-messages.js` module
  - [ ] Define MessageTypes constants
  - [ ] Define ErrorTypes constants
  - [ ] Implement JSON schema validation
  - [ ] Create SwapMessageBuilder class
  - [ ] Add message serialization/deserialization
  - [ ] Write unit tests for message handling

#### Phase 2: Enhanced Matching (Priority: HIGH)
- [ ] Improve endpoint matching algorithm
  - [ ] Implement ALL criteria matching (not ANY)
  - [ ] Add criteria priority/weighting
  - [ ] Support complex criteria combinations
  - [ ] Add location-based matching
  - [ ] Add QoS-based matching
  - [ ] Add processing capability matching
  - [ ] Write matching engine tests

#### Phase 3: Security Implementation (Priority: HIGH)
- [ ] Add authentication
  - [ ] Implement token-based auth
  - [ ] Add API key validation
  - [ ] Support OAuth2/JWT
  - [ ] Add rate limiting per endpoint
- [ ] Add message encryption
  - [ ] Implement WebCrypto integration
  - [ ] Add key derivation
  - [ ] Add integrity protection (HMAC)
  - [ ] Add end-to-end encryption option
- [ ] Add authorization
  - [ ] Role-based access control
  - [ ] Endpoint permission management

#### Phase 4: Session Management (Priority: MEDIUM)
- [ ] Enhanced session handling
  - [ ] Add session timeout mechanism
  - [ ] Implement session persistence
  - [ ] Add session recovery on reconnect
  - [ ] Track session statistics
  - [ ] Add session cleanup scheduler
- [ ] State machine implementation
  - [ ] Full JSEP state tracking
  - [ ] State transition validation
  - [ ] State persistence

#### Phase 5: Scalability (Priority: MEDIUM)
- [ ] Distributed architecture
  - [ ] Redis integration for session storage
  - [ ] Multi-server clustering support
  - [ ] Load balancing strategy
  - [ ] Session replication
  - [ ] Distributed matching engine
- [ ] Performance optimization
  - [ ] Connection pooling
  - [ ] Message batching
  - [ ] Compression support (permessage-deflate)
  - [ ] Resource limits and throttling

#### Phase 6: Monitoring & Operations (Priority: MEDIUM)
- [ ] Logging enhancements
  - [ ] Structured logging (JSON)
  - [ ] Log levels configuration
  - [ ] Separate error/access logs
  - [ ] Integration with logging services
- [ ] Metrics collection
  - [ ] Prometheus metrics endpoint
  - [ ] Connection metrics
  - [ ] Message throughput metrics
  - [ ] Session duration metrics
  - [ ] Error rate tracking
- [ ] Health checks
  - [ ] Liveness probe
  - [ ] Readiness probe
  - [ ] Dependency checks

#### Phase 7: Additional Features (Priority: LOW)
- [ ] Advanced capabilities
  - [ ] Message history/replay
  - [ ] Presence detection
  - [ ] Typing indicators
  - [ ] Read receipts
  - [ ] Message prioritization
- [ ] Admin interface
  - [ ] Web-based admin panel
  - [ ] Endpoint management UI
  - [ ] Session monitoring dashboard
  - [ ] Configuration management
  - [ ] Real-time statistics

#### Phase 8: Testing & Documentation (Priority: HIGH)
- [ ] Testing
  - [ ] Unit tests (>90% coverage)
  - [ ] Integration tests
  - [ ] Load testing (1000+ concurrent connections)
  - [ ] Stress testing
  - [ ] Security testing
  - [ ] Failover testing
- [ ] Documentation
  - [ ] API documentation
  - [ ] Deployment guide
  - [ ] Operations manual
  - [ ] Troubleshooting guide
  - [ ] Performance tuning guide

### 17.2 Client Implementation ToDo

#### Phase 1: Core Client Library (Priority: HIGH)
- [ ] Message system
  - [ ] SwapMessage base class
  - [ ] All 8 message type classes
  - [ ] Message validation
  - [ ] Message serialization
  - [ ] Message builder/factory
  - [ ] Unit tests for messages

- [ ] Transport layer
  - [ ] WebSocketTransport class
  - [ ] Connection management
  - [ ] Reconnection logic
  - [ ] Message queuing
  - [ ] Heartbeat/keepalive
  - [ ] Transport tests

- [ ] State machine
  - [ ] JSEP state implementation
  - [ ] State validators
  - [ ] State transitions
  - [ ] Event emitters
  - [ ] State machine tests

#### Phase 2: Client API (Priority: HIGH)
- [ ] SwapClient class
  - [ ] Connection establishment
  - [ ] Registration
  - [ ] Connect/Accept/Reject
  - [ ] Update/Close handling
  - [ ] Application messages
  - [ ] Event handling
  - [ ] Error handling
  - [ ] Client tests

- [ ] Matching criteria
  - [ ] MatchingCriteria class
  - [ ] CriteriaBuilder (fluent API)
  - [ ] Criteria validation
  - [ ] Criteria tests

#### Phase 3: Security (Priority: HIGH)
- [ ] Encryption implementation
  - [ ] WebCrypto integration
  - [ ] AES-GCM encryption
  - [ ] Key derivation
  - [ ] Secure random generation
  - [ ] Encryption tests

- [ ] Integrity protection
  - [ ] HMAC implementation
  - [ ] Message signing
  - [ ] Signature verification
  - [ ] Integrity tests

- [ ] Security manager
  - [ ] Unified security API
  - [ ] Key management
  - [ ] Security configuration
  - [ ] Security tests

#### Phase 4: WebRTC Integration (Priority: HIGH)
- [ ] SDP handling
  - [ ] SDP validation
  - [ ] SDP parsing utilities
  - [ ] SDP modification helpers
  - [ ] SDP tests

- [ ] ICE handling
  - [ ] ICE gathering helpers
  - [ ] ICE candidate collection
  - [ ] Wait for gathering completion
  - [ ] ICE tests

- [ ] WebRTC helper API
  - [ ] SwapWebRTCHelper class
  - [ ] Offer/answer creation
  - [ ] RTCPeerConnection integration
  - [ ] Connection state tracking
  - [ ] WebRTC integration tests

#### Phase 5: Peer-to-Peer Mode (Priority: MEDIUM)
- [ ] SwapPeer class
  - [ ] Peer listener mode
  - [ ] Peer connector mode
  - [ ] Direct connection handling
  - [ ] Single peer limitation
  - [ ] Peer tests

#### Phase 6: Error Handling (Priority: MEDIUM)
- [ ] Error classes
  - [ ] SwapError base class
  - [ ] ConnectionError
  - [ ] ValidationError
  - [ ] SecurityError
  - [ ] TimeoutError

- [ ] RFC 7807 support
  - [ ] ProblemDetails formatter
  - [ ] All 4 error types
  - [ ] Error response parsing
  - [ ] Error tests

#### Phase 7: Advanced Features (Priority: LOW)
- [ ] Utilities
  - [ ] ID generation
  - [ ] Validators
  - [ ] Logger
  - [ ] Configuration manager
  - [ ] Utility tests

- [ ] Session persistence
  - [ ] LocalStorage integration
  - [ ] Session recovery
  - [ ] State restoration

- [ ] Middleware support
  - [ ] Plugin architecture
  - [ ] Message interceptors
  - [ ] Custom validators
  - [ ] Event hooks

#### Phase 8: Browser & Node Support (Priority: MEDIUM)
- [ ] Platform compatibility
  - [ ] Browser support (ESM)
  - [ ] Node.js support (CommonJS)
  - [ ] React Native support
  - [ ] Electron support
  - [ ] Platform-specific tests

- [ ] Build system
  - [ ] Rollup/Webpack configuration
  - [ ] ESM output
  - [ ] CommonJS output
  - [ ] UMD output
  - [ ] TypeScript definitions
  - [ ] Source maps

#### Phase 9: Examples & Documentation (Priority: HIGH)
- [ ] Example applications
  - [ ] Simple peer-to-peer chat
  - [ ] Server-relayed video call
  - [ ] Custom application messages
  - [ ] Multi-party conference
  - [ ] Screen sharing demo

- [ ] Documentation
  - [ ] API reference (JSDoc)
  - [ ] Getting started guide
  - [ ] Client usage guide
  - [ ] WebRTC integration guide
  - [ ] Security best practices
  - [ ] Troubleshooting guide
  - [ ] Migration guide

#### Phase 10: Testing & Quality (Priority: HIGH)
- [ ] Testing suite
  - [ ] Unit tests (>90% coverage)
  - [ ] Integration tests
  - [ ] E2E tests
  - [ ] Browser compatibility tests
  - [ ] Performance tests
  - [ ] Security tests
  - [ ] Mock server for testing

- [ ] CI/CD
  - [ ] GitHub Actions workflow
  - [ ] Automated testing
  - [ ] Code coverage reporting
  - [ ] Automated releases
  - [ ] NPM publishing

### 17.3 Shared ToDo Items

#### Documentation
- [ ] Protocol specification summary
- [ ] Architecture diagrams
- [ ] Sequence diagrams for message flows
- [ ] API reference documentation
- [ ] Example code snippets
- [ ] Performance benchmarks
- [ ] Security best practices
- [ ] FAQ document

#### Quality Assurance
- [ ] Code review process
- [ ] Linting configuration (ESLint)
- [ ] Code formatting (Prettier)
- [ ] Git hooks (pre-commit)
- [ ] Continuous integration
- [ ] Automated testing
- [ ] Code coverage tracking
- [ ] Performance monitoring

#### Release Management
- [ ] Versioning strategy (SemVer)
- [ ] Changelog maintenance
- [ ] Release notes
- [ ] NPM package publishing
- [ ] GitHub releases
- [ ] Docker image publishing
- [ ] Documentation updates

### 17.4 Priority Matrix

```
┌─────────────────────────────────────────────┐
│ HIGH PRIORITY (Weeks 1-3)                   │
├─────────────────────────────────────────────┤
│ ✓ Server: Core dependencies                │
│ ✓ Server: Enhanced matching                │
│ ✓ Server: Security implementation          │
│ ✓ Server: Testing & documentation          │
│ ✓ Client: Core library                     │
│ ✓ Client: Client API                       │
│ ✓ Client: Security                         │
│ ✓ Client: WebRTC integration               │
│ ✓ Client: Examples & documentation         │
│ ✓ Client: Testing & quality                │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ MEDIUM PRIORITY (Weeks 4-6)                 │
├─────────────────────────────────────────────┤
│ ○ Server: Session management               │
│ ○ Server: Scalability                      │
│ ○ Server: Monitoring & operations          │
│ ○ Client: Peer-to-peer mode                │
│ ○ Client: Error handling                   │
│ ○ Client: Browser & Node support           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ LOW PRIORITY (Weeks 7+)                     │
├─────────────────────────────────────────────┤
│ □ Server: Additional features              │
│ □ Client: Advanced features                │
└─────────────────────────────────────────────┘
```

### 17.5 Development Milestones

**Milestone 1: MVP (Week 3)**
- Basic server with message routing
- Basic client with WebRTC integration
- Core security features
- Essential documentation

**Milestone 2: Production Ready (Week 6)**
- Enhanced matching and session management
- Full security implementation
- Scalability features
- Comprehensive testing
- Complete documentation

**Milestone 3: Enterprise Features (Week 9+)**
- Distributed architecture
- Admin interface
- Advanced monitoring
- Performance optimization
- Premium features

## Conclusion

This implementation plan provides a comprehensive roadmap for building a production-ready, spec-compliant SWAP protocol library. The modular architecture ensures maintainability, the extensive testing guarantees reliability, and the clear documentation enables widespread adoption.

The existing server implementation provides a solid foundation that can be enhanced with the features outlined in the ToDo lists. The structured approach with clear priorities ensures efficient development and timely delivery of a robust SWAP protocol solution.

The library will serve as a reference implementation of the 3GPP SWAP specification and enable developers to build real-time communication applications with confidence.

---

**Document Version**: 2.0.0
**Last Updated**: 2025-10-29
**Specification Reference**: 3GPP TS 26.113 v19.1.0
**Server Implementation**: server.js (Initial version)
