/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import type { AgentPlugin } from '../plugin.js';

// Core agents (original set)
import { claudePlugin } from './claude.js';
import { geminiPlugin } from './gemini.js';
import { antigravityPlugin } from './antigravity.js';
import { cursorPlugin } from './cursor.js';
import { codexPlugin } from './codex.js';

// CAM-compatible agents
import { ampPlugin } from './amp.js';
import { clinePlugin } from './cline.js';
import { copilotPlugin } from './copilot.js';
import { firebenderPlugin } from './firebender.js';
import { goosePlugin } from './goose.js';
import { kilocodePlugin } from './kilocode.js';
import { rooPlugin } from './roo.js';

// Dojo-exclusive agents (NOT in CAM)
import { windsurfPlugin } from './windsurf.js';
import { aiderPlugin } from './aider.js';
import { zedPlugin } from './zed.js';
import { codyPlugin } from './cody.js';
import { voidPlugin } from './void.js';
import { juniePlugin } from './junie.js';
import { traePlugin } from './trae.js';
import { boltPlugin } from './bolt.js';
import { lovablePlugin } from './lovable.js';

/**
 * Registry of built-in agent plugins.
 * 
 * Core (5): claude, gemini, antigravity, cursor, codex
 * CAM-compatible (7): amp, cline, copilot, firebender, goose, kilocode, roo
 * Dojo-exclusive (9): windsurf, aider, zed, cody, void, junie, trae, bolt, lovable
 * 
 * Total: 21 agents
 */
export const agentPlugins: Record<string, AgentPlugin> = {
  // Core agents
  'claude': claudePlugin,
  'gemini': geminiPlugin,
  'antigravity': antigravityPlugin,
  'cursor': cursorPlugin,
  'codex': codexPlugin,

  // CAM-compatible agents
  'amp': ampPlugin,
  'cline': clinePlugin,
  'copilot': copilotPlugin,
  'firebender': firebenderPlugin,
  'goose': goosePlugin,
  'kilocode': kilocodePlugin,
  'roo': rooPlugin,

  // Dojo-exclusive agents (NOT in CAM)
  'windsurf': windsurfPlugin,
  'aider': aiderPlugin,
  'zed': zedPlugin,
  'cody': codyPlugin,
  'void': voidPlugin,
  'junie': juniePlugin,
  'trae': traePlugin,
  'bolt': boltPlugin,
  'lovable': lovablePlugin
};

/**
 * Get all registered plugins as an array.
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

// Re-export all plugins
export { claudePlugin } from './claude.js';
export { geminiPlugin } from './gemini.js';
export { antigravityPlugin } from './antigravity.js';
export { cursorPlugin } from './cursor.js';
export { codexPlugin } from './codex.js';
export { ampPlugin } from './amp.js';
export { clinePlugin } from './cline.js';
export { copilotPlugin } from './copilot.js';
export { firebenderPlugin } from './firebender.js';
export { goosePlugin } from './goose.js';
export { kilocodePlugin } from './kilocode.js';
export { rooPlugin } from './roo.js';
export { windsurfPlugin } from './windsurf.js';
export { aiderPlugin } from './aider.js';
export { zedPlugin } from './zed.js';
export { codyPlugin } from './cody.js';
export { voidPlugin } from './void.js';
export { juniePlugin } from './junie.js';
export { traePlugin } from './trae.js';
export { boltPlugin } from './bolt.js';
export { lovablePlugin } from './lovable.js';
