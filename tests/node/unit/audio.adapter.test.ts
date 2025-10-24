import { AudioEmbeddingAdapter } from '../../../src/app/vectorization/adapters/AudioEmbeddingAdapter';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

describe('AudioEmbeddingAdapter (Node + ORT)', () => {
  let adapter: AudioEmbeddingAdapter;

  beforeEach(() => {
    adapter = new AudioEmbeddingAdapter();
    // Mock Web Audio API for Node environment
    global.AudioContext = class {
      decodeAudioData: (arrayBuffer: ArrayBuffer) => Promise<AudioBuffer>;
      close: () => void;

      constructor() {
        this.decodeAudioData = jest.fn().mockImplementation((arrayBuffer: ArrayBuffer) => {
          // Check if this looks like valid audio by checking the first few bytes
          const view = new Uint8Array(arrayBuffer);
          const isValidAudio = view.length > 44 && (
            // Check for RIFF (WAV) header
            (view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46) ||
            // Check for MP3 frame sync
            (view[0] === 0xFF && (view[1] & 0xE0) === 0xE0)
          );

          if (!isValidAudio) {
            return Promise.reject(new Error('Not a valid audio file'));
          }

          // Mock AudioBuffer
          const mockBuffer = {
            getChannelData: jest.fn().mockReturnValue(new Float32Array([0.1, 0.2, 0.3])),
            numberOfChannels: 1,
            sampleRate: 16000,
            length: 3,
            duration: 0.0001875,
          };

          return Promise.resolve(mockBuffer as any);
        });

        this.close = jest.fn();
      }
    } as any;
  });

  afterEach(async () => {
    await adapter.dispose();
  });

  it('supports audio modality', () => {
    const modalities = adapter.getSupportedModalities();
    expect(modalities).toContain('audio');
  });

  it('handles WAV audio format', async () => {
    const audioPath = path.join(__dirname, '../../../fixtures/audio/test.wav');
    const buf = readFileSync(audioPath);
    const file = new File([buf], 'test.wav', { type: 'audio/wav' });

    expect(adapter.canHandle(file)).toBe(true);
  });

  it('handles various audio formats', async () => {
    const formats = ['test.mp3', 'test.ogg', 'test.mp4', 'test.aac', 'test.flac'];
    for (const filename of formats) {
      const audioPath = path.join(__dirname, `../../../fixtures/audio/${filename}`);
      const buf = readFileSync(audioPath);
      const file = new File([buf], filename, { type: `audio/${filename.split('.').pop()}` });

      expect(adapter.canHandle(file)).toBe(true);
    }
  });

  it('rejects non-audio files', async () => {
    const imagePath = path.join(__dirname, '../../../fixtures/images/test.jpg');
    const buf = readFileSync(imagePath);
    const file = new File([buf], 'test.jpg', { type: 'image/jpeg' });

    expect(adapter.canHandle(file)).toBe(false);
  });
});
