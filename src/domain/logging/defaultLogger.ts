import type { Logger } from '@domain/logging/Logger';

/**
 * Default console-based logger implementation.
 * Used as fallback when no custom logger is provided.
 */
export const defaultLogger: Logger = {
  debug: (...args: unknown[]) => console.debug('[lxrt]', ...args),
  info: (...args: unknown[]) => console.info('[lxrt]', ...args),
  warn: (...args: unknown[]) => console.warn('[lxrt]', ...args),
  error: (...args: unknown[]) => console.error('[lxrt]', ...args),
};
