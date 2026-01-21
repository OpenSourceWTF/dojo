/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { execSync } from 'node:child_process';
import { plugins } from './plugins/index.js';
import type { DetectedAgent, AgentPlugin } from './plugin.js';

// Re-export types for backwards compatibility
export type { DetectedAgent } from './plugin.js';

/**
 * Check if a CLI command exists in PATH.
 */
export function cliExists(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Detection options for agent detection.
 */
export interface DetectOptions {
  /** If true, only return agents where CLI is installed */
  requireCli?: boolean;
}

/**
 * Detect which AI agents are available in the project.
 * Detection is based on directory existence.
 * Optionally requires CLI to be installed.
 *
 * @param projectRoot - Project root directory
 * @param options - Detection options
 * @returns Array of detected agents
 */
export function detectAgents(projectRoot: string, options: DetectOptions = {}): DetectedAgent[] {
  const agents: DetectedAgent[] = [];

  for (const plugin of plugins) {
    // Check directory existence first
    const detected = plugin.detect(projectRoot);
    if (!detected) continue;

    // If requireCli is set, check CLI availability
    if (options.requireCli && plugin.cli) {
      if (!cliExists(plugin.cli)) {
        continue;
      }
    }

    agents.push(detected);
  }

  return agents;
}

/**
 * Check if any agents are available in the project.
 */
export function hasAgents(projectRoot: string): boolean {
  return detectAgents(projectRoot).length > 0;
}

/**
 * Get the plugin for a detected agent.
 */
export function getPluginForAgent(agent: DetectedAgent): AgentPlugin | undefined {
  return plugins.find(p => p.name === agent.name);
}

/**
 * Get all available plugins.
 */
export function getPlugins(): AgentPlugin[] {
  return [...plugins];
}

/**
 * Get a plugin by its name.
 */
export function getPluginByName(name: string): AgentPlugin | undefined {
  return plugins.find(p => p.name === name);
}
