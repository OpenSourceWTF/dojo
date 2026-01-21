/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Roo agent plugin (CAM-compatible).
 * Skills are stored in .roo/rules/{skill}.md
 * Supports MCP via .roo/mcp.json
 */
export const rooPlugin = createAgentPlugin({
  name: 'roo',
  displayName: 'Roo',
  format: 'flat-md',
  agentDir: '.roo/rules',
  cli: 'roo'
});
