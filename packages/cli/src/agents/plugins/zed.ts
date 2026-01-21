/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Zed AI agent plugin (NOT in CAM - dojo exclusive).
 * Skills are stored in .zed/skills/{skill}.md
 * Zed's AI assistant uses context from project.
 */
export const zedPlugin = createAgentPlugin({
  name: 'zed',
  displayName: 'Zed AI',
  format: 'flat-md',
  agentDir: '.zed/skills',
  cli: 'zed'
});
