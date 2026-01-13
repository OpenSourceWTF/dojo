/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { existsSync, rmSync, readdirSync, statSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { SkillFormatPlugin, FormatInstallOptions, FormatRemoveOptions } from '../format-plugin.js';

/**
 * Folder rule format: {baseDir}/{skill}/RULE.md with YAML frontmatter
 * Used by: Cursor (.cursor/rules/)
 */
export const folderRulePlugin: SkillFormatPlugin = {
  name: 'folder-rule',

  getSkillPath(baseDir: string, skillName: string): string {
    return join(baseDir, skillName, 'RULE.md');
  },

  listSkills(baseDir: string): string[] {
    if (!existsSync(baseDir)) return [];

    return readdirSync(baseDir).filter(entry => {
      const entryPath = join(baseDir, entry);
      if (!statSync(entryPath).isDirectory()) return false;
      return existsSync(join(entryPath, 'RULE.md'));
    });
  },

  transformContent(content: string, skillName: string): string {
    // Extract description from first line
    const lines = content.split('\n');
    let description = 'Imported from dojo';
    if (lines.length > 0 && lines[0].trim().length > 0) {
      description = lines[0].trim().replace(/^#\s*/, '');
    }

    return `---
name: ${skillName}
alwaysApply: false
description: ${description}
---

${content}`;
  },

  async installSkill(options: FormatInstallOptions): Promise<string> {
    const { baseDir, skillName, sourcePath } = options;
    const destPath = this.getSkillPath(baseDir, skillName);
    const skillDir = dirname(destPath);

    await mkdir(skillDir, { recursive: true });

    if (existsSync(destPath)) {
      rmSync(destPath);
    }

    // Read source and transform with YAML frontmatter
    const content = await readFile(sourcePath, 'utf-8');
    const transformed = this.transformContent!(content, skillName);
    await writeFile(destPath, transformed);

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
