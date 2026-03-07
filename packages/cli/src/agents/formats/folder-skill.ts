/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { existsSync, rmSync, readdirSync, statSync, lstatSync } from 'node:fs';
import { mkdir, copyFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { SkillFormatPlugin, FormatInstallOptions, FormatRemoveOptions } from '../format-plugin.js';

/**
 * Folder skill format: {baseDir}/{skill}/SKILL.md
 * Used by: Claude (.claude/skills/), Gemini (.gemini/skills/), Codex (.codex/skills/)
 * 
 * This is the CANONICAL format in the hub-and-spoke model.
 */
export const folderSkillPlugin: SkillFormatPlugin = {
  name: 'folder-skill',

  getSkillPath(baseDir: string, skillName: string): string {
    return join(baseDir, skillName, 'SKILL.md');
  },

  listSkills(baseDir: string): string[] {
    if (!existsSync(baseDir)) return [];

    return readdirSync(baseDir).filter(entry => {
      const entryPath = join(baseDir, entry);
      if (!statSync(entryPath).isDirectory()) return false;
      // Use lstatSync to detect broken symlinks (existsSync returns false for those)
      try { lstatSync(join(entryPath, 'SKILL.md')); return true; } catch { return false; }
    });
  },

  async installSkill(options: FormatInstallOptions): Promise<string> {
    const { baseDir, skillName, sourcePath } = options;
    const destPath = this.getSkillPath(baseDir, skillName);
    const skillDir = dirname(destPath);

    await mkdir(skillDir, { recursive: true });

    // Remove existing file if it exists
    try {
      lstatSync(destPath);
      rmSync(destPath, { force: true });
    } catch {
      // File doesn't exist, which is fine
    }

    await copyFile(sourcePath, destPath);

    return skillName;
  },

  async removeSkill(options: FormatRemoveOptions): Promise<boolean> {
    const { baseDir, skillName } = options;
    const skillPath = this.getSkillPath(baseDir, skillName);
    const skillDir = dirname(skillPath);

    if (existsSync(skillDir)) {
      try {
        rmSync(skillDir, { recursive: true });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  },

  // Hub-and-spoke conversion: folder-skill IS the canonical format
  toCanonical(content: string, _skillName: string): string {
    return content; // Already canonical
  },

  fromCanonical(content: string, _skillName: string): string {
    return content; // Already canonical
  }
};
