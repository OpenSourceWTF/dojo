/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import chalk from 'chalk';
import { join } from 'node:path';
import { plugins } from '../agents/plugins/index.js';
import type { DetectedAgent } from '../agents/plugin.js';

export interface InstalledSkill {
  name: string;
  path: string;
}

export interface AgentSkills {
  agent: DetectedAgent;
  skills: InstalledSkill[];
}

/**
 * Get installed skills using the plugin system.
 * Detects all agents and lists their skills using plugin.listSkills().
 */
export function getInstalledSkillsFromPlugins(projectRoot: string): AgentSkills[] {
  const results: AgentSkills[] = [];

  for (const plugin of plugins) {
    const detected = plugin.detect(projectRoot);
    if (!detected) continue;

    // Use plugin's listSkills method - delegates to format plugin
    const skillNames = plugin.listSkills(projectRoot);
    const skills: InstalledSkill[] = skillNames.map(name => ({
      name,
      path: plugin.getSkillPath(projectRoot, name)
    }));

    results.push({ agent: detected, skills });
  }

  return results;
}

/**
 * Get installed skills grouped by agent name (legacy format).
 */
export function getInstalledSkills(projectRoot: string): Record<string, string[]> {
  const agentSkills = getInstalledSkillsFromPlugins(projectRoot);
  const result: Record<string, string[]> = {};

  for (const { agent, skills } of agentSkills) {
    result[agent.name] = skills.map(s => s.name);
  }

  return result;
}

/**
 * Get display path for an agent.
 */
function getAgentPathDisplay(agentName: string): string {
  // Get plugin to derive path from its configuration
  const plugin = plugins.find(p => p.name === agentName);
  if (!plugin) return agentName;
  return plugin.agentDir;
}

/**
 * List installed skills command.
 */
export async function list(): Promise<void> {
  const projectRoot = process.cwd();
  const agentSkills = getInstalledSkillsFromPlugins(projectRoot);

  console.log('Installed Skills:\n');

  let totalSkills = 0;
  let totalAgents = 0;

  for (const { agent, skills } of agentSkills) {
    totalAgents++;
    const displayPath = getAgentPathDisplay(agent.name);

    console.log(chalk.bold(`${agent.name.charAt(0).toUpperCase() + agent.name.slice(1)} (${displayPath}):`));

    if (skills.length === 0) {
      console.log('  (none detected)');
    } else {
      for (const skill of skills) {
        console.log(`  • ${skill.name}`);
        totalSkills++;
      }
    }

    console.log('');
  }

  if (agentSkills.length === 0) {
    console.log(chalk.yellow('No agent directories detected.'));
    console.log('Create .claude/skills/, .gemini/skills/, or other agent directories first.\n');
  } else {
    console.log(`Total: ${totalSkills} skills across ${totalAgents} agents`);
  }
}
