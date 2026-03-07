/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import chalk from 'chalk';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { plugins } from '../agents/plugins/index.js';
import { detectAgents } from '../agents/detector.js';

// Skill storage locations
const GLOBAL_SKILLS_DIR = join(homedir(), '.dojo', 'skills');
const getLocalSkillsDir = (projectRoot: string) => join(projectRoot, '.dojo', 'skills');

interface SyncOptions {
  force?: boolean;
  global?: boolean;
}

interface SyncResult {
  gathered: number;
  distributed: number;
  skipped: number;
}

/**
 * Three-step sync process:
 * 1. Scan all detected agent skill directories to discover skills
 * 2. Copy unique skills INTO .dojo/skills/ (canonical hub), avoid duplication/overwriting
 * 3. Copy FROM .dojo/skills/ back out to each agent directory for missing skills
 */
export async function sync(options: SyncOptions = {}) {
  const projectRoot = process.cwd();
  const dojoSkillsDir = options.global ? GLOBAL_SKILLS_DIR : getLocalSkillsDir(projectRoot);

  console.log(chalk.blue('🔄 Syncing skills...\n'));

  const scope = options.global ? 'global' : 'local';
  const dojoLabel = options.global ? '~/.dojo/skills' : '.dojo/skills';
  console.log(chalk.white(`Scope: ${scope} (${dojoLabel})\n`));

  // Ensure .dojo/skills exists
  mkdirSync(dojoSkillsDir, { recursive: true });

  // Detect available agents
  const agents = detectAgents(projectRoot);
  if (agents.length === 0) {
    console.log(chalk.yellow('⚠️  No agent directories found'));
    return;
  }

  console.log(chalk.white(`Agents: ${agents.map(a => a.name).join(', ')}\n`));

  // ── Step 1: Scan all agent skill directories ──
  console.log(chalk.cyan('Step 1: Scanning agent directories...\n'));

  // Collect all skills from all agents: { skillName -> { content (canonical), source agent } }
  const discoveredSkills = new Map<string, { content: string; agent: string }>();

  for (const agent of agents) {
    const plugin = plugins.find(p => p.name === agent.name);
    if (!plugin) continue;

    const skillNames = plugin.listSkills(projectRoot);
    for (const skillName of skillNames) {
      if (discoveredSkills.has(skillName)) continue; // First-found wins

      const skillPath = plugin.getSkillPath(projectRoot, skillName);
      if (!existsSync(skillPath)) continue;

      try {
        const rawContent = readFileSync(skillPath, 'utf-8');
        // Convert to canonical format using the plugin's format plugin
        const canonicalContent = plugin.formatPlugin.toCanonical(rawContent, skillName);
        discoveredSkills.set(skillName, { content: canonicalContent, agent: plugin.name });
        console.log(chalk.gray(`  Found: ${skillName} (from ${plugin.displayName})`));
      } catch {
        // Skip unreadable files
      }
    }
  }

  if (discoveredSkills.size === 0) {
    // Check if .dojo/skills has any skills to distribute
    const existingCanonical = readdirSync(dojoSkillsDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''));

    if (existingCanonical.length === 0) {
      console.log(chalk.yellow('\n⚠️  No skills found in any agent directory or .dojo/skills'));
      return;
    }

    console.log(chalk.gray(`  No new skills in agent directories`));
    console.log(chalk.gray(`  ${existingCanonical.length} skill(s) already in ${dojoLabel}\n`));
  } else {
    console.log(chalk.gray(`  Discovered ${discoveredSkills.size} skill(s)\n`));
  }

  // ── Step 2: Copy unique skills into .dojo/skills ──
  console.log(chalk.cyan('Step 2: Gathering into .dojo/skills...\n'));

  let gathered = 0;
  let skippedGather = 0;

  for (const [skillName, { content, agent }] of discoveredSkills) {
    const canonicalPath = join(dojoSkillsDir, `${skillName}.md`);

    if (existsSync(canonicalPath) && !options.force) {
      skippedGather++;
      console.log(chalk.gray(`  Skip: ${skillName} (already in ${dojoLabel})`));
      continue;
    }

    writeFileSync(canonicalPath, content);
    gathered++;
    console.log(chalk.green(`  ← ${skillName} (from ${agent})`));
  }

  console.log(chalk.gray(`  Gathered: ${gathered}, Skipped: ${skippedGather}\n`));

  // ── Step 3: Copy from .dojo/skills back out to each agent ──
  console.log(chalk.cyan('Step 3: Distributing to agents...\n'));

  // Read all canonical skills
  const canonicalSkills = readdirSync(dojoSkillsDir)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''));

  let distributed = 0;
  let skippedDistribute = 0;

  for (const agent of agents) {
    const plugin = plugins.find(p => p.name === agent.name);
    if (!plugin) continue;

    for (const skillName of canonicalSkills) {
      // Check if a valid (readable) copy already exists — use existsSync which
      // returns false for broken symlinks, so stale symlinks get replaced
      const agentSkillPath = plugin.getSkillPath(projectRoot, skillName);
      if (existsSync(agentSkillPath) && !options.force) {
        skippedDistribute++;
        continue;
      }

      const canonicalPath = join(dojoSkillsDir, `${skillName}.md`);

      try {
        await plugin.installSkill({
          projectRoot,
          skillName,
          canonicalPath
        });
        distributed++;
        console.log(chalk.green(`  → ${skillName} → ${plugin.displayName}`));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`  Failed: ${skillName} → ${plugin.displayName}: ${message}`));
      }
    }
  }

  console.log(chalk.gray(`  Distributed: ${distributed}, Skipped: ${skippedDistribute}\n`));

  // Summary
  const result: SyncResult = {
    gathered,
    distributed,
    skipped: skippedGather + skippedDistribute
  };

  console.log(chalk.green(`✅ Sync complete! Gathered ${result.gathered}, distributed ${result.distributed}, skipped ${result.skipped}`));
}
