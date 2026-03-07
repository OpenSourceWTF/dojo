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
 * 
 * Uses a hub-and-spoke model where 'folder-skill' (Claude format) is the
 * canonical format. All conversions go through this canonical format.
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
   * Install a skill by copying to the agent directory.
   * @returns Relative path to installed skill
   */
  installSkill(options: FormatInstallOptions): Promise<string>;

  /**
   * Remove a skill.
   * @returns true if removed, false if not found
   */
  removeSkill(options: FormatRemoveOptions): Promise<boolean>;

  /**
   * Convert content FROM this format TO canonical (folder-skill) format.
   * For folder-skill format, this is a no-op (returns content unchanged).
   * For other formats, this strips format-specific elements (e.g., YAML frontmatter).
   * 
   * @param content - Content in this format
   * @param skillName - Name of the skill (for metadata extraction)
   * @returns Content in canonical folder-skill format
   */
  toCanonical(content: string, skillName: string): string;

  /**
   * Convert content FROM canonical (folder-skill) format TO this format.
   * For folder-skill format, this is a no-op (returns content unchanged).
   * For other formats, this adds format-specific elements (e.g., YAML frontmatter).
   * 
   * @param content - Content in canonical folder-skill format
   * @param skillName - Name of the skill (for metadata injection)
   * @returns Content in this format
   */
  fromCanonical(content: string, skillName: string): string;
}
