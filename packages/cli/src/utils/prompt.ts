/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import * as readline from 'node:readline';
import chalk from 'chalk';

/**
 * Prompt the user for input and return their answer.
 * 
 * @param question - The question to display to the user
 * @param options - Optional configuration
 * @returns The user's answer (trimmed)
 */
export async function prompt(question: string, options?: { color?: 'yellow' | 'cyan' | 'gray' }): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const colorFn = options?.color === 'cyan' ? chalk.cyan
    : options?.color === 'gray' ? chalk.gray
      : chalk.yellow;

  return new Promise(resolve => {
    rl.question(colorFn(question), answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt for confirmation (Y/n style).
 * 
 * @param question - The question to display
 * @param defaultYes - If true, empty input returns true (default: true)
 * @returns True if confirmed, false otherwise
 */
export async function confirm(question: string, defaultYes = true): Promise<boolean> {
  const suffix = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = await prompt(`${question} ${suffix}: `);

  if (answer === '') return defaultYes;
  return answer.toLowerCase().startsWith('y');
}
