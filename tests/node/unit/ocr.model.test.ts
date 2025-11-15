import { createAIProvider, init } from '../../../src/index';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

describe('OCR Model (Node + ORT)', () => {
  const provider = createAIProvider({
    ocr: {
      model: 'Xenova/trocr-small-printed',
      dtype: 'fp32',
      device: 'cpu',
    },
  });

  beforeAll(async () => {
    await init();
    await provider.warmup('ocr');
  });

  afterAll(async () => {
    await provider.dispose();
  });

  it('recognizes text from image', async () => {
    const imagePath = path.join(__dirname, '../../fixtures/images/test.png');
    const imageBuffer = readFileSync(imagePath);
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });

    const result = await provider.recognize(imageBlob);
    
    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
    
    console.log(`✅ OCR recognized: "${result.text}"`);
  });

  it('zwraca metadane rozpoznawania', async () => {
    const imagePath = path.join(__dirname, '../../fixtures/images/test.png');
    const imageBuffer = readFileSync(imagePath);
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });

    const result = await provider.recognize(imageBlob);
    
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('language');
    expect(result).toHaveProperty('regions');
    
    expect(typeof result.confidence).toBe('number');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    
    console.log(`✅ OCR confidence: ${result.confidence}`);
    console.log(`✅ OCR language: ${result.language}`);
  });

  it('handles różne formaty obrazów', async () => {
    const formats = ['test.jpg', 'test.png', 'test.gif'];
    
    for (const filename of formats) {
      const imagePath = path.join(__dirname, `../../fixtures/images/${filename}`);
      const imageBuffer = readFileSync(imagePath);
      const imageBlob = new Blob([imageBuffer], { type: `image/${filename.split('.').pop()}` });

      const result = await provider.recognize(imageBlob);
      
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');
      
      console.log(`✅ ${filename}: "${result.text}"`);
    }
  });

  it('handles opcje OCR', async () => {
    const imagePath = path.join(__dirname, '../../fixtures/images/test.png');
    const imageBuffer = readFileSync(imagePath);
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });

    const result = await provider.recognize(imageBlob, {
      language: 'en',
      confidence: 0.8,
    });
    
    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    
    console.log(`✅ OCR with options: "${result.text}" (confidence: ${result.confidence})`);
  });

  it('handles obrazy bez tekstu', async () => {
    // Test with an image that might not have text
    const imagePath = path.join(__dirname, '../../fixtures/images/test.jpg');
    const imageBuffer = readFileSync(imagePath);
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });

    const result = await provider.recognize(imageBlob);
    
    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    // Even if no text is found, should return empty string, not error
    expect(typeof result.text).toBe('string');
    
    console.log(`✅ OCR no-text result: "${result.text}"`);
  });
});
