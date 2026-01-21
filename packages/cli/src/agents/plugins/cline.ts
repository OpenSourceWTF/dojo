/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Cline agent plugin (formerly Continue).
 * Rules are stored in .clinerules/ folder as markdown files
 * Also supports .clinerules/AGENTS.md for general rules
 * 
 * @see https://docs.cline.bot/features/cline-rules
 */
export const clinePlugin = createAgentPlugin({
  name: 'cline',
  displayName: 'Cline',
  format: 'flat-md',
  agentDir: '.clinerules',
  cli: 'cline'
});
