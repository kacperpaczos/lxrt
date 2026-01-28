/**
 * Domain-specific error classes for Transformers Router
 * These errors represent business logic failures and should be caught and handled appropriately
 */

/**
 * Type-safe error patterns for programmatic error handling
 */
export enum ErrorPattern {
  // Model lifecycle
  MODEL_NOT_LOADED = 'MODEL_NOT_LOADED',
  MODEL_LOAD_FAILED = 'MODEL_LOAD_FAILED',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',

  // Inference
  INFERENCE_FAILED = 'INFERENCE_FAILED',
  INFERENCE_ABORTED = 'INFERENCE_ABORTED',

  // Validation
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  CONFIG_INVALID = 'CONFIG_INVALID',

  // Initialization
  INIT_FAILED = 'INIT_FAILED',

  // Generic
  UNKNOWN = 'UNKNOWN',
}

/**
 * Base error class with pattern support
 */
export abstract class LxrtError extends Error {
  abstract readonly pattern: ErrorPattern;
}

export class ValidationError extends LxrtError {
  readonly pattern = ErrorPattern.VALIDATION_FAILED;

  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ModelUnavailableError extends LxrtError {
  readonly pattern = ErrorPattern.MODEL_UNAVAILABLE;

  constructor(
    message: string,
    public model: string,
    public modality: string
  ) {
    super(message);
    this.name = 'ModelUnavailableError';
  }
}

export class ModelLoadError extends LxrtError {
  readonly pattern = ErrorPattern.MODEL_LOAD_FAILED;

  constructor(
    message: string,
    public model: string,
    public modality: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ModelLoadError';
  }
}

export class ModelNotLoadedError extends LxrtError {
  readonly pattern = ErrorPattern.MODEL_NOT_LOADED;

  constructor(
    message: string,
    public model: string,
    public modality: string
  ) {
    super(message);
    this.name = 'ModelNotLoadedError';
  }
}

export class InferenceError extends LxrtError {
  readonly pattern: ErrorPattern;

  constructor(
    message: string,
    public modality: string,
    public originalError?: Error,
    pattern: ErrorPattern = ErrorPattern.INFERENCE_FAILED
  ) {
    super(message);
    this.name = 'InferenceError';
    this.pattern = pattern;
  }
}

export class InitializationError extends LxrtError {
  readonly pattern = ErrorPattern.INIT_FAILED;

  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'InitializationError';
  }
}

export class ConfigurationError extends LxrtError {
  readonly pattern = ErrorPattern.CONFIG_INVALID;

  constructor(
    message: string,
    public configField?: string
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Utility to check if an error is an LxrtError with a specific pattern
 */
export function isLxrtError(error: unknown): error is LxrtError {
  return error instanceof LxrtError;
}

export function hasErrorPattern(
  error: unknown,
  pattern: ErrorPattern
): boolean {
  return isLxrtError(error) && error.pattern === pattern;
}
