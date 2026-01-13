/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { existsSync, rmSync, mkdirSync, readdirSync } from 'node:fs';
import { symlink } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
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

    if (existsSync(destPath)) {
      rmSync(destPath);
    }

    const relPath = relative(dirname(destPath), sourcePath);
    await symlink(relPath, destPath);

    return `${skillName}.md`;
  },

  async removeSkill(options: FormatRemoveOptions): Promise<boolean> {
    const { baseDir, skillName } = options;
    const skillPath = this.getSkillPath(baseDir, skillName);

    if (existsSync(skillPath)) {
      try {
        rmSync(skillPath);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
};
