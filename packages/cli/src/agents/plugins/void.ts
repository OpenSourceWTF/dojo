/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Void agent plugin (Void Editor).
 * Skills are stored in .void/skills/
 * MCP config in project root mcp_config.json
 * 
 * @see https://deepwiki.com/voideditor/void/3.6-model-context-protocol-(mcp)-service
 */
export const voidPlugin = createAgentPlugin({
  name: 'void',
  displayName: 'Void',
  format: 'flat-md',
  agentDir: '.void/skills',
  mcpConfig: {
    path: 'mcp_config.json', // Project-level config
    format: 'json',
    key: 'mcpServers'
  }
});
