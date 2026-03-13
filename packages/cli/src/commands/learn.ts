/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import chalk from 'chalk';
import { searchRegistry, loadRegistry, SkillEntry } from '../registry/index.js';
import { resolveSkill, detectCycle } from '../resolver/dependencies.js';
import { downloadSkill } from '../download/github.js';
import { detectAgents, getPluginByName } from '../agents/detector.js';
import type { DetectedAgent } from '../agents/plugin.js';
import { addMcpServersToConfig } from '../mcp/config.js';
import { loadMergedBlacklist, checkBlacklist, formatBlockedMessage } from '../blacklist/index.js';
import { prompt } from '../utils/prompt.js';
import { join } from 'node:path';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';

interface LearnOptions {
  registry?: string;  // Local path, github:owner/repo, or URL
  mcpMode?: boolean;  // Modal: install MCP servers only (skip skills)
  forAgents?: string[]; // Specific agents to install for
  global?: boolean;    // Install to global ~/.dojo/skills instead of project-local
}

// Skill storage locations
const GLOBAL_SKILLS_DIR = join(homedir(), '.dojo', 'skills');
const getLocalSkillsDir = (projectRoot: string) => join(projectRoot, '.dojo', 'skills');

/**
 * Parse skill input like "kungfu", "kungfu@1.0.0", or "@anthropics/create-docx"
 */
function parseSkillInput(input: string): { name: string; version?: string } {
  const atIndex = input.lastIndexOf('@');
  if (atIndex > 0) {
    const name = input.substring(0, atIndex);
    const version = input.substring(atIndex + 1);
    return { name, version };
  }
  return { name: input };
}

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
  // Check if content already has frontmatter
  const hasFrontmatter = content.trimStart().startsWith('---');

  if (hasFrontmatter) {
    // Parse existing frontmatter and merge
    const endIndex = content.indexOf('---', 3);
    if (endIndex > 0) {
      const existingFm = content.substring(3, endIndex).trim();
      const body = content.substring(endIndex + 3).trim();

      // Parse existing fields
      const existing: Record<string, string> = {};
      for (const line of existingFm.split('\n')) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          existing[key] = value;
        }
      }

      // Merge with dojo metadata (dojo fields take precedence for tracking)
      const merged = {
        ...existing,
        name: existing.name || metadata.name,
        dojo_source: metadata.source,
        dojo_version: metadata.version,
        dojo_fqn: metadata.fqn,
        dojo_installed: new Date().toISOString().split('T')[0],
      };

      // Build new frontmatter
      const newFm = Object.entries(merged)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');

      return `---\n${newFm}\n---\n\n${body}`;
    }
  }

  // No existing frontmatter - create new
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
 * Prompt user to select from multiple matches.
 * 
 * @param matches - Array of skill matches to choose from
 * @returns The selected skill's FQN
 */
async function promptUserSelection(matches: { fqn: string; skill: SkillEntry }[]): Promise<string> {
  console.log(chalk.yellow('\nMultiple skills found. Please select one:\n'));

  matches.forEach((m, i) => {
    console.log(`  ${chalk.cyan(`[${i + 1}]`)} ${m.fqn}`);
    if (m.skill.description) {
      console.log(`      ${chalk.gray(m.skill.description)}`);
    }
  });

  const answer = await prompt('\nEnter number: ');
  const index = parseInt(answer, 10) - 1;

  if (index >= 0 && index < matches.length) {
    return matches[index].fqn;
  }
  throw new Error('Invalid selection');
}

