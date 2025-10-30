import { generateSourceId, nextMessageId } from '../utils/IdGenerator.js';
import { validateMessageShape } from '../utils/Validator.js';

export class SwapMessage {
  constructor(messageType, init = {}) {
    this.version = 1;
    this.source_id = init.source_id || generateSourceId('ep');
    if (!SwapMessage._counters[this.source_id]) {
      SwapMessage._counters[this.source_id] = { value: 0 };
    }
    this.message_id = init.message_id || nextMessageId(SwapMessage._counters[this.source_id]);
    this.message_type = messageType;
  }

  validate() {
    const { valid, errors } = validateMessageShape(this);
    if (!valid) {
      const err = new Error('Message validation failed');
      err.errors = errors;
      throw err;
    }
    return true;
  }

  serialize() {
    this.validate();
    return JSON.stringify(this);
  }

  static parse(json) {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    const { valid, errors } = validateMessageShape(obj);
    if (!valid) {
      const err = new Error('Message validation failed');
      err.errors = errors;
      throw err;
    }
    return obj;
  }

  // Placeholders; implemented in Phase 5
  async sign() {
    throw new Error('Integrity protection not implemented in Phase 1');
  }

  async encrypt() {
    throw new Error('Encryption not implemented in Phase 1');
  }
}

SwapMessage._counters = {};

