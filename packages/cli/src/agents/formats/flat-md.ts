/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { existsSync, rmSync, mkdirSync, readdirSync, lstatSync } from 'node:fs';
import { copyFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { SkillFormatPlugin, FormatInstallOptions, FormatRemoveOptions } from '../format-plugin.js';

/**
 * Flat markdown format: {baseDir}/{skill}.md
 * Used by: Antigravity (.agent/workflows/)
 */
export const flatMdPlugin: SkillFormatPlugin = {
  name: 'flat-md',

  getSkillPath(baseDir: string, skillName: string): string {
    return join(baseDir, `${skillName}.md`);
  },

  listSkills(baseDir: string): string[] {
    if (!existsSync(baseDir)) return [];

    return readdirSync(baseDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''));
  },

  async installSkill(options: FormatInstallOptions): Promise<string> {
    const { baseDir, skillName, sourcePath } = options;
    const destPath = this.getSkillPath(baseDir, skillName);

    mkdirSync(dirname(destPath), { recursive: true });

    // Remove existing file if it exists
    try {
      lstatSync(destPath);
      rmSync(destPath, { force: true });
    } catch {
      // File doesn't exist, which is fine
    }

    await copyFile(sourcePath, destPath);

    return `${skillName}.md`;
  },

  async removeSkill(options: FormatRemoveOptions): Promise<boolean> {
    const { baseDir, skillName } = options;
    const skillPath = this.getSkillPath(baseDir, skillName);

    // Use lstatSync to detect broken symlinks (existsSync returns false for those)
    try {
      lstatSync(skillPath);
    } catch {
      return false; // File doesn't exist at all
    }
    try {
      rmSync(skillPath);
      return true;
    } catch {
      return false;
    }
  },

  // Hub-and-spoke conversion: flat-md is identical to canonical (just markdown)
  toCanonical(content: string, _skillName: string): string {
    return content; // No transformation needed
  },

  fromCanonical(content: string, _skillName: string): string {
    return content; // No transformation needed
  }
};
