import { ErrorTypes } from './ErrorTypes.js';

export class ProblemDetails {
  static create(type, title, detail, status) {
    return { type: `http://forge.3gpp.org/sa4/swap/${type}.html`, title, detail, status };
  }

  static [ErrorTypes.MESSAGE_UNKNOWN]() {
    return this.create(ErrorTypes.MESSAGE_UNKNOWN, 'Message type unknown', 'The message type is not recognized', 400);
  }

  static [ErrorTypes.MESSAGE_MALFORMATTED]() {
    return this.create(
      ErrorTypes.MESSAGE_MALFORMATTED,
      'Message malformatted',
      'The message does not conform to the schema',
      400
    );
  }

  static [ErrorTypes.TARGET_UNKNOWN]() {
    return this.create(ErrorTypes.TARGET_UNKNOWN, 'Target cannot be located', 'No endpoint matches the provided criteria', 404);
  }

  static [ErrorTypes.UNAUTHORIZED]() {
    return this.create(ErrorTypes.UNAUTHORIZED, 'Unauthorized', 'Authentication or authorization failed', 401);
  }
}

