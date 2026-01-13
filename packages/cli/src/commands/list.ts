/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import chalk from 'chalk';
import { join } from 'node:path';
import { plugins } from '../agents/plugins/index.js';
import { getConfiguredMcpServers } from '../mcp/config.js';
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

interface ListOptions {
  mcpMode?: boolean;  // List MCP servers only (modal)
}

/**
 * List installed skills command.
 */
export async function list(options: ListOptions = {}): Promise<void> {
  const projectRoot = process.cwd();

  // MCP mode: list configured MCP servers
  if (options.mcpMode) {
    console.log('Configured MCP Servers:\n');

    const servers = await getConfiguredMcpServers();

    if (servers.length === 0) {
      console.log(chalk.yellow('No MCP servers configured.'));
      console.log(chalk.gray('Use `dojo learn <skill> --mcp` to install MCP servers.\n'));
      return;
    }

    // Group by agent
    const byAgent = new Map<string, typeof servers>();
    for (const server of servers) {
      const list = byAgent.get(server.agent) || [];
      list.push(server);
      byAgent.set(server.agent, list);
    }

    for (const [agent, agentServers] of byAgent) {
      console.log(chalk.bold(`${agent}:`));
      for (const server of agentServers) {
        if (server.command) {
          console.log(`  • ${server.name} (${server.command})`);
        } else {
          console.log(`  • ${server.name}`);
        }
      }
      console.log('');
    }

    console.log(`Total: ${servers.length} MCP servers`);
    return;
  }

  // Default: list installed skills
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
    const exampleDirs = plugins.slice(0, 3).map(p => p.agentDir).join(', ');
    console.log(`Create ${exampleDirs}, or other agent directories first.\n`);
  } else {
    console.log(`Total: ${totalSkills} skills across ${totalAgents} agents`);
  }
}
