/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Cursor agent plugin.
 * Rules are stored in .cursor/rules/{rule}.md
 * MCP config is stored in ~/.cursor/mcp.json
 * 
 * @see https://cursor.com/docs/context/rules
 * @see https://cursor.com/docs/context/mcp
 */
export const cursorPlugin = createAgentPlugin({
  name: 'cursor',
  displayName: 'Cursor',
  format: 'folder-rule',
  agentDir: '.cursor/rules',
  cli: 'cursor',
  mcpConfig: {
    path: '~/.cursor/mcp.json',
    format: 'json',
    key: 'mcpServers'
  }
});
