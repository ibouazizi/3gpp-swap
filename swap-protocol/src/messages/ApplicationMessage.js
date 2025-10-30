import { SwapMessage } from './SwapMessage.js';
import { MessageTypes } from './MessageTypes.js';

export class ApplicationMessage extends SwapMessage {
  constructor(target, type, value, init = {}) {
    super(MessageTypes.APPLICATION, init);
    this.target = target;
    this.type = type;
    this.value = value;
  }
}

