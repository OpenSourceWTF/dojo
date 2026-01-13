/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import fs from 'fs/promises';
import path from 'path';
import { claudePlugin } from '../agents/plugins/claude.js';
import { cursorPlugin } from '../agents/plugins/cursor.js';

interface SyncOptions {
  force?: boolean;
}

/**
 * Transform Claude skill to Cursor rule format.
 * Cursor expects YAML frontmatter with name, alwaysApply, and description.
 */
export async function claudeToCursor(
  sourcePath: string,
  destPath: string,
  options: SyncOptions = {}
): Promise<boolean> {
  // Check if destination exists and we shouldn't overwrite
  if (!options.force) {
    try {
      await fs.access(destPath);
      return false; // File exists, skip
    } catch {
      // File does not exist -> proceed
    }
  }

  const content = await fs.readFile(sourcePath, 'utf-8');

  // Extract skill name - handle both flat (.md) and folder (/SKILL.md) formats
  const basename = path.basename(sourcePath, '.md');
  const skillName = basename === 'SKILL'
    ? path.basename(path.dirname(sourcePath)) // folder format: get parent dir name
    : basename; // flat format: use the filename

  // Extract description from first line if it starts with text
  const lines = content.split('\n');
  let description = "Imported from dojo";
  if (lines.length > 0 && lines[0].trim().length > 0) {
    description = lines[0].trim().replace(/^#\s*/, ''); // Remove leading header marker
  }

  const ruleContent = `---
name: ${skillName}
alwaysApply: false
description: ${description}
---

${content}`;

  // Ensure destination directory exists
  await fs.mkdir(path.dirname(destPath), { recursive: true });

  await fs.writeFile(destPath, ruleContent);
  return true;
}

/**
 * Batch sync all Claude skills to Cursor rules.
 * Uses plugin system for source and destination paths.
 */
export async function syncClaudeToCursor(
  projectRoot: string,
  options: SyncOptions = {}
): Promise<{ synced: string[]; skipped: string[] }> {
  // Use plugin system for paths
  const skillsDir = path.join(projectRoot, claudePlugin.agentDir);
  const synced: string[] = [];
  const skipped: string[] = [];

  try {
    // Use Claude plugin to list skills
    const skillNames = claudePlugin.listSkills(projectRoot);

    for (const skillName of skillNames) {
      const sourcePath = claudePlugin.getSkillPath(projectRoot, skillName);
      const destPath = cursorPlugin.getSkillPath(projectRoot, skillName);

      const wasSynced = await claudeToCursor(sourcePath, destPath, options);

      if (wasSynced) {
        synced.push(skillName);
      } else {
        skipped.push(skillName);
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { synced, skipped };
    }
    throw error;
  }

  return { synced, skipped };
}