/**
 * Structured logging helper - writes JSON lines to stdout.
 * Captured by `docker logs regatta` on the VPS and by terminal locally.
 *
 * Format: {"t":"2026-04-17T01:30:00.000Z","lvl":"info","evt":"coach.request","...":"..."}
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  [key: string]: unknown;
}

export function log(lvl: LogLevel, evt: string, fields: LogFields = {}): void {
  const line = {
    t: new Date().toISOString(),
    lvl,
    evt,
    ...fields,
  };
  // eslint-disable-next-line no-console
  (lvl === 'error' ? console.error : console.log)(JSON.stringify(line));
}

export const logInfo = (evt: string, f?: LogFields) => log('info', evt, f);
export const logWarn = (evt: string, f?: LogFields) => log('warn', evt, f);
export const logError = (evt: string, f?: LogFields) => log('error', evt, f);
export const logDebug = (evt: string, f?: LogFields) => log('debug', evt, f);
