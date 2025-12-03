import { env } from '@huggingface/transformers';
import path from 'node:path';
import os from 'node:os';

// Dedicated cache for tests, can be overridden with TR_CACHE
const cacheDir = process.env.TR_CACHE || path.join(os.homedir(), '.cache/transformersjs-tests');
env.cacheDir = cacheDir;

// Configuration for Node.js - using onnxruntime-node with single context fix
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = false;
env.useCustomCache = false;

// ONNX runtime configuration (works with jest-environment-node-single-context)
env.backends.onnx.cpu = {
  numThreads: 1,
  debug: false,
};
env.backends.onnx.gpu = false; // Disable GPU for testing consistency

// Fallback to WASM if onnxruntime-node doesn't work
env.backends.onnx.wasm = {
  numThreads: 1,
  wasmPaths: {},
  debug: false,
};

// Extended timeout for models
jest.setTimeout(300000); // 5 minutes for model downloads


