import { env } from '@huggingface/transformers';
import path from 'node:path';
import os from 'node:os';

// Dedykowany cache dla testów, można nadpisać przez TR_CACHE
const cacheDir = process.env.TR_CACHE || path.join(os.homedir(), '.cache/transformersjs-tests');
env.cacheDir = cacheDir;

// Konfiguracja dla Node.js - użycie onnxruntime-node z single context fix
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = false;
env.useCustomCache = false;

// Konfiguracja onnxruntime-node (działa z jest-environment-node-single-context)
env.backends.onnx.cpu = {
  numThreads: 1,
  debug: false,
};
env.backends.onnx.gpu = false; // Disable GPU for testing consistency

// Fallback to WASM jeśli onnxruntime-node nie działa
env.backends.onnx.wasm = {
  numThreads: 1,
  wasmPaths: {},
  debug: false,
};

// Wydłużony timeout dla modeli
jest.setTimeout(300000); // 5 minut dla pobierania modeli


