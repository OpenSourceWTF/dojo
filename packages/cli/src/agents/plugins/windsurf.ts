/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Windsurf agent plugin.
 * Skills are stored in .windsurf/rules/{skill}/SKILL.md
 * Uses .windsurfrules at project root for main rules.
 * Supports MCP via .windsurf/mcp.json
 */
export const windsurfPlugin = createAgentPlugin({
  name: 'windsurf',
  displayName: 'Windsurf',
  format: 'folder-skill',
  agentDir: '.windsurf/rules',
  cli: 'windsurf'
  // MCP support via .windsurf/mcp.json (similar to Cursor)
});
