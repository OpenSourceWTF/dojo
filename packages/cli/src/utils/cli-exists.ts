/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { execSync } from 'node:child_process';
import { platform } from 'node:os';

/**
 * Check if a CLI command exists in PATH.
 * Cross-platform: uses 'where' on Windows, 'which' on Unix.
 * 
 * Note: Uses synchronous exec for simplicity in detection flow.
 * This is acceptable since detection runs once at startup.
 */
export function cliExists(command: string): boolean {
  try {
    const cmd = platform() === 'win32' ? `where ${command}` : `which ${command}`;
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Async version of cliExists for use in async contexts.
 * Uses spawn to avoid blocking the event loop.
 */
export async function cliExistsAsync(command: string): Promise<boolean> {
  const { spawn } = await import('node:child_process');

  return new Promise((resolve) => {
    const cmd = platform() === 'win32' ? 'where' : 'which';
    const proc = spawn(cmd, [command], { stdio: 'ignore' });

    proc.on('close', (code) => {
      resolve(code === 0);
    });

    proc.on('error', () => {
      resolve(false);
    });
  });
}
