/**
 * CLI List Command - List cached models
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface ListOptions {
  cacheDir?: string;
}

interface CachedModel {
  name: string;
  path: string;
  size: string;
  modified: Date;
}

/**
 * Get the default Hugging Face cache directory
 */
function getDefaultCacheDir(): string {
  const homeDir = os.homedir();
  // Hugging Face Transformers.js uses this path
  return path.join(homeDir, '.cache', 'huggingface', 'hub');
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get directory size recursively
 */
function getDirSize(dirPath: string): number {
  let size = 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        size += getDirSize(filePath);
      } else {
        size += stat.size;
      }
    }
  } catch {
    // Ignore errors
  }
  return size;
}

/**
 * List all cached models
 */
export async function listCommand(options: ListOptions): Promise<void> {
  const cacheDir = options.cacheDir || getDefaultCacheDir();

  console.log(`\n📂 Cached models in: ${cacheDir}\n`);

  if (!fs.existsSync(cacheDir)) {
    console.log('   No cached models found.\n');
    return;
  }

  try {
    const entries = fs.readdirSync(cacheDir);
    const models: CachedModel[] = [];

    for (const entry of entries) {
      // Hugging Face cache uses "models--org--model" format
      if (entry.startsWith('models--')) {
        const modelPath = path.join(cacheDir, entry);
        const stat = fs.statSync(modelPath);

        // Parse model name from directory name
        const parts = entry.replace('models--', '').split('--');
        const modelName = parts.join('/');

        models.push({
          name: modelName,
          path: modelPath,
          size: formatBytes(getDirSize(modelPath)),
          modified: stat.mtime,
        });
      }
    }

    if (models.length === 0) {
      console.log('   No cached models found.\n');
      return;
    }

    // Sort by name
    models.sort((a, b) => a.name.localeCompare(b.name));

    // Display table
    console.log(
      '   ┌─────────────────────────────────────────────┬──────────┬─────────────────────┐'
    );
    console.log(
      '   │ Model                                       │ Size     │ Modified            │'
    );
    console.log(
      '   ├─────────────────────────────────────────────┼──────────┼─────────────────────┤'
    );

    for (const model of models) {
      const name = model.name.padEnd(43).slice(0, 43);
      const size = model.size.padEnd(8);
      const modified = model.modified
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');
      console.log(`   │ ${name} │ ${size} │ ${modified} │`);
    }

    console.log(
      '   └─────────────────────────────────────────────┴──────────┴─────────────────────┘'
    );
    console.log(`\n   Total: ${models.length} model(s)\n`);
  } catch (error) {
    console.error(`\n❌ Failed to list models: ${(error as Error).message}\n`);
    process.exit(1);
  }
}
