import { env } from '@huggingface/transformers';
import path from 'node:path';
import os from 'node:os';

// Dedykowany cache dla testów, można nadpisać przez TR_CACHE
env.cacheDir = process.env.TR_CACHE || path.join(os.homedir(), '.cache/transformersjs-tests');

// W Node Transformers.js wykryje onnxruntime-node automatycznie przy imporcie pipeline

// Wydłużony timeout dla modeli
jest.setTimeout(180000);


