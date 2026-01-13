/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';
import chalk from 'chalk';
import { McpServerConfig } from '../registry/loader.js';
import { plugins } from '../agents/plugins/index.js';
import type { McpConfig, AgentPlugin } from '../agents/plugin.js';
import { prompt } from '../utils/prompt.js';

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
 * Get CLI command for a plugin (based on agent name).
 */
function getCliCommand(pluginName: string): string {
  const cliMap: Record<string, string> = {
    'claude': 'claude',
    'gemini': 'gemini',
    'antigravity': 'gemini',
    'codex': 'codex',
    'cursor': 'cursor'
  };
  return cliMap[pluginName] || pluginName;
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

/**
 * Prompt user for required environment variables.
 * Defaults to existing environment values if available.
 * If user skips and no value exists, uses ${env:VAR_NAME} format.
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
      promptText = `     ${key} (skip to use \${env:${key}}): `;
    } else {
      // Show masked default for sensitive values
      const masked = key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')
        ? '***'
        : defaultValue;
      promptText = `     ${key} [${masked}]: `;
    }

    const value = await prompt(promptText);

    // If user skips and no default, use ${env:KEY} format
    if (!value && !defaultValue) {
      result[key] = `\${env:${key}}`;
    } else {
      result[key] = value || defaultValue || `\${env:${key}}`;
    }
  }

  return result;
}

/**
 * Add MCP servers to a specific plugin's config.
 * Returns { added: string[], skipped: string[] }
 */
async function addServersToPlugin(
  plugin: AgentPlugin,
  servers: McpServerConfig[],
  resolvedEnvs: Map<string, Record<string, string>>
): Promise<{ added: string[]; skipped: string[] }> {
  const added: string[] = [];
  const skipped: string[] = [];

  const mcpConfig = plugin.mcpConfig;
  if (!mcpConfig) return { added, skipped };

  if (mcpConfig.format === 'json') {
    const config = await loadJsonConfig(mcpConfig.path);
    const mcpServers = (config[mcpConfig.key] as Record<string, unknown>) || {};

    for (const server of servers) {
      if (mcpServers[server.name]) {
        skipped.push(server.name);
        continue;
      }

      const env = resolvedEnvs.get(server.name) || {};

      mcpServers[server.name] = {
        command: server.command,
        args: server.args,
        ...(Object.keys(env).length > 0 ? { env } : {})
      };
      added.push(server.name);
    }

    if (added.length > 0) {
      config[mcpConfig.key] = mcpServers;
      await saveJsonConfig(mcpConfig.path, config);
    }
  } else if (mcpConfig.format === 'toml') {
    let { raw, servers: existing } = await loadTomlConfig(mcpConfig.path);

    for (const server of servers) {
      if (existing[server.name]) {
        skipped.push(server.name);
        continue;
      }

      const env = resolvedEnvs.get(server.name) || {};
      const serverWithEnv = { ...server, env: { ...server.env, ...env } };

      raw = addServerToToml(raw, serverWithEnv);
      added.push(server.name);
    }

    if (added.length > 0) {
      await mkdir(dirname(mcpConfig.path), { recursive: true });
      await writeFile(mcpConfig.path, raw);
    }
  }

  return { added, skipped };
}

/**
 * Add MCP servers to ALL agent configs that have mcpConfig defined.
 * Uses the plugin system for MCP config paths.
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

  // Use plugin system - iterate over plugins with mcpConfig
  for (const plugin of plugins) {
    if (!plugin.mcpConfig) continue;

    // Check if agent CLI is installed (use plugin.cli if defined)
    const cli = plugin.cli || plugin.name;
    if (!cliExists(cli)) {
      console.log(chalk.gray(`   ⏭ ${plugin.displayName}: skipped (${cli} not found)`));
      continue;
    }

    const { added, skipped } = await addServersToPlugin(plugin, servers, resolvedEnvs);
    if (added.length > 0) {
      results[plugin.displayName] = added;
      console.log(chalk.green(`   ✓ ${plugin.displayName}: ${added.join(', ')}`));
      console.log(chalk.gray(`     → ${plugin.mcpConfig.path}`));
    }
    if (skipped.length > 0) {
      console.log(chalk.gray(`   ⏭ ${plugin.displayName}: ${skipped.join(', ')} (already configured)`));
    }
  }

  return results;
}

/**
 * List currently configured MCP servers from all agent configs.
 * Uses the plugin system for MCP config paths.
 */
export async function listMcpServers(): Promise<Record<string, Record<string, unknown>>> {
  const results: Record<string, Record<string, unknown>> = {};

  for (const plugin of plugins) {
    if (!plugin.mcpConfig) continue;

    const mcpConfig = plugin.mcpConfig;
    if (await fileExists(mcpConfig.path)) {
      if (mcpConfig.format === 'json') {
        const config = await loadJsonConfig(mcpConfig.path);
        const servers = config[mcpConfig.key] as Record<string, unknown>;
        if (servers && Object.keys(servers).length > 0) {
          results[plugin.displayName] = servers;
        }
      } else if (mcpConfig.format === 'toml') {
        const { servers } = await loadTomlConfig(mcpConfig.path);
        if (Object.keys(servers).length > 0) {
          results[plugin.displayName] = servers;
        }
      }
    }
  }

  return results;
}

/**
 * Remove an MCP server from all agent configs.
 * Uses the plugin system for MCP config paths.
 * Returns array of { agent, path } for removed entries.
 */
export async function removeMcpServer(name: string): Promise<Array<{ agent: string; path: string }>> {
  const removed: Array<{ agent: string; path: string }> = [];

  for (const plugin of plugins) {
    if (!plugin.mcpConfig) continue;

    const mcpConfig = plugin.mcpConfig;
    if (!(await fileExists(mcpConfig.path))) continue;

    if (mcpConfig.format === 'json') {
      const config = await loadJsonConfig(mcpConfig.path);
      const servers = config[mcpConfig.key] as Record<string, unknown>;

      if (servers && servers[name]) {
        delete servers[name];
        await saveJsonConfig(mcpConfig.path, config);
        removed.push({ agent: plugin.displayName, path: mcpConfig.path });
      }
    }
    // TOML removal is more complex, skip for now
  }

  return removed;
}

/**
 * Get configured MCP servers for a plugin.
 * Returns array of server names and their configuration.
 */
interface ConfiguredMcpServer {
  name: string;
  command?: string;
  args?: string[];
  agent: string;
  configPath: string;
}

/**
 * Get all configured MCP servers across all agents.
 * Reads from each plugin's MCP config file.
 */
export async function getConfiguredMcpServers(): Promise<ConfiguredMcpServer[]> {
  const servers: ConfiguredMcpServer[] = [];

  for (const plugin of plugins) {
    if (!plugin.mcpConfig) continue;

    const mcpConfig = plugin.mcpConfig;
    if (!(await fileExists(mcpConfig.path))) continue;

    if (mcpConfig.format === 'json') {
      const config = await loadJsonConfig(mcpConfig.path);
      const mcpServers = config[mcpConfig.key] as Record<string, Record<string, unknown>> | undefined;

      if (mcpServers && typeof mcpServers === 'object') {
        for (const [name, serverConfig] of Object.entries(mcpServers)) {
          servers.push({
            name,
            command: serverConfig.command as string | undefined,
            args: serverConfig.args as string[] | undefined,
            agent: plugin.displayName,
            configPath: mcpConfig.path
          });
        }
      }
    } else if (mcpConfig.format === 'toml') {
      // Parse TOML for server names
      const { servers: tomlServers } = await loadTomlConfig(mcpConfig.path);
      for (const name of Object.keys(tomlServers)) {
        servers.push({
          name,
          agent: plugin.displayName,
          configPath: mcpConfig.path
        });
      }
    }
  }

  return servers;
}

