#!/usr/bin/env node
/**
 * LXRT CLI - Model Management Command Line Interface
 *
 * Usage:
 *   npx lxrt pull <model-id> [--dtype <dtype>]
 *   npx lxrt list
 *   npx lxrt remove <model-id>
 */

import { program } from 'commander';
import { pullCommand } from './commands/pull';
import { listCommand } from './commands/list';
import { removeCommand } from './commands/remove';

// Package version from package.json
const VERSION = '0.6.0';

program
    .name('lxrt')
    .description('LXRT Model Management CLI')
    .version(VERSION);

program
    .command('pull <model-id>')
    .description('Download a model from Hugging Face Hub')
    .option('-d, --dtype <type>', 'Quantization type (fp32, fp16, q8, q4)', 'fp32')
    .option('--cache-dir <path>', 'Custom cache directory')
    .action(async (modelId: string, options: { dtype: string; cacheDir?: string }) => {
        await pullCommand(modelId, options);
    });

program
    .command('list')
    .description('List cached models')
    .option('--cache-dir <path>', 'Custom cache directory')
    .action(async (options: { cacheDir?: string }) => {
        await listCommand(options);
    });

program
    .command('remove <model-id>')
    .description('Remove a cached model')
    .option('--cache-dir <path>', 'Custom cache directory')
    .option('-f, --force', 'Force removal without confirmation')
    .action(async (modelId: string, options: { cacheDir?: string; force?: boolean }) => {
        await removeCommand(modelId, options);
    });

program.parse();
