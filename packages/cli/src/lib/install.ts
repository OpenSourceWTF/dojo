/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

/**
 * Library exports for MCP server integration.
 * This module provides a programmatic API for skill installation.
 */

import { searchRegistry, loadRegistry } from '../registry/index.js';
import { resolveSkill, detectCycle } from '../resolver/dependencies.js';
import { downloadSkill } from '../download/github.js';
import { detectAgents, getPluginForAgent } from '../agents/detector.js';
import { loadMergedBlacklist, checkBlacklist, formatBlockedMessage } from '../blacklist/index.js';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface InstallOptions {
  version?: string;
  registry?: string;
  global?: boolean;
  projectRoot?: string;
}

export interface InstallResult {
  success: boolean;
  message: string;
  installedPaths: string[];
  fqn?: string;
}

// Skill storage locations
const GLOBAL_SKILLS_DIR = join(homedir(), '.dojo', 'skills');
const getLocalSkillsDir = (projectRoot: string) => join(projectRoot, '.dojo', 'skills');

/**
 * Inject/update YAML frontmatter in skill content
 */
function injectFrontmatter(
  content: string,
  metadata: {
    name: string;
    source: string;
    version: string;
    fqn: string;
    description?: string;
  }
): string {
  const hasFrontmatter = content.trimStart().startsWith('---');

  if (hasFrontmatter) {
    const endIndex = content.indexOf('---', 3);
    if (endIndex > 0) {
      const existingFm = content.substring(3, endIndex).trim();
      const body = content.substring(endIndex + 3).trim();

      const existing: Record<string, string> = {};
      for (const line of existingFm.split('\n')) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          existing[key] = value;
        }
      }

      const merged = {
        ...existing,
        name: existing.name || metadata.name,
        dojo_source: metadata.source,
        dojo_version: metadata.version,
        dojo_fqn: metadata.fqn,
        dojo_installed: new Date().toISOString().split('T')[0],
      };

      const newFm = Object.entries(merged)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');

      return `---\n${newFm}\n---\n\n${body}`;
    }
  }

  const fm = `---
name: ${metadata.name}
description: ${metadata.description || 'Skill installed via dojo'}
dojo_source: ${metadata.source}
dojo_version: ${metadata.version}
dojo_fqn: ${metadata.fqn}
dojo_installed: ${new Date().toISOString().split('T')[0]}
---`;

  return `${fm}\n\n${content}`;
}

/**
 * Install a skill programmatically.
 * Used by MCP server and can be called from other tools.
 *
 * @param skill - Skill name or search term
 * @param options - Installation options
 * @returns Installation result
 */
