/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { join } from 'node:path';
import { homedir } from 'node:os';
import { createAgentPlugin } from '../plugin.js';

/**
 * Claude agent plugin.
 * Skills are stored in .claude/skills/{skill}/SKILL.md
 * 
 * MCP config locations (per https://claudelog.com/configuration/#mcp-configuration):
 * - Recommended: ~/.claude.json
 * - Also supported: ~/.claude/settings.json, ~/.claude/mcp_servers.json, .mcp.json
 */
export const claudePlugin = createAgentPlugin({
  name: 'claude',
  displayName: 'Claude',
  format: 'folder-skill',
  agentDir: '.claude/skills',
  cli: 'claude',
  mcpConfig: {
    path: join(homedir(), '.claude.json'),
    format: 'json',
    key: 'mcpServers'
  }
});
