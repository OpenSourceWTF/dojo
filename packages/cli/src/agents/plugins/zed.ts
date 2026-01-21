/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Zed AI agent plugin.
 * Zed uses .rules at project root (single file) for project rules.
 * Also supports: .cursorrules, .windsurfrules, .clinerules, AGENTS.md, CLAUDE.md, GEMINI.md
 * Dojo creates skill files in .zed/skills/ for additional skills
 * 
 * @see https://zed.dev/docs/ai/rules
 */
export const zedPlugin = createAgentPlugin({
  name: 'zed',
  displayName: 'Zed AI',
  format: 'flat-md',
  agentDir: '.zed/skills',
  cli: 'zed'
});
