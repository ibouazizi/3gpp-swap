import Ajv from 'ajv';
import { MessageTypes } from '../messages/MessageTypes.js';

const ajv = new Ajv({ allErrors: true, strict: false });

// Common primitives
const baseFields = {
  version: { const: 1 },
  source_id: { type: 'string', minLength: 10 },
  message_id: { type: 'integer', minimum: 1 },
  message_type: { type: 'string', enum: Object.values(MessageTypes) }
};

const criteriaItem = {
  type: 'object',
  required: ['type', 'value'],
  additionalProperties: false,
  properties: {
    type: { type: 'string', minLength: 1 },
    value: {}
  }
};

const schemas = {
  [MessageTypes.REGISTER]: {
    type: 'object',
    required: ['version', 'source_id', 'message_id', 'message_type'],
    additionalProperties: false,
    properties: {
      ...baseFields,
      criteria: { type: 'array', items: criteriaItem },
      capabilities: {
        type: 'object',
        additionalProperties: true,
        properties: {
          security: {
            type: 'object',
            properties: {
              integrity: { type: 'boolean' },
              encryption: { type: 'boolean' }
            },
            additionalProperties: true
          }
        }
      },
      security: { type: 'object', nullable: true }
    },
    anyOf: [
      { required: ['criteria'] },
      { required: ['security'] }
    ]
  },
  [MessageTypes.RESPONSE]: {
    type: 'object',
    required: ['version', 'source_id', 'message_id', 'message_type', 'response_to', 'status', 'reason'],
    additionalProperties: true,
    properties: {
      ...baseFields,
      response_to: { type: 'integer', minimum: 0 },
      status: { type: 'integer' },
      reason: { type: 'string' },
      error: { type: 'object', nullable: true },
      security: { type: 'object', nullable: true }
    }
  },
  [MessageTypes.CONNECT]: {
    type: 'object',
    required: ['version', 'source_id', 'message_id', 'message_type'],
    additionalProperties: false,
    properties: {
      ...baseFields,
      offer: { type: 'string', minLength: 1 },
      criteria: { type: 'array', items: criteriaItem },
      security: { type: 'object', nullable: true }
    },
    anyOf: [
      { required: ['offer', 'criteria'] },
      { required: ['security'] }
    ]
  },
  [MessageTypes.ACCEPT]: {
    type: 'object',
    required: ['version', 'source_id', 'message_id', 'message_type'],
    additionalProperties: false,
    properties: {
      ...baseFields,
      target: { type: 'string', minLength: 10 },
      answer: { type: 'string', minLength: 1 },
      security: { type: 'object', nullable: true }
    },
    anyOf: [
      { required: ['target', 'answer'] },
      { required: ['security'] }
    ]
  },
  [MessageTypes.REJECT]: {
    type: 'object',
    required: ['version', 'source_id', 'message_id', 'message_type'],
    additionalProperties: false,
    properties: {
      ...baseFields,
      target: { type: 'string', minLength: 10 },
      reason: { type: 'string', minLength: 1 },
      security: { type: 'object', nullable: true }
    },
    anyOf: [
      { required: ['target', 'reason'] },
      { required: ['security'] }
    ]
  },
  [MessageTypes.UPDATE]: {
    type: 'object',
    required: ['version', 'source_id', 'message_id', 'message_type'],
    additionalProperties: false,
    properties: {
      ...baseFields,
      target: { type: 'string', minLength: 10 },
      sdp: { type: 'string', minLength: 1 },
      security: { type: 'object', nullable: true }
    },
    anyOf: [
      { required: ['target', 'sdp'] },
      { required: ['security'] }
    ]
  },
  [MessageTypes.CLOSE]: {
    type: 'object',
    required: ['version', 'source_id', 'message_id', 'message_type'],
    additionalProperties: false,
    properties: {
      ...baseFields,
      target: { type: 'string', minLength: 10 },
      security: { type: 'object', nullable: true }
    },
    anyOf: [
      { required: ['target'] },
      { required: ['security'] }
    ]
  },
  [MessageTypes.APPLICATION]: {
    type: 'object',
    required: ['version', 'source_id', 'message_id', 'message_type'],
    additionalProperties: true,
    properties: {
      ...baseFields,
      target: { type: 'string', minLength: 10 },
      type: { type: 'string', minLength: 1 },
      value: {},
      security: { type: 'object', nullable: true }
    },
    anyOf: [
      { required: ['target', 'type', 'value'] },
      { required: ['security'] }
    ]
  }
};

const validators = Object.fromEntries(
  Object.entries(schemas).map(([k, schema]) => [k, ajv.compile(schema)])
);

export function validateMessageShape(message) {
  if (!message || typeof message !== 'object') return { valid: false, errors: ['Invalid message object'] };
  const mt = message.message_type;
  const validator = validators[mt];
  if (!validator) return { valid: false, errors: [`Unknown message type: ${mt}`] };
  const valid = validator(message);
  return { valid, errors: valid ? [] : validator.errors };
}

export function getSchemaFor(type) {
  return schemas[type];
}
