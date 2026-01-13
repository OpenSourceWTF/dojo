/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Cursor agent plugin.
 * Skills are stored in .cursor/rules/{skill}/RULE.md
 * Note: Cursor does not support MCP servers currently.
 */
export const cursorPlugin = createAgentPlugin({
  name: 'cursor',
  displayName: 'Cursor',
  format: 'folder-rule',
  agentDir: '.cursor/rules',
  cli: 'cursor'
  // No mcpConfig - Cursor doesn't support MCP
});
