/**
 * CLI Pull Command - Download models from Hugging Face Hub
 */

import { createLogBus } from '../../core/logging/LogBus';

const logger = createLogBus('CLI:pull');

interface PullOptions {
  dtype: string;
  cacheDir?: string;
}

/**
 * Download a model from Hugging Face Hub
 * Models are cached locally for future use
 */
export async function pullCommand(
  modelId: string,
  options: PullOptions
): Promise<void> {
  console.log(`\n📦 Downloading model: ${modelId}`);
  console.log(`   DType: ${options.dtype}`);

  try {
    // Dynamic import to avoid circular dependencies
    const { pipeline, env } = await import('@huggingface/transformers');

    // Set cache directory if provided
    if (options.cacheDir) {
      env.cacheDir = options.cacheDir;
      console.log(`   Cache: ${options.cacheDir}`);
    }

    console.log('\n⏳ Downloading...\n');

    // Determine pipeline type based on model name
    let pipelineType:
      | 'text-generation'
      | 'feature-extraction'
      | 'text-to-speech'
      | 'automatic-speech-recognition' = 'text-generation';

    const modelLower = modelId.toLowerCase();
    if (
      modelLower.includes('embed') ||
      modelLower.includes('minilm') ||
      modelLower.includes('bge')
    ) {
      pipelineType = 'feature-extraction';
    } else if (modelLower.includes('tts') || modelLower.includes('speecht5')) {
      pipelineType = 'text-to-speech';
    } else if (modelLower.includes('whisper') || modelLower.includes('stt')) {
      pipelineType = 'automatic-speech-recognition';
    }

    // Download model by creating pipeline (this caches it)
    await pipeline(pipelineType, modelId, {
      dtype: options.dtype as 'fp32' | 'fp16' | 'q8' | 'q4',
      progress_callback: (progress: {
        status: string;
        progress?: number;
        file?: string;
      }) => {
        if (progress.status === 'progress' && progress.progress !== undefined) {
          const percent = Math.round(progress.progress);
          const bar =
            '█'.repeat(Math.floor(percent / 5)) +
            '░'.repeat(20 - Math.floor(percent / 5));
          process.stdout.write(
            `\r   [${bar}] ${percent}% ${progress.file || ''}`
          );
        } else if (progress.status === 'done') {
          process.stdout.write(
            '\r   [████████████████████] 100% Done!          \n'
          );
        }
      },
    });

    console.log(`\n✅ Model downloaded successfully: ${modelId}\n`);
    logger.info('Model downloaded', { modelId, dtype: options.dtype });
  } catch (error) {
    console.error(
      `\n❌ Failed to download model: ${(error as Error).message}\n`
    );
    logger.error('Download failed', {
      modelId,
      error: (error as Error).message,
    });
    process.exit(1);
  }
}
