import { MessageTypes } from './MessageTypes.js';
import { RegisterMessage } from './RegisterMessage.js';
import { ResponseMessage } from './ResponseMessage.js';
import { ConnectMessage } from './ConnectMessage.js';
import { AcceptMessage } from './AcceptMessage.js';
import { RejectMessage } from './RejectMessage.js';
import { UpdateMessage } from './UpdateMessage.js';
import { CloseMessage } from './CloseMessage.js';
import { ApplicationMessage } from './ApplicationMessage.js';
import { SwapMessage } from './SwapMessage.js';

export class MessageFactory {
  static fromObject(obj) {
    if (!obj || typeof obj !== 'object') {
      throw new Error('Invalid message object');
    }
    const common = { source_id: obj.source_id, message_id: obj.message_id };
    switch (obj.message_type) {
      case MessageTypes.REGISTER:
        return new RegisterMessage(obj.criteria, common);
      case MessageTypes.RESPONSE:
        return new ResponseMessage(obj.response_to, obj.status, obj.reason, obj.error, common);
      case MessageTypes.CONNECT:
        return new ConnectMessage(obj.offer, obj.criteria, common);
      case MessageTypes.ACCEPT:
        return new AcceptMessage(obj.target, obj.answer, common);
      case MessageTypes.REJECT:
        return new RejectMessage(obj.target, obj.reason, common);
      case MessageTypes.UPDATE:
        return new UpdateMessage(obj.target, obj.sdp, common);
      case MessageTypes.CLOSE:
        return new CloseMessage(obj.target, common);
      case MessageTypes.APPLICATION:
        return new ApplicationMessage(obj.target, obj.type, obj.value, common);
      default:
        // Still allow validation to surface a better error
        return SwapMessage.parse(obj);
    }
  }

  static fromJSON(json) {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    return this.fromObject(obj);
  }
}

