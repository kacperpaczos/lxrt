/**
 * @tags stt, flow, audio
 * @description STT flow integration test - tests full speech-to-text lifecycle
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

describe('Integration: STT flow (Node + ORT)', () => {
  const logger = createTestLogger('STT Flow');
  
  const provider = createAIProvider({
    stt: { model: 'Xenova/whisper-tiny', dtype: 'fp32', device: 'cpu' },
  });

  beforeAll(async () => {
    logger.logTestStart('STT flow integration test');
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

  it('warmup → listen → dispose', async () => {
    const wavPath = path.join(__dirname, '../../fixtures/audio/test.wav');
    logger.logInput('audioPath', wavPath);
    
    logger.logStep('Loading audio file');
    const buf = readFileSync(wavPath);
    logger.logOutput('bufferSize', `${buf.length} bytes`);
    
    // Convert buffer to Float32Array for Node.js environment
    const audioData = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    logger.logOutput('audioDataSamples', audioData.length);

    // Save original audio with timestamp for reference
    logger.logStep('Saving input audio for reference');
    const blob = new Blob([buf], { type: 'audio/wav' });
    const originalAudioPath = await saveAudioWithTimestamp(blob, 'stt-input');
    logger.logOutput('savedAudioPath', originalAudioPath);
    expect(originalAudioPath).toContain('test-audio-recordings');
    expect(originalAudioPath).toContain('stt-input_');

    logger.logStep('Transcribing audio');
    logger.logApiCall('provider.listen()', { 
      audioDataLength: audioData.length, 
      options: { language: 'en' } 
    });
    
    const text = await measureAsync(logger, 'listen', () => 
      provider.listen(audioData, { language: 'en' })
    );
    
    logger.logOutput('transcription', text);
    
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);

    console.log(`✅ STT transcribed: "${text}"`);
  }, 180000);
});
