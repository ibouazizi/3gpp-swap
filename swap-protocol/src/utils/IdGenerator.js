import { v4 as uuidv4 } from 'uuid';

export function generateSourceId(prefix = 'src') {
  // Ensure at least 10 UTF-8 characters
  const id = `${prefix}-${uuidv4().replace(/-/g, '')}`;
  return id.length >= 10 ? id : id.padEnd(10, '0');
}

export function nextMessageId(counterRef) {
  // Safely increment positive monotonic integer
  if (typeof counterRef.value !== 'number' || counterRef.value < 0) {
    counterRef.value = 0;
  }
  counterRef.value += 1;
  return counterRef.value;
}

