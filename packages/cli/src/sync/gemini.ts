/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

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
 * - Source: .claude/skills/{skill}/SKILL.md (folder-skill format)
 * - Dest: .agent/workflows/{skill}.md (flat-md format)
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

  // Get all skill directories in Claude skills directory
  const entries = readdirSync(claudeDir);

  for (const entry of entries) {
    const entryPath = join(claudeDir, entry);

    // Skip if not a directory
    if (!statSync(entryPath).isDirectory()) {
      skipped.push(entry);
      continue;
    }

    // Check for SKILL.md inside the directory
    const skillFilePath = join(entryPath, 'SKILL.md');
    if (!existsSync(skillFilePath)) {
      skipped.push(entry);
      continue;
    }

    // Sync the skill (output as flat .md file)
    const destPath = join(geminiDir, `${entry}.md`);
    const wasSynced = claudeToGemini(skillFilePath, destPath, options);

    if (wasSynced) {
      synced.push(entry);
    } else {
      skipped.push(entry);
    }
  }

  return { synced, skipped };
}