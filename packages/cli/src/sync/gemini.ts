/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

export interface SyncOptions {
  force?: boolean;
}

/**
 * Transform Claude skill to Gemini format (1:1 copy).
 * Claude and Gemini use identical markdown format.
 * Returns true if file was written, false if skipped.
 */
export function claudeToGemini(sourcePath: string, destPath: string, options: SyncOptions = {}): boolean {
  // Check if destination exists and we shouldn't overwrite
  if (existsSync(destPath) && !options.force) {
    return false;
  }

  // Read source content
  const content = readFileSync(sourcePath, 'utf-8');

  // Ensure destination directory exists
  const destDir = dirname(destPath);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  // Write to destination (1:1 copy)
  writeFileSync(destPath, content);
  return true;
}

/**
 * Batch sync all Claude skills to Gemini format.
 * - Source: .claude/skills/*.md
 * - Dest: .agent/workflows/*.md
 */
export function syncClaudeToGemini(
  projectRoot: string,
  options: SyncOptions = {}
): { synced: string[]; skipped: string[] } {
  const synced: string[] = [];
  const skipped: string[] = [];

  const claudeDir = join(projectRoot, '.claude', 'skills');
  const geminiDir = join(projectRoot, '.agent', 'workflows');

  // Check if Claude skills directory exists
  if (!existsSync(claudeDir)) {
    return { synced, skipped };
  }

  // Get all files in Claude skills directory
  const files = readdirSync(claudeDir);

  for (const file of files) {
    // Only sync .md files
    if (!file.endsWith('.md')) {
      skipped.push(file);
      continue;
    }

    const sourcePath = join(claudeDir, file);
    const destPath = join(geminiDir, file);

    const wasSynced = claudeToGemini(sourcePath, destPath, options);
    if (wasSynced) {
      synced.push(file);
    } else {
      skipped.push(file);
    }
  }

  return { synced, skipped };
}