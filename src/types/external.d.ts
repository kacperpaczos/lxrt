/**
 * Type definitions for external libraries and browser APIs
 * Used to avoid 'any' type throughout the codebase
 */

// ============================================================
// Transformers.js Pipeline Output Types
// ============================================================

/**
 * Tensor-like structure from Transformers.js
 */
export interface TensorLike {
  data: Float32Array | number[];
  dims: number[];
}

/**
 * CLAP (Audio) model output structure
 */
export interface CLAPPipelineOutput {
  pooled_output?: TensorLike;
  last_hidden_state?: TensorLike;
}

/**
 * CLIP (Image/Text) model output structure
 */
export interface CLIPPipelineOutput {
  image_embeds?: TensorLike;
  text_embeds?: TensorLike;
  logits_per_image?: TensorLike;
  logits_per_text?: TensorLike;
}

/**
 * Generic pipeline callable - accepts any input and returns typed output
 * Note: Transformers.js pipelines have complex overloaded signatures,
 * so we use a flexible callable type here
 */
export interface TransformersPipeline<TOutput> {
  (input: unknown, options?: Record<string, unknown>): Promise<TOutput>;
}

/**
 * Audio pipeline type - CLAP model
 */
export type AudioPipeline = TransformersPipeline<CLAPPipelineOutput>;

/**
 * Image pipeline type - CLIP model
 */
export type ImagePipeline = TransformersPipeline<CLIPPipelineOutput>;

// ============================================================
// FFmpeg.wasm Types
// ============================================================

/**
 * FFmpeg FS method overload type (method-based API)
 */
export interface FFmpegInstance {
  load(): Promise<void>;
  run(...args: string[]): Promise<void>;
  FS(method: 'writeFile', path: string, data: Uint8Array): void;
  FS(method: 'readFile', path: string): Uint8Array;
  FS(method: 'unlink', path: string): void;
}

/**
 * FFmpeg fetchFile function type
 */
export type FFmpegFetchFile = (
  file: File | string | Blob
) => Promise<Uint8Array>;

// ============================================================
// Browser Performance API Extensions (Non-standard)
// ============================================================

/**
 * Chrome's non-standard performance.memory API
 */
export interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/**
 * Extended Performance interface with memory
 */
export interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

// ============================================================
// Browser Navigator API Extensions (Non-standard)
// ============================================================

/**
 * Extended Navigator interface with deviceMemory
 */
export interface NavigatorWithDeviceMemory extends Navigator {
  deviceMemory?: number;
}

// ============================================================
// DOM Extensions for cross-environment compatibility
// ============================================================

/**
 * Image element with event listener methods
 */
export interface ImageElementWithEvents extends HTMLImageElement {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
}

/**
 * Document-like object for globalThis.document access
 */
export interface DocumentLike {
  createElement(tagName: 'canvas'): HTMLCanvasElement;
  createElement(tagName: string): HTMLElement;
}

// ============================================================
// Event Handler Types
// ============================================================

/**
 * Generic event handler type for typed event emitters
 */
export type TypedEventHandler<T> = (data: T) => void;

/**
 * Event listener map with proper typing
 */
export type EventListenerMap<T = unknown> = Map<
  string,
  Set<TypedEventHandler<T>>
>;
