/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Lovable agent plugin (AI prototyping tool, NOT in CAM - dojo exclusive).
 * Skills are stored in .lovable/skills/{skill}.md
 */
export const lovablePlugin = createAgentPlugin({
  name: 'lovable',
  displayName: 'Lovable',
  format: 'flat-md',
  agentDir: '.lovable/skills',
  // Lovable is web-based, no CLI
});
