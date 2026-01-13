/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin, AgentPlugin } from '../plugin.js';

/**
 * Codex agent plugin using folder-skill format.
 * Skills are stored in .codex/skills/{skill}/SKILL.md
 */
export const codexPlugin: AgentPlugin = createAgentPlugin({
  name: 'codex',
  displayName: 'Codex',
  format: 'folder-skill',
  agentDir: '.codex/skills'
});
