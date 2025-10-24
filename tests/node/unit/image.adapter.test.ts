import { ImageEmbeddingAdapter } from '../../../src/app/vectorization/adapters/ImageEmbeddingAdapter';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

describe('ImageEmbeddingAdapter (Node + ORT)', () => {
  let adapter: ImageEmbeddingAdapter;

  beforeEach(() => {
    adapter = new ImageEmbeddingAdapter();
    // Mock canvas global for Node environment
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      width = 0;
      height = 0;
      complete = false;

      set src(value: string) {
        this.src = value;
        // Simulate image load
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
    } as any;
  });

  afterEach(async () => {
    await adapter.dispose();
  });

  it('supports image modality', () => {
    const modalities = adapter.getSupportedModalities();
    expect(modalities).toContain('image');
  });

  it('handles PNG image format', async () => {
    const imagePath = path.join(__dirname, '../../../fixtures/images/test.png');
    const buf = readFileSync(imagePath);
    const file = new File([buf], 'test.png', { type: 'image/png' });

    expect(adapter.canHandle(file)).toBe(true);
  });

  it('handles various image formats', async () => {
    const formats = ['test.jpg', 'test.gif', 'test.webp', 'test.bmp'];
    for (const filename of formats) {
      const imagePath = path.join(__dirname, `../../../fixtures/images/${filename}`);
      const buf = readFileSync(imagePath);
      const file = new File([buf], filename, { type: `image/${filename.split('.').pop()}` });

      expect(adapter.canHandle(file)).toBe(true);
    }
  });

  it('rejects non-image files', async () => {
    const audioPath = path.join(__dirname, '../../../fixtures/audio/test.wav');
    const buf = readFileSync(audioPath);
    const file = new File([buf], 'test.wav', { type: 'audio/wav' });

    expect(adapter.canHandle(file)).toBe(false);
  });
});
