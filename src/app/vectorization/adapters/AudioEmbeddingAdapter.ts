/**
 * Audio Embedding Adapter using CLAP (Contrastive Language-Audio Pretraining)
 */

import type { EmbeddingAdapter, EmbeddingResult } from './EmbeddingAdapter';
import type { VectorModality } from '../../../core/types';
import type { CLAPPipelineOutput, TensorLike } from '../../../types/external';

export class AudioEmbeddingAdapter implements EmbeddingAdapter {
  private initialized = false;
  // Pipeline is typed loosely due to Transformers.js complex overloads
  private pipeline:
    | ((
        input: Float32Array | string,
        options?: Record<string, unknown>
      ) => Promise<CLAPPipelineOutput>)
    | null = null;

  getSupportedModalities(): VectorModality[] {
    return ['audio'];
  }

  canHandle(file: File): boolean {
    const audioTypes = [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4',
      'audio/aac',
      'audio/flac',
      'audio/webm',
    ];
    return audioTypes.some(type => file.type.startsWith(type));
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import Transformers.js
      const { pipeline } = await import('@huggingface/transformers');

      // Initialize CLAP pipeline for audio embeddings
      // Type assertion needed due to Transformers.js complex overloads
      const loadedPipeline = await pipeline(
        'feature-extraction',
        'laion/clap-htsat-fused',
        {
          device: this.getPreferredDevice(),
        }
      );
      this.pipeline = loadedPipeline as unknown as typeof this.pipeline;

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize audio embedding adapter: ${error}`);
    }
  }

  async process(file: File): Promise<EmbeddingResult> {
    await this.ensureInitialized();

    const startTime = performance.now();

    try {
      // Convert File to audio data
      const audioBuffer = await this.fileToAudioBuffer(file);

      // Process through CLAP pipeline
      const output = await this.pipeline!(audioBuffer);

      // Extract embedding (assuming the model returns pooled embeddings)
      const vector = this.extractEmbedding(output);

      const processingTime = performance.now() - startTime;

      return {
        vector,
        metadata: {
          modality: 'audio',
          originalSize: file.size,
          processedSize: audioBuffer.length * 4, // Assuming Float32
          processingTimeMs: processingTime,
        },
      };
    } catch (error) {
      throw new Error(`Audio processing failed: ${error}`);
    }
  }

  async processText(text: string): Promise<Float32Array> {
    await this.ensureInitialized();

    try {
      // CLAP supports text inputs for text-audio retrieval
      const output = await this.pipeline!(text);
      return this.extractEmbedding(output);
    } catch (error) {
      // If model doesn't support text, we might want to throw or return dummy
      throw new Error(`Audio adapter text processing failed: ${error}`);
    }
  }

  async dispose(): Promise<void> {
    if (this.pipeline) {
      // Cleanup pipeline resources
      this.pipeline = null;
    }
    this.initialized = false;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private getPreferredDevice(): 'webgpu' | 'wasm' {
    // Check WebGPU availability
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      return 'webgpu';
    }
    return 'wasm'; // Fallback to WASM
  }

  private async fileToAudioBuffer(file: File): Promise<Float32Array> {
    return new Promise((resolve, reject) => {
      const audioContext = new AudioContext();
      const reader = new FileReader();

      reader.onload = async e => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          // Convert to mono and normalize
          const channelData = audioBuffer.getChannelData(0);
          const samples = channelData.length;

          // Simple normalization (could be more sophisticated)
          const maxValue = Math.max(...channelData.map(Math.abs));
          const normalizedData = new Float32Array(samples);

          for (let i = 0; i < samples; i++) {
            normalizedData[i] = channelData[i] / maxValue;
          }

          resolve(normalizedData);
        } catch (error) {
          reject(error);
        } finally {
          audioContext.close();
        }
      };

      reader.onerror = () => {
        audioContext.close();
        reject(new Error('Failed to read audio file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  private extractEmbedding(output: CLAPPipelineOutput): Float32Array {
    // Extract the embedding from the pipeline output
    // This depends on the specific CLAP model implementation
    if (output.pooled_output) {
      return new Float32Array(output.pooled_output.data);
    }

    if (output.last_hidden_state) {
      // Use mean pooling if pooled output is not available
      const hiddenState: TensorLike = output.last_hidden_state;
      const embeddingSize = hiddenState.dims[hiddenState.dims.length - 1];
      const sequenceLength = hiddenState.dims[hiddenState.dims.length - 2];

      const vector = new Float32Array(embeddingSize);
      for (let i = 0; i < embeddingSize; i++) {
        let sum = 0;
        for (let j = 0; j < sequenceLength; j++) {
          sum += hiddenState.data[j * embeddingSize + i];
        }
        vector[i] = sum / sequenceLength;
      }

      return vector;
    }

    throw new Error('Unable to extract embedding from model output');
  }
}
