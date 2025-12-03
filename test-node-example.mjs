/**
 * Example script to test Node.js setup with real models
 * Run with: node test-node-example.mjs
 */

import { createAIProvider } from './dist/index.js';

async function testEmbeddings() {
  console.log('Testing embeddings...');
  const provider = createAIProvider({
    embedding: {
      model: 'Xenova/all-MiniLM-L6-v2',
      dtype: 'fp32',
      device: 'cpu',
    },
  });

  try {
    await provider.warmup('embedding');
    const [vec] = await provider.embed('Hello world');
    console.log('✅ Embeddings working, vector length:', Array.isArray(vec) ? vec.length : 'Float32Array');

    const similarity = await provider.similarity('Hello world', 'Hi there');
    console.log('✅ Similarity working:', similarity);

    await provider.dispose();
    console.log('✅ Provider disposed successfully');
  } catch (error) {
    console.error('❌ Embeddings test failed:', error.message);
  }
}

async function testSTT() {
  console.log('Testing STT...');
  const provider = createAIProvider({
    stt: {
      model: 'Xenova/whisper-tiny',
      dtype: 'fp32',
      device: 'cpu',
    },
  });

  try {
    await provider.warmup('stt');

    // Use a simple WAV file from fixtures
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const wavPath = join(process.cwd(), 'tests/fixtures/audio/test.wav');
    const buf = readFileSync(wavPath);
    const blob = new Blob([buf], { type: 'audio/wav' });

    const text = await provider.listen(blob, { language: 'en' });
    console.log('✅ STT working, transcribed:', text);

    await provider.dispose();
    console.log('✅ Provider disposed successfully');
  } catch (error) {
    console.error('❌ STT test failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Testing Node.js setup with real models...\n');

  await testEmbeddings();
  console.log('');
  await testSTT();

  console.log('\n✨ Tests completed!');
}

main().catch(console.error);
