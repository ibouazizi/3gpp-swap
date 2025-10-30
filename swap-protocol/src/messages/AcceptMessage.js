import { SwapMessage } from './SwapMessage.js';
import { MessageTypes } from './MessageTypes.js';

export class AcceptMessage extends SwapMessage {
  constructor(target, answer, init = {}) {
    super(MessageTypes.ACCEPT, init);
    this.target = target;
    this.answer = answer;
  }
}

