export const States = Object.freeze({
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  CLOSING: 'closing'
});

const Transitions = {
  [States.IDLE]: {
    connect: States.CONNECTING,
    accept_incoming: States.CONNECTING
  },
  [States.CONNECTING]: {
    accept: States.CONNECTED,
    reject: States.IDLE
  },
  [States.CONNECTED]: {
    update: States.CONNECTED,
    close: States.CLOSING
  },
  [States.CLOSING]: {
    closed: States.IDLE
  }
};

export class StateMachine {
  constructor(initial = States.IDLE) {
    this.state = initial;
  }

  canSend(messageType) {
    switch (this.state) {
      case States.IDLE:
        return ['register', 'connect'].includes(messageType);
      case States.CONNECTING:
        return ['accept', 'reject', 'update', 'close', 'application', 'response'].includes(messageType);
      case States.CONNECTED:
        return ['update', 'close', 'application', 'response'].includes(messageType);
      case States.CLOSING:
        return ['response'].includes(messageType);
      default:
        return true;
    }
  }

  apply(event) {
    const map = Transitions[this.state] || {};
    const next = map[event];
    if (next) this.state = next;
    return this.state;
  }
}

