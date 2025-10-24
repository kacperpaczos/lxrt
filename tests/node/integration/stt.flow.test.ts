import { createAIProvider } from '../../../dist/index.js';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

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

    const text = await provider.listen(blob, { language: 'en' });
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  }, 180000);
});


