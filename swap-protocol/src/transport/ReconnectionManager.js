export class ReconnectionManager {
  constructor(options = {}) {
    const cfg = options.reconnect || options;
    this.enabled = cfg?.enabled ?? true;
    this.maxAttempts = cfg?.maxAttempts ?? 5;
    this.initialDelay = cfg?.initialDelay ?? 1000;
    this.maxDelay = cfg?.maxDelay ?? 30000;
    this.backoffMultiplier = cfg?.backoffMultiplier ?? 2;
    this.attempts = 0;
    this._timer = null;
  }

  reset() {
    this.attempts = 0;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  scheduleReconnect(task) {
    if (!this.enabled) return false;
    if (this.attempts >= this.maxAttempts) return false;
    const delay = Math.min(
      this.initialDelay * Math.pow(this.backoffMultiplier, this.attempts),
      this.maxDelay
    );
    this.attempts += 1;
    this._timer = setTimeout(() => {
      this._timer = null;
      task();
    }, delay);
    return true;
  }
}

