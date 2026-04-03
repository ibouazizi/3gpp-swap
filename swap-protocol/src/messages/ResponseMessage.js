import { SwapMessage } from './SwapMessage.js';
import { MessageTypes } from './MessageTypes.js';

export class ResponseMessage extends SwapMessage {
  constructor(type, target, request, description, init = {}) {
    super(MessageTypes.RESPONSE, init);
    this.type = type;
    this.target = target;
    this.request = request;
    this.description = description;
    // if (error) this.error = error;
  }
}

