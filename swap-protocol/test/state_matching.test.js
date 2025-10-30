import test from 'node:test';
import assert from 'node:assert/strict';

import { StateMachine, States, MatchingEngine } from '../src/index.js';

test('StateMachine transitions', () => {
  const sm = new StateMachine();
  assert.equal(sm.state, States.IDLE);
  sm.apply('connect');
  assert.equal(sm.state, States.CONNECTING);
  sm.apply('accept');
  assert.equal(sm.state, States.CONNECTED);
  sm.apply('close');
  assert.equal(sm.state, States.CLOSING);
  sm.apply('closed');
  assert.equal(sm.state, States.IDLE);
});

test('MatchingEngine finds superset matches and selects', () => {
  const m = new MatchingEngine();
  m.register('a', [{ type: 'service', value: 'video' }]);
  m.register('b', [{ type: 'service', value: 'video' }, { type: 'qos', value: 'high' }]);
  const matches = m.findMatches([{ type: 'service', value: 'video' }]);
  assert(matches.includes('a') && matches.includes('b'));
  const sel = m.selectEndpoint(matches);
  assert(['a', 'b'].includes(sel));
});