export async function learn(skill: string, options: LearnOptions = {}) {
  const projectRoot = process.cwd();

  // Parse registry option - if local path, use localOnly mode
  const isLocalRegistry = Boolean(options.registry && !options.registry.startsWith('github:') && !options.registry.startsWith('https://'));
  const registryConfig = {
    localRegistryPath: isLocalRegistry ? options.registry : undefined,
    localOnly: isLocalRegistry,
    remoteUrl: !isLocalRegistry ? options.registry : undefined
  };

  // Parse input
  const { name: skillQuery, version } = parseSkillInput(skill);

  // 1. Search registry
  console.log(chalk.gray(`🔍 Searching for "${skillQuery}"...`));

  const results = await searchRegistry(skillQuery, {
    localRegistryPath: registryConfig.localRegistryPath,
    localOnly: registryConfig.localOnly,
    remoteUrl: registryConfig.remoteUrl
  });

  if (results.length === 0) {
    console.log(chalk.red(`❌ No skills found matching "${skillQuery}"`));
    process.exit(1);
  }

  // 2. Filter and select skill
  let candidates = results;

  // When --mcp is set, filter to skills with mcp_servers
  if (options.mcpMode) {
    candidates = results.filter(r => r.skill.mcp_servers && r.skill.mcp_servers.length > 0);

    // If no MCP skills found in results, search for mcp-<name> variant
    if (candidates.length === 0) {
      const mcpVariants = await searchRegistry(`mcp-${skillQuery}`, {
        localRegistryPath: registryConfig.localRegistryPath,
        localOnly: registryConfig.localOnly,
        remoteUrl: registryConfig.remoteUrl
      });
      candidates = mcpVariants.filter(r => r.skill.mcp_servers && r.skill.mcp_servers.length > 0);

      if (candidates.length === 0) {
        console.log(chalk.yellow(`⚠️  No MCP servers found for "${skillQuery}"`));
        console.log(chalk.gray(`   Try: dojo search ${skillQuery} --mcp`));
        process.exit(1);
      }
    }
  }

  // Unified selection logic
  let fqn: string;
  if (candidates.length === 1) {
    fqn = candidates[0].fqn;
  } else {
    // Check for exact match first
    const exact = candidates.find(r => r.fqn === skillQuery || r.skill.name === skillQuery);
    if (exact) {
      fqn = exact.fqn;
    } else {
      fqn = await promptUserSelection(candidates);
    }
  }

  // 3. Check blacklist before proceeding
  const blacklist = await loadMergedBlacklist({
    localPath: isLocalRegistry ? options.registry : undefined,
  });
  const blocked = checkBlacklist(fqn, blacklist);
  if (blocked) {
    console.log(chalk.red(`\n🚫 ${formatBlockedMessage(fqn, blocked)}`));
    process.exit(1);
  }

  // 4. Load full registry for dependency resolution
  const registry = await loadRegistry(registryConfig.localRegistryPath, {
    localOnly: registryConfig.localOnly,
    remoteUrl: registryConfig.remoteUrl
  });

  // 4. Get skill entry
  const skillEntry = registry.skills.get(fqn);
  if (!skillEntry) {
    console.log(chalk.red(`❌ Skill "${fqn}" not found in registry`));
    process.exit(1);
  }

  // 5. Detect cycles
  const cycleCheck = detectCycle(fqn, registry);
  if (cycleCheck) {
    console.log(chalk.red(`❌ Circular dependency detected: ${cycleCheck.join(' -> ')}`));
    process.exit(1);
  }

  // 6. Resolve all dependencies
  const resolved = resolveSkill(fqn, registry);

  // Check dependencies against blacklist
  for (const r of resolved) {
    if (r.fqn === fqn) continue; // Already checked above
    const depBlocked = checkBlacklist(r.fqn, blacklist);
    if (depBlocked) {
      console.log(chalk.red(`\n🚫 Dependency "${r.fqn}" is blacklisted and cannot be installed.`));
      console.log(chalk.red(`   Reason: ${depBlocked.reason}`));
      console.log(chalk.yellow(`   "${fqn}" depends on this blacklisted skill.`));
      process.exit(1);
    }
  }

  console.log(chalk.blue(`📦 Installing ${fqn}`));

  // Display tree
  resolved.forEach((r, i) => {
    const prefix = i === resolved.length - 1 ? '   └── ' : '   ├── ';
    console.log(chalk.gray(prefix) + r.fqn);
  });

  // 7. Detect agents (with CLI requirement for skill installation)
  let agents = detectAgents(projectRoot, { requireCli: true });

  if (options.forAgents && options.forAgents.length > 0) {
    const requested = new Set(options.forAgents.map(a => a.toLowerCase().trim()));
    const filtered = agents.filter(a => requested.has(a.name));

    // Warn about requested agents that weren't detected
    for (const agentName of requested) {
      const plugin = getPluginByName(agentName);
      if (!plugin) {
        console.log(chalk.red(`⚠️  Unknown agent: ${agentName}`));
      } else {
        const isDetected = agents.some(a => a.name === agentName);
        if (!isDetected) {
          console.log(chalk.yellow(`⚠️  ${plugin.displayName} not detected (CLI not installed or directory missing)`));
        }
      }
    }

    agents = filtered;

    if (agents.length === 0) {
      console.log(chalk.yellow(`\n❌ No agents available to install to.`));
      console.log(chalk.gray(`   Install agent CLIs (claude, gemini, cursor, codex) or create directories first.`));
      return;
    }
  }

  // If no agents detected, show warning and exit
  if (agents.length === 0) {
    console.log(chalk.yellow('\n❌ No agents detected.'));
    console.log(chalk.gray(`   Install agent CLIs (claude, gemini, cursor, codex) or create directories first.`));
    return;
  }

  // 8. Determine skills directory based on global flag
  const skillsDir = options.global ? GLOBAL_SKILLS_DIR : getLocalSkillsDir(projectRoot);
  await mkdir(skillsDir, { recursive: true });

  // 9. Download and install each skill
  const installedPaths: string[] = [];
  const allMcpServers: import('../registry/loader.js').McpServerConfig[] = [];

  for (const r of resolved) {
    const entry = r.entry;
    const rawName = entry.path || entry.name || r.fqn.split('/').pop() || r.fqn;
    let skillName = rawName.split('/').pop() || rawName;
    if (skillName.endsWith('.md')) {
      skillName = skillName.slice(0, -3);
    }
    // Sanitize to kebab-case
    skillName = skillName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const skillVersion = version || entry.versions?.latest || 'main';

    // Detect MCP-only entry: has mcp_servers but source doesn't point to a .md file
    const isMcpOnly = entry.mcp_servers && entry.mcp_servers.length > 0 &&
      !entry.source.endsWith('.md') &&
      !entry.path?.endsWith('.md');

    // Download skill files (unless --mcp flag is set or this is MCP-only entry)
    if (!options.mcpMode && !isMcpOnly) {
      const canonicalPath = join(skillsDir, `${skillName}.md`);

      try {
        await downloadSkill({
          source: entry.source,
          version: skillVersion,
          destPath: canonicalPath
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(chalk.red(`\n❌ Failed to download ${r.fqn}: ${message}`));
        process.exit(1);
      }

      // Read downloaded content and inject frontmatter
      let content = await readFile(canonicalPath, 'utf-8');
      content = injectFrontmatter(content, {
        name: skillName,
        source: entry.source,
        version: skillVersion,
        fqn: r.fqn,
        description: entry.description
      });
      await writeFile(canonicalPath, content);

      // Install to all detected agent directories using plugins
      for (const agent of agents) {
        const plugin = getPluginByName(agent.name);
        if (plugin) {
          const destPath = await plugin.installSkill({
            projectRoot,
            skillName,
            canonicalPath
          });
          installedPaths.push(destPath);
        }
      }
    }

    // Collect MCP servers for setup only if --mcp flag is set (modal)
    if (options.mcpMode && entry.mcp_servers && entry.mcp_servers.length > 0) {
      allMcpServers.push(...entry.mcp_servers);
    }
  }

  // 10. Setup MCP servers if any
  if (allMcpServers.length > 0) {
    console.log(chalk.blue('\n🔌 Setting up MCP servers:'));
    await addMcpServersToConfig(allMcpServers);
  }

  // 11. Display success
  console.log(chalk.green('\n✅ Installed!'));
  if (installedPaths.length > 0) {
    console.log(chalk.gray(`   📁 ${skillsDir} ${options.global ? '(global)' : '(local)'}`));
    for (const p of installedPaths) {
      console.log(chalk.gray(`   ↪ ${p}`));
    }
  }
}

