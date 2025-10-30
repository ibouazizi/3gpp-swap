export class SessionManager {
  constructor() {
    this.sessions = new Map(); // key `${a}|${b}` → { a, b, state }
  }

  _key(a, b) {
    return [a, b].sort().join('|');
  }

  create(a, b) {
    const key = this._key(a, b);
    const session = { a, b, state: 'active', createdAt: Date.now() };
    this.sessions.set(key, session);
    return session;
  }

  get(a, b) {
    return this.sessions.get(this._key(a, b));
  }

  remove(a, b) {
    return this.sessions.delete(this._key(a, b));
  }

  listFor(endpoint) {
    const res = [];
    for (const s of this.sessions.values()) {
      if (s.a === endpoint || s.b === endpoint) res.push(s);
    }
    return res;
  }
}

