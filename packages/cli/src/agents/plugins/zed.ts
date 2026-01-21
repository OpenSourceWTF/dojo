/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Zed AI agent plugin.
 * Zed uses .rules at project root for rules.
 * MCP servers are configured in settings.json under "context_servers".
 * 
 * @see https://zed.dev/docs/ai/rules
 * @see https://zed.dev/docs/ai/mcp
 */
export const zedPlugin = createAgentPlugin({
  name: 'zed',
  displayName: 'Zed AI',
  format: 'flat-md',
  agentDir: '.zed/skills',
  cli: 'zed',
  mcpConfig: {
    path: '~/.config/zed/settings.json', // Global settings
    format: 'json',
    key: 'context_servers'
  }
});
