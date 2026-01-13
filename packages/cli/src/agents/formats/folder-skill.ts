/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { existsSync, rmSync, readdirSync, statSync, lstatSync } from 'node:fs';
import { mkdir, symlink } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
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
      return existsSync(join(entryPath, 'SKILL.md'));
    });
  },

  async installSkill(options: FormatInstallOptions): Promise<string> {
    const { baseDir, skillName, sourcePath } = options;
    const destPath = this.getSkillPath(baseDir, skillName);
    const skillDir = dirname(destPath);

    await mkdir(skillDir, { recursive: true });

    // Remove existing file/symlink if it exists (lstatSync catches broken symlinks too)
    try {
      lstatSync(destPath);
      rmSync(destPath, { force: true });
    } catch {
      // File doesn't exist, which is fine
    }

    const relPath = relative(skillDir, sourcePath);
    await symlink(relPath, destPath);

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
