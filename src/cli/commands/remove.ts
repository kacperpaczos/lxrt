/**
 * CLI Remove Command - Remove cached models
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import { createLogBus } from '../../core/logging/LogBus';

const logger = createLogBus('CLI:remove');

interface RemoveOptions {
  cacheDir?: string;
  force?: boolean;
}

/**
 * Get the default Hugging Face cache directory
 */
function getDefaultCacheDir(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.cache', 'huggingface', 'hub');
}

/**
 * Prompt user for confirmation
 */
async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(message, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Delete directory recursively
 */
function deleteDir(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * Remove a cached model
 */
export async function removeCommand(
  modelId: string,
  options: RemoveOptions
): Promise<void> {
  const cacheDir = options.cacheDir || getDefaultCacheDir();

  // Convert model ID to cache directory name
  // "Xenova/all-MiniLM-L6-v2" -> "models--Xenova--all-MiniLM-L6-v2"
  const cacheName = 'models--' + modelId.replace(/\//g, '--');
  const modelPath = path.join(cacheDir, cacheName);

  console.log(`\n🗑️  Removing model: ${modelId}`);
  console.log(`   Path: ${modelPath}`);

  if (!fs.existsSync(modelPath)) {
    console.log('\n❌ Model not found in cache.\n');
    console.log('   Run `npx lxrt list` to see cached models.\n');
    process.exit(1);
  }

  // Confirm deletion unless --force is used
  if (!options.force) {
    const confirmed = await confirm(
      '\n   Are you sure you want to delete this model? (y/N) '
    );
    if (!confirmed) {
      console.log('\n   Operation cancelled.\n');
      return;
    }
  }

  try {
    deleteDir(modelPath);
    console.log(`\n✅ Model removed successfully: ${modelId}\n`);
    logger.info('Model removed', { modelId });
  } catch (error) {
    console.error(`\n❌ Failed to remove model: ${(error as Error).message}\n`);
    logger.error('Remove failed', { modelId, error: (error as Error).message });
    process.exit(1);
  }
}
