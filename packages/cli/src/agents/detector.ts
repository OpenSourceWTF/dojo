/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { plugins } from './plugins/index.js';
import type { DetectedAgent, AgentPlugin } from './plugin.js';

// Re-export types for backwards compatibility
export type { DetectedAgent } from './plugin.js';

/**
 * Detect which AI agents are available in the project.
 * Detection is based on directory existence, not CLI availability.
 *
 * @param projectRoot - Project root directory
 * @returns Array of detected agents
 */
export function detectAgents(projectRoot: string): DetectedAgent[] {
  const agents: DetectedAgent[] = [];

  for (const plugin of plugins) {
    const detected = plugin.detect(projectRoot);
    if (detected) {
      agents.push(detected);
    }
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
