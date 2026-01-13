/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { join } from 'node:path';
import { homedir } from 'node:os';
import { createAgentPlugin } from '../plugin.js';

/**
 * Gemini agent plugin.
 * Skills are stored in .gemini/skills/{skill}/SKILL.md
 */
export const geminiPlugin = createAgentPlugin({
  name: 'gemini',
  displayName: 'Gemini',
  format: 'folder-skill',
  agentDir: '.gemini/skills',
  cli: 'gemini',
  mcpConfig: {
    path: join(homedir(), '.gemini', 'settings.json'),
    format: 'json',
    key: 'mcpServers'
  }
});
