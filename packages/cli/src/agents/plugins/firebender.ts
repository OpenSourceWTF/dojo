/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * Sets LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Firebender agent plugin (CAM-compatible).
 * Skills are stored in .firebender/skills/{skill}/SKILL.md
 * Uses firebender.json for MCP configuration
 */
export const firebenderPlugin = createAgentPlugin({
  name: 'firebender',
  displayName: 'Firebender',
  format: 'folder-skill',
  agentDir: '.firebender/skills',
  cli: 'firebender'
});
