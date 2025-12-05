/**
 * @tags stt, model, core, audio
 * @description STT Model integration tests - tests speech-to-text with Whisper
 */
import { createAIProvider, init } from '../../../../src/index';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { createTestLogger, measureAsync } from '../helpers/test-logger';

describe('STT Model (Node + ORT)', () => {
  const logger = createTestLogger('STT Model');
  
  const provider = createAIProvider({
    stt: {
      model: 'Xenova/whisper-tiny',
      dtype: 'fp32',
      device: 'cpu',
    },
  });

  beforeAll(async () => {
    logger.logTestStart('STT Model integration tests');
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

  it('transcribes short WAV from fixtures', async () => {
    const wavPath = path.join(__dirname, '../../../fixtures/audio/test.wav');
    logger.logInput('audioFile', wavPath);
    
    logger.logStep('Loading audio file');
    const buf = readFileSync(wavPath);
    logger.logOutput('bufferSize', `${buf.length} bytes`);
    
    // Convert buffer to Float32Array for Node.js environment
    const audioData = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    logger.logOutput('audioDataLength', `${audioData.length} samples`);
    
    logger.logApiCall('provider.listen()', { 
      audioDataLength: audioData.length, 
      options: { language: 'en', task: 'transcribe' } 
    });
    
    const text = await measureAsync(logger, 'listen', () => 
      provider.listen(audioData, { language: 'en', task: 'transcribe' })
    );
    
    logger.logOutput('transcription', text);
    
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
    
    console.log(`✅ STT transcribed: "${text}"`);
  }, 180000);
});
