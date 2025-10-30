export class MessageQueue {
  constructor() {
    this._queue = [];
  }

  enqueue(message) {
    this._queue.push(message);
  }

  dequeue() {
    return this._queue.shift();
  }

  isEmpty() {
    return this._queue.length === 0;
  }

  size() {
    return this._queue.length;
  }

  flush(sendFn) {
    while (!this.isEmpty()) {
      const msg = this.dequeue();
      try {
        sendFn(msg);
      } catch (e) {
        // Put back and abort on first failure
        this._queue.unshift(msg);
        throw e;
      }
    }
  }
}

