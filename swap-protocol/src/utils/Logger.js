export class Logger {
  constructor(level = 'info') {
    this.level = level;
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
  }

  setLevel(level) {
    this.level = level;
  }

  can(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  error(...args) { if (this.can('error')) console.error('[swap]', ...args); }
  warn(...args) { if (this.can('warn')) console.warn('[swap]', ...args); }
  info(...args) { if (this.can('info')) console.info('[swap]', ...args); }
  debug(...args) { if (this.can('debug')) console.debug('[swap]', ...args); }
}

export const defaultLogger = new Logger('info');

