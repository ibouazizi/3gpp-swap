import { SwapMessage } from './SwapMessage.js';
import { MessageTypes } from './MessageTypes.js';

export class ResponseMessage extends SwapMessage {
  constructor(response_to, status, reason, error = null, init = {}) {
    super(MessageTypes.RESPONSE, init);
    this.response_to = response_to;
    this.status = status;
    this.reason = reason;
    if (error) this.error = error;
  }
}

