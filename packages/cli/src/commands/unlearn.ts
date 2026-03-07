/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import chalk from 'chalk';
import { existsSync, rmSync, lstatSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { removeMcpServer } from '../mcp/config.js';
import { plugins } from '../agents/plugins/index.js';

// Skill storage locations
const GLOBAL_SKILLS_DIR = join(homedir(), '.dojo', 'skills');
const getLocalSkillsDir = (projectRoot: string) => join(projectRoot, '.dojo', 'skills');

interface UnlearnOptions {
  yes?: boolean;
  global?: boolean;
  forAgents?: string[];  // Subset of agents to unlearn from
  mcpMode?: boolean;     // Remove MCP configs only (skip skill files)
}

/**
 * Find all locations where a skill is installed using the plugin system.
 * Checks each detected agent's skill path.
 * @param forAgents - Optional array of agent names to filter by
 */
export function findSkillLocations(projectRoot: string, skillName: string, forAgents?: string[]): string[] {
  const locations: string[] = [];
  const allowedAgents = forAgents ? new Set(forAgents.map(a => a.toLowerCase().trim())) : null;

  for (const plugin of plugins) {
    // If forAgents specified, filter to only those agents
    if (allowedAgents && !allowedAgents.has(plugin.name)) continue;

    const detected = plugin.detect(projectRoot);
    if (!detected) continue;

    const skillPath = plugin.getSkillPath(projectRoot, skillName);

    if (plugin.format === 'flat-md') {
      // Flat format: {skill}.md file
      // Use lstatSync to detect broken symlinks (existsSync returns false for those)
      let flatExists = false;
      try { lstatSync(skillPath); flatExists = true; } catch { /* doesn't exist */ }
      if (flatExists) {
        locations.push(skillPath);
      }
    } else {
      // Folder formats: {skill}/SKILL.md or {skill}/RULE.md
      // Check both the file and the containing directory
      if (existsSync(skillPath)) {
        locations.push(skillPath);
      }
      const skillDir = dirname(skillPath);
      if (existsSync(skillDir) && statSync(skillDir).isDirectory()) {
        // For folder formats, we want to remove the directory, not just the file
        if (!locations.includes(skillDir)) {
          locations.push(skillDir);
        }
        // Remove the file if we added it, we only want the directory
        const fileIndex = locations.indexOf(skillPath);
        if (fileIndex !== -1) {
          locations.splice(fileIndex, 1);
        }
      }
    }
  }

  return locations;
}

/**
 * Remove skill files from all provided locations.
 * Handles both regular files and directories (for folder-based formats).
 * Returns count of removed locations.
 */
export async function removeSkillFiles(locations: string[]): Promise<number> {
  let removed = 0;

  for (const location of locations) {
    try {
      // Use lstatSync instead of existsSync to detect broken symlinks
      let lstat;
      try { lstat = lstatSync(location); } catch { continue; }


      if (lstat.isSymbolicLink() || lstat.isFile()) {
        rmSync(location);
        removed++;
      } else if (lstat.isDirectory()) {
        rmSync(location, { recursive: true });
        removed++;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Failed to remove ${location}: ${message}`));
    }
  }

  return removed;
}

/**
 * Remove skill from local .dojo/skills directory.
 */
function removeLocalSkillFile(projectRoot: string, skillName: string): boolean {
  const localPath = join(getLocalSkillsDir(projectRoot), `${skillName}.md`);
  // Use lstatSync to detect broken symlinks (existsSync returns false for those)
  try { lstatSync(localPath); } catch { return false; }
  try {
    rmSync(localPath);
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`Failed to remove local skill file: ${message}`));
  }
  return false;
}

/**
 * Remove skill from global ~/.dojo/skills directory.
 */
function removeGlobalSkillFile(skillName: string): boolean {
  const globalPath = join(GLOBAL_SKILLS_DIR, `${skillName}.md`);
  // Use lstatSync to detect broken symlinks (existsSync returns false for those)
  try { lstatSync(globalPath); } catch { return false; }
  try {
    rmSync(globalPath);
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`Failed to remove global skill file: ${message}`));
  }
  return false;
}

/**
 * Unlearn (remove) a skill.
 * 
 * Without -g: Removes skill files from agent directories AND local .dojo/skills file
 * With -g: Removes from global ~/.dojo/skills (and MCP configs)
 */
export async function unlearn(
  skill: string,
  options: UnlearnOptions = {},
  commandOrRoot?: unknown
): Promise<void> {
  const projectRoot = typeof commandOrRoot === 'string' ? commandOrRoot : process.cwd();

  if (options.global) {
    // Global unlearn: remove from ~/.dojo/skills and all MCP configs
    console.log(chalk.red(`🗑️  Removing "${skill}" globally...\n`));

    // MCP-only mode: skip skill file removal
    if (!options.mcpMode) {
      // Remove skill files from project agent directories
      const locations = findSkillLocations(projectRoot, skill, options.forAgents);
      console.log(chalk.yellow('📂 Removing skill files:'));
      if (locations.length > 0) {
        const removedCount = await removeSkillFiles(locations);
        for (const loc of locations) {
          const relative = loc.replace(projectRoot, '').replace(/^\//, '');
          console.log(chalk.red(`   ✗ ${relative}`));
        }
        if (removedCount === 0 && locations.length > 0) {
          console.log(chalk.gray(`   (already removed)`));
        }
      } else {
        console.log(chalk.gray(`   No skill files found for "${skill}"`));
      }

      // Remove from global storage
      console.log('');
      console.log(chalk.yellow('📦 Removing from global storage:'));
      const removed = removeGlobalSkillFile(skill);
      if (removed) {
        console.log(chalk.red(`   ✗ ${GLOBAL_SKILLS_DIR}/${skill}.md`));
      } else {
        console.log(chalk.gray(`   No global file found for "${skill}"`));
      }

      console.log('');
    }

    // Remove MCP server entries
    if (!options.mcpMode) console.log('');
    console.log(chalk.yellow('🔌 Removing MCP servers:'));
    const removedMcp = await removeMcpServer(skill);
    if (removedMcp.length > 0) {
      for (const { agent, path } of removedMcp) {
        console.log(chalk.red(`   ✗ ${agent}: ${skill}`));
        console.log(chalk.gray(`     → ${path}`));
      }
    } else {
      console.log(chalk.gray(`   No MCP server entry found for "${skill}"`));
    }

    const modeLabel = options.mcpMode ? ' (MCP only)' : '';
    console.log(chalk.green(`\n✅ Unlearned ${skill} globally${modeLabel}`));

  } else {
    // Local unlearn: remove skill files AND local .dojo/skills file
    console.log(chalk.yellow(`🗑️  Removing "${skill}" from this project...\n`));

    // MCP-only mode: skip skill file removal
    if (!options.mcpMode) {
      // Remove skill files from agent directories
      const locations = findSkillLocations(projectRoot, skill, options.forAgents);
      console.log(chalk.yellow('📂 Removing skill files:'));
      if (locations.length > 0) {
        const removedCount = await removeSkillFiles(locations);
        for (const loc of locations) {
          const relative = loc.replace(projectRoot, '').replace(/^\//, '');
          console.log(chalk.red(`   ✗ ${relative}`));
        }
        if (removedCount === 0 && locations.length > 0) {
          console.log(chalk.gray(`   (already removed)`));
        }
      } else {
        console.log(chalk.gray(`   No skill files found for "${skill}"`));
      }

      // Remove local skill file
      const localSkillsDir = getLocalSkillsDir(projectRoot);
      console.log('');
      console.log(chalk.yellow('📦 Removing from local storage:'));
      const removedLocal = removeLocalSkillFile(projectRoot, skill);
      if (removedLocal) {
        console.log(chalk.red(`   ✗ .dojo/skills/${skill}.md`));
      } else {
        console.log(chalk.gray(`   No local file found for "${skill}"`));
      }

      console.log('');
    }

    // Remove MCP server entries (always check, even in local mode)
    console.log(chalk.yellow('🔌 Removing MCP servers:'));
    const removedMcp = await removeMcpServer(skill);
    if (removedMcp.length > 0) {
      for (const { agent, path } of removedMcp) {
        console.log(chalk.red(`   ✗ ${agent}: ${skill}`));
        console.log(chalk.gray(`     → ${path}`));
      }
    } else {
      console.log(chalk.gray(`   No MCP server entry found for "${skill}"`));
    }

    const modeLabel = options.mcpMode ? ' (MCP only)' : '';
    console.log(chalk.green(`\n✅ Unlearned ${skill}${modeLabel}`));
  }
}
