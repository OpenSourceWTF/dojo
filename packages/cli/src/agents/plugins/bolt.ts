/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Bolt agent plugin (StackBlitz AI, NOT in CAM - dojo exclusive).
 * Skills are stored in .bolt/skills/{skill}.md
 */
export const boltPlugin = createAgentPlugin({
  name: 'bolt',
  displayName: 'Bolt',
  format: 'flat-md',
  agentDir: '.bolt/skills',
  // Bolt is web-based, no CLI
});
