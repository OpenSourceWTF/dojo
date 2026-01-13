/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { join } from 'node:path';
import { homedir } from 'node:os';
import { createAgentPlugin } from '../plugin.js';

/**
 * Antigravity agent plugin (legacy Gemini format).
 * Skills are stored in .agent/workflows/{skill}.md
 * Uses Gemini CLI for detection.
 */
export const antigravityPlugin = createAgentPlugin({
  name: 'antigravity',
  displayName: 'Antigravity',
  format: 'flat-md',
  agentDir: '.agent/workflows',
  cli: 'gemini',  // Uses Gemini CLI
  mcpConfig: {
    path: join(homedir(), '.gemini', 'antigravity', 'mcp_config.json'),
    format: 'json',
    key: 'mcpServers'
  }
});
