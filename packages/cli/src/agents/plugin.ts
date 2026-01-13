/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { SkillFormatPlugin, SkillFormat, getFormatPlugin } from './formats/index.js';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Detected agent information.
 * Agent names are extensible strings (e.g., 'claude', 'gemini', 'cursor', 'codex', 'antigravity').
 */
export interface DetectedAgent {
  name: string;
  path: string;        // Absolute path to skills/rules directory
  format: SkillFormat;
}

/**
 * Options for installing a skill.
 */
export interface InstallSkillOptions {
  projectRoot: string;
  skillName: string;
  canonicalPath: string;  // Path to canonical skill file in .dojo/skills/
}

/**
 * Options for removing a skill.
 */
export interface RemoveSkillOptions {
  projectRoot: string;
  skillName: string;
}

/**
 * Agent plugin interface for extensible agent support.
 * Each AI agent (Claude, Gemini, Cursor, etc.) implements this interface.
 * 
 * Format-specific operations are delegated to the format plugin.
 */
export interface AgentPlugin {
  /** Agent identifier */
  readonly name: DetectedAgent['name'];

  /** Human-readable display name */
  readonly displayName: string;

  /** Skill format used by this agent */
  readonly format: SkillFormat;

  /** Directory path relative to project root (e.g., '.claude/skills') */
  readonly agentDir: string;

  /** Format plugin for handling skill file operations */
  readonly formatPlugin: SkillFormatPlugin;

  /**
   * Detect if this agent is available in the project.
   * Detection is based on directory existence, not CLI availability.
   */
  detect(projectRoot: string): DetectedAgent | null;

  /**
   * Install a skill to this agent's directory.
   * Delegates to format plugin for format-specific operations.
   */
  installSkill(options: InstallSkillOptions): Promise<string>;

  /**
   * Remove a skill from this agent's directory.
   * Delegates to format plugin for format-specific operations.
   */
  removeSkill(options: RemoveSkillOptions): Promise<boolean>;

  /**
   * Get the path where a skill would be installed.
   * Delegates to format plugin for format-specific path resolution.
   */
  getSkillPath(projectRoot: string, skillName: string): string;

  /**
   * List installed skills for this agent.
   * Delegates to format plugin for format-specific directory scanning.
   */
  listSkills(projectRoot: string): string[];
}

/**
 * Create a standard agent plugin with format plugin delegation.
 * Reduces boilerplate for common agent plugin patterns.
 */
export function createAgentPlugin(config: {
  name: DetectedAgent['name'];
  displayName: string;
  format: SkillFormat;
  agentDir: string;
}): AgentPlugin {
  const formatPlugin = getFormatPlugin(config.format);

  return {
    name: config.name,
    displayName: config.displayName,
    format: config.format,
    agentDir: config.agentDir,
    formatPlugin,

    detect(projectRoot: string): DetectedAgent | null {
      const fullPath = join(projectRoot, config.agentDir);
      if (!existsSync(fullPath)) return null;
      return {
        name: config.name,
        path: fullPath,
        format: config.format
      };
    },

    getSkillPath(projectRoot: string, skillName: string): string {
      const baseDir = join(projectRoot, config.agentDir);
      return formatPlugin.getSkillPath(baseDir, skillName);
    },

    listSkills(projectRoot: string): string[] {
      const baseDir = join(projectRoot, config.agentDir);
      return formatPlugin.listSkills(baseDir);
    },

    async installSkill(options: InstallSkillOptions): Promise<string> {
      const baseDir = join(options.projectRoot, config.agentDir);
      const skillIdentifier = await formatPlugin.installSkill({
        baseDir,
        skillName: options.skillName,
        sourcePath: options.canonicalPath
      });
      // Return relative path from project root (agentDir/skillIdentifier)
      return join(config.agentDir, skillIdentifier);
    },

    async removeSkill(options: RemoveSkillOptions): Promise<boolean> {
      const baseDir = join(options.projectRoot, config.agentDir);
      return formatPlugin.removeSkill({
        baseDir,
        skillName: options.skillName
      });
    }
  };
}
