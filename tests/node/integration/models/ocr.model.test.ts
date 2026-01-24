/**
 * @tags ocr, model, core, image
 * @description OCR Model integration tests - tests text recognition with TrOCR
 */
import { createAIProvider, init } from '../../../../src/index';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { createTestLogger, measureAsync } from '../helpers/test-logger';
import { FixtureLoader } from '../../../utils/FixtureLoader';

describe('OCR Model (Node + ORT)', () => {
  const logger = createTestLogger('OCR Model');

  const provider = createAIProvider({
    ocr: {
      model: 'Xenova/trocr-small-printed',
      dtype: 'fp32',
      device: 'cpu',
    },
  });

  beforeAll(async () => {
    logger.logTestStart('OCR Model integration tests');
    logger.logStep('Initializing transformers');
    await measureAsync(logger, 'init', () => init());

    logger.logModelLoad('ocr', 'Xenova/trocr-small-printed', { dtype: 'fp32', device: 'cpu' });
    await measureAsync(logger, 'warmup-ocr', () => provider.warmup('ocr'));
  });

  afterAll(async () => {
    logger.logStep('Disposing provider');
    await provider.dispose();
    logger.logTestEnd(true);
  });

  it('recognizes text from image', async () => {
    const filename = 'test.png';
    if (!FixtureLoader.exists('images', filename)) {
      logger.logStep('Skipping OCR test: Missing fixture');
      return;
    }
    logger.logInput('imagePath', filename);

    logger.logStep('Loading image file');
    const imagePath = FixtureLoader.getPath('images', filename);
    const imageAndBuf = readFileSync(imagePath);

    logger.logOutput('imageBufferSize', `${imageAndBuf.length} bytes`);

    const imageBlob = new Blob([imageAndBuf], { type: 'image/png' });
    logger.logOutput('imageBlob', imageBlob);

    logger.logApiCall('provider.recognize()', { imageType: 'image/png', size: imageAndBuf.length });

    const result = await measureAsync(logger, 'recognize', () => provider.recognize(imageBlob));

    logger.logOutput('result', result);

    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);

    console.log(`✅ OCR recognized: "${result.text}"`);
  });

  it('zwraca metadane rozpoznawania', async () => {
    const imagePath = path.join(__dirname, '../../../fixtures/images/test.png');
    logger.logInput('imagePath', imagePath);

    const imageBuffer = readFileSync(imagePath);
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });

    logger.logApiCall('provider.recognize()', { expectMetadata: true });

    const result = await measureAsync(logger, 'recognize-metadata', () => provider.recognize(imageBlob));

    logger.logOutput('result.text', result.text);
    logger.logOutput('result.confidence', result.confidence);
    logger.logOutput('result.language', result.language);
    logger.logOutput('result.regions', result.regions);

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

    logger.logInput('formats', formats);

    for (const filename of formats) {
      logger.logStep(`Processing ${filename}`);

      const imagePath = path.join(__dirname, `../../../fixtures/images/${filename}`);
      const imageBuffer = readFileSync(imagePath);
      const imageBlob = new Blob([imageBuffer], { type: `image/${filename.split('.').pop()}` });

      logger.logApiCall('provider.recognize()', { format: filename });

      const result = await measureAsync(logger, `recognize-${filename}`, () => provider.recognize(imageBlob));

      logger.logOutput(`result-${filename}`, result);

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');

      console.log(`✅ ${filename}: "${result.text}"`);
    }
  });

  it('handles opcje OCR', async () => {
    const imagePath = path.join(__dirname, '../../../fixtures/images/test.png');
    logger.logInput('imagePath', imagePath);

    const imageBuffer = readFileSync(imagePath);
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });

    const options = { language: 'en', confidence: 0.8 };
    logger.logInput('options', options);

    logger.logApiCall('provider.recognize()', { options });

    const result = await measureAsync(logger, 'recognize-options', () =>
      provider.recognize(imageBlob, options)
    );

    logger.logOutput('result', result);

    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);

    console.log(`✅ OCR with options: "${result.text}" (confidence: ${result.confidence})`);
  });

  it('handles obrazy bez tekstu', async () => {
    // Test with an image that might not have text
    const imagePath = path.join(__dirname, '../../../fixtures/images/test.jpg');
    logger.logInput('imagePath', imagePath);
    logger.logStep('Testing image that might not have clear text');

    const imageBuffer = readFileSync(imagePath);
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });

    logger.logApiCall('provider.recognize()', { expectEmpty: 'possible' });

    const result = await measureAsync(logger, 'recognize-notext', () => provider.recognize(imageBlob));

    logger.logOutput('result', result);

    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    // Even if no text is found, should return empty string, not error
    expect(typeof result.text).toBe('string');

    console.log(`✅ OCR no-text result: "${result.text}"`);
  });
});
