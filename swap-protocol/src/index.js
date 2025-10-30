export { MessageTypes } from './messages/MessageTypes.js';
export { SwapMessage } from './messages/SwapMessage.js';
export { RegisterMessage } from './messages/RegisterMessage.js';
export { ResponseMessage } from './messages/ResponseMessage.js';
export { ConnectMessage } from './messages/ConnectMessage.js';
export { AcceptMessage } from './messages/AcceptMessage.js';
export { RejectMessage } from './messages/RejectMessage.js';
export { UpdateMessage } from './messages/UpdateMessage.js';
export { CloseMessage } from './messages/CloseMessage.js';
export { ApplicationMessage } from './messages/ApplicationMessage.js';
export { MessageFactory } from './messages/MessageFactory.js';

export { validateMessageShape, getSchemaFor } from './utils/Validator.js';
export { generateSourceId, nextMessageId } from './utils/IdGenerator.js';
export { Logger, defaultLogger } from './utils/Logger.js';

export { ErrorTypes } from './errors/ErrorTypes.js';
export { ProblemDetails } from './errors/ProblemDetails.js';
export { SwapError } from './errors/SwapError.js';

// Transport layer
export { WebSocketTransport, buildSwapUri } from './transport/WebSocketTransport.js';
export { MessageQueue } from './transport/MessageQueue.js';
export { ReconnectionManager } from './transport/ReconnectionManager.js';

// State and sessions
export { States, StateMachine } from './state/StateMachine.js';
export { SessionManager } from './core/SessionManager.js';

// Matching
export { MatchingEngine } from './matching/MatchingEngine.js';
export { CriteriaBuilder } from './matching/CriteriaBuilder.js';

// Core client
export { SwapClient } from './core/SwapClient.js';

// Security
export { SecurityManager } from './security/SecurityManager.js';
export { Encryption } from './security/Encryption.js';
export { IntegrityProtection } from './security/IntegrityProtection.js';
export { KeyDerivation } from './security/KeyDerivation.js';

// SDP/WebRTC helpers
export { SdpUtils } from './sdp/SdpUtils.js';
export { SdpValidator } from './sdp/SdpValidator.js';
export { IceGatherer } from './sdp/IceGatherer.js';
export { SwapWebRTCHelper } from './sdp/SwapWebRTCHelper.js';
