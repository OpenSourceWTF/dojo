/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { claudePlugin } from '../agents/plugins/claude.js';
import { antigravityPlugin } from '../agents/plugins/antigravity.js';

export interface SyncOptions {
  force?: boolean;
}

/**
 * Transform Claude skill to Gemini/Antigravity format (1:1 copy).
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
 * Batch sync all Claude skills to Antigravity format.
 * Uses plugin system for source and destination paths.
 * - Source: Claude folder-skill format ({skill}/SKILL.md)
 * - Dest: Antigravity flat-md format ({skill}.md)
 */
export function syncClaudeToGemini(
  projectRoot: string,
  options: SyncOptions = {}
): { synced: string[]; skipped: string[] } {
  const synced: string[] = [];
  const skipped: string[] = [];

  // Use plugin system to list Claude skills
  const skillNames = claudePlugin.listSkills(projectRoot);

  for (const skillName of skillNames) {
    const sourcePath = claudePlugin.getSkillPath(projectRoot, skillName);
    const destPath = antigravityPlugin.getSkillPath(projectRoot, skillName);

    const wasSynced = claudeToGemini(sourcePath, destPath, options);

    if (wasSynced) {
      synced.push(skillName);
    } else {
      skipped.push(skillName);
    }
  }

  return { synced, skipped };
}