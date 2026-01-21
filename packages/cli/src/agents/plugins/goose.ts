/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Goose agent plugin (Block/Square, CAM-compatible).
 * Skills are stored in .goose/skills/{skill}.md
 */
export const goosePlugin = createAgentPlugin({
  name: 'goose',
  displayName: 'Goose',
  format: 'flat-md',
  agentDir: '.goose/skills',
  cli: 'goose'
});
