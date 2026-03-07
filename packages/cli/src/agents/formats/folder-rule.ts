/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { existsSync, rmSync, readdirSync, statSync, lstatSync } from 'node:fs';
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
      // Use lstatSync to detect broken symlinks (existsSync returns false for those)
      try { lstatSync(join(entryPath, 'RULE.md')); return true; } catch { return false; }
    });
  },

  /**
   * Convert FROM canonical (folder-skill) format TO folder-rule format.
   * Adds YAML frontmatter required by Cursor.
   */
  fromCanonical(content: string, skillName: string): string {
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

  /**
   * Convert FROM folder-rule format TO canonical (folder-skill) format.
   * Strips YAML frontmatter.
   */
  toCanonical(content: string, _skillName: string): string {
    // Check if content starts with YAML frontmatter
    if (!content.startsWith('---')) {
      return content; // No frontmatter, return as-is
    }

    // Find end of frontmatter
    const endIndex = content.indexOf('---', 3);
    if (endIndex === -1) {
      return content; // Malformed frontmatter, return as-is
    }

    // Return content after frontmatter (skip the closing --- and following newlines)
    return content.slice(endIndex + 3).replace(/^\n+/, '');
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

    // Read source and transform with YAML frontmatter
    const content = await readFile(sourcePath, 'utf-8');
    const transformed = this.fromCanonical(content, skillName);
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
