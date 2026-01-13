/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { existsSync, rmSync, readdirSync, statSync } from 'node:fs';
import { mkdir, symlink } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { SkillFormatPlugin, FormatInstallOptions, FormatRemoveOptions } from '../format-plugin.js';

/**
 * Folder skill format: {baseDir}/{skill}/SKILL.md
 * Used by: Claude (.claude/skills/), Gemini (.gemini/skills/), Codex (.codex/skills/)
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

    if (existsSync(destPath)) {
      rmSync(destPath);
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
  }
};
