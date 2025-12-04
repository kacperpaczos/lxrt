import { createAIProvider, init } from '../../../../src/index';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

describe('STT Model (Node + ORT)', () => {
  const provider = createAIProvider({
    stt: {
      model: 'Xenova/whisper-tiny',
      dtype: 'fp32',
      device: 'cpu',
    },
  });

  beforeAll(async () => {
    await init();
    await provider.warmup('stt');
  });

  afterAll(async () => {
    await provider.dispose();
  });

  it('transcribes short WAV from fixtures', async () => {
    const wavPath = path.join(__dirname, '../../../fixtures/audio/test.wav');
    const buf = readFileSync(wavPath);
    
    // Convert buffer to Float32Array for Node.js environment
    const audioData = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    
    const text = await provider.listen(audioData, { language: 'en', task: 'transcribe' });
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  }, 180000);
});

