import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MessageTypes,
  RegisterMessage,
  ConnectMessage,
  AcceptMessage,
  ResponseMessage,
  MessageFactory,
  validateMessageShape
} from '../src/index.js';

test('RegisterMessage validates and serializes', () => {
  const reg = new RegisterMessage([
    { type: 'service', value: 'video-call' },
    { type: 'qos', value: 'high' }
  ], { source_id: 'endpoint-123456' });

  assert.equal(reg.message_type, MessageTypes.REGISTER);
  const { valid, errors } = validateMessageShape(reg);
  assert.equal(valid, true, JSON.stringify(errors));
  const json = reg.serialize();
  const parsed = JSON.parse(json);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.source_id, 'endpoint-123456');
});

test('ConnectMessage round-trip via factory', () => {
  const con = new ConnectMessage('v=0...sdp-offer', [{ type: 'service', value: 'test' }], {
    source_id: 'endpoint-abcdefg'
  });
  const json = con.serialize();
  const rebuilt = MessageFactory.fromJSON(json);
  assert.equal(rebuilt.offer, 'v=0...sdp-offer');
  assert.equal(rebuilt.criteria.length, 1);
  assert.equal(rebuilt.source_id, 'endpoint-abcdefg');
});

test('Accept/Response messages validate schemas', () => {
  const acc = new AcceptMessage('target-123456', 'v=0...answer', { source_id: 'source-zzzzz1' });
  const res = new ResponseMessage(acc.message_id, 200, 'OK', null, { source_id: 'source-zzzzz1' });
  assert.equal(validateMessageShape(acc).valid, true);
  assert.equal(validateMessageShape(res).valid, true);
});

