/**
 * @tags stt, llm, tts, flow, multimodal, audio
 * @description Multimodal flow integration tests - tests STT→LLM→TTS chains
 */
import { createAIProvider, init } from '../../../src/index';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';
import { createTestLogger, measureAsync } from './helpers/test-logger';

/**
 * Save audio blob to file with timestamp
 */
async function saveAudioWithTimestamp(audioBlob: Blob, prefix: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `${prefix}_${timestamp}.wav`;
  const outputDir = path.join(process.cwd(), 'test-audio-recordings');

  mkdirSync(outputDir, { recursive: true });

  const audioPath = path.join(outputDir, filename);
  const arrayBuffer = await audioBlob.arrayBuffer();
  writeFileSync(audioPath, Buffer.from(arrayBuffer));

  console.log(`✅ Audio saved: ${audioPath} (${audioBlob.size} bytes)`);
  return audioPath;
}

describe('Integration: Multimodal flow (Node + ORT)', () => {
  
  describe('STT only (lightweight)', () => {
    const logger = createTestLogger('Multimodal - STT Only');
    
    const provider = createAIProvider({
      stt: { model: 'Xenova/whisper-tiny', dtype: 'fp32', device: 'cpu' },
    });

    beforeAll(async () => {
      logger.logTestStart('Multimodal STT-only flow');
      logger.logStep('Initializing transformers');
      await measureAsync(logger, 'init', () => init());
      
      logger.logModelLoad('stt', 'Xenova/whisper-tiny', { dtype: 'fp32', device: 'cpu' });
      await measureAsync(logger, 'warmup-stt', () => provider.warmup('stt'));
    });

    afterAll(async () => {
      logger.logStep('Disposing provider');
      await provider.dispose();
      logger.logTestEnd(true);
    });

    it('STT processes audio correctly', async () => {
      const wavPath = path.join(__dirname, '../../fixtures/audio/test.wav');
      logger.logInput('audioPath', wavPath);
      
      logger.logStep('Loading audio file');
      const buf = readFileSync(wavPath);
      logger.logOutput('bufferSize', `${buf.length} bytes`);
      
      const audioData = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
      logger.logOutput('audioDataSamples', audioData.length);

      // Save original audio with timestamp for reference
      logger.logStep('Saving input audio');
      const blob = new Blob([buf], { type: 'audio/wav' });
      const originalAudioPath = await saveAudioWithTimestamp(blob, 'stt-input');
      logger.logOutput('savedPath', originalAudioPath);
      expect(originalAudioPath).toContain('test-audio-recordings');

      logger.logApiCall('provider.listen()', { audioDataLength: audioData.length, language: 'en' });
      
      const text = await measureAsync(logger, 'listen', () => 
        provider.listen(audioData, { language: 'en' })
      );
      
      logger.logOutput('transcription', text);
      
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);

      console.log(`✅ STT transcribed: "${text}"`);
    }, 180000);
  });

  describe('LLM integration', () => {
    const logger = createTestLogger('Multimodal - STT+LLM');
    
    const provider = createAIProvider({
      stt: { model: 'Xenova/whisper-tiny', dtype: 'fp32', device: 'cpu' },
      llm: { model: 'Xenova/gpt2', dtype: 'fp32', device: 'cpu', maxTokens: 50 },
    });

    beforeAll(async () => {
      logger.logTestStart('Multimodal STT→LLM flow');
      logger.logStep('Initializing transformers');
      await measureAsync(logger, 'init', () => init());
      
      logger.logStep('Warming up models in parallel');
      logger.logModelLoad('stt', 'Xenova/whisper-tiny', { dtype: 'fp32', device: 'cpu' });
      logger.logModelLoad('llm', 'Xenova/gpt2', { dtype: 'fp32', device: 'cpu', maxTokens: 50 });
      
      await Promise.all([
        measureAsync(logger, 'warmup-stt', () => provider.warmup('stt')),
        measureAsync(logger, 'warmup-llm', () => provider.warmup('llm')),
      ]);
    });

    afterAll(async () => {
      logger.logStep('Disposing provider');
      await provider.dispose();
      logger.logTestEnd(true);
    });

    it('STT → LLM conversation', async () => {
      // STT: audio → text
      const wavPath = path.join(__dirname, '../../fixtures/audio/test.wav');
      logger.logInput('audioPath', wavPath);
      
      logger.logStep('Loading audio file');
      const buf = readFileSync(wavPath);
      const audioData = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);

      // Save original audio with timestamp for reference
      logger.logStep('Saving input audio');
      const blob = new Blob([buf], { type: 'audio/wav' });
      const originalAudioPath = await saveAudioWithTimestamp(blob, 'llm-stt-input');
      logger.logOutput('savedPath', originalAudioPath);
      expect(originalAudioPath).toContain('test-audio-recordings');

      logger.logStep('STT: Transcribing audio');
      logger.logApiCall('provider.listen()', { audioDataLength: audioData.length });
      
      const transcribedText = await measureAsync(logger, 'listen', () => 
        provider.listen(audioData, { language: 'en' })
      );
      logger.logOutput('transcription', transcribedText);

      // LLM: process transcribed text
      const llmPrompt = `Respond to: "${transcribedText}"`;
      logger.logInput('llmPrompt', llmPrompt);
      
      logger.logStep('LLM: Processing transcribed text');
      logger.logApiCall('provider.chat()', { prompt: llmPrompt });
      
      const response = await measureAsync(logger, 'chat', () => provider.chat(llmPrompt));
      logger.logOutput('llmResponse', response);
      
      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);

      console.log(`✅ STT transcribed: "${transcribedText}"`);
      console.log(`✅ LLM responded: "${response.content}"`);
    }, 300000);
  });

  describe('Full multimodal chain', () => {
    const logger = createTestLogger('Multimodal - Full Chain');
    
    const provider = createAIProvider({
      stt: { model: 'Xenova/whisper-tiny', dtype: 'fp32', device: 'cpu' },
      llm: { model: 'Xenova/gpt2', dtype: 'fp32', device: 'cpu', maxTokens: 30 },
      tts: { model: 'Xenova/speecht5_tts', dtype: 'fp32', device: 'cpu' },
    });

    beforeAll(async () => {
      logger.logTestStart('Full multimodal chain: STT → LLM → TTS');
      logger.logStep('Initializing transformers');
      await init();
      
      logger.logStep('Warming up all models in parallel');
      logger.logModelLoad('stt', 'Xenova/whisper-tiny', { dtype: 'fp32', device: 'cpu' });
      logger.logModelLoad('llm', 'Xenova/gpt2', { dtype: 'fp32', device: 'cpu', maxTokens: 30 });
      logger.logModelLoad('tts', 'Xenova/speecht5_tts', { dtype: 'fp32', device: 'cpu' });
      
      await Promise.all([
        measureAsync(logger, 'warmup-stt', () => provider.warmup('stt')),
        measureAsync(logger, 'warmup-llm', () => provider.warmup('llm')),
        measureAsync(logger, 'warmup-tts', () => provider.warmup('tts')),
      ]);
    });

    afterAll(async () => {
      logger.logStep('Disposing provider');
      await provider.dispose();
      logger.logTestEnd(true);
    });

    it('STT → LLM → TTS roundtrip', async () => {
      // STT: audio → text
      const wavPath = path.join(__dirname, '../../fixtures/audio/test.wav');
      logger.logInput('audioPath', wavPath);
      
      logger.logStep('Loading audio file');
      const buf = readFileSync(wavPath);
      const audioData = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
      logger.logOutput('audioDataSamples', audioData.length);

      // Save original audio with timestamp for reference
      logger.logStep('Saving input audio');
      const blob = new Blob([buf], { type: 'audio/wav' });
      const originalAudioPath = await saveAudioWithTimestamp(blob, 'multimodal-input');
      logger.logOutput('savedInputPath', originalAudioPath);
      expect(originalAudioPath).toContain('test-audio-recordings');
      expect(originalAudioPath).toContain('multimodal-input_');

      logger.logStep('Step 1: STT - Transcribing audio');
      logger.logApiCall('provider.listen()', { audioDataLength: audioData.length });
      
      const transcribedText = await measureAsync(logger, 'stt-listen', () => 
        provider.listen(audioData, { language: 'en' })
      );
      logger.logOutput('transcription', transcribedText);

      // LLM: respond to transcribed text
      const llmPrompt = `Say something about: "${transcribedText}"`;
      logger.logInput('llmPrompt', llmPrompt);
      
      logger.logStep('Step 2: LLM - Generating response');
      logger.logApiCall('provider.chat()', { prompt: llmPrompt });
      
      const response = await measureAsync(logger, 'llm-chat', () => provider.chat(llmPrompt));
      logger.logOutput('llmResponse', response);
      expect(response.content.length).toBeGreaterThan(0);

      // TTS: text → audio
      const speakerEmbeddings = new Float32Array(512).fill(0.5);
      logger.logInput('ttsText', response.content);
      logger.logInput('speakerEmbeddings', 'Float32Array(512) filled with 0.5');
      
      logger.logStep('Step 3: TTS - Synthesizing speech');
      logger.logApiCall('provider.speak()', { text: response.content, speakerSize: 512 });
      
      const audioBlob = await measureAsync(logger, 'tts-speak', () => 
        provider.speak(response.content, { speaker: speakerEmbeddings })
      );
      logger.logOutput('audioBlob', audioBlob);

      expect(audioBlob).toBeInstanceOf(Blob);
      expect(audioBlob.size).toBeGreaterThan(1000);

      // Save TTS audio recording with timestamp for validation
      logger.logStep('Saving TTS output');
      const savedAudioPath = await saveAudioWithTimestamp(audioBlob, 'multimodal-tts');
      logger.logOutput('savedOutputPath', savedAudioPath);
      expect(savedAudioPath).toContain('test-audio-recordings');
      expect(savedAudioPath).toContain('multimodal-tts_');

      console.log(`✅ Multimodal chain: "${transcribedText}" → LLM → TTS saved`);
    }, 600000);
  });
});
