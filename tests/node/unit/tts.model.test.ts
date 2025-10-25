import { createAIProvider, init } from '../../../src/index';
import { writeFileSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';

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

describe('TTS Model (Node + ORT)', () => {
  const provider = createAIProvider({
    tts: {
      model: 'Xenova/speecht5_tts',
      dtype: 'fp32',
      device: 'cpu',
    },
  });

  beforeAll(async () => {
    await init();
    await provider.warmup('tts');
  });

  afterAll(async () => {
    await provider.dispose();
  });

  it('generates audio from text', async () => {
    const text = 'Hello, this is a test of text to speech.';
    const speakerEmbeddings = new Float32Array(512).fill(0.5); // Simple default speaker
    
    const audioBlob = await provider.speak(text, {
      speaker: speakerEmbeddings,
    });

    expect(audioBlob).toBeInstanceOf(Blob);
    expect(audioBlob.size).toBeGreaterThan(1000); // Should have some content
    
    // Save audio for validation
    const savedPath = await saveAudioWithTimestamp(audioBlob, 'tts-test');
    expect(savedPath).toContain('test-audio-recordings');
    
    console.log(`✅ TTS generated audio: ${audioBlob.size} bytes`);
  });

  it('generates różne audio dla różnych tekstów', async () => {
    const text1 = 'This is the first test.';
    const text2 = 'This is the second test with different content.';
    const speakerEmbeddings = new Float32Array(512).fill(0.5);
    
    const audio1 = await provider.speak(text1, { speaker: speakerEmbeddings });
    const audio2 = await provider.speak(text2, { speaker: speakerEmbeddings });
    
    expect(audio1).toBeInstanceOf(Blob);
    expect(audio2).toBeInstanceOf(Blob);
    expect(audio1.size).toBeGreaterThan(0);
    expect(audio2.size).toBeGreaterThan(0);
    
    // Different texts should produce different audio
    expect(audio1.size).not.toBe(audio2.size);
    
    // Save both for comparison
    await saveAudioWithTimestamp(audio1, 'tts-text1');
    await saveAudioWithTimestamp(audio2, 'tts-text2');
    
    console.log(`✅ Audio 1: ${audio1.size} bytes`);
    console.log(`✅ Audio 2: ${audio2.size} bytes`);
  });

  it('handles różne speaker embeddings', async () => {
    const text = 'Testing different speaker voices.';
    
    // Different speaker embeddings
    const speaker1 = new Float32Array(512).fill(0.3);
    const speaker2 = new Float32Array(512).fill(0.7);
    
    const audio1 = await provider.speak(text, { speaker: speaker1 });
    const audio2 = await provider.speak(text, { speaker: speaker2 });
    
    expect(audio1).toBeInstanceOf(Blob);
    expect(audio2).toBeInstanceOf(Blob);
    expect(audio1.size).toBeGreaterThan(0);
    expect(audio2.size).toBeGreaterThan(0);
    
    // Different speakers should produce different audio
    expect(audio1.size).not.toBe(audio2.size);
    
    // Save both for comparison
    await saveAudioWithTimestamp(audio1, 'tts-speaker1');
    await saveAudioWithTimestamp(audio2, 'tts-speaker2');
    
    console.log(`✅ Speaker 1: ${audio1.size} bytes`);
    console.log(`✅ Speaker 2: ${audio2.size} bytes`);
  });

  it('generates audio dla długich tekstów', async () => {
    const longText = 'This is a longer text that should test the TTS model with more content. ' +
      'It includes multiple sentences and should produce a longer audio output. ' +
      'The model should handle this gracefully and produce coherent speech.';
    
    const speakerEmbeddings = new Float32Array(512).fill(0.5);
    const audioBlob = await provider.speak(longText, {
      speaker: speakerEmbeddings,
    });

    expect(audioBlob).toBeInstanceOf(Blob);
    expect(audioBlob.size).toBeGreaterThan(2000); // Longer text should produce more audio
    
    // Save for validation
    await saveAudioWithTimestamp(audioBlob, 'tts-long-text');
    
    console.log(`✅ Long text audio: ${audioBlob.size} bytes`);
  });
});
