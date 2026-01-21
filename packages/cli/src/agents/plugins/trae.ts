/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Trae agent plugin (ByteDance AI editor, NOT in CAM - dojo exclusive).
 * Skills are stored in .trae/skills/{skill}.md
 */
export const traePlugin = createAgentPlugin({
  name: 'trae',
  displayName: 'Trae',
  format: 'flat-md',
  agentDir: '.trae/skills',
  cli: 'trae'
});
