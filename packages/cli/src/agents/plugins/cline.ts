/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Cline agent plugin (formerly Continue).
 * Skills are stored in .clinerules/{skill}.md
 * Also supports .clinerules/AGENTS.md for general rules.
 */
export const clinePlugin = createAgentPlugin({
  name: 'cline',
  displayName: 'Cline',
  format: 'flat-md',
  agentDir: '.clinerules',
  cli: 'cline'
});
