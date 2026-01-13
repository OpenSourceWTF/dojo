/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import chalk from 'chalk';
import { McpServerConfig } from '../registry/loader.js';

// Agent MCP config definitions
interface AgentMcpConfig {
  name: string;
  cli: string;           // CLI command to check for
  path: string;
  format: 'json' | 'toml';
  key: string; // Root key for MCP servers (e.g., 'mcpServers')
}

const AGENT_MCP_CONFIGS: AgentMcpConfig[] = [
  { name: 'Claude', cli: 'claude', path: join(homedir(), '.claude', 'claude_desktop_config.json'), format: 'json', key: 'mcpServers' },
  { name: 'Gemini', cli: 'gemini', path: join(homedir(), '.gemini', 'settings.json'), format: 'json', key: 'mcpServers' },
  { name: 'Antigravity', cli: 'gemini', path: join(homedir(), '.gemini', 'antigravity', 'mcp_config.json'), format: 'json', key: 'mcpServers' },
  { name: 'Codex', cli: 'codex', path: join(homedir(), '.codex', 'config.toml'), format: 'toml', key: 'mcp_servers' },
];

/**
 * Check if a CLI command exists in PATH.
 */
function cliExists(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a file exists.
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load JSON config file.
 */
async function loadJsonConfig(path: string): Promise<Record<string, unknown>> {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * Save JSON config file.
 */
async function saveJsonConfig(path: string, config: Record<string, unknown>): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(config, null, 2));
}

/**
 * Load TOML config file (simple parser for MCP server section).
 */
async function loadTomlConfig(path: string): Promise<{ raw: string; servers: Record<string, unknown> }> {
  try {
    const content = await readFile(path, 'utf-8');
    // Simple parsing: extract mcp_servers sections
    const servers: Record<string, unknown> = {};
    const regex = /\[mcp_servers\.([^\]]+)\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      servers[match[1]] = true; // Just track existence for now
    }
    return { raw: content, servers };
  } catch {
    return { raw: '', servers: {} };
  }
}

/**
 * Add MCP server to TOML config (appends section).
 */
function addServerToToml(raw: string, server: McpServerConfig): string {
  const section = `
[mcp_servers.${server.name}]
command = "${server.command}"
args = ${JSON.stringify(server.args)}
${server.env ? `env = ${JSON.stringify(server.env)}` : ''}
`;
  return raw + section;
}
import { prompt } from '../utils/prompt.js';

/**
 * Prompt user for required environment variables.
 * Defaults to existing environment values if available.
 */
async function promptForEnvVars(serverName: string, envTemplate: Record<string, string>): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  for (const [key, templateValue] of Object.entries(envTemplate)) {
    // Check if env var exists in current environment
    const envValue = process.env[key];
    const defaultValue = envValue || templateValue;
    const isPlaceholder = !defaultValue || defaultValue.startsWith('${') || defaultValue === '';

    let promptText: string;
    if (isPlaceholder) {
      promptText = `     ${key}: `;
    } else {
      // Show masked default for sensitive values
      const masked = key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')
        ? '***'
        : defaultValue;
      promptText = `     ${key} [${masked}]: `;
    }

    const value = await prompt(promptText);
    result[key] = value || defaultValue || '';
  }

  return result;
}

/**
 * Add MCP servers to a specific agent's config.
 * Returns { added: string[], skipped: string[] }
 */
