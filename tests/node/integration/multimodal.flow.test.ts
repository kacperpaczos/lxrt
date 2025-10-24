import { createAIProvider } from '../../../dist/index.js';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

// Skip multimodal tests unless explicitly enabled (heavy models)
const RUN_LLM_TESTS = process.env.RUN_LLM === '1';
const RUN_TTS_TESTS = process.env.RUN_TTS === '1';

describe('Integration: Multimodal flow (Node + ORT)', () => {
  describe('STT only (lightweight)', () => {
    const provider = createAIProvider({
      stt: { model: 'Xenova/whisper-tiny', dtype: 'fp32', device: 'cpu' },
    });

    beforeAll(async () => {
      await provider.warmup('stt');
    });

    afterAll(async () => {
      await provider.dispose();
    });

    it('STT processes audio correctly', async () => {
      const wavPath = path.join(__dirname, '../../../fixtures/audio/test.wav');
      const buf = readFileSync(wavPath);
      const blob = new Blob([buf], { type: 'audio/wav' });

      const text = await provider.listen(blob, { language: 'en' });
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    }, 180000);
  });

  (RUN_LLM_TESTS ? describe : describe.skip)('LLM integration', () => {
    const provider = createAIProvider({
      stt: { model: 'Xenova/whisper-tiny', dtype: 'fp32', device: 'cpu' },
      llm: { model: 'Xenova/gpt2', dtype: 'fp32', device: 'cpu', maxTokens: 50 },
    });

    beforeAll(async () => {
      await Promise.all([
        provider.warmup('stt'),
        provider.warmup('llm'),
      ]);
    });

    afterAll(async () => {
      await provider.dispose();
    });

    it('STT → LLM conversation', async () => {
      // STT: audio → text
      const wavPath = path.join(__dirname, '../../../fixtures/audio/test.wav');
      const buf = readFileSync(wavPath);
      const blob = new Blob([buf], { type: 'audio/wav' });
      const transcribedText = await provider.listen(blob, { language: 'en' });

      // LLM: process transcribed text
      const response = await provider.chat(`Respond to: "${transcribedText}"`);
      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);
    }, 300000);
  });

  (RUN_TTS_TESTS ? describe : describe.skip)('Full multimodal chain', () => {
    const provider = createAIProvider({
      stt: { model: 'Xenova/whisper-tiny', dtype: 'fp32', device: 'cpu' },
      llm: { model: 'Xenova/gpt2', dtype: 'fp32', device: 'cpu', maxTokens: 30 },
      tts: { model: 'Xenova/speecht5_tts', dtype: 'fp32', device: 'cpu' },
    });

    beforeAll(async () => {
      await Promise.all([
        provider.warmup('stt'),
        provider.warmup('llm'),
        provider.warmup('tts'),
      ]);
    });

    afterAll(async () => {
      await provider.dispose();
    });

    it('STT → LLM → TTS roundtrip', async () => {
      // STT: audio → text
      const wavPath = path.join(__dirname, '../../../fixtures/audio/test.wav');
      const buf = readFileSync(wavPath);
      const blob = new Blob([buf], { type: 'audio/wav' });
      const transcribedText = await provider.listen(blob, { language: 'en' });

      // LLM: respond to transcribed text
      const response = await provider.chat(`Say something about: "${transcribedText}"`);
      expect(response.content.length).toBeGreaterThan(0);

      // TTS: text → audio
      const speakerEmbeddings = new Float32Array(512).fill(0.5); // Simple default
      const audioBlob = await provider.speak(response.content, {
        speaker: speakerEmbeddings,
      });

      expect(audioBlob).toBeInstanceOf(Blob);
      expect(audioBlob.size).toBeGreaterThan(1000); // Should have some content
    }, 600000); // Long timeout for heavy models
  });
});
