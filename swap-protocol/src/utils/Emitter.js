export class Emitter {
  constructor() {
    this._listeners = new Map();
  }

  on(event, fn) {
    const list = this._listeners.get(event) || [];
    list.push(fn);
    this._listeners.set(event, list);
    return this;
  }

  once(event, fn) {
    const wrap = (...args) => { this.off(event, wrap); fn(...args); };
    return this.on(event, wrap);
  }

  off(event, fn) {
    const list = this._listeners.get(event);
    if (!list) return this;
    if (!fn) { this._listeners.delete(event); return this; }
    const idx = list.indexOf(fn);
    if (idx >= 0) list.splice(idx, 1);
    if (list.length === 0) this._listeners.delete(event); else this._listeners.set(event, list);
    return this;
  }

  emit(event, ...args) {
    const list = this._listeners.get(event);
    if (!list) return false;
    for (const fn of [...list]) try { fn(...args); } catch {}
    return true;
  }
}