export async function installSkill(
  skill: string,
  options: InstallOptions = {}
): Promise<InstallResult> {
  const projectRoot = options.projectRoot || process.cwd();

  try {
    // Parse registry option
    const isLocalRegistry = Boolean(
      options.registry &&
      !options.registry.startsWith('github:') &&
      !options.registry.startsWith('https://')
    );
    const registryConfig = {
      localRegistryPath: isLocalRegistry ? options.registry : undefined,
      localOnly: isLocalRegistry,
      remoteUrl: !isLocalRegistry ? options.registry : undefined,
    };

    // Search registry
    const results = await searchRegistry(skill, {
      localRegistryPath: registryConfig.localRegistryPath,
      localOnly: registryConfig.localOnly,
    });

    if (results.length === 0) {
      return {
        success: false,
        message: `No skills found matching "${skill}"`,
        installedPaths: [],
      };
    }

    // Use first match (or exact match if found)
    const exact = results.find(
      (r) => r.fqn === skill || r.skill.name === skill
    );
    const fqn = exact ? exact.fqn : results[0].fqn;

    // Check blacklist before proceeding
    const blacklist = await loadMergedBlacklist({
      localPath: isLocalRegistry ? options.registry : undefined,
    });
    const blocked = checkBlacklist(fqn, blacklist);
    if (blocked) {
      return {
        success: false,
        message: formatBlockedMessage(fqn, blocked),
        installedPaths: [],
      };
    }

    // Load full registry
    const registry = await loadRegistry(registryConfig.localRegistryPath, {
      localOnly: registryConfig.localOnly,
    });

    // Get skill entry
    const skillEntry = registry.skills.get(fqn);
    if (!skillEntry) {
      return {
        success: false,
        message: `Skill "${fqn}" not found in registry`,
        installedPaths: [],
      };
    }

    // Check for cycles
    const cycleCheck = detectCycle(fqn, registry);
    if (cycleCheck) {
      return {
        success: false,
        message: `Circular dependency detected: ${cycleCheck.join(' -> ')}`,
        installedPaths: [],
      };
    }

    // Resolve dependencies
    const resolved = resolveSkill(fqn, registry);

    // Check dependencies against blacklist
    for (const r of resolved) {
      if (r.fqn === fqn) continue; // Already checked above
      const depBlocked = checkBlacklist(r.fqn, blacklist);
      if (depBlocked) {
        return {
          success: false,
          message: `Dependency "${r.fqn}" is blacklisted: ${depBlocked.reason}`,
          installedPaths: [],
        };
      }
    }

    // Detect agents
    const agents = detectAgents(projectRoot);

    // If no agents detected, return early
    if (agents.length === 0) {
      return {
        success: false,
        message: 'No AI agent directories detected. Install an agent CLI first (claude, gemini, cursor, codex).',
        installedPaths: [],
      };
    }

    // Determine skills directory
    const skillsDir = options.global
      ? GLOBAL_SKILLS_DIR
      : getLocalSkillsDir(projectRoot);
    await mkdir(skillsDir, { recursive: true });

    // Download and install each skill
    const installedPaths: string[] = [];

    for (const r of resolved) {
      const entry = r.entry;
      const rawName =
        entry.path || entry.name || r.fqn.split('/').pop() || r.fqn;
      let skillName = rawName.split('/').pop() || rawName;
      if (skillName.endsWith('.md')) {
        skillName = skillName.slice(0, -3);
      }
      skillName = skillName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      const skillVersion = options.version || 'main';

      // Check if MCP-only
      const isMcpOnly =
        entry.mcp_servers &&
        entry.mcp_servers.length > 0 &&
        !entry.source.endsWith('.md') &&
        !entry.path?.endsWith('.md');

      if (!isMcpOnly) {
        const canonicalPath = join(skillsDir, `${skillName}.md`);

        // Download skill
        await downloadSkill({
          source: entry.source,
          version: skillVersion,
          destPath: canonicalPath,
        });

        // Inject frontmatter
        let content = await readFile(canonicalPath, 'utf-8');
        content = injectFrontmatter(content, {
          name: skillName,
          source: entry.source,
          version: skillVersion,
          fqn: r.fqn,
          description: entry.description,
        });
        await writeFile(canonicalPath, content);

        // Install to each agent using plugins
        for (const agent of agents) {
          const plugin = getPluginForAgent(agent);
          if (plugin) {
            const destPath = await plugin.installSkill({
              projectRoot,
              skillName,
              canonicalPath,
            });
            installedPaths.push(destPath);
          }
        }
      }
    }

    return {
      success: true,
      message: `Successfully installed ${fqn}`,
      installedPaths,
      fqn,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message,
      installedPaths: [],
    };
  }
}

export interface UninstallOptions {
  projectRoot?: string;
}

export interface UninstallResult {
  success: boolean;
  message: string;
  removedPaths: string[];
}

/**
 * Uninstall a skill programmatically.
 * Used by MCP server and can be called from other tools.
 *
 * @param skill - Skill name to remove
 * @param options - Uninstall options
 * @returns Uninstall result
 */
export async function uninstallSkill(
  skill: string,
  options: UninstallOptions = {}
): Promise<UninstallResult> {
  const projectRoot = options.projectRoot || process.cwd();
  const removedPaths: string[] = [];

  try {
    // Detect agents
    const agents = detectAgents(projectRoot);

    if (agents.length === 0) {
      return {
        success: false,
        message: 'No AI agent directories detected. Install an agent CLI first (claude, gemini, cursor, codex).',
        removedPaths: [],
      };
    }

    // Remove from each agent using plugins
    for (const agent of agents) {
      const plugin = getPluginForAgent(agent);
      if (plugin) {
        const removed = await plugin.removeSkill({
          projectRoot,
          skillName: skill,
        });
        if (removed) {
          const skillPath = plugin.getSkillPath(projectRoot, skill);
          const relativePath = skillPath.replace(projectRoot + '/', '');
          removedPaths.push(relativePath);
        }
      }
    }

    // Remove from local .dojo/skills
    const localSkillPath = join(getLocalSkillsDir(projectRoot), `${skill}.md`);
    if (existsSync(localSkillPath)) {
      await unlink(localSkillPath);
      removedPaths.push(`.dojo/skills/${skill}.md`);
    }

    if (removedPaths.length === 0) {
      return {
        success: false,
        message: `Skill "${skill}" not found in any agent directories`,
        removedPaths: [],
      };
    }

    return {
      success: true,
      message: `Successfully uninstalled ${skill}`,
      removedPaths,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message,
      removedPaths: [],
    };
  }
}
