import { SwapMessage } from './SwapMessage.js';
import { MessageTypes } from './MessageTypes.js';

export class ConnectMessage extends SwapMessage {
  constructor(offer, criteria = [], init = {}) {
    super(MessageTypes.CONNECT, init);
    this.offer = offer;
    this.criteria = Array.isArray(criteria) ? criteria : [];
  }
}

