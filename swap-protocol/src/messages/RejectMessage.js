import { SwapMessage } from './SwapMessage.js';
import { MessageTypes } from './MessageTypes.js';

export class RejectMessage extends SwapMessage {
  constructor(target, reason, init = {}) {
    super(MessageTypes.REJECT, init);
    this.target = target;
    this.reason = reason;
  }
}

