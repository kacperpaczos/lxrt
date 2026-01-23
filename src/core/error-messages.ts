/**
 * Centralized error messages for LXRT
 */
export const ERRORS = {
  MODEL: {
    NOT_LOADED: (modality: string) =>
      `Model for ${modality} must be loaded. Call warmup('${modality}') first.`,
    NOT_CONFIGURED: (modality: string) =>
      `${modality} not configured. Add config to createAIProvider().`,
  },
} as const;
