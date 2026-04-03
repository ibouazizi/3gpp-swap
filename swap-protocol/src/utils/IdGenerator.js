import { v4 as uuidv4 } from 'uuid';

export function generateSourceId() {
  return uuidv4();
}

export function nextMessageId(counterRef) {
  // Safely increment positive monotonic integer
  if (typeof counterRef.value !== 'number' || counterRef.value < 0) {
    counterRef.value = 0;
  }
  counterRef.value += 1;
  return counterRef.value;
}

