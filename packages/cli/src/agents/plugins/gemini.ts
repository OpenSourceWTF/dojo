/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin, AgentPlugin } from '../plugin.js';

/**
 * Gemini agent plugin using folder-skill format.
 * Skills are stored in .gemini/skills/{skill}/SKILL.md
 */
export const geminiPlugin: AgentPlugin = createAgentPlugin({
  name: 'gemini',
  displayName: 'Gemini',
  format: 'folder-skill',
  agentDir: '.gemini/skills'
});
