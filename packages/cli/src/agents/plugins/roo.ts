/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Roo agent plugin.
 * Rules are stored in .roo/rules/{rule}.md
 * MCP config is stored in .roo/mcp.json (project) or global VSCode extension storage
 * 
 * @see https://docs.roocode.com/features/mcp/using-mcp-in-roo
 */
export const rooPlugin = createAgentPlugin({
  name: 'roo',
  displayName: 'Roo',
  format: 'flat-md',
  agentDir: '.roo/rules',
  mcpConfig: {
    path: '.roo/mcp.json', // Project-level config
    format: 'json',
    key: 'mcpServers'
  }
});
