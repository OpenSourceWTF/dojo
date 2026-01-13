/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import chalk from 'chalk';
import { existsSync, rmSync, statSync, lstatSync, readdirSync } from 'node:fs';
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
}

/**
 * Find all locations where a skill is installed using the plugin system.
 * Checks each detected agent's skill path.
 */
export function findSkillLocations(projectRoot: string, skillName: string): string[] {
  const locations: string[] = [];

  for (const plugin of plugins) {
    const detected = plugin.detect(projectRoot);
    if (!detected) continue;

    const skillPath = plugin.getSkillPath(projectRoot, skillName);

    if (plugin.format === 'flat-md') {
      // Flat format: {skill}.md file
      if (existsSync(skillPath)) {
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
 * Remove skill symlinks from all provided locations.
 * Only removes symlinks - actual files are preserved.
 * For directories, removes them if they only contain symlinks.
 * Returns count of removed locations.
 */
export async function removeSkillSymlinks(locations: string[]): Promise<number> {
  let removed = 0;

  for (const location of locations) {
    try {
      if (!existsSync(location)) continue;

      const lstat = lstatSync(location);

      if (lstat.isSymbolicLink()) {
        // Direct symlink (e.g., .agent/workflows/skill.md)
        rmSync(location);
        removed++;
      } else if (lstat.isDirectory()) {
        // Directory - check if contents are symlinks
        const files = readdirSync(location);
        const allSymlinks = files.every(f => {
          const fpath = join(location, f);
          return lstatSync(fpath).isSymbolicLink();
        });

        if (allSymlinks && files.length > 0) {
          // All contents are symlinks, safe to remove directory
          rmSync(location, { recursive: true });
          removed++;
        } else {
          console.log(chalk.gray(`   Skipping ${location} (contains non-symlink files)`));
        }
      } else {
        console.log(chalk.gray(`   Skipping ${location} (not a symlink)`));
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
  if (existsSync(localPath)) {
    try {
      rmSync(localPath);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Failed to remove local skill file: ${message}`));
    }
  }
  return false;
}

/**
 * Remove skill from global ~/.dojo/skills directory.
 */
function removeGlobalSkillFile(skillName: string): boolean {
  const globalPath = join(GLOBAL_SKILLS_DIR, `${skillName}.md`);
  if (existsSync(globalPath)) {
    try {
      rmSync(globalPath);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Failed to remove global skill file: ${message}`));
    }
  }
  return false;
}

/**
 * Unlearn (remove) a skill.
 * 
 * Without -g: Removes symlinks from agent directories AND local .dojo/skills file
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

    // Remove symlinks from project agent directories
    const locations = findSkillLocations(projectRoot, skill);
    console.log(chalk.yellow('📂 Removing symlinks:'));
    if (locations.length > 0) {
      const removedSymlinks = await removeSkillSymlinks(locations);
      for (const loc of locations) {
        const relative = loc.replace(projectRoot, '').replace(/^\//, '');
        console.log(chalk.red(`   ✗ ${relative}`));
      }
      if (removedSymlinks === 0 && locations.length > 0) {
        console.log(chalk.gray(`   (already removed or not symlinks)`));
      }
    } else {
      console.log(chalk.gray(`   No symlinks found for "${skill}"`));
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

    // Remove MCP server entries
    console.log('');
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

    console.log(chalk.green(`\n✅ Unlearned ${skill} globally`));

  } else {
    // Local unlearn: remove symlinks AND local .dojo/skills file
    console.log(chalk.yellow(`🗑️  Removing "${skill}" from this project...\n`));

    // Remove symlinks from agent directories
    const locations = findSkillLocations(projectRoot, skill);
    console.log(chalk.yellow('📂 Removing symlinks:'));
    if (locations.length > 0) {
      const removedSymlinks = await removeSkillSymlinks(locations);
      for (const loc of locations) {
        const relative = loc.replace(projectRoot, '').replace(/^\//, '');
        console.log(chalk.red(`   ✗ ${relative}`));
      }
      if (removedSymlinks === 0 && locations.length > 0) {
        console.log(chalk.gray(`   (already removed or not symlinks)`));
      }
    } else {
      console.log(chalk.gray(`   No symlinks found for "${skill}"`));
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

    console.log(chalk.green(`\n✅ Unlearned ${skill}`));
  }
}
