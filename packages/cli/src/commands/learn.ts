/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import chalk from 'chalk';
import { searchRegistry, loadRegistry, SkillEntry } from '../registry/index.js';
import { resolveSkill, detectCycle } from '../resolver/dependencies.js';
import { downloadSkill } from '../download/github.js';
import { detectAgents, DetectedAgent } from '../agents/detector.js';
import { addMcpServersToConfig } from '../mcp/config.js';
import { join, relative, dirname } from 'node:path';
import { mkdir, writeFile, readFile, symlink, unlink, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import * as readline from 'node:readline';

interface LearnOptions {
  registry?: string;  // Local path, github:owner/repo, or URL
}

// Canonical skill storage location
const DOJO_SKILLS_DIR = join(homedir(), '.dojo', 'skills');

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
 * Prompt user to select from multiple matches
 */
async function promptUserSelection(matches: { fqn: string; skill: SkillEntry }[]): Promise<string> {
  console.log(chalk.yellow('\nMultiple skills found. Please select one:\n'));

  matches.forEach((m, i) => {
    console.log(`  ${chalk.cyan(`[${i + 1}]`)} ${m.fqn}`);
    if (m.skill.description) {
      console.log(`      ${chalk.gray(m.skill.description)}`);
    }
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve, reject) => {
    rl.question(chalk.yellow('\nEnter number: '), (answer) => {
      rl.close();
      const index = parseInt(answer, 10) - 1;
      if (index >= 0 && index < matches.length) {
        resolve(matches[index].fqn);
      } else {
        reject(new Error('Invalid selection'));
      }
    });
  });
}

/**
 * Create symlink from agent directory to canonical skill
 */
async function symlinkSkillToAgent(
  agent: DetectedAgent,
  skillName: string,
  canonicalPath: string,
  projectRoot: string
): Promise<string> {
  let destPath: string;

  switch (agent.format) {
    case 'flat-md':
      // Claude and Gemini use flat .md files
      destPath = join(agent.path, `${skillName}.md`);
      await mkdir(agent.path, { recursive: true });

      // Remove existing file/symlink if present
      try {
        await unlink(destPath);
      } catch {
        // Doesn't exist, that's fine
      }

      // Create relative symlink
      const relPath = relative(dirname(destPath), canonicalPath);
      await symlink(relPath, destPath);
      break;

    case 'folder-rule':
      // Cursor uses folder/RULE.md structure - needs actual file with special frontmatter
      const folderPath = join(agent.path, skillName);
      destPath = join(folderPath, 'RULE.md');
      await mkdir(folderPath, { recursive: true });

      // Read canonical content and add Cursor-specific frontmatter
      const content = await readFile(canonicalPath, 'utf-8');
      const lines = content.split('\n');
      let description = 'Imported from dojo';
      if (lines.length > 0 && lines[0].trim().length > 0) {
        description = lines[0].trim().replace(/^#\s*/, '');
      }

      const cursorContent = `---
name: ${skillName}
alwaysApply: false
description: ${description}
dojo_canonical: ${canonicalPath}
---

${content}`;
      await writeFile(destPath, cursorContent);
      break;

    default:
      throw new Error(`Unknown agent format: ${agent.format}`);
  }

  return destPath;
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
    localOnly: registryConfig.localOnly
  });

  if (results.length === 0) {
    console.log(chalk.red(`❌ No skills found matching "${skillQuery}"`));
    process.exit(1);
  }

  // 2. Handle multiple matches
  let fqn: string;
  if (results.length === 1) {
    fqn = results[0].fqn;
  } else {
    // Check for exact match first
    const exact = results.find(r => r.fqn === skillQuery || r.skill.name === skillQuery);
    if (exact) {
      fqn = exact.fqn;
    } else {
      fqn = await promptUserSelection(results);
    }
  }

  // 3. Load full registry for dependency resolution
  const registry = await loadRegistry(registryConfig.localRegistryPath, { localOnly: registryConfig.localOnly });

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
  console.log(chalk.blue(`📦 Installing ${fqn}`));

  // Display tree
  resolved.forEach((r, i) => {
    const prefix = i === resolved.length - 1 ? '   └── ' : '   ├── ';
    console.log(chalk.gray(prefix) + r.fqn);
  });

  // 7. Detect agents
  const agents = detectAgents(projectRoot);

  if (agents.length === 0) {
    console.log(chalk.yellow('\n⚠️  No agent directories detected. Creating .claude/skills...'));
    const claudePath = join(projectRoot, '.claude', 'skills');
    await mkdir(claudePath, { recursive: true });
    agents.push({ name: 'claude', path: claudePath, format: 'flat-md' });
  }

  // 8. Ensure canonical skills directory exists
  await mkdir(DOJO_SKILLS_DIR, { recursive: true });

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
    const skillVersion = version || 'main';

    // Download to canonical location
    const canonicalPath = join(DOJO_SKILLS_DIR, `${skillName}.md`);

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

    // Symlink to all detected agent directories
    for (const agent of agents) {
      const destPath = await symlinkSkillToAgent(agent, skillName, canonicalPath, projectRoot);
      installedPaths.push(destPath.replace(projectRoot + '/', ''));
    }

    // Collect MCP servers for setup
    if (entry.mcp_servers && entry.mcp_servers.length > 0) {
      allMcpServers.push(...entry.mcp_servers);
    }
  }

  // 10. Setup MCP servers if any
  if (allMcpServers.length > 0) {
    console.log(chalk.blue('\n🔌 Setting up MCP servers:'));
    await addMcpServersToConfig(allMcpServers);
  }

  // 11. Display success
  console.log(chalk.green('\n✅ Installed to:'));
  console.log(chalk.gray(`   📁 ${DOJO_SKILLS_DIR} (canonical)`));
  for (const p of installedPaths) {
    console.log(chalk.gray(`   ↪ ${p}`));
  }
}

