import { SwapMessage } from './SwapMessage.js';
import { MessageTypes } from './MessageTypes.js';

export class RegisterMessage extends SwapMessage {
  constructor(criteria = [], init = {}) {
    super(MessageTypes.REGISTER, init);
    if (Array.isArray(criteria)) {
      this.criteria = criteria;
    } else if (criteria && typeof criteria === 'object') {
      const { criteria: list = [], capabilities } = criteria;
      this.criteria = Array.isArray(list) ? list : [];
      if (capabilities) this.capabilities = capabilities;
    } else {
      this.criteria = [];
    }
    if (init.capabilities && !this.capabilities) this.capabilities = init.capabilities;
  }
}
