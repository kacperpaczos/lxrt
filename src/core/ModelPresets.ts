/**
 * Model Presets - Semantic naming for models
 *
 * Provides user-friendly preset names (e.g. 'chat-light', 'embedding-quality')
 * that map to actual model IDs from the Model Registry.
 *
 * This is the foundation for the auto-tuning system (Phase 0).
 */

/**
 * LLM Presets
 *
 * Naming convention: <use-case>-<size> or <priority>
 * - Size: tiny, light, medium, heavy
 * - Use-case combinations: chat-light, chat-medium, chat-heavy
 * - Priority: fast, balanced, quality
 * - Special: default
 */
export const LLM_PRESETS = {
  // Size-based (core presets)
  tiny: 'Xenova/gpt2',
  light: 'Xenova/Qwen1.5-0.5B-Chat',
  medium: 'Xenova/Phi-3-mini-4k-instruct',
  heavy: 'Xenova/gemma-2b-it',

  // Chat-specific combinations (recommended)
  'chat-light': 'Xenova/Qwen1.5-0.5B-Chat',
  'chat-medium': 'Xenova/Phi-3-mini-4k-instruct',
  'chat-heavy': 'Xenova/gemma-2b-it',

  // Completion-specific
  'completion-light': 'Xenova/TinyLlama-1.1B-Chat-v1.0',
  'completion-medium': 'Xenova/Phi-3-mini-4k-instruct',
  'completion-heavy': 'Xenova/gemma-2b-it',

  // Priority-based
  fast: 'Xenova/TinyLlama-1.1B-Chat-v1.0', // Fastest inference
  balanced: 'Xenova/Qwen1.5-0.5B-Chat', // Balance speed/quality
  quality: 'Xenova/Phi-3-mini-4k-instruct', // Best quality

  // Special
  default: 'Xenova/Qwen1.5-0.5B-Chat',
} as const;

/**
 * Embedding Presets
 */
export const EMBEDDING_PRESETS = {
  // Size-based
  tiny: 'Xenova/all-MiniLM-L6-v2',
  light: 'Xenova/all-MiniLM-L6-v2',
  heavy: 'Xenova/bge-m3',

  // Priority-based
  fast: 'Xenova/all-MiniLM-L6-v2', // Fast, 384 dims
  quality: 'Xenova/bge-m3', // High quality, 1024 dims
  balanced: 'Xenova/all-MiniLM-L6-v2',

  // Special
  default: 'Xenova/all-MiniLM-L6-v2',
} as const;

/**
 * STT (Speech-to-Text) Presets
 */
export const STT_PRESETS = {
  // Size-based
  tiny: 'Xenova/whisper-tiny',
  light: 'Xenova/whisper-tiny',
  medium: 'Xenova/whisper-small',

  // Priority-based
  fast: 'Xenova/whisper-tiny',
  quality: 'Xenova/whisper-small',
  balanced: 'Xenova/whisper-tiny',

  // Special
  default: 'Xenova/whisper-tiny',
} as const;

/**
 * TTS (Text-to-Speech) Presets
 */
export const TTS_PRESETS = {
  // Currently only one model available
  default: 'Xenova/speecht5_tts',
  light: 'Xenova/speecht5_tts',
} as const;

/**
 * OCR Presets
 */
export const OCR_PRESETS = {
  // Currently only Tesseract available
  default: 'tesseract',
  light: 'tesseract',
} as const;

/**
 * Combined presets registry
 */
export const MODEL_PRESETS = {
  llm: LLM_PRESETS,
  embedding: EMBEDDING_PRESETS,
  stt: STT_PRESETS,
  tts: TTS_PRESETS,
  ocr: OCR_PRESETS,
} as const;

// Derived types for TypeScript auto-completion
export type LLMPreset = keyof typeof LLM_PRESETS;
export type EmbeddingPreset = keyof typeof EMBEDDING_PRESETS;
export type STTPreset = keyof typeof STT_PRESETS;
export type TTSPreset = keyof typeof TTS_PRESETS;
export type OCRPreset = keyof typeof OCR_PRESETS;

/**
 * Resolve a model preset or ID to the actual model ID
 *
 * @param modality - The modality (llm, embedding, stt, tts, ocr)
 * @param modelSpec - Preset name, known model ID, or custom model ID
 * @returns Actual model ID to use
 *
 * @example
 * resolveModelId('llm', 'chat-light') // → 'Xenova/Qwen1.5-0.5B-Chat'
 * resolveModelId('llm', 'Xenova/gpt2') // → 'Xenova/gpt2' (pass-through)
 * resolveModelId('llm', 'my-org/custom') // → 'my-org/custom' (pass-through)
 */
export function resolveModelId(
  modality: keyof typeof MODEL_PRESETS,
  modelSpec: string
): string {
  // 1. Check if it's a preset
  const presetRegistry = MODEL_PRESETS[modality] as Record<string, string>;
  const presetModel = presetRegistry[modelSpec];

  if (presetModel) {
    return presetModel;
  }

  // 2. Not a preset - return as-is (could be known model ID or custom model)
  return modelSpec;
}

/**
 * Check if a string is a valid preset for the given modality
 */
export function isPreset(
  modality: keyof typeof MODEL_PRESETS,
  modelSpec: string
): boolean {
  const presetRegistry = MODEL_PRESETS[modality] as Record<string, string>;
  return modelSpec in presetRegistry;
}

/**
 * Get all available presets for a modality
 */
export function getAvailablePresets(
  modality: keyof typeof MODEL_PRESETS
): string[] {
  return Object.keys(MODEL_PRESETS[modality]);
}
