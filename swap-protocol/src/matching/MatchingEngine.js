export class MatchingEngine {
  constructor() {
    this.registry = new Map(); // endpointId -> { criteria: [], updatedAt }
  }

  register(endpointId, criteria = []) {
    this.registry.set(endpointId, { criteria: Array.isArray(criteria) ? criteria : [], updatedAt: Date.now() });
  }

  unregister(endpointId) {
    this.registry.delete(endpointId);
  }

  _criterionKey(c) {
    return `${c.type}::${JSON.stringify(c.value)}`;
  }

  _criteriaSet(criteria) {
    const set = new Set();
    for (const c of criteria || []) set.add(this._criterionKey(c));
    return set;
  }

  findMatches(criteria = []) {
    // Return endpoints that satisfy ALL provided criteria
    const querySet = this._criteriaSet(criteria);
    const matches = [];
    for (const [endpointId, entry] of this.registry.entries()) {
      const regSet = this._criteriaSet(entry.criteria);
      let ok = true;
      for (const key of querySet) {
        if (!regSet.has(key)) { ok = false; break; }
      }
      if (ok) matches.push({ endpointId, criteriaCount: entry.criteria?.length || 0 });
    }
    return matches.map(m => m.endpointId);
  }

  selectEndpoint(matches = []) {
    if (!matches.length) return null;
    // Prefer endpoints with more registered criteria (more specific), random among top
    const scored = matches.map((endpointId) => {
      const count = this.registry.get(endpointId)?.criteria?.length || 0;
      return { endpointId, count };
    });
    const max = Math.max(...scored.map(s => s.count));
    const top = scored.filter(s => s.count === max).map(s => s.endpointId);
    return top[Math.floor(Math.random() * top.length)];
  }
}

