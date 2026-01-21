/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * OpenAI Codex agent plugin.
 * Skills are stored in .codex/skills/{skill}/SKILL.md
 */
export const codexPlugin = createAgentPlugin({
  name: 'codex',
  displayName: 'OpenAI Codex',
  format: 'folder-skill',
  agentDir: '.codex/skills',
  cli: 'codex'
});
