/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin, AgentPlugin } from '../plugin.js';

/**
 * Claude agent plugin using folder-skill format.
 * Skills are stored in .claude/skills/{skill}/SKILL.md
 */
export const claudePlugin: AgentPlugin = createAgentPlugin({
  name: 'claude',
  displayName: 'Claude',
  format: 'folder-skill',
  agentDir: '.claude/skills'
});
