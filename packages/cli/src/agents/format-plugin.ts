/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

/**
 * Skill format identifier.
 * Common formats: 'flat-md', 'folder-skill', 'folder-rule'
 * Extensible - plugins can define their own format strings.
 */
export type SkillFormat = string;

/**
 * Options for installing a skill.
 */
export interface FormatInstallOptions {
  baseDir: string;      // e.g., /project/.claude/skills
  skillName: string;
  sourcePath: string;   // Path to canonical skill file
}

/**
 * Options for removing a skill.
 */
export interface FormatRemoveOptions {
  baseDir: string;
  skillName: string;
}

/**
 * Skill format plugin interface.
 * Handles format-specific file operations for skills.
 */
export interface SkillFormatPlugin {
  /** Format identifier */
  readonly name: SkillFormat;

  /**
   * Get the path where a skill file would be stored.
   * @returns Full path to the skill file (e.g., .claude/skills/foo/SKILL.md)
   */
  getSkillPath(baseDir: string, skillName: string): string;

  /**
   * List skill names in the given directory.
   * @returns Array of skill names (without extensions)
   */
  listSkills(baseDir: string): string[];

  /**
   * Install a skill by creating symlink or copy.
   * @returns Relative path to installed skill
   */
  installSkill(options: FormatInstallOptions): Promise<string>;

  /**
   * Remove a skill.
   * @returns true if removed, false if not found
   */
  removeSkill(options: FormatRemoveOptions): Promise<boolean>;

  /**
   * Transform content before writing (optional, e.g., for Cursor frontmatter).
   */
  transformContent?(content: string, skillName: string): string;
}