async function addServersToAgent(agent: AgentMcpConfig, servers: McpServerConfig[], resolvedEnvs: Map<string, Record<string, string>>): Promise<{ added: string[]; skipped: string[] }> {
  const added: string[] = [];
  const skipped: string[] = [];

  if (agent.format === 'json') {
    const config = await loadJsonConfig(agent.path);
    const mcpServers = (config[agent.key] as Record<string, unknown>) || {};

    for (const server of servers) {
      if (mcpServers[server.name]) {
        skipped.push(server.name);
        continue; // Already exists
      }

      const env = resolvedEnvs.get(server.name);
      mcpServers[server.name] = {
        command: server.command,
        args: server.args,
        ...(env && Object.keys(env).length > 0 && { env })
      };
      added.push(server.name);
    }

    if (added.length > 0) {
      config[agent.key] = mcpServers;
      await saveJsonConfig(agent.path, config);
    }
  } else if (agent.format === 'toml') {
    let { raw, servers: existingServers } = await loadTomlConfig(agent.path);

    for (const server of servers) {
      if (existingServers[server.name]) {
        skipped.push(server.name);
        continue; // Already exists
      }

      const env = resolvedEnvs.get(server.name);
      const serverWithEnv = { ...server, env };
      raw = addServerToToml(raw, serverWithEnv);
      added.push(server.name);
    }

    if (added.length > 0) {
      await mkdir(dirname(agent.path), { recursive: true });
      await writeFile(agent.path, raw);
    }
  }

  return { added, skipped };
}

/**
 * Add MCP servers to ALL detected agent configs.
 * 
 * @param servers - Array of MCP server configurations to add
 * @returns Record of agent names to arrays of added server names
 */
export async function addMcpServersToConfig(servers: McpServerConfig[]): Promise<Record<string, string[]>> {
  if (servers.length === 0) return {};

  // Prompt for env vars ONCE per server (shared across all agents)
  const resolvedEnvs = new Map<string, Record<string, string>>();
  for (const server of servers) {
    if (server.env && Object.keys(server.env).length > 0) {
      console.log(chalk.yellow(`   ${server.name} requires configuration:`));
      const envVars = await promptForEnvVars(server.name, server.env);
      resolvedEnvs.set(server.name, envVars);
    } else {
      resolvedEnvs.set(server.name, {});
    }
  }

  const results: Record<string, string[]> = {};

  for (const agent of AGENT_MCP_CONFIGS) {
    // Check if agent CLI is installed
    if (!cliExists(agent.cli)) {
      continue; // Skip agents that aren't installed
    }

    const { added, skipped } = await addServersToAgent(agent, servers, resolvedEnvs);
    if (added.length > 0) {
      results[agent.name] = added;
      console.log(chalk.green(`   ✓ ${agent.name}: ${added.join(', ')}`));
      console.log(chalk.gray(`     → ${agent.path}`));
    }
    if (skipped.length > 0) {
      console.log(chalk.gray(`   ⏭ ${agent.name}: ${skipped.join(', ')} (already configured)`));
    }
  }

  return results;
}

/**
 * List currently configured MCP servers from all agent configs.
 */
export async function listMcpServers(): Promise<Record<string, Record<string, unknown>>> {
  const results: Record<string, Record<string, unknown>> = {};

  for (const agent of AGENT_MCP_CONFIGS) {
    if (await fileExists(agent.path)) {
      if (agent.format === 'json') {
        const config = await loadJsonConfig(agent.path);
        const servers = config[agent.key] as Record<string, unknown>;
        if (servers && Object.keys(servers).length > 0) {
          results[agent.name] = servers;
        }
      } else if (agent.format === 'toml') {
        const { servers } = await loadTomlConfig(agent.path);
        if (Object.keys(servers).length > 0) {
          results[agent.name] = servers;
        }
      }
    }
  }

  return results;
}

/**
 * Remove an MCP server from all agent configs.
 * Returns array of { agent, path } for removed entries.
 */
export async function removeMcpServer(name: string): Promise<Array<{ agent: string; path: string }>> {
  const removed: Array<{ agent: string; path: string }> = [];

  for (const agent of AGENT_MCP_CONFIGS) {
    if (!(await fileExists(agent.path))) continue;

    if (agent.format === 'json') {
      const config = await loadJsonConfig(agent.path);
      const servers = config[agent.key] as Record<string, unknown>;

      if (servers && servers[name]) {
        delete servers[name];
        await saveJsonConfig(agent.path, config);
        removed.push({ agent: agent.name, path: agent.path });
      }
    }
    // TOML removal is more complex, skip for now
  }

  return removed;
}

