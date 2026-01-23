/**
 * Model Registry - Definitions of supported and tested models
 */

import type { Modality, DType } from './types';

export interface BaseModelInfo {
  name: string;
  description?: string;
  size: string; // Human readable size (e.g. "1.2 GB")
  sizeBytes?: number; // Estimated download size
  requirements: {
    minRam: number; // MB
    gpu?: boolean; // Recommended
  };
  quantizedVersions: DType[];
}

export interface LLMModelInfo extends BaseModelInfo {
  family:
    | 'qwen'
    | 'llama'
    | 'phi'
    | 'gemma'
    | 'mistral'
    | 'gpt2'
    | 'tinyllama'
    | 'other';
  contextWindow: number;
  maxOutputTokens?: number;
  chatTemplate: boolean;
  functionCalling: boolean;
}

export interface EmbeddingModelInfo extends BaseModelInfo {
  dimension: number;
  maxInputTokens: number;
  pooling: 'mean' | 'cls';
}

export interface STTModelInfo extends BaseModelInfo {
  languages: string[];
}

export interface TTSModelInfo extends BaseModelInfo {
  languages: string[];
  speakers: number;
}

export interface OCRModelInfo extends BaseModelInfo {
  languages: string[];
}

export type ModelInfo =
  | LLMModelInfo
  | EmbeddingModelInfo
  | STTModelInfo
  | TTSModelInfo
  | OCRModelInfo;

/**
 * Registry of supported models
 */
export const MODEL_REGISTRY = {
  llm: {
    'Xenova/gpt2': {
      name: 'GPT-2 Small',
      description: 'Very small language model for testing and basic generation',
      size: '500MB',
      requirements: { minRam: 1024 },
      quantizedVersions: ['fp32', 'fp16', 'q8', 'q4'],
      family: 'gpt2',
      contextWindow: 1024,
      chatTemplate: false,
      functionCalling: false,
    },
    'Xenova/Qwen1.5-0.5B-Chat': {
      name: 'Qwen 1.5 0.5B Chat',
      description: 'Highly efficient small model with good chat capabilities',
      size: '1GB',
      requirements: { minRam: 2048 },
      quantizedVersions: ['fp16', 'q8', 'q4'],
      family: 'qwen',
      contextWindow: 32768,
      chatTemplate: true,
      functionCalling: false,
    },
    'Xenova/Phi-3-mini-4k-instruct': {
      name: 'Phi-3 Mini 4k',
      description: 'Microsoft Phi-3 Mini, strong reasoning capabilities',
      size: '2.5GB',
      requirements: { minRam: 4096, gpu: true },
      quantizedVersions: ['q4', 'q4f16'],
      family: 'phi',
      contextWindow: 4096,
      chatTemplate: true,
      functionCalling: false,
    },
    'Xenova/TinyLlama-1.1B-Chat-v1.0': {
      name: 'TinyLlama 1.1B',
      description: 'Compact Llama-based model',
      size: '1.5GB',
      requirements: { minRam: 3072 },
      quantizedVersions: ['fp16', 'q8', 'q4'],
      family: 'tinyllama',
      contextWindow: 2048,
      chatTemplate: true,
      functionCalling: false,
    },
    'Xenova/gemma-2b-it': {
      name: 'Gemma 2B IT',
      description: 'Google Gemma 2B instruction tuned',
      size: '1.8GB',
      requirements: { minRam: 4096 },
      quantizedVersions: ['q8', 'q4'],
      family: 'gemma',
      contextWindow: 8192,
      chatTemplate: true,
      functionCalling: false,
    },
  } as Record<string, LLMModelInfo>,

  embedding: {
    'Xenova/all-MiniLM-L6-v2': {
      name: 'all-MiniLM-L6-v2',
      description: 'Standard fast embedding model',
      size: '80MB',
      requirements: { minRam: 512 },
      quantizedVersions: ['fp32', 'fp16', 'q8'],
      dimension: 384,
      maxInputTokens: 512,
      pooling: 'mean',
    },
    'Xenova/bge-m3': {
      name: 'BGE-M3',
      description: 'Multilingual heavy embedding model',
      size: '1.5GB',
      requirements: { minRam: 2048, gpu: true },
      quantizedVersions: ['fp32', 'fp16'],
      dimension: 1024,
      maxInputTokens: 8192,
      pooling: 'cls',
    },
  } as Record<string, EmbeddingModelInfo>,

  stt: {
    'Xenova/whisper-tiny': {
      name: 'Whisper Tiny',
      size: '150MB',
      requirements: { minRam: 1024 },
      quantizedVersions: ['fp32', 'fp16', 'q8'],
      languages: ['en', 'multilingual'],
    },
    'Xenova/whisper-small': {
      name: 'Whisper Small',
      size: '500MB',
      requirements: { minRam: 2048 },
      quantizedVersions: ['fp32', 'fp16', 'q8'],
      languages: ['en', 'multilingual'],
    },
  } as Record<string, STTModelInfo>,

  tts: {
    'Xenova/speecht5_tts': {
      name: 'SpeechT5',
      size: '500MB',
      requirements: { minRam: 1024 },
      quantizedVersions: ['fp32', 'fp16'],
      languages: ['en'],
      speakers: 1,
    },
  } as Record<string, TTSModelInfo>,

  ocr: {
    tesseract: {
      name: 'Tesseract',
      size: '50MB',
      requirements: { minRam: 512 },
      quantizedVersions: [],
      languages: ['eng'],
    },
  } as Record<string, OCRModelInfo>,
} as const;

// Derived types for auto-complete
export type SupportedLLM = keyof typeof MODEL_REGISTRY.llm;
export type SupportedEmbedding = keyof typeof MODEL_REGISTRY.embedding;
export type SupportedSTT = keyof typeof MODEL_REGISTRY.stt;
export type SupportedTTS = keyof typeof MODEL_REGISTRY.tts;
export type SupportedOCR = keyof typeof MODEL_REGISTRY.ocr;

// Default models
export const DEFAULT_MODELS = {
  llm: 'Xenova/Qwen1.5-0.5B-Chat',
  embedding: 'Xenova/all-MiniLM-L6-v2',
  stt: 'Xenova/whisper-tiny',
  tts: 'Xenova/speecht5_tts',
  ocr: 'tesseract',
} as const;

/**
 * Get model info from registry
 */
export function getModelInfo<M extends Modality>(
  modality: M,
  model: string
): ModelInfo | undefined {
  const registry = MODEL_REGISTRY[modality as keyof typeof MODEL_REGISTRY];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (registry as any)?.[model];
}

/**
 * Check if a model is known in the registry
 */
export function isKnownModel(modality: Modality, model: string): boolean {
  return !!getModelInfo(modality, model);
}

/**
 * Get default model for modality
 */
export function getDefaultModel(modality: Modality): string {
  if (modality in DEFAULT_MODELS) {
    return DEFAULT_MODELS[modality as keyof typeof DEFAULT_MODELS];
  }
  return '';
}

/**
 * Get model requirements (RAM, GPU)
 */
export function getModelRequirements(
  modality: Modality,
  model: string
): BaseModelInfo['requirements'] | undefined {
  return getModelInfo(modality, model)?.requirements;
}

/**
 * Get LLM model family
 */
export function getModelFamily(
  model: string
): LLMModelInfo['family'] | undefined {
  const info = getModelInfo('llm', model);
  return (info as LLMModelInfo)?.family;
}
