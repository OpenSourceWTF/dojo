/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { join } from 'node:path';
import { homedir } from 'node:os';
import { createAgentPlugin } from '../plugin.js';

/**
 * Codex agent plugin.
 * Skills are stored in .codex/skills/{skill}/SKILL.md
 */
export const codexPlugin = createAgentPlugin({
  name: 'codex',
  displayName: 'Codex',
  format: 'folder-skill',
  agentDir: '.codex/skills',
  cli: 'codex',
  mcpConfig: {
    path: join(homedir(), '.codex', 'config.toml'),
    format: 'toml',
    key: 'mcp_servers'
  }
});
