import { env } from '@huggingface/transformers';
import path from 'node:path';
import os from 'node:os';

// Dedykowany cache dla testów, można nadpisać przez TR_CACHE
const cacheDir = process.env.TR_CACHE || path.join(os.homedir(), '.cache/transformersjs-tests');
env.cacheDir = cacheDir;

// Konfiguracja dla Node.js
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = false;

// Użyj standardowego cache (FileCache w Node.js)
env.useCustomCache = false;

// Wymuś użycie WASM backend zamiast onnxruntime-node (problem z typami tensorów)
env.backends.onnx.wasm = {
  numThreads: 1,
};

// Wydłużony timeout dla modeli
jest.setTimeout(300000); // 5 minut dla pobierania modeli


