/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import chalk from 'chalk';

const CACHE_DIR = join(homedir(), '.dojo', 'cache');

export async function cache(action: string) {
  if (action === 'clean') {
    try {
      const stats = await stat(CACHE_DIR);
      if (stats.isDirectory()) {
        await rm(CACHE_DIR, { recursive: true });
        console.log(chalk.green('✓ Cache cleared successfully'));
        console.log(chalk.gray(`  Removed: ${CACHE_DIR}`));
      }
    } catch {
      console.log(chalk.yellow('Cache directory does not exist'));
    }
  } else if (action === 'info') {
    try {
      const stats = await stat(CACHE_DIR);
      console.log(chalk.cyan('Cache location:'), CACHE_DIR);
      console.log(chalk.cyan('Last modified:'), stats.mtime.toISOString());
    } catch {
      console.log(chalk.yellow('No cache exists yet'));
    }
  } else {
    console.log('Usage: dojo cache <clean|info>');
  }
}
