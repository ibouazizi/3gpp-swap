import { SwapMessage } from './SwapMessage.js';
import { MessageTypes } from './MessageTypes.js';

export class CloseMessage extends SwapMessage {
  constructor(target, init = {}) {
    super(MessageTypes.CLOSE, init);
    this.target = target;
  }
}

