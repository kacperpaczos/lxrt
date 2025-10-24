import { env } from '@huggingface/transformers';
import path from 'node:path';
import os from 'node:os';

// Dedykowany cache dla testów, można nadpisać przez TR_CACHE
const cacheDir = process.env.TR_CACHE || path.join(os.homedir(), '.cache/transformersjs-tests');
env.cacheDir = cacheDir;

// Konfiguracja dla Node.js - TYLKO WASM BACKEND
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = false;
env.useCustomCache = false;

// WYMUŚ WYŁĄCZNIE WASM BACKEND (bez onnxruntime-node)
env.backends.onnx.wasm = {
  numThreads: 1,
  wasmPaths: {},
  debug: false,
};

// Wyłącz onnxruntime-node całkowicie
env.backends.onnx.cpu = false;
env.backends.onnx.gpu = false;

// Wydłużony timeout dla modeli
jest.setTimeout(300000); // 5 minut dla pobierania modeli


