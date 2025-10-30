import { SwapMessage } from './SwapMessage.js';
import { MessageTypes } from './MessageTypes.js';

export class UpdateMessage extends SwapMessage {
  constructor(target, sdp, init = {}) {
    super(MessageTypes.UPDATE, init);
    this.target = target;
    this.sdp = sdp;
  }
}

