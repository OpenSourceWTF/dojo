/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import type { AgentPlugin } from '../plugin.js';
import { claudePlugin } from './claude.js';
import { geminiPlugin } from './gemini.js';
import { antigravityPlugin } from './antigravity.js';
import { cursorPlugin } from './cursor.js';
import { codexPlugin } from './codex.js';

/**
 * Registry of built-in agent plugins.
 */
export const agentPlugins: Record<string, AgentPlugin> = {
  'claude': claudePlugin,
  'gemini': geminiPlugin,
  'antigravity': antigravityPlugin,
  'cursor': cursorPlugin,
  'codex': codexPlugin
};

/**
 * Get all registered plugins as an array.
 * Plugins are returned in registration order.
 */
export const plugins: AgentPlugin[] = Object.values(agentPlugins);

/**
 * Get a plugin by agent name.
 */
export function getPlugin(name: string): AgentPlugin | undefined {
  return agentPlugins[name];
}

/**
 * Get all plugin names.
 */
export function getPluginNames(): string[] {
  return Object.keys(agentPlugins);
}

/**
 * Register a custom agent plugin.
 */
export function registerPlugin(plugin: AgentPlugin): void {
  agentPlugins[plugin.name] = plugin;
}

// Re-export individual plugins for direct access
export { claudePlugin } from './claude.js';
export { geminiPlugin } from './gemini.js';
export { antigravityPlugin } from './antigravity.js';
export { cursorPlugin } from './cursor.js';
export { codexPlugin } from './codex.js';
