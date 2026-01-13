/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import chalk from 'chalk';
import { prompt } from '../utils/prompt.js';
import { McpServerConfig } from '../registry/loader.js';

// Known MCP config locations
const MCP_CONFIG_OPTIONS = [
  { name: 'Claude Desktop', path: join(homedir(), '.claude', 'claude_desktop_config.json') },
  { name: 'Cursor', path: join(homedir(), '.cursor', 'mcp.json') },
  { name: 'VS Code Roo', path: join(homedir(), '.vscode', 'roo_mcp.json') },
];

// Dojo preferences cache
const DOJO_PREFS_PATH = join(homedir(), '.dojo', 'preferences.json');

interface DojoPreferences {
  mcpConfigPath?: string;
}

interface McpConfig {
  mcpServers?: Record<string, {
    command: string;
    args: string[];
    env?: Record<string, string>;
  }>;
}

/**
 * Load Dojo preferences.
 * 
 * @returns The saved preferences or empty object
 */
async function loadPreferences(): Promise<DojoPreferences> {
  try {
    const content = await readFile(DOJO_PREFS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * Save Dojo preferences.
 * 
 * @param prefs - Preferences to save
 */
async function savePreferences(prefs: DojoPreferences): Promise<void> {
  await mkdir(dirname(DOJO_PREFS_PATH), { recursive: true });
  await writeFile(DOJO_PREFS_PATH, JSON.stringify(prefs, null, 2));
}

/**
 * Check if a file exists.
 * 
 * @param path - Path to check
 * @returns True if file exists
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
 * Prompt user to select MCP config file.
 * 
 * @param defaultPath - Optional default path from preferences
 * @returns Selected config file path
 */
async function promptMcpConfigSelection(defaultPath?: string): Promise<string> {
  // Find existing configs
  const existingConfigs: typeof MCP_CONFIG_OPTIONS = [];
  for (const opt of MCP_CONFIG_OPTIONS) {
    if (await fileExists(opt.path)) {
      existingConfigs.push(opt);
    }
  }

  // If only one exists, use it
  if (existingConfigs.length === 1) {
    console.log(chalk.gray(`   Using ${existingConfigs[0].name} config`));
    return existingConfigs[0].path;
  }

  // If default exists and is valid, offer to use it
  if (defaultPath && await fileExists(defaultPath)) {
    const defaultName = MCP_CONFIG_OPTIONS.find(o => o.path === defaultPath)?.name || 'Custom';
    console.log(chalk.gray(`   Default: ${defaultName} (${defaultPath})`));

    const answer = await prompt('   Use default? [Y/n]: ');
    if (answer.toLowerCase() !== 'n') {
      return defaultPath;
    }
  }

  // Show options
  console.log(chalk.yellow('\n   Select MCP config file:\n'));

  const options = existingConfigs.length > 0 ? existingConfigs : MCP_CONFIG_OPTIONS;
  options.forEach((opt, i) => {
    const exists = existingConfigs.some(e => e.path === opt.path);
    const status = exists ? chalk.green('(exists)') : chalk.gray('(will create)');
    console.log(`   ${chalk.cyan(`[${i + 1}]`)} ${opt.name} ${status}`);
    console.log(chalk.gray(`       ${opt.path}`));
  });

  const answer = await prompt('\n   Enter number: ');
  const index = parseInt(answer, 10) - 1;

  if (index >= 0 && index < options.length) {
    return options[index].path;
  }

  // Default to Claude Desktop
  return MCP_CONFIG_OPTIONS[0].path;
}

/**
 * Load MCP config from a path.
 * 
 * @param configPath - Path to config file
 * @returns Parsed config or empty mcpServers object
 */
async function loadMcpConfig(configPath: string): Promise<McpConfig> {
  try {
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { mcpServers: {} };
  }
}

/**
 * Save MCP config to a path.
 * 
 * @param configPath - Path to save config
 * @param config - Config object to save
 */
async function saveMcpConfig(configPath: string, config: McpConfig): Promise<void> {
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2));
}

/**
 * Add MCP servers to config (with user selection).
 * 
 * @param servers - Array of MCP server configurations to add
 * @returns Array of server names that were added
 */
export async function addMcpServersToConfig(servers: McpServerConfig[]): Promise<string[]> {
  if (servers.length === 0) return [];

  // Load preferences to get default config path
  const prefs = await loadPreferences();

  // Prompt for config selection
  const configPath = await promptMcpConfigSelection(prefs.mcpConfigPath);

  // Save preference for next time
  if (configPath !== prefs.mcpConfigPath) {
    prefs.mcpConfigPath = configPath;
    await savePreferences(prefs);
  }

  // Load and update config
  const config = await loadMcpConfig(configPath);
  const added: string[] = [];

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  for (const server of servers) {
    // Skip if already configured
    if (config.mcpServers[server.name]) {
      console.log(chalk.gray(`   ⏭ ${server.name} (already configured)`));
      continue;
    }

    // Prompt for required env variables
    let envVars: Record<string, string> = {};
    if (server.env) {
      console.log(chalk.yellow(`   ${server.name} requires configuration:`));

      for (const [key, defaultValue] of Object.entries(server.env)) {
        const isPlaceholder = defaultValue.startsWith('${') || defaultValue === '';
        const promptText = isPlaceholder
          ? `     ${key}: `
          : `     ${key} [${defaultValue}]: `;

        const value = await prompt(promptText, { color: 'cyan' });
        envVars[key] = value || defaultValue;
      }
    }

    config.mcpServers[server.name] = {
      command: server.command,
      args: server.args,
      ...(Object.keys(envVars).length > 0 && { env: envVars })
    };

    added.push(server.name);
    console.log(chalk.green(`   ✓ ${server.name} → ${server.package}`));
  }

  if (added.length > 0) {
    await saveMcpConfig(configPath, config);
    console.log(chalk.gray(`   Saved to: ${configPath}`));
  }

  return added;
}

/**
 * List currently configured MCP servers from default config.
 * 
 * @returns Record of server names to their configs
 */
export async function listMcpServers(): Promise<Record<string, { command: string; args: string[] }>> {
  const prefs = await loadPreferences();
  if (!prefs.mcpConfigPath) return {};

  const config = await loadMcpConfig(prefs.mcpConfigPath);
  return config.mcpServers || {};
}

/**
 * Remove an MCP server from default config.
 * 
 * @param name - Server name to remove
 * @returns True if removed, false if not found
 */
export async function removeMcpServer(name: string): Promise<boolean> {
  const prefs = await loadPreferences();
  if (!prefs.mcpConfigPath) return false;

  const config = await loadMcpConfig(prefs.mcpConfigPath);

  if (!config.mcpServers || !config.mcpServers[name]) {
    return false;
  }

  delete config.mcpServers[name];
  await saveMcpConfig(prefs.mcpConfigPath, config);
  return true;
}
