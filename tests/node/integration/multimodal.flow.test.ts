import { createAIProvider, init } from '../../../src/index';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';

// LLM and TTS tests always enabled for full coverage

/**
 * Save audio blob to file with timestamp
 */
async function saveAudioWithTimestamp(audioBlob: Blob, prefix: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // YYYY-MM-DDTHH-MM-SS
  const filename = `${prefix}_${timestamp}.wav`;
  const outputDir = path.join(process.cwd(), 'test-audio-recordings');

  // Create directory if it doesn't exist
  mkdirSync(outputDir, { recursive: true });

  const audioPath = path.join(outputDir, filename);
  const arrayBuffer = await audioBlob.arrayBuffer();
  writeFileSync(audioPath, Buffer.from(arrayBuffer));

  console.log(`✅ Audio saved: ${audioPath} (${audioBlob.size} bytes)`);
  return audioPath;
}

describe('Integration: Multimodal flow (Node + ORT)', () => {
  describe('STT only (lightweight)', () => {
    const provider = createAIProvider({
      stt: { model: 'Xenova/whisper-tiny', dtype: 'fp32', device: 'cpu' },
    });

    beforeAll(async () => {
      await init();
      await provider.warmup('stt');
    });

    afterAll(async () => {
      await provider.dispose();
    });

    it('STT processes audio correctly', async () => {
      const wavPath = path.join(__dirname, '../../fixtures/audio/test.wav');
      const buf = readFileSync(wavPath);
      
      // Convert buffer to Float32Array for Node.js environment
      const audioData = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);

      // Save original audio with timestamp for reference
      const blob = new Blob([buf], { type: 'audio/wav' });
      const originalAudioPath = await saveAudioWithTimestamp(blob, 'stt-input');
      expect(originalAudioPath).toContain('test-audio-recordings');

      const text = await provider.listen(audioData, { language: 'en' });
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);

      console.log(`✅ STT transcribed: "${text}"`);
    }, 180000);
  });

  describe('LLM integration', () => {
    const provider = createAIProvider({
      stt: { model: 'Xenova/whisper-tiny', dtype: 'fp32', device: 'cpu' },
      llm: { model: 'Xenova/gpt2', dtype: 'fp32', device: 'cpu', maxTokens: 50 },
    });

    beforeAll(async () => {
      await init();
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
          const wavPath = path.join(__dirname, '../../fixtures/audio/test.wav');
          const buf = readFileSync(wavPath);
          
          // Convert buffer to Float32Array for Node.js environment
          const audioData = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);

          // Save original audio with timestamp for reference
          const blob = new Blob([buf], { type: 'audio/wav' });
          const originalAudioPath = await saveAudioWithTimestamp(blob, 'llm-stt-input');
          expect(originalAudioPath).toContain('test-audio-recordings');

          const transcribedText = await provider.listen(audioData, { language: 'en' });

          // LLM: process transcribed text
          const response = await provider.chat(`Respond to: "${transcribedText}"`);
          expect(response.content).toBeDefined();
          expect(response.content.length).toBeGreaterThan(0);

          console.log(`✅ STT transcribed: "${transcribedText}"`);
          console.log(`✅ LLM responded: "${response.content}"`);
        }, 300000);
  });

  describe('Full multimodal chain', () => {
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
          const wavPath = path.join(__dirname, '../../fixtures/audio/test.wav');
          const buf = readFileSync(wavPath);
          
          // Convert buffer to Float32Array for Node.js environment
          const audioData = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);

          // Save original audio with timestamp for reference
          const blob = new Blob([buf], { type: 'audio/wav' });
          const originalAudioPath = await saveAudioWithTimestamp(blob, 'multimodal-input');
          expect(originalAudioPath).toContain('test-audio-recordings');
          expect(originalAudioPath).toContain('multimodal-input_');

          const transcribedText = await provider.listen(audioData, { language: 'en' });

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

          // Save TTS audio recording with timestamp for validation
          const savedAudioPath = await saveAudioWithTimestamp(audioBlob, 'multimodal-tts');
          expect(savedAudioPath).toContain('test-audio-recordings');
          expect(savedAudioPath).toContain('multimodal-tts_');

          console.log(`✅ Multimodal chain: "${transcribedText}" → LLM → TTS saved`);
        }, 600000); // Long timeout for heavy models
  });
});
