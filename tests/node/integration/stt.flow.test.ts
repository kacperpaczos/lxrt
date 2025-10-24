import { createAIProvider } from '../../../dist/index.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';

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

describe('Integration: STT flow (Node + ORT)', () => {
  const provider = createAIProvider({
    stt: { model: 'Xenova/whisper-tiny', dtype: 'fp32', device: 'cpu' },
  });

  beforeAll(async () => {
    await provider.warmup('stt');
  });

  afterAll(async () => {
    await provider.dispose();
  });

  it('warmup → listen → dispose', async () => {
    const wavPath = path.join(__dirname, '../../../fixtures/audio/test.wav');
    const buf = readFileSync(wavPath);
    const blob = new Blob([buf], { type: 'audio/wav' });

    // Save original audio with timestamp for reference
    const originalAudioPath = await saveAudioWithTimestamp(blob, 'stt-input');
    expect(originalAudioPath).toContain('test-audio-recordings');
    expect(originalAudioPath).toContain('stt-input_');

    const text = await provider.listen(blob, { language: 'en' });
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);

    console.log(`✅ STT transcribed: "${text}"`);
  }, 180000);
});


